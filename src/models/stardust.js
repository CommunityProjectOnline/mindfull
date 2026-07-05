// Stardust model - the staging inbox. Two ways in: a quick capture (one loose item)
// or an AI import (a batch of items + proposed typed links, produced by the extraction
// prompt in AI-Ingestion-Prompt.md). Nothing touches the canvas until the user places it.
//
// Lifecycle: an item waits unplaced -> "place" turns it into a real Thought (the row stays,
// remembering ref -> thought id, so links can resolve as partners get placed) -> once a
// batch has no unplaced items left, the whole batch is swept away.

const crypto = require('crypto');
const db = require('../db/connection');
const Layout = require('../lib/layout');
const Thought = require('./thought');
const Connection = require('./connection');
const Memory = require('./memory');

const now = () => new Date().toISOString();

const stmts = {
    unplaced: db.prepare('SELECT * FROM stardust WHERE placed_thought_id IS NULL ORDER BY created ASC, id ASC'),
    unplacedInBatch: db.prepare('SELECT * FROM stardust WHERE batch_id = ? AND placed_thought_id IS NULL ORDER BY id ASC'),
    itemById: db.prepare('SELECT * FROM stardust WHERE id = ?'),
    placedInBatch: db.prepare('SELECT * FROM stardust WHERE batch_id = ? AND placed_thought_id IS NOT NULL'),
    countUnplaced: db.prepare('SELECT COUNT(*) AS n FROM stardust WHERE placed_thought_id IS NULL'),
    countUnplacedInBatch: db.prepare('SELECT COUNT(*) AS n FROM stardust WHERE batch_id = ? AND placed_thought_id IS NULL'),
    insertItem: db.prepare(
        `INSERT INTO stardust (batch_id, ref, title, category, shortcut, content, source, tags, created)
         VALUES (@batch_id, @ref, @title, @category, @shortcut, @content, @source, @tags, @created)`
    ),
    markPlaced: db.prepare('UPDATE stardust SET placed_thought_id = @thought_id WHERE id = @id'),
    deleteItem: db.prepare('DELETE FROM stardust WHERE id = ?'),
    deleteBatchItems: db.prepare('DELETE FROM stardust WHERE batch_id = ?'),

    batches: db.prepare('SELECT * FROM stardust_batches ORDER BY created ASC'),
    batchById: db.prepare('SELECT * FROM stardust_batches WHERE id = ?'),
    insertBatch: db.prepare(
        `INSERT INTO stardust_batches (id, suggested_memory_name, summary, origin_ref, created)
         VALUES (@id, @suggested_memory_name, @summary, @origin_ref, @created)`
    ),
    deleteBatch: db.prepare('DELETE FROM stardust_batches WHERE id = ?'),

    linksInBatch: db.prepare('SELECT * FROM stardust_links WHERE batch_id = ? ORDER BY position ASC, id ASC'),
    linkCounts: db.prepare('SELECT batch_id, COUNT(*) AS n FROM stardust_links GROUP BY batch_id'),
    insertLink: db.prepare(
        `INSERT INTO stardust_links (batch_id, from_ref, to_ref, type, note, position, created)
         VALUES (@batch_id, @from_ref, @to_ref, @type, @note, @position, @created)`
    ),
    deleteLink: db.prepare('DELETE FROM stardust_links WHERE id = ?'),
    deleteLinksTouching: db.prepare('DELETE FROM stardust_links WHERE batch_id = ? AND (from_ref = ? OR to_ref = ?)'),
    deleteBatchLinks: db.prepare('DELETE FROM stardust_links WHERE batch_id = ?')
};

function serializeItem(row) {
    return {
        id: row.id,
        batchId: row.batch_id,
        ref: row.ref,
        title: row.title,
        category: row.category,
        shortcut: row.shortcut,
        content: row.content,
        source: row.source,
        tags: row.tags ? JSON.parse(row.tags) : [],
        created: row.created
    };
}

// Create the Thought for a stardust item. If its shortcut collides with an existing
// Thought's, drop the shortcut rather than failing the placement.
function createThoughtFrom(item, x, y) {
    const fields = {
        title: item.title,
        category: item.category,
        shortcut: item.shortcut,
        content: item.content,
        source: item.source,
        tags: item.tags ? JSON.parse(item.tags) : [],
        x, y
    };
    try {
        return Thought.create(fields);
    } catch (err) {
        if (String(err.message).includes('UNIQUE')) {
            return Thought.create({ ...fields, shortcut: null });
        }
        throw err;
    }
}

