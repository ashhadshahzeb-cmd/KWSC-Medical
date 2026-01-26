const { pool } = require('./db');

async function setupFamilyTable() {
    try {
        console.log('Creating family_members table...');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS family_members (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                name TEXT NOT NULL,
                relation TEXT NOT NULL CHECK (relation IN ('Spouse', 'Son', 'Daughter', 'Parent')),
                dob DATE,
                gender TEXT CHECK (gender IN ('Male', 'Female', 'Other')),
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // Index for faster retrieval by user
        await pool.query('CREATE INDEX IF NOT EXISTS idx_family_user ON family_members(user_id);');

        console.log('✅ family_members table created successfully.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error creating family table:', err);
        process.exit(1);
    }
}

setupFamilyTable();
