const express = require('express');
const router = express.Router();
const { analyzeAndRecommend, getRecommendations } = require('./ai.controller');
const { authenticate } = require('../../middleware/auth');

router.get('/recommendations', authenticate, getRecommendations);
router.post('/analyze', authenticate, analyzeAndRecommend);

module.exports = router;
