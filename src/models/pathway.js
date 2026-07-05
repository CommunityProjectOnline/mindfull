// Pathway model - a colored branch of connected Thoughts growing off an Origin.
//
// Pathways are never created directly by the user; they emerge as connections are made.
// Assignment rules, applied to each connection in creation order:
//   - first connection between two lone Thoughts  -> new pathway, Origin = the Thought dragged from
//   - connecting outward from an Origin           -> new pathway (each spoke off an Origin is its own branch)
//   - extending the loose end of a chain          -> same pathway (the color continues down the line)
//   - branching off a mid-chain Thought           -> new pathway rooted at the fork (new color)
//   - linking two already-connected Thoughts      -> no pathway (a neutral cross-link, colored by its type)
//
// The same replay runs on boot (backfilling databases from before pathways existed) and after
// every insert (assigning the new connection). It only ever fills NULLs, never overwrites, and
// genuine cross-links come out NULL every time - so re-running it is always safe.

const db = require('../db/connection');
const { recordEvent } = require('../lib/events');

const now = () => new Date().toISOString();

// Branch colors, cycled as pathways are born. Deliberately distinct from the connection-type
// colors (green/red/purple/blue/amber), which stay on the type badge.
const PALETTE = [
    '#4cc9f0', // cyan
    '#f72585', // magenta
    '#a3e635', // lime
    '#fca311', // orange
    '#2ec4b6', // teal
    '#e0aaff', // lavender
    '#ffd166', // warm yellow
    '#76c893'  // sea green
];

const stmts = {
    all: db.prepare('SELECT * FROM pathways ORDER BY created ASC'),
    byId: db.prepare('SELECT * FROM pathways WHERE id = ?'),
    count: db.prepare('SELECT COUNT(*) AS n FROM pathways'),
    insert: db.prepare(
        `INSERT INTO pathways (origin_thought_id, color, name, created)
         VALUES (@origin, @color, @name, @created)`
    ),
    update: db.prepare('UPDATE pathways SET color = @color, name = @name WHERE id = @id'),
    allConnections: db.prepare('SELECT * FROM connections ORDER BY created ASC, id ASC'),
    setConnectionPathway: db.prepare('UPDATE connections SET pathway_id = @pathway_id WHERE id = @id')
};

function serialize(row) {
    if (!row) return null;
    return {
        id: row.id,
        originThoughtId: row.origin_thought_id,
        color: row.color,
        name: row.name,
        created: row.created
    };
}

function createPathway(originThoughtId) {
    const color = PALETTE[stmts.count.get().n % PALETTE.length];
    const info = stmts.insert.run({ origin: originThoughtId, color, name: null, created: now() });
    const pathway = serialize(stmts.byId.get(info.lastInsertRowid));
    recordEvent('pathway.created', 'pathway', pathway.id, pathway);
    return pathway;
}

// Replay all connections in creation order, assigning a pathway to any that lack one.
// Runs inside a transaction; returns the number of connections it assigned.
const assignUnassigned = db.transaction(() => {
    const degree = new Map();  // thoughtId -> how many connections touch it so far
    const chain = new Map();   // thoughtId -> pathway_id of the last branch connection touching it
    const origins = new Set(stmts.all.all().map((p) => p.origin_thought_id));
    let assigned = 0;

    const bump = (thoughtId, pathwayId) => {
        degree.set(thoughtId, (degree.get(thoughtId) || 0) + 1);
        if (pathwayId != null) chain.set(thoughtId, pathwayId);
    };

    for (const conn of stmts.allConnections.all()) {
        const from = conn.from_thought_id;
        const to = conn.to_thought_id;

        if (conn.pathway_id != null) {
            // Already assigned - just feed it into the replay state.
            bump(from, conn.pathway_id);
            bump(to, conn.pathway_id);
            continue;
        }

        const degF = degree.get(from) || 0;
        const degT = degree.get(to) || 0;
        let pathwayId = null;

        if (degF === 0 && degT === 0) {
            // Two lone Thoughts: a study begins. The Thought dragged from is the Origin.
            const p = createPathway(from);
            origins.add(from);
            pathwayId = p.id;
        } else if (degF > 0 && degT > 0) {
            // Both sides already connected: a cross-link between branches. No pathway.
            pathwayId = null;
        } else {
            const anchor = degF > 0 ? from : to; // the already-connected side
            const anchorDeg = degree.get(anchor) || 0;

            if (origins.has(anchor) || anchorDeg >= 2 || chain.get(anchor) == null) {
                // A spoke off an Origin, a fork off a mid-chain Thought, or an anchor whose
                // only prior link was a cross-link: a new branch is born at the anchor.
                const p = createPathway(anchor);
                origins.add(anchor);
                pathwayId = p.id;
            } else {
                // Extending the loose end of a chain: the branch (and its color) continues.
                pathwayId = chain.get(anchor);
            }
        }

        if (pathwayId != null) {
            stmts.setConnectionPathway.run({ pathway_id: pathwayId, id: conn.id });
            assigned++;
        }
        bump(from, pathwayId);
        bump(to, pathwayId);
    }

    return assigned;
});

const Pathway = {
    PALETTE,

    all() {
        return stmts.all.all().map(serialize);
    },

    getById(id) {
        return serialize(stmts.byId.get(id));
    },

    // Fill in pathway assignments for any connections that lack one. Called on boot
    // (backfill) and after every connection insert (assigning the newcomer).
    assignUnassigned() {
        return assignUnassigned();
    },

    // User override: recolor (or rename) a branch.
    update(id, { color, name }) {
        const row = stmts.byId.get(id);
        if (!row) return null;
        stmts.update.run({
            id,
            color: color !== undefined ? color : row.color,
            name: name !== undefined ? name : row.name
        });
        const pathway = serialize(stmts.byId.get(id));
        recordEvent('pathway.updated', 'pathway', id, pathway);
        return pathway;
    }
};

module.exports = Pathway;
