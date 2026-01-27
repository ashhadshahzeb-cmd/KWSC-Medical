const { pool } = require('./db');

async function updateFamilySchema() {
    try {
        console.log('Adding card columns to family_members table...');

        await pool.query(`
            ALTER TABLE family_members ADD COLUMN IF NOT EXISTS card_no TEXT;
            ALTER TABLE family_members ADD COLUMN IF NOT EXISTS valid_upto DATE;
            ALTER TABLE family_members ADD COLUMN IF NOT EXISTS hospitalization TEXT;
            ALTER TABLE family_members ADD COLUMN IF NOT EXISTS room_limit TEXT;
            ALTER TABLE family_members ADD COLUMN IF NOT EXISTS total_limit DECIMAL(10,2) DEFAULT 50000;
            ALTER TABLE family_members ADD COLUMN IF NOT EXISTS cnic TEXT;
            ALTER TABLE family_members ADD COLUMN IF NOT EXISTS dob DATE;
        `);

        console.log('✅ family_members table updated with card columns.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error updating family_members table:', err);
        process.exit(1);
    }
}

updateFamilySchema();
