const { pool } = require('./db');

async function setupClaimsTable() {
    try {
        console.log('Creating claims table...');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS claims (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                emp_no TEXT NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                claim_type TEXT NOT NULL,
                description TEXT,
                image_url TEXT,
                status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
                admin_comments TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // Add index for admin queries
        await pool.query('CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_claims_emp ON claims(emp_no);');

        console.log('✅ claims table created successfully.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error creating claims table:', err);
        process.exit(1);
    }
}

setupClaimsTable();
