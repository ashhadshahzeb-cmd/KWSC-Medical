console.log('[API] Entry point loaded');
try {
    const app = require('../server/index.js');
    module.exports = app;
} catch (error) {
    console.error('[API] Startup Error:', error);
    module.exports = (req, res) => {
        res.status(500).json({
            error: 'Backend Startup Failed',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    };
}