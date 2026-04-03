const express = require('express');
const router = express.Router();
const { analyzeAndRecommend, getRecommendations } = require('./ai.controller');
const { authenticateProfile } = require('../../middleware/auth');

router.get('/recommendations', authenticateProfile, getRecommendations);
router.post('/analyze', authenticateProfile, analyzeAndRecommend);

module.exports = router;
