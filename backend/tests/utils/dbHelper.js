const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

let db;

/**
 * Creates an entirely fresh in-memory SQLite database matching the production schema.
 * Replaces the pool.query implementation with this in-memory instance for tests.
 */
const initTestDb = async () => {
    db = new sqlite3.Database(':memory:');
    
    // We execute the phase 1 migration script's schema directly.
    const schemaPath = path.join(__dirname, '../../migrations/schema.txt');
    // Using simple literal creation here for reliability in tests:
    const schema = `
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT NOT NULL,
            fitness_goal TEXT,
            gender TEXT,
            height_cm REAL,
            weight_kg REAL,
            age INTEGER,
            has_completed_intro BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS profiles (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            avatar_emoji TEXT,
            pin_hash TEXT,
            fitness_goal TEXT,
            gender TEXT,
            height_cm REAL,
            weight_kg REAL,
            age INTEGER,
            has_completed_onboarding BOOLEAN DEFAULT 0,
            is_guest BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS nutrition_targets (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            profile_id TEXT NOT NULL,
            bmr REAL,
            tdee REAL,
            daily_calories REAL,
            protein_g REAL,
            fat_g REAL,
            carbs_g REAL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (profile_id) REFERENCES profiles(id)
        );
    `;

    return new Promise((resolve, reject) => {
        db.exec(schema, (err) => {
            if (err) return reject(err);
            resolve();
        });
    });
};

/**
 * Returns a mock pool.query function that queries the in-memory db.
 */
const getMockPoolQuery = () => {
    return (sql, params = []) => {
        return new Promise((resolve, reject) => {
            // Very simple mapping of pg-style / async query interface to sqlite callback
            const action = sql.trim().toLowerCase().startsWith('select') ? 'all' : 'run';
            db[action](sql, params, function (err, rows) {
                if (err) return reject(err);
                if (action === 'all') resolve({ rows });
                else resolve({ rows: [], lastID: this.lastID, changes: this.changes });
            });
        });
    };
};

const closeTestDb = () => {
    if (db) {
        db.close();
    }
};

module.exports = { initTestDb, getMockPoolQuery, closeTestDb };
