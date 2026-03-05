const { z } = require('zod');
const pool = require('../../config/db');

const OnboardSchema = z.object({
    name: z.string().min(2).optional(),
    height_cm: z.number().min(100).max(250),
    weight_kg: z.number().min(30).max(300),
    age: z.number().int().min(10).max(100),
    gender: z.enum(['male', 'female']),
    fitness_goal: z.enum(['strength', 'aesthetic', 'fat_loss']),
});

const getMe = async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT id, name, email, height_cm, weight_kg, age, gender, fitness_goal, has_completed_intro, created_at
       FROM users WHERE id = ?`,
            [req.user.userId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(result.rows[0]);
    } catch (err) {
        next(err);
    }
};

const onboard = async (req, res, next) => {
    try {
        const data = OnboardSchema.parse(req.body);
        const params = [data.height_cm, data.weight_kg, data.age, data.gender, data.fitness_goal];
        let sql;
        if (data.name) {
            sql = `UPDATE users SET height_cm=?, weight_kg=?, age=?, gender=?, fitness_goal=?, name=?, updated_at=datetime('now') WHERE id=?`;
            params.push(data.name, req.user.userId);
        } else {
            sql = `UPDATE users SET height_cm=?, weight_kg=?, age=?, gender=?, fitness_goal=?, updated_at=datetime('now') WHERE id=?`;
            params.push(req.user.userId);
        }
        await pool.query(sql, params);
        const result = await pool.query(
            'SELECT id, name, email, height_cm, weight_kg, age, gender, fitness_goal, has_completed_intro FROM users WHERE id = ?',
            [req.user.userId]
        );
        res.json(result.rows[0]);
    } catch (err) {
        next(err);
    }
};

const markIntroComplete = async (req, res, next) => {
    try {
        await pool.query('UPDATE users SET has_completed_intro = 1 WHERE id = ?', [req.user.userId]);
        res.json({ message: 'Onboarding video marked as watched' });
    } catch (err) {
        next(err);
    }
};

module.exports = { getMe, onboard, markIntroComplete };
