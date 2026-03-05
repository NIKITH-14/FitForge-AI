const express = require('express');
const router = express.Router();
const { getWorkoutPlan, generateWorkoutPlan } = require('./workout.controller');
const { authenticate } = require('../../middleware/auth');

router.get('/plan', authenticate, getWorkoutPlan);
router.post('/generate', authenticate, generateWorkoutPlan);

module.exports = router;
