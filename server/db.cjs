const { Pool } = require('pg');
const path = require('path');

if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is missing!');
}

const config = {
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
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
