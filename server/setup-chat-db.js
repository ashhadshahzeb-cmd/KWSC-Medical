const { pool } = require('./db');

async function setupChatTable() {
    try {
        console.log('Creating chat_messages table...');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS chat_messages (
                id SERIAL PRIMARY KEY,
                sender_id INTEGER NOT NULL REFERENCES users(id),
                receiver_id INTEGER REFERENCES users(id),
                message TEXT NOT NULL,
                is_admin_message BOOLEAN DEFAULT FALSE,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // Add index for faster queries
        await pool.query('CREATE INDEX IF NOT EXISTS idx_chat_sender ON chat_messages(sender_id);');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_chat_receiver ON chat_messages(receiver_id);');

        console.log('✅ chat_messages table created successfully.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error creating table:', err);
        process.exit(1);
    }
}

setupChatTable();
