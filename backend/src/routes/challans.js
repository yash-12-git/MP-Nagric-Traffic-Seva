// Challan routes: fetch challan details and download the generated PDF/HTML.

const fs = require('fs');
const path = require('path');
const express = require('express');
const db = require('../config/database');
const { requireAuth } = require('../middleware/auth');
const { UPLOAD_DIR } = require('../middleware/upload');

const router = express.Router();
const CHALLAN_DIR = path.join(UPLOAD_DIR, 'challans');

// GET /api/challans/:challan_number — challan details joined with its case.
router.get('/:challan_number', requireAuth, (req, res) => {
  try {
    const ch = db
      .prepare(
        `SELECT ch.*, c.case_number, c.plate_number, c.location_address, c.incident_time,
                c.vehicle_owner_name, c.vehicle_owner_address, c.vehicle_type,
                vt.label_en AS violation_label, vt.mv_act_section AS violation_section,
                o.full_name AS officer_name, o.badge_number AS officer_badge
         FROM challans ch
         JOIN cases c ON c.id = ch.case_id
         JOIN violation_types vt ON vt.id = c.violation_type_id
         JOIN officers o ON o.id = ch.issued_by_officer_id
         WHERE ch.challan_number = ?`
      )
      .get(req.params.challan_number);
    if (!ch) return res.status(404).json({ success: false, error: 'Challan not found' });
    return res.json({ success: true, data: ch });
  } catch (err) {
    console.error('[challans] detail error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load challan' });
  }
});

// GET /api/challans/:challan_number/pdf — stream the generated document.
router.get('/:challan_number/pdf', requireAuth, (req, res) => {
  try {
    const ch = db.prepare('SELECT pdf_path FROM challans WHERE challan_number = ?').get(req.params.challan_number);
    if (!ch) return res.status(404).json({ success: false, error: 'Challan not found' });

    // Resolve the stored file, or fall back to either extension.
    const base = path.basename(ch.pdf_path || `${req.params.challan_number}.pdf`);
    const candidates = [
      path.join(CHALLAN_DIR, base),
      path.join(CHALLAN_DIR, `${req.params.challan_number}.pdf`),
      path.join(CHALLAN_DIR, `${req.params.challan_number}.html`),
    ];
    const found = candidates.find((p) => fs.existsSync(p));
    if (!found) return res.status(404).json({ success: false, error: 'Challan document not generated' });

    res.setHeader('Content-Type', found.endsWith('.pdf') ? 'application/pdf' : 'text/html');
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(found)}"`);
    return res.sendFile(found);
  } catch (err) {
    console.error('[challans] pdf error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load challan PDF' });
  }
});

module.exports = router;
