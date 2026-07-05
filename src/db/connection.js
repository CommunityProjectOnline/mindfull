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

// CREATE IF NOT EXISTS doesn't add new columns to tables that already exist, so databases
// created before a column was introduced get it added here.
function ensureColumn(table, column, ddl) {
    const has = db.pragma(`table_info(${table})`).some((c) => c.name === column);
    if (!has) {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
        console.log(`🗄️  Migrated: added ${table}.${column}`);
    }
}
ensureColumn('thoughts', 'source', 'source TEXT');
ensureColumn('connections', 'pathway_id', 'pathway_id INTEGER REFERENCES pathways(id) ON DELETE SET NULL');
ensureColumn('memories', 'color', 'color TEXT');

console.log(`🗄️  SQLite ready at ${DB_PATH}`);

module.exports = db;
