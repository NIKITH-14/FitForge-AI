const express = require('express');
const router = express.Router();
const { register, login, logout, refresh } = require('./auth.controller');
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many attempts, please try again later' },
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', logout);
router.post('/refresh', refresh);

module.exports = router;
