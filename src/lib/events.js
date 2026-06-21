// Event recording - every meaningful write drops a row in the events table so the Timeline
// (Phase 6) can replay the full history from the "Big Bang" (the first Thought) to now.

const db = require('../db/connection');

const insertEvent = db.prepare(
    `INSERT INTO events (type, entity_type, entity_id, payload, at)
     VALUES (@type, @entity_type, @entity_id, @payload, @at)`
);

/**
 * Record a timeline event.
 * @param {string} type        - dotted event name, e.g. 'thought.created'
 * @param {string} entityType  - 'thought' | 'memory' | 'connection'
 * @param {number} entityId    - id of the affected entity
 * @param {object} [payload]   - optional snapshot, stored as JSON
 */
function recordEvent(type, entityType, entityId, payload = null) {
    insertEvent.run({
        type,
        entity_type: entityType,
        entity_id: entityId,
        payload: payload ? JSON.stringify(payload) : null,
        at: new Date().toISOString()
    });
}

module.exports = { recordEvent };
