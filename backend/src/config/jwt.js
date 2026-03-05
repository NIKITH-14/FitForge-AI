const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret';

const generateAccessToken = (payload) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '15m' });
};

const generateRefreshToken = (payload) => {
    return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });
};

const verifyAccessToken = (token) => {
    return jwt.verify(token, JWT_SECRET);
};

const verifyRefreshToken = (token) => {
    return jwt.verify(token, JWT_REFRESH_SECRET);
};

module.exports = { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken };
