const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.resolve(__dirname, '../fitness_platform.db');
const backupPath = path.resolve(__dirname, '../fitness_platform_backup_' + Date.now() + '.db');

// Backup DB
fs.copyFileSync(dbPath, backupPath);
console.log('✅ Created DB backup at:', backupPath);

const db = new sqlite3.Database(dbPath);

const tablesToClean = [
    'workout_plans',
    'bmi_records',
    'ai_recommendations',
    'food_logs',
    'nutrition_targets',
    'form_analyses',
    'machine_sessions',
    'profiles' // MUST BE LAST due to foreign keys if they are enforced
];

let report = {};

db.serialize(() => {
    // Optionally enable foreign keys but we are targeting cascade-like behavior manually
    db.run("PRAGMA foreign_keys = ON;");

    tablesToClean.forEach(table => {
        db.run(`DELETE FROM ${table}`, function(err) {
            if (err) {
                console.error(`❌ Error clearing ${table}:`, err.message);
            } else {
                report[table] = this.changes;
                console.log(`✅ Cleared ${table}: ${this.changes} rows deleted`);
            }
        });
    });
});

db.close((err) => {
    if (err) throw err;
    console.log('\n--- CLEANUP COMPLETE ---');
    console.log(JSON.stringify(report, null, 2));
    console.log('All profile data manually wiped from the database.');
});
