const express = require('express');
const router = express.Router();
const { getBMI, calculateAndSaveBMI, getBMIHistory } = require('./bmi.controller');
const { authenticateProfile } = require('../../middleware/auth');

router.get('/', authenticateProfile, getBMI);
router.post('/calculate', authenticateProfile, calculateAndSaveBMI);

// Returns all past bmi_records for the active profile (newest first, limit 50).
// Used by the BodyStats component to render a lightweight measurement history list.
router.get('/history', authenticateProfile, getBMIHistory);

module.exports = router;
