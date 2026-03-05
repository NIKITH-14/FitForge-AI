const { verifyAccessToken } = require('../config/jwt');

const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = verifyAccessToken(token);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

const authenticateMachine = (req, res, next) => {
    const machineToken = req.headers['x-machine-token'];
    if (!machineToken || machineToken !== process.env.MACHINE_SECRET) {
        return res.status(401).json({ error: 'Invalid machine token' });
    }
    next();
};

module.exports = { authenticate, authenticateMachine };
