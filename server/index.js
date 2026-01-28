// HealFlow Backend Server - SQL Server Version
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const { pool } = require('./db.js');


// Email Transporter (For OTP)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || '', // e.g. your-email@gmail.com
        pass: process.env.EMAIL_PASS || ''  // e.g. your-app-password
    }
});

const app = express();
const PORT = process.env.PORT || 5000;
const MASTER_KEY = process.env.MASTER_KEY || '8271933';

// Middleware
app.use(cors());
app.use(express.json());

// Health Check
app.get('/api/health', async (req, res) => {
    try {
        const result = await pool.query('SELECT 1 as test');
        res.json({ status: 'OK', database: 'PostgreSQL Connected', timestamp: new Date() });
    } catch (err) {
        console.error('Health Check Error:', err);
        res.status(500).json({ status: 'ERROR', database: 'Not Connected', error: err.message || 'Unknown Error' });
    }
});

// List Tables
// ============================================================================
// NOTIFICATIONS API
// ============================================================================

app.get('/api/notifications', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/notifications/:id/read', async (req, res) => {
    try {
        await pool.query('UPDATE notifications SET status = $1 WHERE id = $2', ['read', req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/notifications/read-all', async (req, res) => {
    try {
        await pool.query('UPDATE notifications SET status = $1 WHERE status = $2', ['read', 'unread']);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/notifications', async (req, res) => {
    try {
        await pool.query('DELETE FROM notifications');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/users/:id/card', async (req, res) => {
    try {
        console.log(`[MEDICAL_CARD] Fetching card for user ID: ${req.params.id}`);

        // Ensure ID is valid integer
        const userId = parseInt(req.params.id);
        if (isNaN(userId)) {
            console.log('[MEDICAL_CARD] Invalid User ID');
            return res.status(400).json({ error: 'Invalid User ID' });
        }

        const result = await pool.query('SELECT * FROM medical_cards WHERE user_id = $1', [userId]);
        console.log(`[MEDICAL_CARD] Found ${result.rows.length} cards`);

        if (result.rows.length === 0) return res.json(null);

        const card = result.rows[0];

        // Calculate spent amount from treatment2 using emp_no
        const spentRes = await pool.query(
            'SELECT SUM(medicine_amount) as total_spent FROM treatment2 WHERE emp_no = $1',
            [card.emp_no]
        );

        const spentAmount = parseFloat(spentRes.rows[0].total_spent || 0);
        const totalLimit = parseFloat(card.total_limit || 100000.00);
        const remainingBalance = totalLimit - spentAmount;

        res.json({
            ...card,
            total_limit: totalLimit,
            spent_amount: spentAmount,
            remaining_balance: remainingBalance
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users/:id/card', async (req, res) => {
    const { id } = req.params;
    const {
        card_no, participant_name, emp_no, cnic, customer_no, dob, valid_upto, branch,
        benefit_covered, hospitalization, room_limit, normal_delivery, c_section_limit
    } = req.body;

    try {
        const userId = parseInt(id);
        if (isNaN(userId)) {
            console.error(`[MEDICAL_CARD] Invalid user ID received: ${id}`);
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        console.log(`[MEDICAL_CARD] Attempting save for user ${userId}`);

        const query = `
            INSERT INTO medical_cards (
                user_id, card_no, participant_name, emp_no, cnic, customer_no, dob, valid_upto, branch,
                benefit_covered, hospitalization, room_limit, normal_delivery, c_section_limit, total_limit
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            ON CONFLICT (user_id) DO UPDATE SET
                card_no = EXCLUDED.card_no,
                participant_name = EXCLUDED.participant_name,
                emp_no = EXCLUDED.emp_no,
                cnic = EXCLUDED.cnic,
                customer_no = EXCLUDED.customer_no,
                dob = EXCLUDED.dob,
                valid_upto = EXCLUDED.valid_upto,
                branch = EXCLUDED.branch,
                benefit_covered = EXCLUDED.benefit_covered,
                hospitalization = EXCLUDED.hospitalization,
                room_limit = EXCLUDED.room_limit,
                normal_delivery = EXCLUDED.normal_delivery,
                c_section_limit = EXCLUDED.c_section_limit,
                total_limit = EXCLUDED.total_limit
            RETURNING *
        `;

        const params = [
            userId,
            card_no || null,
            participant_name || null,
            emp_no || null,
            cnic || null,
            customer_no || null,
            (dob && dob !== '') ? dob : null,
            (valid_upto && valid_upto !== '') ? valid_upto : null,
            branch || null,
            benefit_covered || null,
            hospitalization || null,
            room_limit || null,
            normal_delivery || null,
            c_section_limit || null,
            req.body.total_limit || 100000.00
        ];

        const result = await pool.query(query, params);
        console.log(`[MEDICAL_CARD] Save successful for user ${userId}`);
        res.json({ success: true, card: result.rows[0] });
    } catch (err) {
        console.error('[MEDICAL_CARD_ERROR]', err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/users/:id/card', async (req, res) => {
    try {
        await pool.query('DELETE FROM medical_cards WHERE user_id = $1', [req.params.id]);
        res.json({ success: true, message: 'Medical card deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================================
// DASHBOARD & ANALYTICS API
// ============================================================================

app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const patientsCount = await pool.query('SELECT COUNT(*) FROM registration');
        const medicineCount = await pool.query('SELECT COUNT(*) FROM treatment2 WHERE treatment = $1 OR medicine_amount > 0', ['medicine']);
        const hospitalCount = await pool.query('SELECT COUNT(*) FROM treatment2 WHERE hospital_name IS NOT NULL AND hospital_name != $1', ['']);
        const labCount = await pool.query('SELECT COUNT(*) FROM treatment2 WHERE lab_name IS NOT NULL AND lab_name != $1', ['']);

        // Fetch Storage Stats
        const storageRes = await pool.query('SELECT pg_database_size(current_database()) as size_bytes');
        const sizeBytes = parseInt(storageRes.rows[0].size_bytes);
        const totalLimitBytes = 500 * 1024 * 1024; // 500MB for Neon Free Tier
        const storagePercentage = (sizeBytes / totalLimitBytes) * 100;

        const storage = {
            bytes: sizeBytes,
            humanReadable: (sizeBytes / (1024 * 1024)).toFixed(2) + ' MB',
            percentage: storagePercentage.toFixed(2),
            isCritical: storagePercentage > 80
        };

        // Auto-Notification if Critical
        if (storage.isCritical) {
            // Check if alert already sent in last 24 hours
            const lastAlert = await pool.query(
                "SELECT id FROM notifications WHERE type = 'storage_warning' AND created_at > NOW() - INTERVAL '1 day'"
            );
            if (lastAlert.rows.length === 0) {
                await pool.query(
                    'INSERT INTO notifications (type, title, message, status) VALUES ($1, $2, $3, $4)',
                    ['storage_warning', 'Database Storage Alert', `Database storage is ${storage.percentage}% full (${storage.humanReadable} used). Please clean up or upgrade.`, 'unread']
                );
            }
        }

        res.json({
            patients: patientsCount.rows[0].count,
            medicine: medicineCount.rows[0].count,
            hospital: hospitalCount.rows[0].count,
            lab: labCount.rows[0].count,
            recentActivities: recentActivities.rows,
            storage
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================================
// CHAT SYSTEM API
// ============================================================================

// Send a message
app.post('/api/chat/send', async (req, res) => {
    const { senderId, receiverId, message, isAdminMessage } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO chat_messages (sender_id, receiver_id, message, is_admin_message) VALUES ($1, $2, $3, $4) RETURNING *',
            [senderId, receiverId, message, isAdminMessage || false]
        );
        res.json({ success: true, message: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get chat history for a user
app.get('/api/chat/history/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await pool.query(
            `SELECT * FROM chat_messages 
             WHERE sender_id = $1 OR receiver_id = $1 
             ORDER BY created_at ASC`,
            [userId] // Fetches all messages where user is either sender or receiver
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get list of users who have chatted (For Admin)
app.get('/api/chat/users', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT DISTINCT u.id, u.full_name, u.email, u.role
             FROM chat_messages cm
             JOIN users u ON u.id = cm.sender_id
             WHERE cm.is_admin_message = FALSE`
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ============================================================================
// ALL EMPLOYEES API (Admin Only)
// ============================================================================

// Get all employees from registration table
app.get('/api/employees', async (req, res) => {
    try {
        const { search, limit = 100, offset = 0 } = req.query;

        let query = 'SELECT * FROM registration';
        let params = [];

        if (search) {
            query += ' WHERE emp_name ILIKE $1 OR emp_no::TEXT ILIKE $1 OR nic ILIKE $1';
            params.push(`%${search}%`);
        }

        query += ` ORDER BY emp_no ASC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

        const result = await pool.query(query, params);

        // Get total count
        let countQuery = 'SELECT COUNT(*) FROM registration';
        if (search) {
            countQuery += ' WHERE emp_name ILIKE $1 OR emp_no::TEXT ILIKE $1 OR nic ILIKE $1';
        }
        const countResult = await pool.query(countQuery, params.length > 0 ? [params[0]] : []);

        res.json({
            employees: result.rows,
            total: parseInt(countResult.rows[0].count),
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (err) {
        console.error('[EMPLOYEES_API_ERROR]', err);
        res.status(500).json({ error: err.message });
    }
});

// Get single employee by ID
app.get('/api/employees/:empNo', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM registration WHERE emp_no = $1', [req.params.empNo]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================================
// CLAIMS REIMBURSEMENT API
// ============================================================================

// Submit a new claim
app.post('/api/claims/submit', async (req, res) => {
    const { userId, empNo, amount, claimType, description, imageUrl } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO claims (user_id, emp_no, amount, claim_type, description, image_url) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [userId, empNo, amount, claimType, description, imageUrl]
        );
        res.json({ success: true, claim: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get user's claims
app.get('/api/claims/user/:userId', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM claims WHERE user_id = $1 ORDER BY created_at DESC',
            [req.params.userId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all claims for admin
app.get('/api/claims/admin', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT c.*, u.full_name, u.email 
             FROM claims c 
             JOIN users u ON c.user_id = u.id 
             ORDER BY c.created_at DESC`
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update claim status (Approve/Reject)
app.put('/api/claims/:id/status', async (req, res) => {
    const { status, adminComments } = req.body;
    const { id } = req.params;

    try {
        // Update status
        const claim = await pool.query(
            'UPDATE claims SET status = $1, admin_comments = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
            [status, adminComments, id]
        );

        // If Approved, deduct from balance (add to treatment2)
        if (status === 'Approved' && claim.rows.length > 0) {
            const c = claim.rows[0];
            await pool.query(
                `INSERT INTO treatment2 (emp_no, medicine_amount, description, treatment)
                 VALUES ($1, $2, $3, 'Reimbursement')`,
                [c.emp_no, c.amount, `Reimbursement Claim ID: ${c.id}`]
            );
        }

        res.json({ success: true, claim: claim.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================================
// FAMILY MANAGEMENT API
// ============================================================================

// Add a family member with card details
app.post('/api/family/add', async (req, res) => {
    const { userId, name, relation, dob, gender, card_no, valid_upto, hospitalization, room_limit, total_limit, cnic } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO family_members (user_id, name, relation, dob, gender, card_no, valid_upto, hospitalization, room_limit, total_limit, cnic) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
            [userId, name, relation, dob || null, gender, card_no || null, valid_upto || null, hospitalization || null, room_limit || null, total_limit || 50000, cnic || null]
        );
        res.json({ success: true, member: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get user's family members with card details
app.get('/api/family/:userId', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM family_members WHERE user_id = $1 ORDER BY relation',
            [req.params.userId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update individual family member card
app.put('/api/family/:memberId', async (req, res) => {
    const { memberId } = req.params;
    const { name, relation, dob, gender, card_no, valid_upto, hospitalization, room_limit, total_limit, cnic } = req.body;
    try {
        const result = await pool.query(
            `UPDATE family_members SET 
                name = COALESCE($1, name),
                relation = COALESCE($2, relation),
                dob = COALESCE($3, dob),
                gender = COALESCE($4, gender),
                card_no = COALESCE($5, card_no),
                valid_upto = COALESCE($6, valid_upto),
                hospitalization = COALESCE($7, hospitalization),
                room_limit = COALESCE($8, room_limit),
                total_limit = COALESCE($9, total_limit),
                cnic = COALESCE($10, cnic)
             WHERE id = $11 RETURNING *`,
            [name, relation, dob || null, gender, card_no, valid_upto || null, hospitalization, room_limit, total_limit, cnic, memberId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Family member not found' });
        }

        res.json({ success: true, member: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete family member
app.delete('/api/family/:memberId', async (req, res) => {
    try {
        await pool.query('DELETE FROM family_members WHERE id = $1', [req.params.memberId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================================
// POLICY & LIMITS API
// ============================================================================

// Check user policy status
app.get('/api/policy/check/:empNo', async (req, res) => {
    const { empNo } = req.params;
    try {
        // 1. Get User Rank (Assuming 'role' or 'designation' in users/registration)
        // For demo, we'll map empNo patterns or default to 'Staff'
        const rank = empNo.startsWith('KW-OFF') ? 'Officer' : 'Staff';

        // 2. Get Policy Limits
        const policyRes = await pool.query('SELECT * FROM policies WHERE rank_name = $1', [rank]);
        const policy = policyRes.rows[0];

        // 3. Get Current Spending
        const spentRes = await pool.query('SELECT SUM(medicine_amount) FROM treatment2 WHERE emp_no = $1', [empNo]);
        const spent = parseFloat(spentRes.rows[0].sum || 0);

        res.json({
            rank,
            limit: parseFloat(policy.annual_limit),
            spent,
            remaining: parseFloat(policy.annual_limit) - spent,
            isExceeded: spent >= parseFloat(policy.annual_limit)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/dashboard/user/:empNo', async (req, res) => {
    const { empNo } = req.params;
    try {
        const myVisits = await pool.query('SELECT COUNT(*) FROM treatment2 WHERE emp_no = $1', [empNo]);
        const mySpent = await pool.query('SELECT SUM(medicine_amount) FROM treatment2 WHERE emp_no = $1', [empNo]);
        const recentVisits = await pool.query('SELECT * FROM treatment2 WHERE emp_no = $1 ORDER BY visit_date DESC LIMIT 5', [empNo]);
        const cardStatus = await pool.query('SELECT id FROM medical_cards WHERE emp_no = $1', [empNo]);

        res.json({
            visits: myVisits.rows[0].count,
            spent: mySpent.rows[0].sum || 0,
            recentVisits: recentVisits.rows,
            hasCard: cardStatus.rows.length > 0
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================================
// MEDICINE REPOSITORY API
// ============================================================================

app.get('/api/medicines', async (req, res) => {
    const { search, limit = 10 } = req.query;
    try {
        let query = 'SELECT * FROM medicines';
        const params = [];

        if (search) {
            query += ' WHERE name ILIKE $1';
            params.push(`%${search}%`);
        }

        query += ` ORDER BY name ASC LIMIT $${params.length + 1}`;
        params.push(limit);

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/medicines/bulk', async (req, res) => {
    const { medicines } = req.body; // Expecting array of {name, price, category}
    if (!Array.isArray(medicines)) {
        return res.status(400).json({ error: 'Medicines must be an array' });
    }

    try {
        for (const med of medicines) {
            await pool.query(
                'INSERT INTO medicines (name, price, category) VALUES ($1, $2, $3) ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price, category = EXCLUDED.category',
                [med.name, med.price || 0, med.category || null]
            );
        }
        res.json({ success: true, count: medicines.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/tables', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create Treatment2 Table
app.post('/api/setup/legacy-schema', async (req, res) => {
    try {
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS Treatment2 (
                Serial_no SERIAL PRIMARY KEY,
                Emp_no TEXT,
                Emp_name TEXT,
                Book_no TEXT,
                Patient_nic TEXT,
                Patient_name TEXT,
                Patient TEXT,
                Refrence TEXT,
                Treatment TEXT,
                Visit_Date TIMESTAMP,
                Qr_code TEXT,
                Store TEXT,
                Allow_month TEXT,
                Cycle_no TEXT,
                Lab_name TEXT,
                Hospital_name TEXT,
                Opd_Ipd TEXT,
                Medicine1 TEXT, Price1 DECIMAL(18,2),
                Medicine2 TEXT, Price2 DECIMAL(18,2),
                Medicine3 TEXT, Price3 DECIMAL(18,2),
                Medicine4 TEXT, Price4 DECIMAL(18,2),
                Medicine5 TEXT, Price5 DECIMAL(18,2),
                Medicine6 TEXT, Price6 DECIMAL(18,2),
                Medicine7 TEXT, Price7 DECIMAL(18,2),
                Medicine8 TEXT, Price8 DECIMAL(18,2),
                Medicine9 TEXT, Price9 DECIMAL(18,2),
                Medicine10 TEXT, Price10 DECIMAL(18,2),
                Medicine_amount DECIMAL(18,2),
                Patient_type TEXT,
                Vendor TEXT,
                Invoice_no TEXT,
                Description TEXT
            );

            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                full_name TEXT,
                role TEXT DEFAULT 'user',
                permissions JSONB DEFAULT '[]',
                emp_no TEXT,
                phone TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS registration (
                id SERIAL PRIMARY KEY,
                emp_no TEXT UNIQUE,
                emp_name TEXT,
                book_no TEXT,
                patient_nic TEXT,
                phone TEXT,
                patient_type TEXT,
                rfid_tag TEXT,
                custom_fields JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        await pool.query(createTableQuery);

        // Migrate existing tables if they lack new columns
        const addColumnsQuery = `
            DO $$ 
            BEGIN 
                -- treatment2 additions
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='treatment2' AND column_name='book_no') THEN
                    ALTER TABLE treatment2 ADD COLUMN book_no TEXT;
                END IF;
                -- registration additions
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='registration' AND column_name='emp_no') THEN
                    ALTER TABLE registration ADD COLUMN emp_no TEXT;
                END IF;
                -- notifications additions
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='metadata') THEN
                    ALTER TABLE notifications ADD COLUMN metadata JSONB DEFAULT '{}';
                END IF;

                -- users additions
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='phone') THEN
                    ALTER TABLE users ADD COLUMN phone TEXT;
                END IF;
                END $;
        `;
        await pool.query(addColumnsQuery);

        res.json({ message: 'Database schema verified and updated.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================================
// AUTHENTICATION ENDPOINTS
// ============================================================================

app.post('/api/auth/send-otp', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    try {
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

        await pool.query(
            'INSERT INTO otp_verifications (email, code, expires_at) VALUES ($1, $2, $3)',
            [email, otpCode, expiresAt]
        );

        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'HealFlow Signup OTP',
                text: `Your OTP for HealFlow signup is: ${otpCode}. It will expire in 10 minutes.`,
                html: `<div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
                        <h2 style="color: #2563eb;">HealFlow Verification</h2>
                        <p>Hello,</p>
                        <p>Your verification code for HealFlow signup is:</p>
                        <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2563eb; margin: 20px 0;">${otpCode}</div>
                        <p>This code will expire in 10 minutes.</p>
                        <p>If you did not request this, please ignore this email.</p>
                      </div>`
            };
            await transporter.sendMail(mailOptions);
            res.json({ success: true, message: 'OTP sent to your email' });
        } else {
            console.log(`\n--- [SIMULATED EMAIL] ---\nTo: ${email}\nOTP Code: ${otpCode}\n--------------------------\n`);
            res.json({ success: true, message: 'OTP simulated (Check server console)' });
        }
    } catch (err) {
        console.error('Email Error:', err);
        res.status(500).json({ error: 'Failed to send OTP email' });
    }
});

app.post('/api/auth/verify-otp', async (req, res) => {
    const { email, code } = req.body;
    try {
        const result = await pool.query(
            'SELECT * FROM otp_verifications WHERE email = $1 AND code = $2 AND expires_at > NOW() AND verified = FALSE ORDER BY created_at DESC LIMIT 1',
            [email, code]
        );

        if (result.rows.length > 0) {
            const otpId = result.rows[0].id;
            await pool.query('UPDATE otp_verifications SET verified = TRUE WHERE id = $1', [otpId]);
            res.json({ success: true, message: 'OTP verified successfully' });
        } else {
            res.status(400).json({ error: 'Invalid or expired OTP' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/signup', async (req, res) => {
    const { email, password, fullName, empNo, otpCode } = req.body;
    try {
        const otpCheck = await pool.query(
            'SELECT * FROM otp_verifications WHERE email = $1 AND code = $2 AND verified = TRUE ORDER BY created_at DESC LIMIT 1',
            [email, otpCode]
        );

        if (otpCheck.rows.length === 0) {
            return res.status(400).json({ error: 'Email not verified or OTP expired' });
        }

        const result = await pool.query(
            'INSERT INTO users (email, password, full_name, emp_no, role) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [email, password, fullName, empNo, 'user']
        );

        await pool.query(
            'INSERT INTO notifications (type, title, message, status) VALUES ($1, $2, $3, $4)',
            ['new_user', 'New User Registered', `New user ${fullName || email} has signed up.`, 'unread']
        );

        res.json({ success: true, user: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1 AND password = $2',
            [email, password]
        );

        if (result.rows.length > 0) {
            const user = result.rows[0];

            // Send Security Notification Email
            if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: user.email,
                    subject: 'HealFlow Security Alert: New Login',
                    html: `<div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
                            <h2 style="color: #2563eb;">Login Security Alert</h2>
                            <p>Hello <b>${user.full_name || 'User'}</b>,</p>
                            <p>Your HealFlow Account was just logged into.</p>
                            <div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 15px 0;">
                                <b>Time:</b> ${new Date().toLocaleString()}<br>
                                <b>Location:</b> (HealFlow Medical Management System)
                            </div>
                            <p>If this was not you, please contact the administrator immediately.</p>
                          </div>`
                };
                transporter.sendMail(mailOptions).catch(e => console.error('Login Email Fail:', e.message));
            }

            // Create login notification for admin (if user is not admin themselves)
            if (user.role !== 'admin') {
                await pool.query(
                    'INSERT INTO notifications (type, title, message, status, metadata) VALUES ($1, $2, $3, $4, $5)',
                    ['user_login', 'User Logged In', `${user.full_name || user.email} just logged into the system.`, 'unread', JSON.stringify({ userId: user.id })]
                );
            }

            res.json({
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.full_name,
                    role: user.role,
                    empNo: user.emp_no,
                    permissions: user.permissions
                }
            });
        } else {
            // Fallback for initial admin if no users exist
            if (email === 'admin@healflow.com' && password === 'Admin') {
                // Ensure admin exists in DB
                const checkAdmin = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
                let adminUser;
                if (checkAdmin.rows.length === 0) {
                    const insertAdmin = await pool.query(
                        'INSERT INTO users (email, password, full_name, role) VALUES ($1, $2, $3, $4) RETURNING *',
                        [email, 'Admin', 'HealFlow Admin', 'admin']
                    );
                    adminUser = insertAdmin.rows[0];
                } else {
                    adminUser = checkAdmin.rows[0];
                }

                return res.json({
                    success: true,
                    user: {
                        id: adminUser.id,
                        email: adminUser.email,
                        name: adminUser.full_name,
                        role: adminUser.role,
                        empNo: adminUser.emp_no,
                        permissions: adminUser.permissions || []
                    }
                });
            }
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all users (Admin only)
app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                u.id, u.email, u.full_name, u.role, u.permissions, u.emp_no,
                CASE WHEN mc.id IS NOT NULL THEN TRUE ELSE FALSE END as has_medical_card
            FROM users u
            LEFT JOIN medical_cards mc ON u.id = mc.user_id
            ORDER BY u.id DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin-only Create User (Bypasses OTP)
app.post('/api/users', async (req, res) => {
    const { email, password, full_name, role, emp_no, phone } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        // Check if user already exists
        const checkUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (checkUser.rows.length > 0) {
            return res.status(400).json({ error: 'A user with this email already exists' });
        }

        const result = await pool.query(
            'INSERT INTO users (email, password, full_name, role, emp_no, phone) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [email, password, full_name, role || 'user', emp_no, phone]
        );

        // Notify admins
        await pool.query(
            'INSERT INTO notifications (type, title, message, status) VALUES ($1, $2, $3, $4)',
            ['new_user', 'User Created (Admin)', `Admin created new account for ${full_name || email}.`, 'unread']
        );

        res.status(201).json({
            success: true,
            user: {
                id: result.rows[0].id,
                email: result.rows[0].email,
                name: result.rows[0].full_name,
                role: result.rows[0].role,
                empNo: result.rows[0].emp_no
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/users/:id/role', async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    try {
        await pool.query('UPDATE Users SET Role = $1 WHERE Id = $2', [role, id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================================
// TREATMENT WORKFLOW ENDPOINTS
// ============================================================================

// Validate Employee Cycle & Fetch Details
app.post('/api/treatment/validate-cycle', async (req, res) => {
    const { empNo, visitDate } = req.body;

    try {
        const date = new Date(visitDate || new Date());
        const day = date.getDate();
        const cycleNo = day <= 15 ? '1' : '2';
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const allowMonth = `${monthNames[date.getMonth()]}-${date.getFullYear()}`;

        // Fetch additional details from Registration table
        const result = await pool.query('SELECT * FROM registration WHERE emp_no = $1', [empNo]);
        const employeeDetails = result.rows[0] || null;

        res.json({
            allowed: true,
            valid: true,
            cycleNo,
            allowMonth,
            employee: employeeDetails ? {
                id: employeeDetails.id,
                empNo: employeeDetails.emp_no,
                name: employeeDetails.emp_name,
                bookNo: employeeDetails.book_no,
                patientNic: employeeDetails.patient_nic,
                patientType: employeeDetails.patient_type,
            } : null,
            message: employeeDetails
                ? `Employee ${employeeDetails.emp_name} validated for Cycle ${cycleNo} of ${allowMonth}`
                : `Employee ${empNo} validated (New Record) for Cycle ${cycleNo} of ${allowMonth}`
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Treatment Records
app.get('/api/treatment/records', async (req, res) => {
    try {
        const { type, page = 1, limit = 50, empNo, startDate, endDate } = req.query;

        let query = `
            SELECT 
                Serial_no AS "Serial_no", Emp_no AS "Emp_no", Emp_name AS "Emp_name", Book_no AS "Book_no",
                Visit_Date AS "Visit_Date", Patient_name AS "Patient_name", Qr_code AS "Qr_code",
                Treatment AS "Treatment", Store AS "Store", Allow_month AS "Allow_month", 
                Cycle_no AS "Cycle_no", Lab_name AS "Lab_name", Hospital_name AS "Hospital_name", 
                Opd_Ipd AS "Opd_Ipd", Medicine_amount::FLOAT AS "Medicine_amount",
                Medicine1 AS "Medicine1", Price1::FLOAT AS "Price1",
                Medicine2 AS "Medicine2", Price2::FLOAT AS "Price2",
                Medicine3 AS "Medicine3", Price3::FLOAT AS "Price3",
                Medicine4 AS "Medicine4", Price4::FLOAT AS "Price4",
                Medicine5 AS "Medicine5", Price5::FLOAT AS "Price5",
                Medicine6 AS "Medicine6", Price6::FLOAT AS "Price6",
                Medicine7 AS "Medicine7", Price7::FLOAT AS "Price7",
                Medicine8 AS "Medicine8", Price8::FLOAT AS "Price8",
                Medicine9 AS "Medicine9", Price9::FLOAT AS "Price9",
                Medicine10 AS "Medicine10", Price10::FLOAT AS "Price10"
            FROM Treatment2 WHERE 1=1`;
        let params = [];
        let paramIndex = 1;

        if (type) {
            query += ` AND Treatment = $${paramIndex++}`;
            params.push(type);
        }
        if (empNo) {
            query += ` AND Emp_no = $${paramIndex++}`;
            params.push(empNo);
        }
        if (startDate) {
            query += ` AND Visit_Date >= $${paramIndex++}`;
            params.push(new Date(startDate));
        }
        if (endDate) {
            query += ` AND Visit_Date <= $${paramIndex++}`;
            params.push(new Date(endDate));
        }

        query += ' ORDER BY Serial_no DESC';
        query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Single Record
app.get('/api/treatment/records/:serialNo', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                Serial_no AS "Serial_no", Emp_no AS "Emp_no", Emp_name AS "Emp_name", Book_no AS "Book_no",
                Visit_Date AS "Visit_Date", Patient_name AS "Patient_name", Qr_code AS "Qr_code",
                Treatment AS "Treatment", Store AS "Store", Allow_month AS "Allow_month", 
                Cycle_no AS "Cycle_no", Lab_name AS "Lab_name", Hospital_name AS "Hospital_name", 
                Opd_Ipd AS "Opd_Ipd", Medicine_amount::FLOAT AS "Medicine_amount",
                Medicine1 AS "Medicine1", Price1::FLOAT AS "Price1",
                Medicine2 AS "Medicine2", Price2::FLOAT AS "Price2",
                Medicine3 AS "Medicine3", Price3::FLOAT AS "Price3",
                Medicine4 AS "Medicine4", Price4::FLOAT AS "Price4",
                Medicine5 AS "Medicine5", Price5::FLOAT AS "Price5",
                Medicine6 AS "Medicine6", Price6::FLOAT AS "Price6",
                Medicine7 AS "Medicine7", Price7::FLOAT AS "Price7",
                Medicine8 AS "Medicine8", Price8::FLOAT AS "Price8",
                Medicine9 AS "Medicine9", Price9::FLOAT AS "Price9",
                Medicine10 AS "Medicine10", Price10::FLOAT AS "Price10"
            FROM Treatment2 WHERE Serial_no = $1`, [req.params.serialNo]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Record not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Commit Treatment Session
app.post('/api/treatment/commit', async (req, res) => {
    const {
        treatmentType, employee, items, labName, hospitalName, hospitalType,
        bookNo, patientType, patientNic, reference, vendor,
        store, invoiceNo, description, medicineAmount
    } = req.body;

    try {
        const date = new Date();
        const day = date.getDate();
        const cycleNo = day <= 15 ? '1' : '2';
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const allowMonth = `${monthNames[date.getMonth()]}-${date.getFullYear()}`;

        const qrData = `${employee.empNo}|${employee.name}|${date.toISOString().split('T')[0]}`;
        const qrCode = await QRCode.toDataURL(qrData);

        const insertQuery = `
            INSERT INTO Treatment2 (
                Treatment, Emp_no, Emp_name, Visit_Date, Patient_name, Qr_code,
                Medicine1, Price1, Medicine2, Price2, Medicine3, Price3, Medicine4, Price4, Medicine5, Price5,
                Medicine6, Price6, Medicine7, Price7, Medicine8, Price8, Medicine9, Price9, Medicine10, Price10,
                Lab_name, Hospital_name, Opd_Ipd, Allow_month, Cycle_no,
                Book_no, Patient_type, Patient_nic, Refrence, Vendor,
                Store, Invoice_no, Description, Medicine_amount, Patient
            ) VALUES (
                $1, $2, $3, $4, $5, $6,
                $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
                $17, $18, $19, $20, $21, $22, $23, $24, $25, $26,
                $27, $28, $29, $30, $31,
                $32, $33, $34, $35, $36,
                $37, $38, $39, $40, $41
            ) RETURNING Serial_no
        `;

        const values = [
            treatmentType, employee.empNo, employee.name, date, employee.name, qrCode,
            items[0]?.name || '', items[0]?.price || 0,
            items[1]?.name || '', items[1]?.price || 0,
            items[2]?.name || '', items[2]?.price || 0,
            items[3]?.name || '', items[3]?.price || 0,
            items[4]?.name || '', items[4]?.price || 0,
            items[5]?.name || '', items[5]?.price || 0,
            items[6]?.name || '', items[6]?.price || 0,
            items[7]?.name || '', items[7]?.price || 0,
            items[8]?.name || '', items[8]?.price || 0,
            items[9]?.name || '', items[9]?.price || 0,
            labName || '', hospitalName || '', hospitalType || '', allowMonth, cycleNo,
            bookNo || '', patientType || 'Self', patientNic || '', reference || '', vendor || '',
            store || '', invoiceNo || '', description || '', medicineAmount || 0, patientType || 'Self'
        ];

        const result = await pool.query(insertQuery, values);
        const serialNo = result.rows[0].Serial_no;

        // Create notification for admin
        await pool.query(
            'INSERT INTO notifications (type, title, message, status) VALUES ($1, $2, $3, $4)',
            ['new_record', 'New Treatment Record', `${treatmentType} record added for ${employee.name} (Emp: ${employee.empNo})`, 'unread']
        );

        res.json({
            success: true,
            qrCode,
            cycleNo,
            allowMonth,
            message: 'Treatment record saved successfully',
            serialNo
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================================
// PATIENTS ENDPOINTS
// ============================================================================

// Get All Patients (Registration)
app.get('/api/patients', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM registration ORDER BY id DESC LIMIT 100');
        res.json(result.rows.map(row => ({
            id: row.id.toString(),
            empNo: row.emp_no,
            name: row.emp_name,
            bookNo: row.book_no,
            cnic: row.patient_nic,
            phone: row.phone,
            patientType: row.patient_type,
            rfid_tag: row.rfid_tag,
            custom_fields: row.custom_fields
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create/Register Patient
app.post('/api/patients', async (req, res) => {
    const { empNo, name, bookNo, cnic, phone, patientType, custom_fields } = req.body;
    try {
        const query = `
            INSERT INTO registration (emp_no, emp_name, book_no, patient_nic, phone, patient_type, custom_fields)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (emp_no) DO UPDATE SET
                emp_name = EXCLUDED.emp_name,
                book_no = EXCLUDED.book_no,
                patient_nic = EXCLUDED.patient_nic,
                phone = EXCLUDED.phone,
                patient_type = EXCLUDED.patient_type,
                custom_fields = EXCLUDED.custom_fields
            RETURNING id
        `;
        const result = await pool.query(query, [empNo, name, bookNo, cnic, phone, patientType, JSON.stringify(custom_fields)]);

        // Create notification for admin
        await pool.query(
            'INSERT INTO notifications (type, title, message, status) VALUES ($1, $2, $3, $4)',
            ['new_patient', 'New Patient Registered', `${name} (Emp No: ${empNo}) has been registered in the system.`, 'unread']
        );

        res.json({ success: true, id: result.rows[0].id, message: 'Patient registered successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/patients/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM registration WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Patient not found' });
        }
        const row = result.rows[0];
        res.json({
            id: row.id.toString(),
            empNo: row.emp_no,
            name: row.emp_name,
            bookNo: row.book_no,
            cnic: row.patient_nic,
            phone: row.phone,
            patientType: row.patient_type,
            rfid_tag: row.rfid_tag,
            custom_fields: row.custom_fields
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/patients/:id/link-card', async (req, res) => {
    try {
        const { rfidTag } = req.body;
        await pool.query('UPDATE registration SET rfid_tag = $1 WHERE id = $2', [rfidTag, req.params.id]);
        res.json({ success: true, message: 'RFID card linked successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/patients/by-tag/:tag', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM registration WHERE rfid_tag = $1', [req.params.tag]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No patient found with this RFID tag' });
        }
        const row = result.rows[0];
        res.json({
            id: row.id.toString(),
            empNo: row.emp_no,
            name: row.emp_name,
            bookNo: row.book_no,
            cnic: row.patient_nic,
            phone: row.phone,
            patientType: row.patient_type,
            rfid_tag: row.rfid_tag,
            custom_fields: row.custom_fields
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Auto-initialize legacy schema on startup
const initSchema = async () => {
    try {
        console.log('🔄 Initializing database schema...');
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                full_name TEXT,
                role TEXT DEFAULT 'user',
                permissions JSONB DEFAULT '[]',
                emp_no TEXT,
                phone TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS registration (
                id SERIAL PRIMARY KEY,
                emp_no TEXT UNIQUE,
                emp_name TEXT,
                book_no TEXT,
                patient_nic TEXT,
                phone TEXT,
                patient_type TEXT,
                rfid_tag TEXT,
                custom_fields JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS otp_verifications (
                id SERIAL PRIMARY KEY,
                phone TEXT NOT NULL,
                code TEXT NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                verified BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                type TEXT,
                title TEXT,
                message TEXT,
                status TEXT DEFAULT 'unread',
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            -- Ensure treatment2 exists
            CREATE TABLE IF NOT EXISTS treatment2 (
                serial_no SERIAL PRIMARY KEY,
                treatment TEXT,
                emp_no TEXT,
                phone TEXT,
                emp_name TEXT,
                visit_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                patient_name TEXT,
                qr_code TEXT,
                medicine_amount DECIMAL(10,2),
                lab_name TEXT,
                hospital_name TEXT,
                hospital_type TEXT,
                opd_ipd TEXT,
                allow_month TEXT,
                cycle_no TEXT,
                store TEXT,
                book_no TEXT,
                invoice_no TEXT,
                description TEXT
            );

            CREATE TABLE IF NOT EXISTS medical_cards (
                id SERIAL PRIMARY KEY,
                user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
                card_no TEXT,
                participant_name TEXT,
                emp_no TEXT,
                phone TEXT,
                cnic TEXT,
                customer_no TEXT,
                dob DATE,
                valid_upto DATE,
                branch TEXT,
                benefit_covered TEXT,
                hospitalization TEXT,
                room_limit TEXT,
                normal_delivery TEXT,
                c_section_limit TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS medicines (
                id SERIAL PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                price DECIMAL(10,2) DEFAULT 0,
                category TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        await pool.query(createTableQuery);

        // Run migrations for existing tables
        const migrationQuery = `
            DO $$ 
            BEGIN 
                -- treatment2 additions
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='treatment2' AND column_name='book_no') THEN
                    ALTER TABLE treatment2 ADD COLUMN book_no TEXT;
                END IF;
                -- registration additions
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='registration' AND column_name='emp_no') THEN
                    ALTER TABLE registration ADD COLUMN emp_no TEXT;
                END IF;
                -- notifications additions
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='metadata') THEN
                    ALTER TABLE notifications ADD COLUMN metadata JSONB DEFAULT '{}';
                END IF;
            END $$;
        `;
        await pool.query(migrationQuery);

        console.log('✅ Database schema initialized and migrated.');
    } catch (err) {
        console.error('❌ Schema Initialization Failed:', err.message);
    }
};

// Start Server
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, async () => {
        console.log(`Server running on http://localhost:${PORT}`);
        console.log('Database: PostgreSQL via Supabase');
        await initSchema();
    });
}

// Export for Vercel
module.exports = app;
