const pool = require('../src/config/db');
const fs = require('fs');
const path = require('path');

const runMigration = async () => {
    try {
        const sql = fs.readFileSync(path.join(__dirname, '001_initial_schema.sql'), 'utf-8');
        await pool.query(sql);
        console.log('[Migration] Schema applied successfully');
        process.exit(0);
    } catch (err) {
        console.error('[Migration] Failed:', err.message);
        process.exit(1);
    }
};

runMigration();
