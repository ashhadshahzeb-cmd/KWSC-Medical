const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const config = {
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Required for Supabase/Heroku
    }
};

const pool = new Pool(config);

pool.on('connect', () => {
    console.log('✅ Connected to PostgreSQL (Supabase)');
});

pool.on('error', (err) => {
    console.error('❌ Database Connection Failed:', err.message);
});

module.exports = {
    pool
};
