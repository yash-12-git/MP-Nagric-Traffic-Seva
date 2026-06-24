// Media routes: serve evidence files and thumbnails (auth required).

const fs = require('fs');
const path = require('path');
const express = require('express');
const db = require('../config/database');
const { requireAuth } = require('../middleware/auth');
const { UPLOAD_DIR } = require('../middleware/upload');

const router = express.Router();

const THUMB_DIR = path.join(UPLOAD_DIR, 'thumbnails');

// Guard against path traversal — only allow a bare filename.
function safeName(name) {
  return path.basename(String(name || ''));
}

// GET /api/media/thumbnail/:case_id — serve a case thumbnail.
router.get('/thumbnail/:case_id', requireAuth, (req, res) => {
  try {
    const c = db.prepare('SELECT thumbnail_path FROM cases WHERE id = ?').get(Number(req.params.case_id));
    if (!c || !c.thumbnail_path) {
      return res.status(404).json({ success: false, error: 'Thumbnail not found' });
    }
    // thumbnail_path may live under uploads/ or uploads/thumbnails/
    const candidates = [
      path.join(THUMB_DIR, safeName(c.thumbnail_path)),
      path.join(UPLOAD_DIR, safeName(c.thumbnail_path)),
    ];
    const found = candidates.find((p) => fs.existsSync(p));
    if (!found) return res.status(404).json({ success: false, error: 'Thumbnail file missing' });
    return res.sendFile(found);
  } catch (err) {
    console.error('[media] thumbnail error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load thumbnail' });
  }
});

// GET /api/media/:filename — serve an evidence file.
router.get('/:filename', requireAuth, (req, res) => {
  try {
    const name = safeName(req.params.filename);
    const abs = path.join(UPLOAD_DIR, name);
    if (!fs.existsSync(abs)) {
      return res.status(404).json({ success: false, error: 'Media not found' });
    }
    return res.sendFile(abs);
  } catch (err) {
    console.error('[media] serve error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load media' });
  }
});

module.exports = router;
