const { randomUUID: uuidv4 } = require('crypto');
const pool = require('../../config/db');

const analyzeAndRecommend = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { session_id } = req.body;

        const sessions = await pool.query(
            `SELECT ms.rep_count, ms.resistance_kg, ms.exercise_name,
              fa.avg_form_score, fa.errors_json, ms.timestamp
       FROM machine_sessions ms
       LEFT JOIN form_analyses fa ON fa.session_id = ms.id
       WHERE ms.profile_id = ?
       ORDER BY ms.timestamp DESC LIMIT 5`,
            [req.user.profile_id]
        );

        const rows = sessions.rows;
        if (rows.length === 0) {
            return res.json({ recommendations: [{ category: 'general', text: 'Complete your first session to get personalized recommendations.' }] });
        }

        const recommendations = [];
        const latestSession = rows[0];
        const avgFormScores = rows.map((r) => r.avg_form_score || 0);
        const avgFormScore = avgFormScores.reduce((a, b) => a + b, 0) / avgFormScores.length;

        if (latestSession.avg_form_score !== null && latestSession.avg_form_score < 60) {
            recommendations.push({
                category: 'technique',
                text: `Your form score is ${latestSession.avg_form_score.toFixed(0)}/100. Focus on technique before increasing resistance. Consider reducing weight by 10-15%.`,
            });
        }

        if (latestSession.avg_form_score !== null && latestSession.avg_form_score > 85) {
            recommendations.push({
                category: 'resistance',
                text: `Outstanding form score of ${latestSession.avg_form_score.toFixed(0)}/100! You are ready to increase resistance by 5% on ${latestSession.exercise_name}.`,
            });
        }

        if (rows.length >= 3) {
            const recentScores = avgFormScores.slice(0, 3);
            const isDeclining = recentScores[0] < recentScores[1] && recentScores[1] < recentScores[2];
            if (isDeclining) {
                recommendations.push({
                    category: 'recovery',
                    text: 'Your form has been declining across your last 3 sessions. Consider scheduling a recovery day and reviewing your technique fundamentals.',
                });
            }
        }

        if (latestSession.errors_json) {
            try {
                const errors = JSON.parse(latestSession.errors_json || '[]');
                if (errors.length > 0) {
                    recommendations.push({
                        category: 'technique',
                        text: `Common form errors detected: ${errors.slice(0, 3).join(', ')}. Focus on correcting these during warm-up sets.`,
                    });
                }
            } catch (e) { /* ignore parse errors */ }
        }

        if (avgFormScore > 75 && rows.length >= 3) {
            recommendations.push({
                category: 'volume',
                text: 'Your consistency and form are solid. Consider adding one additional session per week to accelerate progress.',
            });
        }

        if (recommendations.length === 0) {
            recommendations.push({
                category: 'general',
                text: 'Keep up the great work! Consistency is key. Stay hydrated and ensure you are sleeping 7-9 hours per night.',
            });
        }

        for (const rec of recommendations) {
            await pool.query(
                `INSERT INTO ai_recommendations (id, user_id, profile_id, session_id, recommendation_text, category) VALUES (?,?,?,?,?,?)`,
                [uuidv4(), userId, req.user.profile_id, session_id || null, rec.text, rec.category]
            );
        }

        res.json({ recommendations, session_analyzed: session_id });
    } catch (err) {
        next(err);
    }
};

const getRecommendations = async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT * FROM ai_recommendations WHERE profile_id = ? ORDER BY created_at DESC LIMIT 10`,
            [req.user.profile_id]
        );
        res.json({ recommendations: result.rows });
    } catch (err) {
        next(err);
    }
};

module.exports = { analyzeAndRecommend, getRecommendations };
