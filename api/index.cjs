try {
    const app = require('../server/index.cjs');
    module.exports = app;
} catch (error) {
    console.error('[API CJS] Startup Error:', error);
    module.exports = (req, res) => {
        res.status(500).json({
            error: 'Backend CJS Startup Failed',
            message: error.message,
            stack: error.stack
        });
    };
}