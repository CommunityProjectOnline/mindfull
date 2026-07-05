// Connection model - a typed link (neural pathway) between two Thoughts.
// Types come from a fixed starter set on the frontend (Confirms, Rebuts, Branches from,
// Relates to, Question); the backend just stores whatever type string it's given.

const db = require('../db/connection');
const { recordEvent } = require('../lib/events');
const Pathway = require('./pathway');

const now = () => new Date().toISOString();

const stmts = {
    all: db.prepare('SELECT * FROM connections ORDER BY created ASC'),
    byId: db.prepare('SELECT * FROM connections WHERE id = ?'),
    insert: db.prepare(
        `INSERT INTO connections (from_thought_id, to_thought_id, type, created)
         VALUES (@from, @to, @type, @created)`
    ),
    setType: db.prepare('UPDATE connections SET type = @type WHERE id = @id'),
    delete: db.prepare('DELETE FROM connections WHERE id = ?'),
    thoughtExists: db.prepare('SELECT id FROM thoughts WHERE id = ?'),
    pair: db.prepare(
        `SELECT id FROM connections
         WHERE (from_thought_id = @a AND to_thought_id = @b)
            OR (from_thought_id = @b AND to_thought_id = @a)`
    )
};

function serialize(row) {
    return {
        id: row.id,
        fromThoughtId: row.from_thought_id,
        toThoughtId: row.to_thought_id,
        type: row.type,
        pathwayId: row.pathway_id, // null = a cross-link between branches
        created: row.created
    };
}

const Connection = {
    all() {
        return stmts.all.all().map(serialize);
    },

    create({ fromThoughtId, toThoughtId, type }) {
        const from = Number(fromThoughtId);
        const to = Number(toThoughtId);

        if (!from || !to) throw new Error('fromThoughtId and toThoughtId are required');
        if (from === to) throw new Error('Cannot connect a Thought to itself');
        if (!stmts.thoughtExists.get(from) || !stmts.thoughtExists.get(to)) {
            throw new Error('Both Thoughts must exist');
        }
        if (stmts.pair.get({ a: from, b: to })) {
            throw new Error('A connection already exists between these Thoughts');
        }

        const created = now();
        const info = stmts.insert.run({ from, to, type: type || 'Relates to', created });

        // Branch assignment: the replay fills in this connection's pathway (creating a new
        // pathway - and possibly a new Origin - when the rules call for one).
        Pathway.assignUnassigned();

        const conn = serialize(stmts.byId.get(info.lastInsertRowid));
        conn.pathway = conn.pathwayId != null ? Pathway.getById(conn.pathwayId) : null;
        recordEvent('connection.created', 'connection', conn.id, conn);
        return conn;
    },

    updateType(id, type) {
        const row = stmts.byId.get(id);
        if (!row) return null;
        stmts.setType.run({ id, type });
        const conn = serialize(stmts.byId.get(id));
        recordEvent('connection.updated', 'connection', id, conn);
        return conn;
    },

    remove(id) {
        const row = stmts.byId.get(id);
        if (!row) return false;
        stmts.delete.run(id);
        recordEvent('connection.deleted', 'connection', id, serialize(row));
        return true;
    }
};

module.exports = Connection;
