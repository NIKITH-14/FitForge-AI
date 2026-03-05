const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { z } = require('zod');
const pool = require('../../config/db');
const { generateAccessToken, generateRefreshToken } = require('../../config/jwt');

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
        const existing = await pool.query('SELECT id FROM users WHERE email = ?', [data.email]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'Email already registered' });
        }
        const passwordHash = await bcrypt.hash(data.password, 12);
        const id = uuidv4();
        await pool.query(
            `INSERT INTO users (id, name, email, password_hash) VALUES (?,?,?,?)`,
            [id, data.name, data.email, passwordHash]
        );
        const userResult = await pool.query(
            'SELECT id, name, email, has_completed_intro, created_at FROM users WHERE id = ?',
            [id]
        );
        const user = userResult.rows[0];
        const accessToken = generateAccessToken({ userId: user.id, email: user.email });
        const refreshToken = generateRefreshToken({ userId: user.id });
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        res.status(201).json({ user, accessToken });
    } catch (err) {
        next(err);
    }
};

const login = async (req, res, next) => {
    try {
        const data = LoginSchema.parse(req.body);
        const result = await pool.query(
            'SELECT id, name, email, password_hash, has_completed_intro, fitness_goal, height_cm, weight_kg FROM users WHERE email = ?',
            [data.email]
        );
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const user = result.rows[0];
        const valid = await bcrypt.compare(data.password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const { password_hash, ...safeUser } = user;
        const accessToken = generateAccessToken({ userId: user.id, email: user.email });
        const refreshToken = generateRefreshToken({ userId: user.id });
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        res.json({ user: safeUser, accessToken });
    } catch (err) {
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

module.exports = { register, login, logout, refresh };
