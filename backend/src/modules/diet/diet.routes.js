const express = require('express');
const router = express.Router();
const { generateDietPlan, getDietPlan } = require('./diet.controller');
const { authenticate } = require('../../middleware/auth');

router.get('/plan', authenticate, getDietPlan);
router.post('/generate', authenticate, generateDietPlan);

module.exports = router;
