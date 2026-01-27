import pg from 'pg';
const { Pool } = pg;

const connectionString = 'postgresql://neondb_owner:npg_Zr1cLFI0TpBM@ep-crimson-grass-ahuw1lmc-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function listCards() {
    try {
        console.log('Listing all medical cards...');
        const result = await pool.query('SELECT id, user_id, emp_no, participant_name FROM medical_cards');
        console.table(result.rows);
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

listCards();
