const { randomUUID: uuidv4 } = require('crypto');
const pool = require('../../config/db');

const EXERCISE_LIBRARY = {
    strength: [
        { name: 'Barbell Squat', muscle_group: 'Legs' },
        { name: 'Bench Press', muscle_group: 'Chest' },
        { name: 'Deadlift', muscle_group: 'Back' },
        { name: 'Overhead Press', muscle_group: 'Shoulders' },
        { name: 'Barbell Row', muscle_group: 'Back' },
        { name: 'Romanian Deadlift', muscle_group: 'Hamstrings' },
        { name: 'Weighted Pull-Up', muscle_group: 'Back' },
        { name: 'Dips', muscle_group: 'Chest/Triceps' },
    ],
    aesthetic: [
        { name: 'Incline Dumbbell Press', muscle_group: 'Chest' },
        { name: 'Cable Flyes', muscle_group: 'Chest' },
        { name: 'Leg Press', muscle_group: 'Quads' },
        { name: 'Leg Curl', muscle_group: 'Hamstrings' },
        { name: 'Lateral Raises', muscle_group: 'Shoulders' },
        { name: 'Bicep Curls', muscle_group: 'Arms' },
        { name: 'Tricep Pushdown', muscle_group: 'Arms' },
        { name: 'Lat Pulldown', muscle_group: 'Back' },
        { name: 'Cable Row', muscle_group: 'Back' },
        { name: 'Bulgarian Split Squat', muscle_group: 'Legs' },
    ],
    fat_loss: [
        { name: 'Kettlebell Swing', muscle_group: 'Full Body' },
        { name: 'Box Jump', muscle_group: 'Legs/Cardio' },
        { name: 'Battle Ropes', muscle_group: 'Full Body' },
        { name: 'Goblet Squat', muscle_group: 'Legs' },
        { name: 'Mountain Climbers', muscle_group: 'Core/Cardio' },
        { name: 'Burpees', muscle_group: 'Full Body' },
        { name: 'Jump Lunges', muscle_group: 'Legs' },
        { name: 'Row Machine Sprint', muscle_group: 'Cardio' },
        { name: 'Plank', muscle_group: 'Core' },
        { name: 'Push-Up Variations', muscle_group: 'Chest/Triceps' },
    ],
};

const PLAN_PARAMS = {
    strength: { reps: '4-6', sets: 5, rest_s: 180, days: 4, duration_min: 60, style: 'Linear Progression' },
    aesthetic: { reps: '8-12', sets: 4, rest_s: 90, days: 5, duration_min: 55, style: 'Hypertrophy' },
    fat_loss: { reps: '15-20', sets: 3, rest_s: 45, days: 5, duration_min: 45, style: 'Circuit / HIIT' },
};

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const generatePlanLogic = (goal, weight_kg) => {
    const params = PLAN_PARAMS[goal];
    const exercises = EXERCISE_LIBRARY[goal];
    const days = DAY_NAMES.slice(0, params.days);
    const schedule = {};
    const exPerDay = Math.ceil(exercises.length / params.days);

    days.forEach((day, i) => {
        schedule[day] = exercises.slice(i * exPerDay, (i + 1) * exPerDay).map((ex) => ({
            exercise: ex.name,
            muscle_group: ex.muscle_group,
            sets: params.sets,
            reps: params.reps,
            rest_s: params.rest_s,
        }));
    });

    return {
        goal,
        style: params.style,
        days_per_week: params.days,
        estimated_duration_min: params.duration_min,
        schedule,
    };
};

const getWorkoutPlan = async (req, res, next) => {
    try {
        const result = await pool.query(
            'SELECT * FROM workout_plans WHERE profile_id = ? ORDER BY created_at DESC LIMIT 1',
            [req.user.profile_id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No plan found. Please generate one.' });
        }
        const row = result.rows[0];
        // Parse plan_json if stored as string
        if (typeof row.plan_json === 'string') {
            try { row.plan_json = JSON.parse(row.plan_json); } catch (e) { }
        }
        res.json(row);
    } catch (err) {
        next(err);
    }
};

const generateWorkoutPlan = async (req, res, next) => {
    try {
        const user = await pool.query(
            'SELECT user_id, fitness_goal, weight_kg FROM profiles WHERE id = ?',
            [req.user.profile_id]
        );
        if (!user.rows[0]?.fitness_goal) {
            return res.status(400).json({ error: 'Complete onboarding first to generate a plan.' });
        }
        const { user_id, fitness_goal, weight_kg } = user.rows[0];
        const plan = generatePlanLogic(fitness_goal, weight_kg);
        const id = uuidv4();
        await pool.query(
            `INSERT INTO workout_plans (id, user_id, profile_id, goal, days_per_week, plan_json) VALUES (?,?,?,?,?,?)`,
            [id, user_id, req.user.profile_id, fitness_goal, plan.days_per_week, JSON.stringify(plan)]
        );
        const result = await pool.query('SELECT * FROM workout_plans WHERE id = ?', [id]);
        const row = result.rows[0];
        if (typeof row.plan_json === 'string') {
            try { row.plan_json = JSON.parse(row.plan_json); } catch (e) { }
        }
        res.status(201).json(row);
    } catch (err) {
        next(err);
    }
};

module.exports = { getWorkoutPlan, generateWorkoutPlan };
