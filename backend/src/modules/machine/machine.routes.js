const express = require('express');
const router = express.Router();
const { ingestSession, ingestFormData, getSessions } = require('./machine.controller');
const { authenticate, authenticateMachine } = require('../../middleware/auth');

// Machine endpoints (machine token auth)
router.post('/session', authenticateMachine, ingestSession);
router.post('/form', authenticateMachine, ingestFormData);

// User-facing history (JWT auth)
router.get('/sessions', authenticate, getSessions);

module.exports = router;
