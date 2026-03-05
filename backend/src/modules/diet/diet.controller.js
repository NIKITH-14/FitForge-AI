const { v4: uuidv4 } = require('uuid');
const pool = require('../../config/db');

const generateDietPlan = async (req, res, next) => {
    try {
        const user = await pool.query(
            'SELECT height_cm, weight_kg, age, gender, fitness_goal FROM users WHERE id = ?',
            [req.user.userId]
        );
        if (!user.rows[0]?.height_cm) {
            return res.status(400).json({ error: 'Complete your profile onboarding first.' });
        }
        const { height_cm, weight_kg, age, gender, fitness_goal } = user.rows[0];

        // BMR - Mifflin-St Jeor
        const bmr = gender === 'male'
            ? 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
            : 10 * weight_kg + 6.25 * height_cm - 5 * age - 161;

        const tdee = parseFloat((bmr * 1.55).toFixed(0));

        let daily_calories;
        if (fitness_goal === 'fat_loss') daily_calories = tdee - 500;
        else if (fitness_goal === 'strength') daily_calories = tdee + 200;
        else daily_calories = tdee;

        const protein_g = parseFloat((weight_kg * 2.0).toFixed(1));
        const fat_g = parseFloat(((daily_calories * 0.25) / 9).toFixed(1));
        const protein_cals = protein_g * 4;
        const fat_cals = fat_g * 9;
        const carbs_g = parseFloat(((daily_calories - protein_cals - fat_cals) / 4).toFixed(1));

        // SQLite UPSERT: check if exists first, then insert or update
        const existing = await pool.query('SELECT id FROM nutrition_targets WHERE user_id = ?', [req.user.userId]);
        let result;
        if (existing.rows.length > 0) {
            await pool.query(
                `UPDATE nutrition_targets SET bmr=?, tdee=?, daily_calories=?, protein_g=?, fat_g=?, carbs_g=?, created_at=datetime('now') WHERE user_id=?`,
                [parseFloat(bmr.toFixed(0)), tdee, parseFloat(daily_calories.toFixed(0)), protein_g, fat_g, carbs_g, req.user.userId]
            );
            result = await pool.query('SELECT * FROM nutrition_targets WHERE user_id = ?', [req.user.userId]);
        } else {
            const id = uuidv4();
            await pool.query(
                `INSERT INTO nutrition_targets (id, user_id, bmr, tdee, daily_calories, protein_g, fat_g, carbs_g) VALUES (?,?,?,?,?,?,?,?)`,
                [id, req.user.userId, parseFloat(bmr.toFixed(0)), tdee, parseFloat(daily_calories.toFixed(0)), protein_g, fat_g, carbs_g]
            );
            result = await pool.query('SELECT * FROM nutrition_targets WHERE id = ?', [id]);
        }

        res.status(201).json({
            ...result.rows[0],
            fitness_goal,
            adjustment_note:
                fitness_goal === 'fat_loss' ? '500 calorie deficit for ~0.5kg/week loss'
                    : fitness_goal === 'strength' ? '200 calorie surplus for lean muscle gain'
                        : 'Maintenance calories for body recomposition',
        });
    } catch (err) {
        next(err);
    }
};

const getDietPlan = async (req, res, next) => {
    try {
        const result = await pool.query(
            'SELECT * FROM nutrition_targets WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
            [req.user.userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No diet plan found. Please generate one.' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        next(err);
    }
};

module.exports = { generateDietPlan, getDietPlan };
