const jwt = require('jsonwebtoken');

const getMockTokens = () => {
    const userId = 'user_abc123';
    const profileId = 'profile_xyz789';

    // Matches the generateProfileToken logic from config/jwt.js
    const profileToken = jwt.sign(
        { userId, profile_id: profileId, email: 'test@example.com' },
        process.env.JWT_SECRET || 'test_secret',
        { expiresIn: '12h' }
    );

    const accessToken = jwt.sign(
        { userId, email: 'test@example.com' },
        process.env.JWT_SECRET || 'test_secret',
        { expiresIn: '30d' }
    );

    return {
        userId,
        profileId,
        profileToken,
        accessToken
    };
};

module.exports = { getMockTokens };
