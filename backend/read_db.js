const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('c:/Users/Eshwar/dev/FitForge-AI/fitness_platform.db');

db.serialize(() => {
  db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) {
      console.error(err);
      return;
    }
    
    let tableNames = tables.map(t => t.name).filter(n => n !== 'sqlite_sequence');
    let queriesCompleted = 0;
    
    if (tableNames.length === 0) {
        console.log("No tables found in the database.");
    }

    tableNames.forEach(tableName => {
      db.all(`SELECT * FROM ${tableName} LIMIT 5`, (err, rows) => {
        if (err) {
          console.error(err);
        } else {
          console.log(`\n=== Table: ${tableName} ===`);
          console.log(JSON.stringify(rows, null, 2));
        }
        
        queriesCompleted++;
        if (queriesCompleted === tableNames.length) {
            db.close();
        }
      });
    });
  });
});
