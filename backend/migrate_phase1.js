const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, '../fitness_platform.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('[Migration] Failed to open SQLite database:', err.message);
        process.exit(1);
    }
    console.log('[Migration] Connected to SQLite at', DB_PATH);
});

db.serialize(() => {
    // 1. Create new tables
    console.log('[Migration] Creating new tables...');

    db.run(`
        CREATE TABLE IF NOT EXISTS profiles (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            avatar_emoji TEXT,
            pin_hash TEXT,
            height_cm REAL,
            weight_kg REAL,
            age INTEGER,
            gender TEXT,
            fitness_goal TEXT CHECK(fitness_goal IN ('strength','aesthetic','fat_loss')),
            has_completed_onboarding INTEGER NOT NULL DEFAULT 0,
            is_admin INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS machine_accounts (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            machine_token_hash TEXT NOT NULL,
            machine_label TEXT,
            registered_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS guest_sessions (
            id TEXT PRIMARY KEY,
            machine_id TEXT,
            temp_data_json TEXT,
            expires_at TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    `);

    // 2. Helper to safely add columns conditionally
    const safeAddColumn = (table, columnDef, callback) => {
        db.all(`PRAGMA table_info(${table})`, (err, columns) => {
            if (err) return console.error(`[Migration] Error checking ${table}:`, err.message);
            const columnName = columnDef.split(' ')[0];
            const exists = columns.some(col => col.name === columnName);
            if (!exists) {
                db.run(`ALTER TABLE ${table} ADD COLUMN ${columnDef}`, (err) => {
                    if (err) console.error(`[Migration] Failed adding ${columnName} to ${table}:`, err.message);
                    else console.log(`[Migration] Added ${columnName} to ${table}`);
                    if (callback) callback();
                });
            } else {
                console.log(`[Migration] Column ${columnName} already exists in ${table}, skipping.`);
                if (callback) callback();
            }
        });
    };

    // 3. Add new columns to existing tables
    console.log('\n[Migration] Ensuring profile_id columns exist...');
    
    safeAddColumn('bmi_records', 'profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE');
    safeAddColumn('nutrition_targets', 'profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE');
    safeAddColumn('nutrition_targets', 'is_active INTEGER DEFAULT 1');
    safeAddColumn('workout_plans', 'profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE');
    safeAddColumn('workout_plans', 'week_start_date TEXT');
    safeAddColumn('machine_sessions', 'profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE');
    safeAddColumn('form_analyses', 'profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE');
    safeAddColumn('ai_recommendations', 'profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE');
    safeAddColumn('food_logs', 'profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE');

    // 4. Migrate existing users into profiles
    setTimeout(() => {
        console.log('\n[Migration] Migrating existing users to their default admin profiles...');
        db.all(`SELECT * FROM users`, (err, users) => {
            if (err) return console.error('[Migration] Failed to fetch users:', err.message);

            if (users.length === 0) {
                console.log('[Migration] No users to migrate. Finished.');
                return db.close();
            }

            db.serialize(() => {
                db.run('BEGIN TRANSACTION');

                let pendingUsers = users.length;
                
                users.forEach(user => {
                    // Check if this user already has an admin profile to avoid duplicates on re-run
                    db.get(`SELECT id FROM profiles WHERE user_id = ? AND is_admin = 1`, [user.id], (err, row) => {
                        if (row) {
                            console.log(`[Migration] User ${user.email} already has a default profile. Skipping.`);
                            pendingUsers--;
                            if (pendingUsers === 0) finishMigration();
                            return;
                        }

                        // Create profile
                        const profileId = crypto.randomUUID();
                        db.run(`
                            INSERT INTO profiles (id, user_id, name, avatar_emoji, height_cm, weight_kg, age, gender, fitness_goal, has_completed_onboarding, is_admin)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                        `, [
                            profileId,
                            user.id,
                            user.name,
                            '👤',
                            user.height_cm,
                            user.weight_kg,
                            user.age,
                            user.gender,
                            user.fitness_goal,
                            user.has_completed_intro
                        ], function(err) {
                            if (err) {
                                console.error(`[Migration] Failed to insert profile for ${user.email}:`, err.message);
                                return;
                            }
                            console.log(`[Migration] Created default admin profile for ${user.email} -> Profile ID: ${profileId}`);

                            // Update corresponding tables with this new profile_id where user_id matches
                            const tablesToUpdate = [
                                'bmi_records', 'nutrition_targets', 'workout_plans', 
                                'machine_sessions', 'form_analyses', 'ai_recommendations', 'food_logs'
                            ];

                            tablesToUpdate.forEach(table => {
                                db.run(`UPDATE ${table} SET profile_id = ? WHERE user_id = ? AND profile_id IS NULL`, [profileId, user.id]);
                            });

                            pendingUsers--;
                            if (pendingUsers === 0) finishMigration();
                        });
                    });
                });

                function finishMigration() {
                    db.run('COMMIT');
                    console.log('\n[Migration] Successfully completed data migration check.');
                    db.close();
                }
            });
        });
    }, 1500); // 1.5s delay to assure the PRAGMA ADD COLUMNs have finished
});
