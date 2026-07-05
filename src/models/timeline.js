// Timeline model - reads the event journal that every other model has been writing
// since Phase 1. The Timeline replays these in order, from the Big Bang (the first
// Thought) to now.

const db = require('../db/connection');

const stmts = {
    all: db.prepare('SELECT * FROM events ORDER BY at ASC, id ASC')
};

const Timeline = {
    events() {
        return stmts.all.all().map((row) => ({
            id: row.id,
            type: row.type,               // e.g. thought.created, connection.created
            entityType: row.entity_type,  // thought | connection | memory | pathway
            entityId: row.entity_id,
            payload: row.payload ? JSON.parse(row.payload) : null,
            at: row.at
        }));
    }
};

module.exports = Timeline;
