const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer'); //sending email for verification
const bcrypt = require('bcrypt');
require('dotenv').config();
const mysql = require('mysql2/promise');

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});


const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    auth: {
        user: '903d66001@smtp-brevo.com',     
        pass: process.env.SMTP_PASSWORD,   
    },
});

// Utils
async function sendEmail(to, message) {
  await transporter.sendMail({
    from: '"Support Capybara App" <capybaraproject2025@gmail.com>',
    to,
    subject: 'Kode OTP Reset Password',
    text: message,
  });
}

async function findUserByEmail(email) {
  const [rows] = await db.query('SELECT * FROM user_data WHERE email = ?', [email]);
  return rows[0] || null;
}

async function saveOTP(user_id, otp, expiresAt) {
  await db.query(
    'INSERT INTO password_reset (user_id, token, expires_at) VALUES (?, ?, ?)',
    [user_id, otp, expiresAt]
  );
}

async function getOTPRecord(user_id, otp) {
  const [rows] = await db.query(
    'SELECT * FROM password_reset WHERE user_id = ? AND token = ? AND expires_at > NOW() ORDER BY expires_at DESC LIMIT 1',
    [user_id, otp]
  );
  return rows[0] || null;
}

async function deleteOTP(user_id, otp) {
  await db.query('DELETE FROM password_reset WHERE user_id = ? AND token = ?', [user_id, otp]);
}

async function updateUserPassword(user_id, hashedPassword) {
  await db.query('UPDATE user_data SET password = ? WHERE user_id = ?', [hashedPassword, user_id]);
}

// -------------------------------------
// Endpoint 1: Request reset passwords
router.post('/request_reset_password', async (req, res) => {
  const { email } = req.body;

  const user = await findUserByEmail(email);
  if (!user) {
    return res.status(200).json({ message: 'If email exists, reset instruction will be sent.' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); //expired in 10 minutes;

  await saveOTP(user.user_id, otp, expiresAt);
  await sendEmail(user.email, `Your verification code: ${otp}`);

  res.json({ message: 'Your verification code has been sent to your email!' });
});

// -------------------------------------
// Endpoint 2: Verify OTP
router.post('/verify_otp', async (req, res) => {
  const { email, otp } = req.body;

  const user = await findUserByEmail(email);
  if (!user) return res.status(400).json({ error: 'Invalid email!' });

  const record = await getOTPRecord(user.user_id, otp);
  if (!record) return res.status(400).json({ error: 'Wrong or expired code!' });

  res.json({ success: true, message: 'OTP valid. You may now reset your password.' });
});

// -------------------------------------
// Endpoint 3: Reset Password
router.post('/reset_password', async (req, res) => {
  const { email, otp, newPassword } = req.body;

  const user = await findUserByEmail(email);
  if (!user) return res.status(400).json({ error: 'User not found!' });

  const record = await getOTPRecord(user.user_id, otp);
  if (!record || new Date(record.expires_at) < new Date()) {
    return res.status(400).json({ error: 'Wrong OTP or Expired Code!' });
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await updateUserPassword(user.user_id, hashed);
  await deleteOTP(user.user_id, otp);

  res.json({ message: 'Password changed!' });
});

module.exports = router;