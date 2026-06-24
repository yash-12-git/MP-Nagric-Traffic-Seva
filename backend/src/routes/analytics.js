// Analytics routes for the dashboard: overview metrics, per-type breakdown,
// and GPS hotspots for the map.

const express = require('express');
const db = require('../config/database');
const { requireOfficer } = require('../middleware/auth');

const router = express.Router();

// GET /api/analytics/overview — totals, challans, amounts, avg resolution time.
router.get('/overview', requireOfficer, (req, res) => {
  try {
    const base = db
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM cases) AS total_cases,
           (SELECT COUNT(*) FROM cases WHERE status='PENDING') AS pending,
           (SELECT COUNT(*) FROM cases WHERE status='UNDER_REVIEW') AS under_review,
           (SELECT COUNT(*) FROM cases WHERE status='REJECTED') AS rejected,
           (SELECT COUNT(*) FROM challans) AS challans_issued,
           (SELECT COALESCE(SUM(fine_amount),0) FROM challans) AS total_fines`
      )
      .get();

    // Average resolution time (hours) over resolved cases.
    const resolved = db
      .prepare(
        `SELECT submitted_at, resolved_at FROM cases
         WHERE resolved_at IS NOT NULL AND submitted_at IS NOT NULL`
      )
      .all();
    let avgHours = 0;
    if (resolved.length) {
      const sum = resolved.reduce((acc, r) => {
        const d = (new Date(r.resolved_at) - new Date(r.submitted_at)) / 36e5;
        return acc + (isFinite(d) && d >= 0 ? d : 0);
      }, 0);
      avgHours = +(sum / resolved.length).toFixed(1);
    }

    return res.json({ success: true, data: { ...base, avg_resolution_hours: avgHours } });
  } catch (err) {
    console.error('[analytics] overview error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load overview' });
  }
});

// GET /api/analytics/violations — count + fines grouped by violation type.
router.get('/violations', requireOfficer, (req, res) => {
  try {
    const rows = db
      .prepare(
        `SELECT vt.code, vt.label_en, vt.fine_amount,
                COUNT(c.id) AS count
         FROM violation_types vt
         LEFT JOIN cases c ON c.violation_type_id = vt.id
         GROUP BY vt.id
         ORDER BY count DESC`
      )
      .all();
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[analytics] violations error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load violation breakdown' });
  }
});

// GET /api/analytics/hotspots — GPS points for the map.
router.get('/hotspots', requireOfficer, (req, res) => {
  try {
    const rows = db
      .prepare(
        `SELECT c.id, c.case_number, c.latitude, c.longitude, c.status, c.location_address,
                vt.label_en AS violation_label
         FROM cases c
         JOIN violation_types vt ON vt.id = c.violation_type_id
         WHERE c.latitude IS NOT NULL AND c.longitude IS NOT NULL`
      )
      .all();
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[analytics] hotspots error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load hotspots' });
  }
});

// GET /api/analytics/timeseries — cases per day (last 30 days) for the line chart.
router.get('/timeseries', requireOfficer, (req, res) => {
  try {
    const rows = db
      .prepare(
        `SELECT DATE(submitted_at) AS day, COUNT(*) AS count
         FROM cases
         WHERE submitted_at >= DATE('now', '-30 days')
         GROUP BY DATE(submitted_at)
         ORDER BY day ASC`
      )
      .all();
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[analytics] timeseries error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load timeseries' });
  }
});

module.exports = router;
