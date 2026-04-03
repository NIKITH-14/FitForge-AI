const bcrypt = require('bcryptjs');
const { randomUUID: uuidv4 } = require('crypto');
const { z } = require('zod');
const pool = require('../../config/db');
const { generateProfileToken } = require('../../config/jwt');

const ProfileSchema = z.object({
    name: z.string().min(2).max(100),
    avatar_emoji: z.string().optional(),
    pin: z.string().length(4).optional(),
    height_cm: z.number().min(50).max(300).optional(),
    weight_kg: z.number().min(20).max(500).optional(),
    age: z.number().min(12).max(120).optional(),
    gender: z.string().optional(),
    fitness_goal: z.enum(['strength', 'aesthetic', 'fat_loss']).optional()
});

const getProfileById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT id, name, avatar_emoji, height_cm, weight_kg, age, gender, fitness_goal, has_completed_onboarding, is_admin,
                    CASE WHEN pin_hash IS NOT NULL THEN true ELSE false END as has_pin, created_at
             FROM profiles WHERE id = ?`,
            [id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Profile not found' });
        res.json(result.rows[0]);
    } catch (err) {
        next(err);
    }
};

const getProfiles = async (req, res, next) => {
    try {
        // Must use Account token (req.user.userId)
        const result = await pool.query(
            `SELECT id, name, avatar_emoji, height_cm, weight_kg, age, gender, fitness_goal, has_completed_onboarding, is_admin,
                    CASE WHEN pin_hash IS NOT NULL THEN true ELSE false END as has_pin, created_at
             FROM profiles WHERE user_id = ? ORDER BY created_at ASC`,
            [req.user.userId]
        );
        res.json({ profiles: result.rows });
    } catch (err) {
        next(err);
    }
};

const createProfile = async (req, res, next) => {
    try {
        const data = ProfileSchema.parse(req.body);

        // Check how many profiles this user already has
        const existingProfiles = await pool.query('SELECT id FROM profiles WHERE user_id = ?', [req.user.userId]);
        const isFirstProfile = existingProfiles.rows.length === 0;

        // If this is NOT the first profile, require an existing admin profile
        if (!isFirstProfile) {
            const adminCheck = await pool.query('SELECT is_admin FROM profiles WHERE user_id = ? AND is_admin = 1', [req.user.userId]);
            if (adminCheck.rows.length === 0) {
                return res.status(403).json({ error: 'Only account admins can create profiles' });
            }
        }

        let pinHash = null;
        if (data.pin) {
            pinHash = await bcrypt.hash(data.pin, 10);
        }

        const profileId = uuidv4();
        // First profile is always admin
        const isAdmin = isFirstProfile ? 1 : 0;
        await pool.query(
            `INSERT INTO profiles (id, user_id, name, avatar_emoji, pin_hash, height_cm, weight_kg, age, gender, fitness_goal, is_admin)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                profileId, req.user.userId, data.name, data.avatar_emoji || '👤',
                pinHash, data.height_cm, data.weight_kg, data.age, data.gender, data.fitness_goal, isAdmin
            ]
        );

        const result = await pool.query(
            `SELECT id, name, avatar_emoji, height_cm, weight_kg, age, gender, fitness_goal, has_completed_onboarding, is_admin,
                    CASE WHEN pin_hash IS NOT NULL THEN true ELSE false END as has_pin, created_at
             FROM profiles WHERE id = ?`,
            [profileId]
        );

        res.status(201).json({ profile: result.rows[0] });
    } catch (err) {
        next(err);
    }
};

