const { v4: uuidv4 } = require('uuid');
const { z } = require('zod');
const pool = require('../../config/db');

const SessionSchema = z.object({
    user_id: z.string().uuid(),
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
    user_id: z.string().uuid(),
    joint_angles: z.record(z.number()),
    errors: z.array(z.string()),
    rep_scores: z.array(z.number().min(0).max(100)),
});

const ingestSession = async (req, res, next) => {
    try {
        const data = SessionSchema.parse(req.body);
        const id = uuidv4();
        await pool.query(
            `INSERT INTO machine_sessions (id, user_id, machine_id, exercise_name, rep_count, resistance_kg, time_under_tension_s, duration_s, timestamp)
       VALUES (?,?,?,?,?,?,?,?,?)`,
            [
                id, data.user_id, data.machine_id, data.exercise_name,
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
        const id = uuidv4();
        await pool.query(
            `INSERT INTO form_analyses (id, session_id, user_id, joint_angles_json, errors_json, avg_form_score, rep_scores_json)
       VALUES (?,?,?,?,?,?,?)`,
            [
                id, data.session_id, data.user_id,
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
        const result = await pool.query(
            `SELECT ms.*, fa.avg_form_score, fa.errors_json
       FROM machine_sessions ms
       LEFT JOIN form_analyses fa ON fa.session_id = ms.id
       WHERE ms.user_id = ?
       ORDER BY ms.timestamp DESC LIMIT ? OFFSET ?`,
            [req.user.userId, limit, offset]
        );
        res.json({ sessions: result.rows, limit, offset });
    } catch (err) {
        next(err);
    }
};

module.exports = { ingestSession, ingestFormData, getSessions };