// Turn every link whose two endpoints are both placed into a real Connection.
function resolveLinks(batchId) {
    if (!batchId) return [];
    const refToId = new Map(
        stmts.placedInBatch.all(batchId)
            .filter((r) => r.ref)
            .map((r) => [r.ref, r.placed_thought_id])
    );
    const made = [];
    stmts.linksInBatch.all(batchId).forEach((link) => {
        const from = refToId.get(link.from_ref);
        const to = refToId.get(link.to_ref);
        if (!from || !to) return; // a partner is still waiting in the inbox
        try {
            made.push(Connection.create({ fromThoughtId: from, toThoughtId: to, type: link.type }));
        } catch (err) {
            // Duplicate pair or a deleted endpoint - the link is stale either way.
        }
        stmts.deleteLink.run(link.id);
    });
    return made;
}

// Once a batch has nothing left waiting, sweep its bookkeeping away.
function cleanupBatch(batchId) {
    if (!batchId) return;
    if (stmts.countUnplacedInBatch.get(batchId).n > 0) return;
    stmts.deleteBatchLinks.run(batchId);
    stmts.deleteBatchItems.run(batchId);
    stmts.deleteBatch.run(batchId);
}

const Stardust = {
    // Everything the inbox panel needs in one call.
    inbox() {
        const linkCounts = {};
        stmts.linkCounts.all().forEach((r) => { linkCounts[r.batch_id] = r.n; });
        const items = stmts.unplaced.all().map(serializeItem);
        const liveBatchIds = new Set(items.map((i) => i.batchId).filter(Boolean));
        return {
            items,
            batches: stmts.batches.all()
                .filter((b) => liveBatchIds.has(b.id))
                .map((b) => ({
                    id: b.id,
                    suggestedMemoryName: b.suggested_memory_name,
                    summary: b.summary,
                    originRef: b.origin_ref,
                    created: b.created,
                    linkCount: linkCounts[b.id] || 0
                }))
        };
    },

    count() {
        return stmts.countUnplaced.get().n;
    },

    // Quick capture - one loose item, no batch.
    capture({ title, category, content, source, tags }) {
        const cleanTitle = String(title || '').trim();
        if (!cleanTitle) throw new Error('A capture needs a title');
        const info = stmts.insertItem.run({
            batch_id: null,
            ref: null,
            title: cleanTitle,
            category: String(category || 'Note'),
            shortcut: null,
            content: String(content || '').trim(),
            source: source ? String(source).trim() : null,
            tags: JSON.stringify(Array.isArray(tags) ? tags : []),
            created: now()
        });
        return serializeItem(stmts.itemById.get(info.lastInsertRowid));
    },

    // Import the JSON produced by the extraction prompt: a batch of items + proposed links.
    importBatch(payload) {
        const thoughts = Array.isArray(payload.thoughts) ? payload.thoughts : [];
        if (!thoughts.length) throw new Error('The import JSON has no "thoughts" array');

        const batchId = crypto.randomUUID();
        const ts = now();
        const originRef = payload.originRef ? String(payload.originRef) : null;

        const importTx = db.transaction(() => {
            stmts.insertBatch.run({
                id: batchId,
                suggested_memory_name: payload.suggestedMemoryName ? String(payload.suggestedMemoryName) : null,
                summary: payload.summary ? String(payload.summary) : null,
                origin_ref: originRef,
                created: ts
            });

            const refs = new Set();
            thoughts.forEach((t, i) => {
                const title = String(t.title || '').trim();
                if (!title) throw new Error(`Thought ${i + 1} has no title`);
                const ref = String(t.ref || `t${i + 1}`);
                refs.add(ref);
                stmts.insertItem.run({
                    batch_id: batchId,
                    ref,
                    title,
                    category: String(t.category || 'Note'),
                    shortcut: t.shortcut ? String(t.shortcut).trim() : null,
                    content: String(t.content || '').trim(),
                    source: t.source ? String(t.source).trim() : null,
                    tags: JSON.stringify(Array.isArray(t.tags) ? t.tags.map(String) : []),
                    created: ts
                });
            });

            // Keep only links whose endpoints exist; the Origin's links go first so the
            // pathway replay roots the study at the Origin when they're placed.
            const links = (Array.isArray(payload.connections) ? payload.connections : [])
                .filter((c) => refs.has(String(c.from)) && refs.has(String(c.to)) && String(c.from) !== String(c.to))
                .sort((a, b) => {
                    const aOrigin = originRef && (String(a.from) === originRef || String(a.to) === originRef) ? 0 : 1;
                    const bOrigin = originRef && (String(b.from) === originRef || String(b.to) === originRef) ? 0 : 1;
                    return aOrigin - bOrigin;
                });
            links.forEach((c, i) => {
                stmts.insertLink.run({
                    batch_id: batchId,
                    from_ref: String(c.from),
                    to_ref: String(c.to),
                    type: String(c.type || 'Relates to'),
                    note: c.note ? String(c.note) : null,
                    position: i,
                    created: ts
                });
            });
        });
        importTx();

        return { batchId, itemCount: thoughts.length, ...this.inbox() };
    },

    // Place one item on the canvas as a real Thought; resolve any links that are now complete.
    place(id, { x, y }) {
        const row = stmts.itemById.get(id);
        if (!row || row.placed_thought_id) return null;

        const thought = createThoughtFrom(row, x != null ? x : 100, y != null ? y : 100);

        if (row.batch_id && row.ref) {
            stmts.markPlaced.run({ id, thought_id: thought.id });
            const connections = resolveLinks(row.batch_id);
            cleanupBatch(row.batch_id);
            return { thought, connections };
        }
        stmts.deleteItem.run(id); // loose capture - nothing to remember
        return { thought, connections: [] };
    },

    // Place every waiting item in a batch as a FORMATION, not a grid: the Origin on
    // the far left, its branches fanning right/up/down along the batch's proposed
    // links. Then create all resolvable connections and (if the import suggested a
    // name) the Memory.
    placeAll(batchId, { x, y }) {
        const batch = stmts.batchById.get(batchId);
        if (!batch) return null;
        const waiting = stmts.unplacedInBatch.all(batchId);
        if (!waiting.length) return null;

        const anchorX = x != null ? x : 400;
        const anchorY = y != null ? y : 300;

        const refs = waiting.map((row) => row.ref || `item-${row.id}`);
        const links = stmts.linksInBatch.all(batchId)
            .map((l) => ({ from: l.from_ref, to: l.to_ref }));
        const seeds = batch.origin_ref ? [batch.origin_ref] : [];
        const tree = Layout.organicTree(refs, links, seeds);

        // Find clear ground for the WHOLE formation near the requested anchor - never
        // on top of existing Thoughts or another Memory's cluster.
        const area = Layout.findClearArea(
            tree.width, tree.height,
            anchorX - tree.width / 2, anchorY - tree.height / 2
        );

        const thoughts = waiting.map((row, i) => {
            const p = tree.positions.get(refs[i]);
            const thought = createThoughtFrom(row, area.x + p.x, area.y + p.y);
            stmts.markPlaced.run({ id: row.id, thought_id: thought.id });
            return thought;
        });

        const connections = resolveLinks(batchId);

        // The Memory: every Thought this batch ever placed, under the suggested name.
        let memory = null;
        if (batch.suggested_memory_name) {
            const allIds = stmts.placedInBatch.all(batchId).map((r) => r.placed_thought_id);
            try {
                memory = Memory.create({ name: batch.suggested_memory_name, thoughtIds: allIds });
            } catch (err) {
                console.error('Could not create the suggested Memory:', err.message);
            }
        }

        cleanupBatch(batchId);
        return { thoughts, connections, memory };
    },

    discard(id) {
        const row = stmts.itemById.get(id);
        if (!row) return false;
        // Links pointing at a discarded item can never resolve - prune them now.
        if (row.batch_id && row.ref) stmts.deleteLinksTouching.run(row.batch_id, row.ref, row.ref);
        stmts.deleteItem.run(id);
        cleanupBatch(row.batch_id);
        return true;
    }
};

module.exports = Stardust;
