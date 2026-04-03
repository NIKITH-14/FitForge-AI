const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret';

// Account-level tokens
const generateAccessToken = (payload) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '30d' });
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

// Profile-scoped tokens
const generateProfileToken = (payload) => {
    // We reuse the JWT_SECRET for profile tokens but they must contain a profile_id in the payload
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' }); 
};

// Guest-scoped tokens
const generateGuestToken = (payload) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '4h' });
};

const verifyToken = (token) => {
    // Universal verification using the main secret
    return jwt.verify(token, JWT_SECRET);
};

module.exports = { 
    generateAccessToken, 
    generateRefreshToken, 
    verifyAccessToken, 
    verifyRefreshToken,
    generateProfileToken,
    generateGuestToken,
    verifyToken
};
