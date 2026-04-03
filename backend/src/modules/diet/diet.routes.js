const express = require('express');
const router = express.Router();
const { generateDietPlan, getDietPlan } = require('./diet.controller');
const { authenticateProfile } = require('../../middleware/auth');

router.get('/plan', authenticateProfile, getDietPlan);
router.post('/generate', authenticateProfile, generateDietPlan);

module.exports = router;
