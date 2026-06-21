-- MindFull schema. All tables exist from day one so the model supports, from the start:
-- a Thought living in many Memories, typed Connections, tags, and a full timeline history.
-- Every statement is idempotent (IF NOT EXISTS) and applied on each boot.

-- Thought - the core unit (a bubble/card on the canvas / Inner Space).
CREATE TABLE IF NOT EXISTS thoughts (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    title        TEXT    NOT NULL,
    category     TEXT    NOT NULL,
    shortcut     TEXT    UNIQUE,                 -- e.g. {{jn3:16}}, for referencing elsewhere
    content      TEXT    NOT NULL DEFAULT '',
    x            REAL    NOT NULL DEFAULT 100,   -- position in Inner Space
    y            REAL    NOT NULL DEFAULT 100,
    created      TEXT    NOT NULL,
    updated      TEXT    NOT NULL,
    last_touched TEXT    NOT NULL
);

-- "Go Deeper" - in-depth content appended to a Thought after creation (list form).
CREATE TABLE IF NOT EXISTS thought_depth (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    thought_id INTEGER NOT NULL REFERENCES thoughts(id) ON DELETE CASCADE,
    body       TEXT    NOT NULL,
    created    TEXT    NOT NULL
);

-- Memory - a named cluster of connected Thoughts; behaves like a document ("white paper").
CREATE TABLE IF NOT EXISTS memories (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT    NOT NULL,
    created      TEXT    NOT NULL,
    updated      TEXT    NOT NULL,
    last_touched TEXT    NOT NULL
);

-- Many-to-many: a Thought can belong to several Memories.
CREATE TABLE IF NOT EXISTS memory_thoughts (
    memory_id  INTEGER NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
    thought_id INTEGER NOT NULL REFERENCES thoughts(id) ON DELETE CASCADE,
    added      TEXT    NOT NULL,
    PRIMARY KEY (memory_id, thought_id)
);

-- Connection - a typed link (neural pathway) between two Thoughts.
CREATE TABLE IF NOT EXISTS connections (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    from_thought_id INTEGER NOT NULL REFERENCES thoughts(id) ON DELETE CASCADE,
    to_thought_id   INTEGER NOT NULL REFERENCES thoughts(id) ON DELETE CASCADE,
    type            TEXT    NOT NULL DEFAULT 'Relates to',
    created         TEXT    NOT NULL
);

-- Tags / meta-words, attachable to either a Thought or a Memory (polymorphic).
CREATE TABLE IF NOT EXISTS tags (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT    UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS taggables (
    tag_id        INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    taggable_type TEXT    NOT NULL,              -- 'thought' | 'memory'
    taggable_id   INTEGER NOT NULL,
    PRIMARY KEY (tag_id, taggable_type, taggable_id)
);

-- Events - the full history, so the Timeline can replay from the "Big Bang" (first Thought).
CREATE TABLE IF NOT EXISTS events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    type        TEXT    NOT NULL,                -- e.g. thought.created, connection.created
    entity_type TEXT    NOT NULL,                -- thought | memory | connection
    entity_id   INTEGER NOT NULL,
    payload     TEXT,                            -- JSON snapshot of the relevant data
    at          TEXT    NOT NULL
);

-- Helpful indexes for the queries we'll run most.
CREATE INDEX IF NOT EXISTS idx_connections_from ON connections(from_thought_id);
CREATE INDEX IF NOT EXISTS idx_connections_to   ON connections(to_thought_id);
CREATE INDEX IF NOT EXISTS idx_memory_thoughts_thought ON memory_thoughts(thought_id);
CREATE INDEX IF NOT EXISTS idx_taggables_lookup ON taggables(taggable_type, taggable_id);
CREATE INDEX IF NOT EXISTS idx_events_at ON events(at);
