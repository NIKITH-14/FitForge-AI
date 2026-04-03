const { verifyAccessToken, verifyToken } = require('../config/jwt');

const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = verifyAccessToken(token); // Verify as Account token
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

const authenticateProfile = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid Profile authorization header' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = verifyToken(token);
        if (!decoded.profile_id) {
            return res.status(403).json({ error: 'Access token missing profile_id scope' });
        }
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired Profile token' });
    }
};

const authenticateGuest = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid Guest authorization header' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = verifyToken(token);
        if (!decoded.guest_id) {
            return res.status(403).json({ error: 'Access token missing guest_id scope' });
        }
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired Guest token' });
    }
};

const authenticateMachine = (req, res, next) => {
    const machineToken = req.headers['x-machine-token'];
    if (!machineToken || machineToken !== process.env.MACHINE_SECRET) {
        return res.status(401).json({ error: 'Invalid machine token' });
    }
    next();
};

// ── authenticateAny ───────────────────────────────────────────────────────────
// Accepts EITHER an account-scoped JWT OR a profile-scoped JWT.
//
// NARROW USE ONLY — this middleware must only be applied to:
//   - GET /profiles/:id
// This allows the dashboard BodyStats component to fetch profile data using
// only a profileToken (which is all that's available post-login dashboard).
//
// Do NOT apply this to write operations (PUT / DELETE).
// All write routes must continue to use `authenticate` (account JWT only).
//
// req.user will be populated from whichever token validates successfully.
// Downstream handlers must use req.user.userId OR req.user.profile_id as needed.
const authenticateAny = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }
    const token = authHeader.split(' ')[1];

    // Try account token first (preferred)
    try {
        const decoded = verifyAccessToken(token);
        req.user = decoded;
        return next();
    } catch {
        // Not a valid account token — try profile token
    }

    // Try profile-scoped token
    try {
        const decoded = verifyToken(token);
        if (decoded.profile_id) {
            req.user = decoded;
            return next();
        }
    } catch {
        // Not a valid profile token either
    }

    return res.status(401).json({ error: 'Invalid or expired token' });
};

module.exports = { authenticate, authenticateProfile, authenticateGuest, authenticateMachine, authenticateAny };
