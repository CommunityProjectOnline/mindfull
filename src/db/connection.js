// Database connection - opens (and creates) the SQLite file and applies the schema.
//
// We use better-sqlite3: synchronous, file-based, zero-config. The whole DB is a single
// file under data/ that survives restarts. Swappable for Postgres later behind the models.

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// Keep the DB next to the project in data/ (gitignored). Created on first run.
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DB_PATH = process.env.MINDFULL_DB || path.join(DATA_DIR, 'mindfull.db');

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

// Pragmas: WAL for snappier concurrent reads, and enforce foreign keys (off by default in SQLite).
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Apply the schema. Every statement is CREATE ... IF NOT EXISTS, so this is safe to run on
// every boot - no migration ceremony needed for a personal project.
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

console.log(`🗄️  SQLite ready at ${DB_PATH}`);

module.exports = db;
