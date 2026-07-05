// Memory model - a named cluster of connected Thoughts. On the canvas it's an organic
// bubble hugging the shape of its Thoughts; opened, it reads as a document (the "white
// paper"): Thoughts as chronological sections, connections as labeled relationships.
// A Thought can belong to many Memories, so membership is a plain many-to-many.

const db = require('../db/connection');
const { recordEvent } = require('../lib/events');
const Layout = require('../lib/layout');
const Tag = require('./tag');
const Thought = require('./thought');

const now = () => new Date().toISOString();

// Bubble tints, cycled as Memories are created. Soft nebula pastels - the canvas renders
// them at low opacity, so they read as a wash of color, not a solid shape.
const PALETTE = [
    '#8ec5ff', // sky
    '#c3a6ff', // violet
    '#ffb3c6', // rose
    '#9be8c8', // mint
    '#ffd8a8', // peach
    '#b5f2ea', // ice
    '#f1b5ff', // orchid
    '#cde697'  // spring
];

const stmts = {
    all: db.prepare('SELECT * FROM memories ORDER BY created ASC'),
    byId: db.prepare('SELECT * FROM memories WHERE id = ?'),
    count: db.prepare('SELECT COUNT(*) AS n FROM memories'),
    insert: db.prepare(
        `INSERT INTO memories (name, color, created, updated, last_touched)
         VALUES (@name, @color, @created, @updated, @last_touched)`
    ),
    rename: db.prepare('UPDATE memories SET name = @name, updated = @updated, last_touched = @last_touched WHERE id = @id'),
    touch: db.prepare('UPDATE memories SET updated = @updated, last_touched = @last_touched WHERE id = @id'),
    delete: db.prepare('DELETE FROM memories WHERE id = ?'),
    memberIds: db.prepare('SELECT thought_id FROM memory_thoughts WHERE memory_id = ? ORDER BY added ASC'),
    addMember: db.prepare(
        'INSERT OR IGNORE INTO memory_thoughts (memory_id, thought_id, added) VALUES (@memory_id, @thought_id, @added)'
    ),
    removeMember: db.prepare('DELETE FROM memory_thoughts WHERE memory_id = ? AND thought_id = ?'),
    thoughtExists: db.prepare('SELECT id FROM thoughts WHERE id = ?')
};

// Connections where BOTH endpoints belong to the Memory - these are the relationships
// the document view labels ("Confirms:", "Rebuts:", ...).
function connectionsAmong(thoughtIds) {
    if (!thoughtIds.length) return [];
    const marks = thoughtIds.map(() => '?').join(',');
    return db.prepare(
        `SELECT * FROM connections
         WHERE from_thought_id IN (${marks}) AND to_thought_id IN (${marks})
         ORDER BY created ASC`
    ).all(...thoughtIds, ...thoughtIds).map((row) => ({
        id: row.id,
        fromThoughtId: row.from_thought_id,
        toThoughtId: row.to_thought_id,
        type: row.type,
        pathwayId: row.pathway_id,
        created: row.created
    }));
}

// List-item shape: enough for the canvas bubble + the Memories panel.
function serialize(row) {
    if (!row) return null;
    const thoughtIds = stmts.memberIds.all(row.id).map((r) => r.thought_id);
    return {
        id: row.id,
        name: row.name,
        color: row.color || PALETTE[(row.id - 1) % PALETTE.length], // legacy rows get a stable fallback
        thoughtIds,
        connectionCount: connectionsAmong(thoughtIds).length,
        created: row.created,
        updated: row.updated,
        lastTouched: row.last_touched
    };
}

