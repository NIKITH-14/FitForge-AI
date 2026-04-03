const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, '../fitness_platform.db');
const db = new sqlite3.Database(dbPath);

console.log('Inspecting DB:', dbPath);

db.all("SELECT name FROM sqlite_master WHERE type='table';", [], (err, tables) => {
    if (err) throw err;
    let pending = tables.length;
    tables.forEach(table => {
        db.all(`PRAGMA table_info(${table.name});`, [], (err, cols) => {
            if (err) throw err;
            console.log(`TABLE ${table.name}: ${cols.map(c => c.name).join(', ')}`);
            pending--;
            if (pending === 0) {
                db.all("SELECT COUNT(*) as c FROM profiles", (err, res) => {
                    console.log(`\nProfiles count: ${res[0].c}`);
                    db.close();
                });
            }
        });
    });
});
