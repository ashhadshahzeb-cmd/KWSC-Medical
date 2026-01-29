// HealFlow Backend Server - SQL Server Version
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const path = require('path');

const { pool } = require('./db.cjs');

const app = express();
const PORT = process.env.PORT || 5000;
const MASTER_KEY = process.env.MASTER_KEY || '8271933';

// Export for Vercel
module.exports = app;

// Middleware
app.use(cors());
app.use(express.json());

// Request Logging Middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Root route for status check
app.get('/', (req, res) => {
    res.json({ message: 'HealFlow API is running', env: process.env.NODE_ENV });
});

// Standalone ping for quick verification
app.get('/api/ping', (req, res) => {
    res.json({ pong: true, time: new Date().toISOString(), mode: 'CJS' });
});

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
        const result = await pool.query('SELECT * FROM medical_cards WHERE user_id = $1', [req.params.id]);
        res.json(result.rows[0] || null);
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

        const query = `
            INSERT INTO medical_cards (
                user_id, card_no, participant_name, emp_no, cnic, customer_no, dob, valid_upto, branch,
                benefit_covered, hospitalization, room_limit, normal_delivery, c_section_limit
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
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
                c_section_limit = EXCLUDED.c_section_limit
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
            c_section_limit || null
        ];

        const result = await pool.query(query, params);
        res.json({ success: true, card: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/users/:id/card', async (req, res) => {
    try {
        await pool.query('DELETE FROM medical_cards WHERE user_id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Chat Endpoints
app.get('/api/chat/users', async (req, res) => {
    try {
        const query = `
            SELECT DISTINCT u.id, u.full_name, u.email
            FROM users u
            JOIN chat_messages m ON (u.id = m.sender_id OR u.id = m.receiver_id)
            WHERE u.role != 'admin'
            ORDER BY u.id
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/chat/history/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const query = `
            SELECT * FROM chat_messages
            WHERE (sender_id = $1 AND receiver_id IS NULL)
               OR (sender_id IS NULL AND receiver_id = $1)
               OR (sender_id = $1 AND receiver_id IN (SELECT id FROM users WHERE role = 'admin'))
               OR (sender_id IN (SELECT id FROM users WHERE role = 'admin') AND receiver_id = $1)
            ORDER BY created_at ASC
        `;
        const result = await pool.query(query, [userId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/chat/send', async (req, res) => {
    const { senderId, receiverId, message, isAdminMessage } = req.body;
    try {
        const query = `
            INSERT INTO chat_messages (sender_id, receiver_id, message, is_admin_message)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const result = await pool.query(query, [senderId, receiverId, message, isAdminMessage]);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DASHBOARD
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const patientsCount = await pool.query('SELECT COUNT(*) FROM registration');
        const medicineCount = await pool.query('SELECT COUNT(*) FROM treatment2 WHERE treatment = $1 OR medicine_amount > 0', ['medicine']);
        const hospitalCount = await pool.query('SELECT COUNT(*) FROM treatment2 WHERE hospital_name IS NOT NULL AND hospital_name != $1', ['']);
        const labCount = await pool.query('SELECT COUNT(*) FROM treatment2 WHERE lab_name IS NOT NULL AND lab_name != $1', ['']);
        const recentActivities = await pool.query('SELECT * FROM treatment2 ORDER BY visit_date DESC LIMIT 10');

        res.json({
            patients: parseInt(patientsCount.rows[0].count),
            medicine: parseInt(medicineCount.rows[0].count),
            hospital: parseInt(hospitalCount.rows[0].count),
            lab: parseInt(labCount.rows[0].count),
            recentActivities: recentActivities.rows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// MEDICINES
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

// AUTH
app.post('/api/auth/signup', async (req, res) => {
    const { email, password, fullName, empNo } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO users (email, password, full_name, emp_no, role) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [email, password, fullName, empNo, 'user']
        );
        res.json({ success: true, user: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1 AND password = $2', [email, password]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            res.json({
                success: true,
                user: { id: user.id, email: user.email, name: user.full_name, role: user.role, empNo: user.emp_no, permissions: user.permissions }
            });
        } else {
            if (email === 'admin@healflow.com' && password === 'Admin') {
                const checkAdmin = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
                let adminUser;
                if (checkAdmin.rows.length === 0) {
                    const insertAdmin = await pool.query('INSERT INTO users (email, password, full_name, role) VALUES ($1, $2, $3, $4) RETURNING *', [email, 'Admin', 'HealFlow Admin', 'admin']);
                    adminUser = insertAdmin.rows[0];
                } else { adminUser = checkAdmin.rows[0]; }
                return res.json({
                    success: true,
                    user: { id: adminUser.id, email: adminUser.email, name: adminUser.full_name, role: adminUser.role, empNo: adminUser.emp_no, permissions: adminUser.permissions || [] }
                });
            }
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATIENTS
app.get('/api/patients', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM Registration ORDER BY Id DESC LIMIT 100');
        res.json(result.rows.map(row => ({ id: row.Id.toString(), empNo: row.Emp_no, name: row.Emp_name, bookNo: row.Book_no, cnic: row.Patient_nic, phone: row.Phone, patientType: row.Patient_type, rfid_tag: row.RFID_Tag, custom_fields: row.Custom_fields })));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/patients', async (req, res) => {
    const { empNo, name, bookNo, cnic, phone, patientType, custom_fields } = req.body;
    try {
        const query = `INSERT INTO Registration (Emp_no, Emp_name, Book_no, Patient_nic, Phone, Patient_type, Custom_fields) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (Emp_no) DO UPDATE SET Emp_name = EXCLUDED.Emp_name, Book_no = EXCLUDED.Book_no, Patient_nic = EXCLUDED.Patient_nic, Phone = EXCLUDED.Phone, Patient_type = EXCLUDED.Patient_type, Custom_fields = EXCLUDED.Custom_fields RETURNING Id`;
        const result = await pool.query(query, [empNo, name, bookNo, cnic, phone, patientType, JSON.stringify(custom_fields)]);
        res.json({ success: true, id: result.rows[0].id });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// TREATMENT COMMIT
app.post('/api/treatment/commit', async (req, res) => {
    const { treatmentType, employee, items, labName, hospitalName, hospitalType, bookNo, patientType, patientNic, reference, vendor, store, invoiceNo, description, medicineAmount } = req.body;
    try {
        const date = new Date();
        const cycleNo = date.getDate() <= 15 ? '1' : '2';
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const allowMonth = `${monthNames[date.getMonth()]}-${date.getFullYear()}`;
        const qrCode = await QRCode.toDataURL(`${employee.empNo}|${employee.name}|${date.toISOString()}`);
        const insertQuery = `INSERT INTO Treatment2 (Treatment, Emp_no, Emp_name, Visit_Date, Patient_name, Qr_code, Medicine1, Price1, Medicine2, Price2, Medicine3, Price3, Medicine4, Price4, Medicine5, Price5, Medicine6, Price6, Medicine7, Price7, Medicine8, Price8, Medicine9, Price9, Medicine10, Price10, Lab_name, Hospital_name, Opd_Ipd, Allow_month, Cycle_no, Book_no, Patient_type, Patient_nic, Refrence, Vendor, Store, Invoice_no, Description, Medicine_amount, Patient) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41) RETURNING Serial_no`;
        const values = [treatmentType, employee.empNo, employee.name, date, employee.name, qrCode, items[0]?.name || '', items[0]?.price || 0, items[1]?.name || '', items[1]?.price || 0, items[2]?.name || '', items[2]?.price || 0, items[3]?.name || '', items[3]?.price || 0, items[4]?.name || '', items[4]?.price || 0, items[5]?.name || '', items[5]?.price || 0, items[6]?.name || '', items[6]?.price || 0, items[7]?.name || '', items[7]?.price || 0, items[8]?.name || '', items[8]?.price || 0, items[9]?.name || '', items[9]?.price || 0, labName || '', hospitalName || '', hospitalType || '', allowMonth, cycleNo, bookNo || '', patientType || 'Self', patientNic || '', reference || '', vendor || '', store || '', invoiceNo || '', description || '', medicineAmount || 0, patientType || 'Self'];
        const result = await pool.query(insertQuery, values);
        res.json({ success: true, serialNo: result.rows[0].Serial_no, qrCode });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// SETUP
app.post('/api/setup/init-db', async (req, res) => {
    try { await initSchema(); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); }
});

const initSchema = async () => {
    // ... Simplified Schema Init ...
    const query = `CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, email TEXT UNIQUE, password TEXT, full_name TEXT, role TEXT);
                   CREATE TABLE IF NOT EXISTS registration (id SERIAL PRIMARY KEY, emp_no TEXT UNIQUE, emp_name TEXT);
                   CREATE TABLE IF NOT EXISTS treatment2 (serial_no SERIAL PRIMARY KEY, treatment TEXT, emp_no TEXT, medicine_amount DECIMAL);`;
    await pool.query(query);
};

// Error Handler
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal Error', message: err.message });
});

if (require.main === module) {
    app.listen(PORT, () => console.log(`Server on ${PORT}`));
}
