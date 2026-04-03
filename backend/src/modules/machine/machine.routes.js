const express = require('express');
const router = express.Router();
const { bootMachine, ingestSession, ingestFormData, getSessions } = require('./machine.controller');
const { authenticateProfile, authenticateMachine } = require('../../middleware/auth');

// Machine endpoints (machine token auth)
router.post('/boot', authenticateMachine, bootMachine);
router.post('/session', authenticateMachine, ingestSession);
router.post('/form', authenticateMachine, ingestFormData);

// User-facing history (JWT auth) - scoped to profile
router.get('/sessions', authenticateProfile, getSessions);

module.exports = router;
