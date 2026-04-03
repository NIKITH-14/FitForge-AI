const express = require('express');
const router = express.Router();
const { getWorkoutPlan, generateWorkoutPlan } = require('./workout.controller');
const { authenticateProfile } = require('../../middleware/auth');

router.get('/plan', authenticateProfile, getWorkoutPlan);
router.post('/generate', authenticateProfile, generateWorkoutPlan);

module.exports = router;