const Memory = {
    PALETTE,

    all() {
        return stmts.all.all().map(serialize);
    },

    // Full shape for the document view: member Thoughts in Big Bang order (each with its
    // tags and Go Deeper entries) plus every connection among them.
    getById(id) {
        const row = stmts.byId.get(id);
        if (!row) return null;
        const memory = serialize(row);
        memory.thoughts = memory.thoughtIds
            .map((tid) => Thought.getById(tid))
            .filter(Boolean)
            .sort((a, b) => a.created.localeCompare(b.created));
        memory.connections = connectionsAmong(memory.thoughtIds);
        return memory;
    },

    create({ name, thoughtIds }) {
        const cleanName = String(name || '').trim();
        if (!cleanName) throw new Error('A Memory needs a name');

        const ids = [...new Set((thoughtIds || []).map(Number))].filter((tid) => stmts.thoughtExists.get(tid));
        if (!ids.length) throw new Error('A Memory needs at least one existing Thought');

        const ts = now();
        const color = PALETTE[stmts.count.get().n % PALETTE.length];
        const info = stmts.insert.run({ name: cleanName, color, created: ts, updated: ts, last_touched: ts });
        const id = info.lastInsertRowid;
        ids.forEach((tid) => stmts.addMember.run({ memory_id: id, thought_id: tid, added: ts }));

        const memory = serialize(stmts.byId.get(id));
        recordEvent('memory.created', 'memory', id, memory);
        return memory;
    },

    rename(id, name) {
        const row = stmts.byId.get(id);
        if (!row) return null;
        const cleanName = String(name || '').trim();
        if (!cleanName) throw new Error('A Memory needs a name');
        const ts = now();
        stmts.rename.run({ id, name: cleanName, updated: ts, last_touched: ts });
        const memory = serialize(stmts.byId.get(id));
        recordEvent('memory.updated', 'memory', id, memory);
        return memory;
    },

    // Grow the Memory: add Thoughts (existing members are silently kept).
    addThoughts(id, thoughtIds) {
        const row = stmts.byId.get(id);
        if (!row) return null;
        const ts = now();
        const ids = [...new Set((thoughtIds || []).map(Number))].filter((tid) => stmts.thoughtExists.get(tid));
        ids.forEach((tid) => stmts.addMember.run({ memory_id: id, thought_id: tid, added: ts }));
        stmts.touch.run({ id, updated: ts, last_touched: ts });
        const memory = serialize(stmts.byId.get(id));
        recordEvent('memory.thoughts_added', 'memory', id, { thoughtIds: ids });
        return memory;
    },

    // Re-lay the Memory out as an organic formation: its first pathway Origin on the
    // far left, branches fanning right along the connections. The formation lands as
    // close as possible to where the study already sits, on clear ground.
    arrange(id) {
        const row = stmts.byId.get(id);
        if (!row) return null;
        const memory = serialize(row);
        const ids = memory.thoughtIds;
        if (!ids.length) return this.getById(id);

        const conns = connectionsAmong(ids);
        const memberSet = new Set(ids);
        // Seed the walk at this study's pathway Origins - earliest-created Thought
        // first, so the paper's opening claim is the card that leads from the left.
        const seeds = db.prepare('SELECT origin_thought_id FROM pathways')
            .all()
            .map((p) => p.origin_thought_id)
            .filter((tid) => memberSet.has(tid))
            .sort((a, b) => a - b);

        const tree = Layout.organicTree(
            ids,
            conns.map((c) => ({ from: c.fromThoughtId, to: c.toThoughtId })),
            seeds
        );

        // Keep the study near its current home; its own cards don't block the search.
        const marks = ids.map(() => '?').join(',');
        const current = db.prepare(`SELECT id, x, y FROM thoughts WHERE id IN (${marks})`).all(...ids);
        const minX = Math.min(...current.map((t) => t.x));
        const minY = Math.min(...current.map((t) => t.y));
        const area = Layout.findClearArea(tree.width, tree.height, minX, minY, ids);

        const move = db.transaction(() => {
            ids.forEach((tid) => {
                const p = tree.positions.get(tid);
                Thought.update(tid, { x: area.x + p.x, y: area.y + p.y });
            });
        });
        move();

        recordEvent('memory.arranged', 'memory', id, { thoughtIds: ids });
        return this.getById(id);
    },

    removeThought(id, thoughtId) {
        const row = stmts.byId.get(id);
        if (!row) return null;
        stmts.removeMember.run(id, Number(thoughtId));
        const ts = now();
        stmts.touch.run({ id, updated: ts, last_touched: ts });
        const memory = serialize(stmts.byId.get(id));
        recordEvent('memory.thought_removed', 'memory', id, { thoughtId: Number(thoughtId) });
        return memory;
    },

    remove(id) {
        const row = stmts.byId.get(id);
        if (!row) return false;
        const snapshot = serialize(row);
        Tag.removeAllFor('memory', id);  // taggables is polymorphic - no FK cascade
        stmts.delete.run(id);            // cascades memory_thoughts
        recordEvent('memory.deleted', 'memory', id, snapshot);
        return true;
    }
};

module.exports = Memory;
