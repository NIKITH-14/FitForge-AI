const express = require('express');
const router = express.Router();
const { getBMI, calculateAndSaveBMI } = require('./bmi.controller');
const { authenticate } = require('../../middleware/auth');

router.get('/', authenticate, getBMI);
router.post('/calculate', authenticate, calculateAndSaveBMI);

module.exports = router;
