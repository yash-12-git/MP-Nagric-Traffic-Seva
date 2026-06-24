// Auth routes: citizen OTP (mocked) and officer badge+password login.

const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { signToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

const DEMO_OTP = process.env.DEMO_OTP || '123456';

function normalisePhone(raw) {
  if (!raw) return null;
  let p = String(raw).replace(/\s|-/g, '');
  if (!p.startsWith('+')) {
    // assume Indian number
    p = p.replace(/^0+/, '');
    if (p.length === 10) p = '+91' + p;
    else if (p.startsWith('91')) p = '+' + p;
    else p = '+91' + p;
  }
  return p;
}

// POST /api/auth/citizen/send-otp  — DEMO ONLY: always "sends" 123456.
// SWAP-TO-PRODUCTION: integrate MSG91 / TextLocal SMS here.
router.post('/citizen/send-otp', (req, res) => {
  try {
    const phone = normalisePhone(req.body.phone);
    if (!phone) return res.status(400).json({ success: false, error: 'Phone number is required' });
    console.log(`[auth] (mock SMS) OTP for ${phone} is ${DEMO_OTP}`);
    return res.json({
      success: true,
      data: { phone, message: 'OTP sent', demo_otp: DEMO_OTP },
    });
  } catch (err) {
    console.error('[auth] send-otp error:', err);
    return res.status(500).json({ success: false, error: 'Failed to send OTP' });
  }
});

// POST /api/auth/citizen/verify-otp — verify OTP, upsert user, return JWT.
router.post('/citizen/verify-otp', (req, res) => {
  try {
    const phone = normalisePhone(req.body.phone);
    const { otp, full_name } = req.body;
    if (!phone || !otp) return res.status(400).json({ success: false, error: 'Phone and OTP are required' });
    if (String(otp) !== DEMO_OTP) {
      return res.status(401).json({ success: false, error: 'Invalid OTP' });
    }

    let user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
    if (!user) {
      const info = db
        .prepare('INSERT INTO users (phone, full_name, is_verified) VALUES (?, ?, 1)')
        .run(phone, full_name || 'Citizen User');
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
      console.log(`[auth] new citizen registered: ${phone}`);
    } else if (!user.is_verified) {
      db.prepare('UPDATE users SET is_verified = 1 WHERE id = ?').run(user.id);
      user.is_verified = 1;
    }

    const token = signToken({ kind: 'user', id: user.id, phone: user.phone });
    return res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          phone: user.phone,
          full_name: user.full_name,
          points: user.points,
          is_verified: 1,
        },
      },
    });
  } catch (err) {
    console.error('[auth] verify-otp error:', err);
    return res.status(500).json({ success: false, error: 'Failed to verify OTP' });
  }
});

// POST /api/auth/officer/login — badge_number + password.
router.post('/officer/login', (req, res) => {
  try {
    const { badge_number, password } = req.body;
    if (!badge_number || !password) {
      return res.status(400).json({ success: false, error: 'Badge number and password are required' });
    }
    const officer = db.prepare('SELECT * FROM officers WHERE badge_number = ?').get(badge_number);
    if (!officer || !bcrypt.compareSync(password, officer.password_hash)) {
      return res.status(401).json({ success: false, error: 'Invalid badge number or password' });
    }
    const token = signToken({ kind: 'officer', id: officer.id, badge: officer.badge_number });
    return res.json({
      success: true,
      data: {
        token,
        officer: {
          id: officer.id,
          badge_number: officer.badge_number,
          full_name: officer.full_name,
          jurisdiction: officer.jurisdiction,
        },
      },
    });
  } catch (err) {
    console.error('[auth] officer login error:', err);
    return res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// GET /api/auth/me — current profile (user or officer).
router.get('/me', requireAuth, (req, res) => {
  try {
    if (req.auth.kind === 'officer') {
      const o = db
        .prepare('SELECT id, badge_number, full_name, jurisdiction FROM officers WHERE id = ?')
        .get(req.auth.id);
      if (!o) return res.status(404).json({ success: false, error: 'Officer not found' });
      return res.json({ success: true, data: { kind: 'officer', ...o } });
    }
    const u = db
      .prepare('SELECT id, phone, full_name, points, total_reports, accepted_reports, is_verified FROM users WHERE id = ?')
      .get(req.auth.id);
    if (!u) return res.status(404).json({ success: false, error: 'User not found' });
    return res.json({ success: true, data: { kind: 'user', ...u } });
  } catch (err) {
    console.error('[auth] me error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load profile' });
  }
});

module.exports = router;
