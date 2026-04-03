const express = require('express');
const router = express.Router();
const { getBMI, calculateAndSaveBMI } = require('./bmi.controller');
const { authenticateProfile } = require('../../middleware/auth');

router.get('/', authenticateProfile, getBMI);
router.post('/calculate', authenticateProfile, calculateAndSaveBMI);

module.exports = router;
