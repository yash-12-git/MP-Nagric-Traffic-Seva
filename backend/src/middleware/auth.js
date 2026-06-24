// JWT auth middleware.
//
// Tokens carry { kind: 'user'|'officer', id, ... }. We expose two guards:
//   requireAuth   — any valid token
//   requireOfficer / requireCitizen — role-scoped
//
// SWAP-TO-PRODUCTION: add refresh tokens + short-lived access tokens, and rotate
// JWT_SECRET out of .env into a secrets manager. Currently single non-refresh JWT.

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'demo-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function extractToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  // DEMO ONLY: allow ?token= for media/PDF loaded directly in <img>/<video>/<iframe>
  // tags, which cannot set an Authorization header.
  if (req.query && req.query.token) return String(req.query.token);
  return null;
}

function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  try {
    req.auth = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

function requireOfficer(req, res, next) {
  requireAuth(req, res, () => {
    if (req.auth.kind !== 'officer') {
      return res.status(403).json({ success: false, error: 'Officer access required' });
    }
    next();
  });
}

function requireCitizen(req, res, next) {
  requireAuth(req, res, () => {
    if (req.auth.kind !== 'user') {
      return res.status(403).json({ success: false, error: 'Citizen access required' });
    }
    next();
  });
}

module.exports = { signToken, requireAuth, requireOfficer, requireCitizen, JWT_SECRET };
