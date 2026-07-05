// Thought model - the core unit (a card on the canvas). Replaces the old in-memory Memory model.
// All persistence goes through better-sqlite3 prepared statements; every create/delete/deepen
// records a timeline event.

const db = require('../db/connection');
const { recordEvent } = require('../lib/events');
const Layout = require('../lib/layout');
const Tag = require('./tag');

const now = () => new Date().toISOString();

// Empty shortcuts are stored as NULL so the UNIQUE constraint doesn't collide on '' .
const normalizeShortcut = (s) => {
    if (s === undefined || s === null) return null;
    const trimmed = String(s).trim();
    return trimmed === '' ? null : trimmed;
};

const statements = {
    insert: db.prepare(
        `INSERT INTO thoughts (title, category, shortcut, content, source, x, y, created, updated, last_touched)
         VALUES (@title, @category, @shortcut, @content, @source, @x, @y, @created, @updated, @last_touched)`
    ),
    byId: db.prepare(`SELECT * FROM thoughts WHERE id = ?`),
    all: db.prepare(`SELECT * FROM thoughts ORDER BY created ASC`),
    delete: db.prepare(`DELETE FROM thoughts WHERE id = ?`),
    touch: db.prepare(`UPDATE thoughts SET updated = @updated, last_touched = @last_touched WHERE id = @id`),
    depthByThought: db.prepare(`SELECT id, body, created FROM thought_depth WHERE thought_id = ? ORDER BY created ASC`),
    countDepth: db.prepare(`SELECT COUNT(*) AS n FROM thought_depth WHERE thought_id = ?`),
    insertDepth: db.prepare(
        `INSERT INTO thought_depth (thought_id, body, created) VALUES (@thought_id, @body, @created)`
    )
};

// Shape a DB row into the API object the frontend expects (camelCase lastTouched).
function serialize(row) {
    if (!row) return null;
    return {
        id: row.id,
        title: row.title,
        category: row.category,
        shortcut: row.shortcut,
        content: row.content,
        source: row.source,
        x: row.x,
        y: row.y,
        created: row.created,
        updated: row.updated,
        lastTouched: row.last_touched,
        tags: Tag.getFor('thought', row.id),
        depthCount: statements.countDepth.get(row.id).n
    };
}

const Thought = {
    all() {
        return statements.all.all().map(serialize);
    },

    getById(id) {
        const row = statements.byId.get(id);
        if (!row) return null;
        const thought = serialize(row);
        thought.depth = statements.depthByThought.all(id); // Go Deeper entries
        return thought;
    },

    create({ title, category, shortcut, content, source, x, y, tags }) {
        const ts = now();
        // Never land on top of an existing card - nudge to the nearest clear ground.
        const spot = Layout.findFreeSpot(x != null ? x : 100, y != null ? y : 100);
        const info = statements.insert.run({
            title,
            category,
            shortcut: normalizeShortcut(shortcut),
            content: content || '',
            source: source || null,
            x: spot.x,
            y: spot.y,
            created: ts,
            updated: ts,
            last_touched: ts
        });
        if (Array.isArray(tags)) Tag.setFor('thought', info.lastInsertRowid, tags);
        const thought = this.getById(info.lastInsertRowid);
        recordEvent('thought.created', 'thought', thought.id, thought);
        return thought;
    },

    // Partial update. Position-only saves (drag) bump timestamps but don't spam the timeline;
    // edits to real content do record a 'thought.updated' event.
    update(id, fields) {
        const existing = statements.byId.get(id);
        if (!existing) return null;

        const contentColumns = ['title', 'category', 'shortcut', 'content', 'source'];
        const allColumns = [...contentColumns, 'x', 'y'];
        const sets = [];
        const params = { id, updated: now(), last_touched: now() };
        let contentChanged = false;

        for (const col of allColumns) {
            if (fields[col] !== undefined) {
                params[col] = col === 'shortcut' ? normalizeShortcut(fields[col]) : fields[col];
                sets.push(`${col} = @${col}`);
                if (contentColumns.includes(col)) contentChanged = true;
            }
        }

        sets.push('updated = @updated', 'last_touched = @last_touched');
        db.prepare(`UPDATE thoughts SET ${sets.join(', ')} WHERE id = @id`).run(params);

        // Tags are a separate (polymorphic) store; replace the set if provided.
        if (Array.isArray(fields.tags)) {
            Tag.setFor('thought', id, fields.tags);
            contentChanged = true;
        }

        const thought = this.getById(id);
        if (contentChanged) recordEvent('thought.updated', 'thought', id, thought);
        return thought;
    },

    // "Go Deeper" - append an in-depth entry to a Thought.
    addDepth(id, body) {
        const existing = statements.byId.get(id);
        if (!existing) return null;
        const ts = now();
        statements.insertDepth.run({ thought_id: id, body, created: ts });
        statements.touch.run({ id, updated: ts, last_touched: ts });
        const thought = this.getById(id);
        recordEvent('thought.deepened', 'thought', id, { body, created: ts });
        return thought;
    },

    remove(id) {
        const existing = statements.byId.get(id);
        if (!existing) return false;
        const snapshot = serialize(existing); // capture tags before we unlink them
        Tag.removeAllFor('thought', id);       // taggables is polymorphic - no FK cascade
        statements.delete.run(id);             // cascades to depth, connections, memberships
        recordEvent('thought.deleted', 'thought', id, snapshot);
        return true;
    }
};

module.exports = Thought;
