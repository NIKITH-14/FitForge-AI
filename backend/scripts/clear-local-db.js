/**
 * DEV-ONLY: Local SQLite Database Cleanup Script
 * 
 * Usage: node scripts/clear-local-db.js
 * 
 * Purpose: This script surgically deletes all rows from application tables
 *          in the local SQLite database to reset the environment for fresh testing.
 *          It PRESERVES the schema and table structures.
 *          It does NOT drop tables.
 *          
 * WARNING: This is destructive. It should only be used in local development!
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Path to the dev database (root of FitForge-AI project, next to package.json)
const DB_PATH = path.join(__dirname, '../../../fitness_platform.db');

if (!fs.existsSync(DB_PATH)) {
    console.error(`[ERROR] Database not found at ${DB_PATH}`);
    process.exit(1);
}

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('[ERROR] Failed to connect to local database:', err.message);
        process.exit(1);
    }
    console.log('[INFO] Connected to DEV database at:', DB_PATH);
});

// The order of tables isn't strictly necessary for SQLite DELETE without PRAGMA foreign_keys=ON blocking,
// but we do it in a logical dependency order just in case.
const TABLES_TO_CLEAR = [
    'machine_accounts',
    'ai_recommendations',
    'form_analyses',
    'machine_sessions',
    'workout_plans',
    'food_logs',
    'nutrition_targets',
    'guest_sessions',
    'bmi_records',
    'profiles',
    'users' // Deleted last since others depend on user_id
];

console.log('[WARNING] Initiating clean slate wipe of all data rows from development database...');

db.serialize(() => {
    // Temporarily turn off foreign keys to allow bulk wiping without constraint errors
    db.run('PRAGMA foreign_keys = OFF');
    db.run('BEGIN TRANSACTION');

    let queriesCompleted = 0;
    
    TABLES_TO_CLEAR.forEach((tableName) => {
        db.run(`DELETE FROM ${tableName}`, function(err) {
            if (err) {
                console.error(`[ERROR] Failed to wipe table ${tableName}:`, err.message);
                db.run('ROLLBACK');
                process.exit(1);
            } else {
                console.log(`[OK] Cleared ${this.changes} row(s) from ${tableName}`);
            }
            
            queriesCompleted++;
            if (queriesCompleted === TABLES_TO_CLEAR.length) {
                db.run('COMMIT', (commitErr) => {
                    if (commitErr) {
                         console.error('[ERROR] Failed to commit changes.');
                    } else {
                         console.log('\n[SUCCESS] Local database reset complete. All schemas preserved.');
                    }
                    db.run('PRAGMA foreign_keys = ON'); // restore
                    db.close();
                });
            }
        });
    });
});
