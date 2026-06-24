// MP Nagrik Traffic Seva — API server entrypoint (Phase 0 demo).

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');

const db = require('./config/database');
const { ping: ocrPing } = require('./services/ocrService');

const authRoutes = require('./routes/auth');
const caseRoutes = require('./routes/cases');
const officerRoutes = require('./routes/officer');
const mediaRoutes = require('./routes/media');
const challanRoutes = require('./routes/challans');
const analyticsRoutes = require('./routes/analytics');

const PORT = parseInt(process.env.PORT || '3001', 10);
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging — keep the demo terminal lively.
app.use((req, res, next) => {
  console.log(`[api] ${req.method} ${req.originalUrl}`);
  next();
});

// Ensure schema exists even if init.js wasn't run (idempotent).
try {
  const schema = fs.readFileSync(path.join(__dirname, 'db/schema.sql'), 'utf8');
  db.exec(schema);
} catch (err) {
  console.error('[api] schema bootstrap failed:', err.message);
}

// Health + reference endpoints.
app.get('/health', (req, res) => res.json({ success: true, data: { status: 'ok', service: 'mp-traffic-api' } }));

app.get('/api/violation-types', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM violation_types ORDER BY id ASC').all();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to load violation types' });
  }
});

// Routes.
app.use('/api/auth', authRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/officer', officerRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/challans', challanRoutes);
app.use('/api/analytics', analyticsRoutes);

// 404.
app.use((req, res) => res.status(404).json({ success: false, error: 'Not found' }));

// Central error handler (e.g. multer file-size errors).
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[api] unhandled error:', err.message);
  const status = err.status || (err.code === 'LIMIT_FILE_SIZE' ? 413 : 500);
  res.status(status).json({ success: false, error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log('================================================');
  console.log(`  MP Nagrik Traffic Seva API`);
  console.log(`  Listening on http://localhost:${PORT}`);
  console.log('================================================');
  // Non-fatal OCR health check.
  ocrPing().then((r) => {
    if (r && r.ok !== false) console.log('[api] OCR service reachable:', JSON.stringify(r));
    else console.warn('[api] OCR service NOT reachable — submissions will fall back to manual plate entry.');
  });
});

module.exports = app;
