const express = require('express');
const router = express.Router();
const { getMe, onboard, markIntroComplete } = require('./user.controller');
const { authenticate } = require('../../middleware/auth');

router.get('/me', authenticate, getMe);
router.put('/onboard', authenticate, onboard);
router.put('/intro-complete', authenticate, markIntroComplete);

module.exports = router;
