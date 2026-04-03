const express = require('express');
const router = express.Router();
const { register, login, logout, refresh, createGuestSession, endGuestSession, getMe } = require('./auth.controller');
const rateLimit = require('express-rate-limit');
const { authenticateMachine, authenticateGuest, authenticate } = require('../../middleware/auth');

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    message: { error: 'Too many attempts, please try again later' },
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', logout);
router.post('/refresh', refresh);

// Added /auth/me for user fetching
router.get('/me', authenticate, getMe);

// Guest Session Endpoints
router.post('/guest', authenticateMachine, createGuestSession);
router.delete('/guest/:id', authenticateGuest, endGuestSession);

module.exports = router;
