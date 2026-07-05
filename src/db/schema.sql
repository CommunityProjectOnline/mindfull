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
    source       TEXT,                           -- provenance: citation, speaker, link
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
-- Drawn on the canvas as an organic bubble hugging the shape of its Thoughts.
CREATE TABLE IF NOT EXISTS memories (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT    NOT NULL,
    color        TEXT,                            -- bubble tint; assigned from a palette on create
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

-- Pathway - a colored branch of connected Thoughts growing off an Origin thought.
-- Pathways are never created directly by the user: they emerge as connections are made
-- (see the assignment rules in src/models/pathway.js).
CREATE TABLE IF NOT EXISTS pathways (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    origin_thought_id INTEGER NOT NULL REFERENCES thoughts(id) ON DELETE CASCADE,
    color             TEXT    NOT NULL,
    name              TEXT,
    created           TEXT    NOT NULL
);

-- Connection - a typed link (neural pathway) between two Thoughts.
-- pathway_id groups connections into a colored branch; NULL means a cross-link
-- between two already-connected Thoughts (rendered neutrally, by its type color).
CREATE TABLE IF NOT EXISTS connections (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    from_thought_id INTEGER NOT NULL REFERENCES thoughts(id) ON DELETE CASCADE,
    to_thought_id   INTEGER NOT NULL REFERENCES thoughts(id) ON DELETE CASCADE,
    type            TEXT    NOT NULL DEFAULT 'Relates to',
    pathway_id      INTEGER REFERENCES pathways(id) ON DELETE SET NULL,
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

-- Stardust - the staging inbox. Quick captures and AI-extracted Thoughts wait here for
-- review before being placed on the canvas as real Thoughts.
CREATE TABLE IF NOT EXISTS stardust_batches (
    id                    TEXT PRIMARY KEY,       -- one import = one batch
    suggested_memory_name TEXT,
    summary               TEXT,
    origin_ref            TEXT,
    created               TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS stardust (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id          TEXT REFERENCES stardust_batches(id) ON DELETE CASCADE,  -- NULL = quick capture
    ref               TEXT,                       -- the import's handle (t1, t2, ...) for wiring links
    title             TEXT NOT NULL,
    category          TEXT NOT NULL DEFAULT 'Note',
    shortcut          TEXT,
    content           TEXT NOT NULL DEFAULT '',
    source            TEXT,
    tags              TEXT,                       -- JSON array of meta-words
    placed_thought_id INTEGER,                    -- set once placed; row kept until its batch resolves
    created           TEXT NOT NULL
);

-- Proposed connections from an import; they become real Connections once both
-- endpoint items have been placed.
CREATE TABLE IF NOT EXISTS stardust_links (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id TEXT NOT NULL REFERENCES stardust_batches(id) ON DELETE CASCADE,
    from_ref TEXT NOT NULL,
    to_ref   TEXT NOT NULL,
    type     TEXT NOT NULL,
    note     TEXT,
    position INTEGER NOT NULL DEFAULT 0,          -- creation order (origin's links first)
    created  TEXT NOT NULL
);

-- Rediscovery - suggestion pairs the user said "not related" to, so they never resurface.
-- Pairs are stored normalized (a_id < b_id).
CREATE TABLE IF NOT EXISTS dismissed_suggestions (
    a_id      INTEGER NOT NULL REFERENCES thoughts(id) ON DELETE CASCADE,
    b_id      INTEGER NOT NULL REFERENCES thoughts(id) ON DELETE CASCADE,
    dismissed TEXT    NOT NULL,
    PRIMARY KEY (a_id, b_id)
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
