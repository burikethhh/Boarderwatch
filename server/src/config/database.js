require('dotenv').config();
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../', process.env.DB_PATH || './data/boarderswatch.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initializeDatabase() {
  const schemaPath = path.join(__dirname, '../../migrations/001_initial_schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);
  ensureColumns();
  console.log('Database initialized successfully');
}

/**
 * Idempotently add columns introduced after the initial schema.
 */
function ensureColumns() {
  const addColumn = (table, column, ddl) => {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all();
    if (!cols.some(c => c.name === column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
      console.log(`[DB] Added column ${table}.${column}`);
    }
  };

  // Motion tracking / PTZ enhancements
  addColumn('cctv_cameras', 'motion_sensitivity', "motion_sensitivity REAL DEFAULT 1.5");
  addColumn('cctv_cameras', 'motion_tracking', "motion_tracking INTEGER DEFAULT 0");
  addColumn('cctv_cameras', 'night_vision', "night_vision TEXT DEFAULT 'auto'");
  addColumn('cctv_cameras', 'ptz_supported', "ptz_supported INTEGER DEFAULT 1");
  addColumn('cctv_alerts', 'motion_score', "motion_score REAL");
  addColumn('cctv_alerts', 'motion_region', "motion_region TEXT");
  addColumn('cctv_alerts', 'clip_path', "clip_path TEXT");
}

function getDatabase() {
  return db;
}

module.exports = { db, initializeDatabase, getDatabase };
