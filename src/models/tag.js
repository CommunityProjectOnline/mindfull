// Tag model - meta-words attachable to a Thought or Memory (polymorphic via taggables).
// Tags are stored lowercase so "Faith" and "faith" are the same meta-word. In Phase 4 these
// become the basis for "you might want to connect these" suggestions.

const db = require('../db/connection');

const stmts = {
    findByName: db.prepare('SELECT id FROM tags WHERE name = ?'),
    insertTag: db.prepare('INSERT INTO tags (name) VALUES (?)'),
    link: db.prepare(
        'INSERT OR IGNORE INTO taggables (tag_id, taggable_type, taggable_id) VALUES (?, ?, ?)'
    ),
    unlinkAll: db.prepare('DELETE FROM taggables WHERE taggable_type = ? AND taggable_id = ?'),
    tagsFor: db.prepare(
        `SELECT t.name FROM tags t
         JOIN taggables tg ON tg.tag_id = t.id
         WHERE tg.taggable_type = ? AND tg.taggable_id = ?
         ORDER BY t.name`
    ),
    all: db.prepare('SELECT name FROM tags ORDER BY name')
};

function normalize(name) {
    return String(name == null ? '' : name).trim().toLowerCase().replace(/\s+/g, ' ');
}

function getOrCreateTagId(name) {
    const n = normalize(name);
    if (!n) return null;
    const row = stmts.findByName.get(n);
    if (row) return row.id;
    return stmts.insertTag.run(n).lastInsertRowid;
}

const Tag = {
    // Names attached to an entity, e.g. getFor('thought', 5)
    getFor(type, id) {
        return stmts.tagsFor.all(type, id).map((r) => r.name);
    },

    // Replace the full set of tags for an entity (de-duped, normalized).
    setFor(type, id, names) {
        const tx = db.transaction((list) => {
            stmts.unlinkAll.run(type, id);
            const seen = new Set();
            for (const raw of list || []) {
                const n = normalize(raw);
                if (!n || seen.has(n)) continue;
                seen.add(n);
                const tagId = getOrCreateTagId(n);
                if (tagId) stmts.link.run(tagId, type, id);
            }
        });
        tx(names);
    },

    // Clean up links when an entity is deleted (taggables is polymorphic, no FK cascade).
    removeAllFor(type, id) {
        stmts.unlinkAll.run(type, id);
    },

    all() {
        return stmts.all.all().map((r) => r.name);
    }
};

module.exports = Tag;
