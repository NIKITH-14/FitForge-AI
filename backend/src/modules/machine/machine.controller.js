const { randomUUID: uuidv4 } = require('crypto');
const { z } = require('zod');
const pool = require('../../config/db');

// Add boot flow validation
const BootSchema = z.object({
    // Only relies on the header being present, no body required currently
});

const SessionSchema = z.object({
    profile_id: z.string().uuid(),
    machine_id: z.string(),
    exercise_name: z.string(),
    rep_count: z.number().int().min(0),
    resistance_kg: z.number().min(0),
    time_under_tension_s: z.number().min(0).optional().default(0),
    duration_s: z.number().int().min(0),
    timestamp: z.string().datetime().optional(),
});

const FormDataSchema = z.object({
    session_id: z.string().uuid(),
    profile_id: z.string().uuid(),
    joint_angles: z.record(z.number()),
    errors: z.array(z.string()),
    rep_scores: z.array(z.number().min(0).max(100)),
});

const bootMachine = async (req, res, next) => {
    try {
        // Authenticated via authenticateMachine middleware (x-machine-token)

        // TODO (Phase 2):
        // bootMachine currently returns all non-guest profiles across all accounts
        // to support shared single-machine / kiosk behavior.
        //
        // In a future multi-machine / multi-account deployment, machine tokens should
        // be explicitly associated with a specific account or gym location so that
        // each machine only loads the profiles intended for that machine.
        //
        // Do NOT keep this global profile loading logic once per-account machine
        // scoping is introduced.

        // Return all persistent profiles from all accounts.
        // Guest sessions are stored in a separate `guest_sessions` table
        // and are never included here.
        const profilesResult = await pool.query(
            `SELECT id, name, avatar_emoji, has_completed_onboarding, fitness_goal, is_admin,
                    CASE WHEN pin_hash IS NOT NULL THEN true ELSE false END as requires_pin
             FROM profiles
             ORDER BY created_at ASC`
        );

        res.json({
            profiles: profilesResult.rows
        });
    } catch (err) {
        next(err);
    }
};

const ingestSession = async (req, res, next) => {
    try {
        const data = SessionSchema.parse(req.body);
        
        // Fetch user_id from profile since the machine data is now tied directly to profile
        const profileResult = await pool.query('SELECT user_id FROM profiles WHERE id = ?', [data.profile_id]);
        if (profileResult.rows.length === 0) {
            return res.status(404).json({ error: 'Profile not found' });
        }
        const user_id = profileResult.rows[0].user_id;

        const id = uuidv4();
        await pool.query(
            `INSERT INTO machine_sessions (id, user_id, profile_id, machine_id, exercise_name, rep_count, resistance_kg, time_under_tension_s, duration_s, timestamp)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
            [
                id, user_id, data.profile_id, data.machine_id, data.exercise_name,
                data.rep_count, data.resistance_kg, data.time_under_tension_s,
                data.duration_s, data.timestamp || new Date().toISOString(),
            ]
        );
        const result = await pool.query('SELECT * FROM machine_sessions WHERE id = ?', [id]);
        res.status(201).json({ session: result.rows[0] });
    } catch (err) {
        next(err);
    }
};

const ingestFormData = async (req, res, next) => {
    try {
        const data = FormDataSchema.parse(req.body);
        const avg_form_score = data.rep_scores.length > 0
            ? data.rep_scores.reduce((a, b) => a + b, 0) / data.rep_scores.length
            : 0;
            
        // Fetch user_id from profile
        const profileResult = await pool.query('SELECT user_id FROM profiles WHERE id = ?', [data.profile_id]);
        if (profileResult.rows.length === 0) {
            return res.status(404).json({ error: 'Profile not found' });
        }
        const user_id = profileResult.rows[0].user_id;

        const id = uuidv4();
        await pool.query(
            `INSERT INTO form_analyses (id, session_id, user_id, profile_id, joint_angles_json, errors_json, avg_form_score, rep_scores_json)
       VALUES (?,?,?,?,?,?,?,?)`,
            [
                id, data.session_id, user_id, data.profile_id,
                JSON.stringify(data.joint_angles), JSON.stringify(data.errors),
                parseFloat(avg_form_score.toFixed(2)), JSON.stringify(data.rep_scores),
            ]
        );
        const result = await pool.query('SELECT * FROM form_analyses WHERE id = ?', [id]);
        res.status(201).json({ form_analysis: result.rows[0] });
    } catch (err) {
        next(err);
    }
};

const getSessions = async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit || '20');
        const offset = parseInt(req.query.offset || '0');
        // Fetch scoped to profile_id, not userId
        const result = await pool.query(
            `SELECT ms.*, fa.avg_form_score, fa.errors_json
       FROM machine_sessions ms
       LEFT JOIN form_analyses fa ON fa.session_id = ms.id
       WHERE ms.profile_id = ?
       ORDER BY ms.timestamp DESC LIMIT ? OFFSET ?`,
            [req.user.profile_id, limit, offset]
        );
        res.json({ sessions: result.rows, limit, offset });
    } catch (err) {
        next(err);
    }
};

module.exports = { bootMachine, ingestSession, ingestFormData, getSessions };
