require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// ─── Security & Middleware ──────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));
app.use(cookieParser());
app.use(morgan('dev'));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Global rate limit
app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
}));

// ─── Health Check ───────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString(), service: 'AI Fitness Platform API' });
});

// ─── API Routes ─────────────────────────────────────────────────────────────
app.use('/api', routes);

// ─── 404 Handler ────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.originalUrl} not found` });
});

// ─── Global Error Handler ───────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
