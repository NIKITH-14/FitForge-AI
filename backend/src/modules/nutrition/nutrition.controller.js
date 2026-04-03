const { randomUUID: uuidv4 } = require('crypto');
const pool = require('../../config/db');
const genAI = require('../../config/gemini');

const analyzeWithGemini = async (imageBuffer, mimeType) => {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are a professional nutritionist and food recognition AI.
Analyze this meal photo and provide a detailed nutritional breakdown.

Return your response in STRICT JSON format with NO extra text, exactly like this:
{
  "items": [
    {
      "name": "food item name",
      "quantity": "estimated quantity e.g. 200g or 1 cup",
      "calories": 250,
      "protein_g": 20,
      "fat_g": 8,
      "carbs_g": 30
    }
  ],
  "total_calories": 250,
  "total_protein_g": 20,
  "total_fat_g": 8,
  "total_carbs_g": 30
}
Be as accurate as possible with portion size estimates.`;

    const imagePart = {
        inlineData: {
            data: imageBuffer.toString('base64'),
            mimeType,
        },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Gemini did not return valid JSON');
    return JSON.parse(jsonMatch[0]);
};

const uploadFoodImage = async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No image file uploaded' });
        const { meal_type = 'snack', date } = req.body;
        const imageBuffer = req.file.buffer;
        const mimeType = req.file.mimetype;

        let analysis;
        try {
            analysis = await analyzeWithGemini(imageBuffer, mimeType);
        } catch (aiErr) {
            console.error('[Gemini] Food analysis error:', aiErr.message);
            return res.status(502).json({ error: 'AI food analysis failed', details: aiErr.message });
        }

        const id = uuidv4();
        const logDate = date || new Date().toISOString();
        await pool.query(
            `INSERT INTO food_logs (id, user_id, profile_id, logged_at, meal_type, items_json, total_calories, total_protein, total_fat, total_carbs)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
            [
                id, req.user.userId, req.user.profile_id, logDate, meal_type,
                JSON.stringify(analysis.items),
                analysis.total_calories, analysis.total_protein_g,
                analysis.total_fat_g, analysis.total_carbs_g,
            ]
        );
        const result = await pool.query('SELECT * FROM food_logs WHERE id = ?', [id]);

        res.status(201).json({
            message: 'Food log created from image analysis',
            log: result.rows[0],
            ai_analysis: analysis,
        });
    } catch (err) {
        next(err);
    }
};

const addManualEntry = async (req, res, next) => {
    try {
        const { meal_type, items, date } = req.body;
        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ error: 'items must be an array of food items' });
        }
        const totals = items.reduce(
            (acc, item) => ({
                calories: acc.calories + (item.calories || 0),
                protein: acc.protein + (item.protein_g || 0),
                fat: acc.fat + (item.fat_g || 0),
                carbs: acc.carbs + (item.carbs_g || 0),
            }),
            { calories: 0, protein: 0, fat: 0, carbs: 0 }
        );
        const id = uuidv4();
        const logDate = date || new Date().toISOString();
        await pool.query(
            `INSERT INTO food_logs (id, user_id, profile_id, logged_at, meal_type, items_json, total_calories, total_protein, total_fat, total_carbs)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
            [id, req.user.userId, req.user.profile_id, logDate, meal_type || 'snack',
                JSON.stringify(items), totals.calories, totals.protein, totals.fat, totals.carbs]
        );
        const result = await pool.query('SELECT * FROM food_logs WHERE id = ?', [id]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        next(err);
    }
};

const getFoodLog = async (req, res, next) => {
    try {
        const date = req.query.date;
        let logs;
        if (date) {
            logs = await pool.query(
                "SELECT * FROM food_logs WHERE profile_id = ? AND (logged_at = ? OR date(logged_at, 'localtime') = ?) ORDER BY id",
                [req.user.profile_id, date, date]
            );
        } else {
            logs = await pool.query(
                "SELECT * FROM food_logs WHERE profile_id = ? AND (logged_at = date('now', 'localtime') OR date(logged_at, 'localtime') = date('now', 'localtime')) ORDER BY id",
                [req.user.profile_id]
            );
        }
        const totals = logs.rows.reduce(
            (acc, row) => ({
                calories: acc.calories + parseFloat(row.total_calories || 0),
                protein: acc.protein + parseFloat(row.total_protein || 0),
                fat: acc.fat + parseFloat(row.total_fat || 0),
                carbs: acc.carbs + parseFloat(row.total_carbs || 0),
            }),
            { calories: 0, protein: 0, fat: 0, carbs: 0 }
        );

        const targets = await pool.query(
            'SELECT daily_calories, protein_g, fat_g, carbs_g FROM nutrition_targets WHERE profile_id = ? ORDER BY created_at DESC LIMIT 1',
            [req.user.profile_id]
        );

        res.json({ date, logs: logs.rows, totals, targets: targets.rows[0] || null });
    } catch (err) {
        next(err);
    }
};

const updateFoodLog = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { items } = req.body;
        const totals = items.reduce(
            (acc, item) => ({
                calories: acc.calories + (item.calories || 0),
                protein: acc.protein + (item.protein_g || 0),
                fat: acc.fat + (item.fat_g || 0),
                carbs: acc.carbs + (item.carbs_g || 0),
            }),
            { calories: 0, protein: 0, fat: 0, carbs: 0 }
        );
        await pool.query(
            `UPDATE food_logs SET items_json=?, total_calories=?, total_protein=?, total_fat=?, total_carbs=? WHERE id=? AND profile_id=?`,
            [JSON.stringify(items), totals.calories, totals.protein, totals.fat, totals.carbs, id, req.user.profile_id]
        );
        const result = await pool.query('SELECT * FROM food_logs WHERE id = ? AND profile_id = ?', [id, req.user.profile_id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Log entry not found' });
        res.json(result.rows[0]);
    } catch (err) {
        next(err);
    }
};

const deleteFoodLog = async (req, res, next) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM food_logs WHERE id=? AND profile_id=?', [id, req.user.profile_id]);
        res.json({ message: 'Food log entry deleted' });
    } catch (err) {
        next(err);
    }
};

module.exports = { uploadFoodImage, addManualEntry, getFoodLog, updateFoodLog, deleteFoodLog };
