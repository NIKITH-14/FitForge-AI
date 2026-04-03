const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const { z } = require('zod');
const pool = require('../../config/db');
const { generateAccessToken, generateRefreshToken, generateGuestToken } = require('../../config/jwt');

const RegisterSchema = z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    password: z.string().min(8),
});

const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

const register = async (req, res, next) => {
    try {
        const data = RegisterSchema.parse(req.body);

        const existingUser = await pool.query('SELECT id FROM users WHERE email = ?', [data.email]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);
        const userId = randomUUID();

        await pool.query(
            'INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)',
            [userId, data.name, data.email, hashedPassword]
        );

        // Return the same shape as login() so the frontend setup flow
        // can immediately capture accessToken and proceed to profile creation.
        const accessToken = generateAccessToken({ userId, email: data.email });
        const refreshToken = generateRefreshToken({ userId, email: data.email });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.status(201).json({
            accessToken,
            user: { id: userId, name: data.name, email: data.email }
        });
    } catch (err) {
        if (err instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid input', details: err.errors });
        }
        next(err);
    }
};

const login = async (req, res, next) => {
    try {
        const data = LoginSchema.parse(req.body);

        const result = await pool.query('SELECT * FROM users WHERE email = ?', [data.email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(data.password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const accessToken = generateAccessToken({ userId: user.id, email: user.email });
        const refreshToken = generateRefreshToken({ userId: user.id, email: user.email });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.json({ accessToken, user: { id: user.id, name: user.name, email: user.email } });
    } catch (err) {
        if (err instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid input', details: err.errors });
        }
        next(err);
    }
};

const logout = (req, res) => {
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out successfully' });
};

const refresh = async (req, res, next) => {
    try {
        const token = req.cookies.refreshToken;
        if (!token) return res.status(401).json({ error: 'No refresh token' });
        const { verifyRefreshToken } = require('../../config/jwt');
        const decoded = verifyRefreshToken(token);
        const result = await pool.query('SELECT id, email FROM users WHERE id = ?', [decoded.userId]);
        if (result.rows.length === 0) return res.status(401).json({ error: 'User not found' });
        const user = result.rows[0];
        const accessToken = generateAccessToken({ userId: user.id, email: user.email });
        res.json({ accessToken });
    } catch (err) {
        next(err);
    }
};

const createGuestSession = async (req, res, next) => {
    try {
        const guestId = randomUUID();
        const machineId = "machine_test_1"; 
        
        const expiresAtDate = new Date();
        expiresAtDate.setHours(expiresAtDate.getHours() + 4);

        await pool.query(
            `INSERT INTO guest_sessions (id, machine_id, temp_data_json, expires_at) VALUES (?,?,?,?)`,
            [guestId, machineId, '{}', expiresAtDate.toISOString()]
        );

        const guestToken = generateGuestToken({ guest_id: guestId, machine_id: machineId });
        
        res.status(201).json({ guestToken, guestId, expiresAt: expiresAtDate.toISOString() });
    } catch (err) {
        next(err);
    }
};

const endGuestSession = async (req, res, next) => {
     try {
        const { id } = req.params;
        
        if (req.user.guest_id !== id) {
             return res.status(403).json({ error: 'Not authorized to terminate this session' });
        }

        await pool.query(`DELETE FROM guest_sessions WHERE id = ?`, [id]);
        
        res.json({ message: 'Guest session terminated and ephemeral data wiped.' });
    } catch (err) {
        next(err);
    }
};

const getMe = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const result = await pool.query(
            'SELECT id, name, email, has_completed_intro FROM users WHERE id = ?',
            [userId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(result.rows[0]);
    } catch (err) {
        next(err);
    }
};

module.exports = { register, login, logout, refresh, createGuestSession, endGuestSession, getMe };