const updateProfile = async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = ProfileSchema.partial().parse(req.body);

        // Only the matched profile or the account admin can update a profile
        if (req.user.profile_id !== id) {
             const adminCheck = await pool.query('SELECT is_admin FROM profiles WHERE user_id = ? AND is_admin = 1', [req.user.userId]);
             if (adminCheck.rows.length === 0) {
                 return res.status(403).json({ error: 'Not authorized to update this profile' });
             }
        }

        const updates = [];
        const params = [];
        const allowedFields = ['name', 'avatar_emoji', 'height_cm', 'weight_kg', 'age', 'gender', 'fitness_goal'];

        allowedFields.forEach(field => {
            if (data[field] !== undefined) {
                updates.push(`${field} = ?`);
                params.push(data[field]);
            }
        });

        if (data.pin) {
            const pinHash = await bcrypt.hash(data.pin, 10);
            updates.push(`pin_hash = ?`);
            params.push(pinHash);
        } else if (data.pin === null) {
            // allows removing a pin if null is passed explicitly
            updates.push(`pin_hash = NULL`);
        }

        // Auto-complete onboarding if stats and goal are present
        if (data.fitness_goal && data.height_cm && data.weight_kg && data.age) {
            updates.push(`has_completed_onboarding = 1`);
        }

        if (updates.length > 0) {
            const sql = `UPDATE profiles SET ${updates.join(', ')} WHERE id = ? RETURNING *`;
            params.push(id);
            await pool.query(sql, params);
        }

        const result = await pool.query(
            `SELECT id, name, avatar_emoji, height_cm, weight_kg, age, gender, fitness_goal, has_completed_onboarding, is_admin,
                    CASE WHEN pin_hash IS NOT NULL THEN true ELSE false END as has_pin, created_at
             FROM profiles WHERE id = ?`,
            [id]
        );

        if (result.rows.length === 0) {
             return res.status(404).json({ error: 'Profile not found' });
        }

        const updatedProfile = result.rows[0];

        // Issue fresh Profile-scoped JWT so client stops caching older state
        const profileTokenPayload = {
            userId: updatedProfile.user_id,
            profile_id: updatedProfile.id,
            goal: updatedProfile.fitness_goal
        };
        const profileToken = generateProfileToken(profileTokenPayload);

        res.json({ profile: updatedProfile, profileToken });
    } catch (err) {
        next(err);
    }
};

const deleteProfile = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        // Verify user is account admin
        const adminCheck = await pool.query('SELECT is_admin FROM profiles WHERE user_id = ? AND is_admin = 1', [req.user.userId]);
        if (adminCheck.rows.length === 0) {
             return res.status(403).json({ error: 'Only account admins can delete profiles' });
        }

        const targetProfile = await pool.query('SELECT is_admin FROM profiles WHERE id = ?', [id]);
        if (targetProfile.rows.length === 0) {
             return res.status(404).json({ error: 'Profile not found' });
        }
        if (targetProfile.rows[0].is_admin === 1) {
             return res.status(400).json({ error: 'Cannot delete the admin profile' });
        }

        await pool.query('DELETE FROM profiles WHERE id = ? AND user_id = ?', [id, req.user.userId]);
        res.json({ message: 'Profile deleted successfully' });
    } catch (err) {
        next(err);
    }
};

const selectProfile = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        // Look up by profile ID only — any authenticated account can select any profile shown on this machine
        const result = await pool.query('SELECT * FROM profiles WHERE id = ?', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Profile not found' });
        
        const profile = result.rows[0];

        // If a pin is required, the user must call verify-pin instead
        if (profile.pin_hash) {
             return res.status(403).json({ error: 'PIN required. Call /verify-pin first.', requires_pin: true });
        }

        // Issue Profile-scoped JWT
        const profileTokenPayload = {
            userId: profile.user_id,
            profile_id: profile.id,
            goal: profile.fitness_goal
        };
        const profileToken = generateProfileToken(profileTokenPayload);

        res.json({ profileToken, profile });
    } catch (err) {
        next(err);
    }
};

const verifyPin = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { pin } = req.body;
        
        if (!pin) return res.status(400).json({ error: 'PIN is required' });

        // Look up by profile ID only — any authenticated account can verify a PIN
        const result = await pool.query('SELECT * FROM profiles WHERE id = ?', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Profile not found' });
        
        const profile = result.rows[0];

        if (!profile.pin_hash) {
            return res.status(400).json({ error: 'Profile does not have a PIN set' });
        }

        const valid = await bcrypt.compare(pin, profile.pin_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid PIN' });
        }

        // Issue Profile-scoped JWT
        const profileTokenPayload = {
            userId: profile.user_id,
            profile_id: profile.id,
            goal: profile.fitness_goal
        };
        const profileToken = generateProfileToken(profileTokenPayload);

        res.json({ profileToken, profile });
    } catch (err) {
        next(err);
    }
};

module.exports = { getProfileById, getProfiles, createProfile, updateProfile, deleteProfile, selectProfile, verifyPin };
