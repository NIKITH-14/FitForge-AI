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

        // Any authenticated account user can create profiles under their own account.
        // The first profile created for an account is automatically marked as admin/owner.

        let pinHash = null;
        if (data.pin) {
            pinHash = await bcrypt.hash(data.pin, 10);
        }

        const profileId = uuidv4();
        // First profile is always admin/owner
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

        // ── Auth guard ─────────────────────────────────────────────────────────
        // This route is called with TWO possible token types:
        //
        //   1. accountToken (PUT /profiles/:id from profiles management or onboarding):
        //      The account token contains { userId } but NOT profile_id.
        //      We check that the target profile belongs to this account's userId.
        //      Additionally allow if the account has an admin profile (they can manage all).
        //
        //   2. profileToken (PUT /profiles/:id from onboarding flow in some cases):
        //      The profile token contains { userId, profile_id }.
        //      We check that req.user.profile_id === id (self-profile only).
        //
        // The `authenticate` middleware on this route only accepts account JWTs.
        // Profile tokens will fail at middleware level already. So in practice
        // req.user.userId is always set here. The profile_id check is defensive.
        // ──────────────────────────────────────────────────────────────────────

        const userId = req.user.userId;
        const tokenProfileId = req.user.profile_id; // undefined for account tokens

        let authorized = false;

        if (tokenProfileId) {
            // Profile-scoped token: only allow self-updates
            authorized = tokenProfileId === id;
        } else if (userId) {
            // Account-scoped token: check the target profile belongs to this account
            const ownerCheck = await pool.query(
                'SELECT id FROM profiles WHERE id = ? AND user_id = ?',
                [id, userId]
            );
            authorized = ownerCheck.rows.length > 0;
        }

        if (!authorized) {
            return res.status(403).json({ error: 'Not authorized to update this profile' });
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

        // Auto-complete onboarding if core stats and goal are all present
        if (data.fitness_goal && data.height_cm && data.weight_kg && data.age) {
            updates.push(`has_completed_onboarding = 1`);
        }

        if (updates.length > 0) {
            const sql = `UPDATE profiles SET ${updates.join(', ')} WHERE id = ?`;
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

        const targetProfile = await pool.query('SELECT is_admin, user_id FROM profiles WHERE id = ?', [id]);
        if (targetProfile.rows.length === 0) {
             return res.status(404).json({ error: 'Profile not found' });
        }
        // Block deletion of admin/owner profile
        if (targetProfile.rows[0].is_admin === 1) {
             return res.status(400).json({ error: 'Cannot delete the owner profile' });
        }
        // Block cross-account deletion
        if (targetProfile.rows[0].user_id !== req.user.userId) {
            return res.status(403).json({ error: 'Not authorized to delete this profile' });
        }

        await pool.query('DELETE FROM profiles WHERE id = ? AND user_id = ?', [id, req.user.userId]);
        res.json({ message: 'Profile deleted successfully' });
    } catch (err) {
        next(err);
    }
};

// ── deleteBulkProfiles ─────────────────────────────────────────────────────────
// Permanently deletes ALL non-admin/non-owner profiles belonging to the
// authenticated account's user_id.
//
// The owner profile (is_admin = 1) is ALWAYS preserved.
// This action is irreversible — all related records (bmi_records, nutrition_targets,
// workout_plans, etc.) are also deleted via DB CASCADE.
//
// Security: requires a valid account JWT (authenticate middleware).
// Returns: { deleted: number, message: string }
const deleteBulkProfiles = async (req, res, next) => {
    try {
        const userId = req.user.userId;

        // Verify the requester has an account with an admin profile
        const adminCheck = await pool.query(
            'SELECT id FROM profiles WHERE user_id = ? AND is_admin = 1',
            [userId]
        );
        if (adminCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Only account admins can perform bulk cleanup' });
        }

        // Fetch all non-admin profiles for this user
        const toDelete = await pool.query(
            'SELECT id FROM profiles WHERE user_id = ? AND is_admin = 0',
            [userId]
        );

        if (toDelete.rows.length === 0) {
            return res.json({ deleted: 0, message: 'No non-owner profiles to delete' });
        }

        // Delete all non-admin profiles for this account
        // Related rows (bmi_records, workout_plans, etc.) are removed via CASCADE
        await pool.query(
            'DELETE FROM profiles WHERE user_id = ? AND is_admin = 0',
            [userId]
        );

        res.json({
            deleted: toDelete.rows.length,
            message: `${toDelete.rows.length} profile(s) permanently deleted. Owner profile preserved.`
        });
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

module.exports = {
    getProfileById,
    getProfiles,
    createProfile,
    updateProfile,
    deleteProfile,
    deleteBulkProfiles,
    selectProfile,
    verifyPin,
};
