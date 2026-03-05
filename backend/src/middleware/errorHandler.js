const errorHandler = (err, req, res, next) => {
    console.error(`[ERROR] ${err.message}`, err.stack);

    if (err.name === 'ZodError') {
        return res.status(400).json({
            error: 'Validation error',
            details: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
        });
    }

    if (err.code === '23505') {
        return res.status(409).json({ error: 'Resource already exists (duplicate key)' });
    }

    if (err.code === '23503') {
        return res.status(404).json({ error: 'Referenced resource not found' });
    }

    const status = err.statusCode || 500;
    const message = err.expose ? err.message : 'Internal server error';
    res.status(status).json({ error: message });
};

module.exports = errorHandler;
