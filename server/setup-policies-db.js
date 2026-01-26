const { pool } = require('./db');

async function setupPoliciesTable() {
    try {
        console.log('Creating policies table...');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS policies (
                id SERIAL PRIMARY KEY,
                rank_name TEXT UNIQUE NOT NULL,
                annual_limit DECIMAL(10,2) NOT NULL,
                room_limit DECIMAL(10,2) NOT NULL,
                maternity_limit DECIMAL(10,2) NOT NULL,
                opd_allowed BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // Insert default policies
        await pool.query(`
            INSERT INTO policies (rank_name, annual_limit, room_limit, maternity_limit)
            VALUES 
                ('Officer', 500000, 15000, 100000),
                ('Staff', 200000, 5000, 50000),
                ('Executive', 1000000, 25000, 200000)
            ON CONFLICT (rank_name) DO NOTHING;
        `);

        console.log('✅ policies table created with defaults.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error creating policies table:', err);
        process.exit(1);
    }
}

setupPoliciesTable();
