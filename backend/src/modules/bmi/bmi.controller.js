const { randomUUID: uuidv4 } = require('crypto');
const pool = require('../../config/db');

const calculateBMIData = (weight_kg, height_cm, age, gender) => {
    const height_m = height_cm / 100;
    const bmi = weight_kg / (height_m * height_m);

    let category;
    if (bmi < 18.5) category = 'Underweight';
    else if (bmi < 25) category = 'Normal';
    else if (bmi < 30) category = 'Overweight';
    else category = 'Obese';

    const ideal_weight_kg = gender === 'male'
        ? 50 + 2.3 * ((height_cm / 2.54 - 60))
        : 45.5 + 2.3 * ((height_cm / 2.54 - 60));

    const healthy_bmi_range = { min: 18.5, max: 24.9 };
    const healthy_weight_range = {
        min: parseFloat((18.5 * height_m * height_m).toFixed(1)),
        max: parseFloat((24.9 * height_m * height_m).toFixed(1)),
    };

    const bmr = gender === 'male'
        ? 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
        : 10 * weight_kg + 6.25 * height_cm - 5 * age - 161;

    const tdee = bmr * 1.55;

    return {
        bmi: parseFloat(bmi.toFixed(2)),
        category,
        ideal_weight_kg: parseFloat(ideal_weight_kg.toFixed(1)),
        healthy_bmi_range,
        healthy_weight_range,
        bmr: parseFloat(bmr.toFixed(0)),
        tdee: parseFloat(tdee.toFixed(0)),
    };
};

const getBMI = async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT b.*, p.height_cm, p.weight_kg, p.age, p.gender, p.fitness_goal
       FROM bmi_records b JOIN profiles p ON p.id = b.profile_id
       WHERE b.profile_id = ? ORDER BY b.recorded_at DESC LIMIT 1`,
            [req.user.profile_id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No BMI record found. Please complete onboarding.' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        next(err);
    }
};

const calculateAndSaveBMI = async (req, res, next) => {
    try {
        const user = await pool.query(
            'SELECT user_id, height_cm, weight_kg, age, gender, fitness_goal FROM profiles WHERE id = ?',
            [req.user.profile_id]
        );
        if (user.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        const { user_id, height_cm, weight_kg, age, gender, fitness_goal } = user.rows[0];
        if (!height_cm || !weight_kg || !age || !gender) {
            return res.status(400).json({ error: 'Complete your profile first (height, weight, age, gender)' });
        }

        const data = calculateBMIData(weight_kg, height_cm, age, gender);

        let goalSuggestion;
        if (fitness_goal === 'fat_loss') goalSuggestion = 'Your fat loss goal is ideal for reducing to a healthy BMI range.';
        else if (fitness_goal === 'strength') goalSuggestion = 'Strength training will help build lean mass and improve body composition.';
        else goalSuggestion = 'Aesthetic training will shape and define your physique toward your ideal weight.';

        const id = uuidv4();
        await pool.query(
            `INSERT INTO bmi_records (id, user_id, profile_id, bmi, category, ideal_weight_kg) VALUES (?,?,?,?,?,?)`,
            [id, user_id, req.user.profile_id, data.bmi, data.category, data.ideal_weight_kg]
        );

        res.json({ ...data, goal_suggestion: goalSuggestion, fitness_goal });
    } catch (err) {
        next(err);
    }
};

module.exports = { getBMI, calculateAndSaveBMI, calculateBMIData };
