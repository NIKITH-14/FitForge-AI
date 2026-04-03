const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../fitness_platform.db');
const db = new sqlite3.Database(DB_PATH);

const tables = [
  'bmi_records',
  'nutrition_targets',
  'workout_plans',
  'machine_sessions',
  'form_analyses',
  'ai_recommendations',
  'food_logs'
];

db.serialize(() => {
  tables.forEach(t => {
    db.run(`ALTER TABLE ${t} ADD COLUMN profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE`, (err) => {
      if (err) {
        console.log(`Column profile_id might already exist in ${t} or error:`, err.message);
      } else {
        console.log(`Added profile_id to ${t}`);
      }
    });
  });
});

db.close();
