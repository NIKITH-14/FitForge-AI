const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Store the database file next to server.js in the backend root
const DB_PATH = path.join(__dirname, '../../../fitness_platform.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('[DB] Failed to open SQLite database:', err.message);
    process.exit(1);
  }
  console.log('[DB] Connected to SQLite at', DB_PATH);
});

db.serialize(() => {
  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = ON');
});

// ─── Auto-create schema ──────────────────────────────────────────────────────
const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  height_cm REAL,
  weight_kg REAL,
  age INTEGER,
  gender TEXT CHECK(gender IN ('male','female')),
  fitness_goal TEXT CHECK(fitness_goal IN ('strength','aesthetic','fat_loss')),
  has_completed_intro INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bmi_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bmi REAL NOT NULL,
  category TEXT NOT NULL,
  ideal_weight_kg REAL,
  recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS nutrition_targets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  bmr REAL NOT NULL,
  tdee REAL NOT NULL,
  daily_calories INTEGER NOT NULL,
  protein_g REAL NOT NULL,
  fat_g REAL NOT NULL,
  carbs_g REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS workout_plans (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal TEXT NOT NULL,
  days_per_week INTEGER NOT NULL,
  plan_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS machine_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  machine_id TEXT,
  exercise_name TEXT NOT NULL,
  rep_count INTEGER NOT NULL DEFAULT 0,
  resistance_kg REAL NOT NULL DEFAULT 0,
  time_under_tension_s REAL NOT NULL DEFAULT 0,
  duration_s INTEGER NOT NULL DEFAULT 0,
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS form_analyses (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES machine_sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joint_angles_json TEXT,
  errors_json TEXT,
  avg_form_score REAL CHECK(avg_form_score >= 0 AND avg_form_score <= 100),
  rep_scores_json TEXT,
  recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_recommendations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT REFERENCES machine_sessions(id) ON DELETE SET NULL,
  recommendation_text TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS food_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  logged_at TEXT NOT NULL DEFAULT (date('now')),
  meal_type TEXT NOT NULL DEFAULT 'snack' CHECK(meal_type IN ('breakfast','lunch','dinner','snack')),
  items_json TEXT NOT NULL DEFAULT '[]',
  total_calories REAL NOT NULL DEFAULT 0,
  total_protein REAL NOT NULL DEFAULT 0,
  total_fat REAL NOT NULL DEFAULT 0,
  total_carbs REAL NOT NULL DEFAULT 0,
  image_url TEXT
);
`;

// Run schema creation
db.exec(SCHEMA, (err) => {
  if (err) {
    console.error('[DB] Schema creation failed:', err.message);
  } else {
    console.log('[DB] Schema ready');
  }
});

// ─── pg-compatible pool wrapper ───────────────────────────────────────────────
// Converts PostgreSQL $1,$2 placeholders → SQLite ? placeholders
// Returns { rows: [...] } just like pg
const pool = {
  query: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      // Convert $1, $2, ... → ?
      const sqliteSQL = sql.replace(/\$\d+/g, '?');

      // Convert boolean true/false to 1/0 for SQLite
      const sqliteParams = params.map(p => {
        if (p === true) return 1;
        if (p === false) return 0;
        return p;
      });

      const upperSQL = sqliteSQL.trim().toUpperCase();

      if (upperSQL.startsWith('SELECT') || upperSQL.startsWith('WITH')) {
        db.all(sqliteSQL, sqliteParams, (err, rows) => {
          if (err) return reject(err);
          // Convert has_completed_intro 0/1 back to boolean
          const mapped = (rows || []).map(row => mapRow(row));
          resolve({ rows: mapped });
        });
      } else if (upperSQL.startsWith('INSERT') && upperSQL.includes('RETURNING')) {
        // Extract the table name for the follow-up SELECT
        const tableName = extractTableName(sqliteSQL);
        // Strip RETURNING clause for SQLite
        const insertSQL = sqliteSQL.replace(/RETURNING\s+[\s\S]+$/i, '').trim();
        db.run(insertSQL, sqliteParams, function (err) {
          if (err) return reject(err);
          const lastId = sqliteParams[0]; // Our PKs are UUIDs passed as first param
          db.get(`SELECT * FROM ${tableName} WHERE id = ?`, [lastId], (err2, row) => {
            if (err2) return reject(err2);
            resolve({ rows: row ? [mapRow(row)] : [] });
          });
        });
      } else if ((upperSQL.startsWith('UPDATE') || upperSQL.startsWith('DELETE')) && upperSQL.includes('RETURNING')) {
        const tableName = extractTableName(sqliteSQL);
        // Extract the WHERE id condition to re-fetch
        const withoutReturning = sqliteSQL.replace(/RETURNING\s+[\s\S]+$/i, '').trim();
        // Find the id param — it's usually the last or second-to-last param
        db.run(withoutReturning, sqliteParams, function (err) {
          if (err) return reject(err);
          // Try to find the affected row by the id param
          const idParam = sqliteParams.find((p, i) => {
            const isUUID = typeof p === 'string' && /^[0-9a-f-]{36}$/.test(p);
            return isUUID;
          });
          if (idParam) {
            db.get(`SELECT * FROM ${tableName} WHERE id = ?`, [idParam], (err2, row) => {
              if (err2) return reject(err2);
              resolve({ rows: row ? [mapRow(row)] : [] });
            });
          } else {
            resolve({ rows: [] });
          }
        });
      } else {
        db.run(sqliteSQL, sqliteParams, function (err) {
          if (err) return reject(err);
          resolve({ rows: [], rowCount: this.changes });
        });
      }
    });
  },
};

function extractTableName(sql) {
  // INSERT INTO table_name ...
  let m = sql.match(/INSERT\s+INTO\s+(\w+)/i);
  if (m) return m[1];
  // UPDATE table_name SET ...
  m = sql.match(/UPDATE\s+(\w+)\s+SET/i);
  if (m) return m[1];
  // DELETE FROM table_name ...
  m = sql.match(/DELETE\s+FROM\s+(\w+)/i);
  if (m) return m[1];
  return 'unknown';
}

function mapRow(row) {
  if (!row) return row;
  const mapped = { ...row };
  // Convert SQLite integers back to booleans for has_completed_intro
  if ('has_completed_intro' in mapped) {
    mapped.has_completed_intro = mapped.has_completed_intro === 1 || mapped.has_completed_intro === true;
  }
  return mapped;
}

module.exports = pool;
