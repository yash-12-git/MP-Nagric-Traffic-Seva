// Officer routes: case queue, full case detail, approve (issue challan), reject,
// and dashboard analytics summary.

const fs = require('fs');
const path = require('path');
const express = require('express');
const db = require('../config/database');
const { requireOfficer } = require('../middleware/auth');
const { UPLOAD_DIR } = require('../middleware/upload');
const { verifyFile } = require('../services/evidenceHash');
const { lookupVahan } = require('../services/vahanMock');
const { generateChallanPdf } = require('../services/challanPdf');
const { nextChallanNumber, audit } = require('../services/helpers');

const router = express.Router();

function fmtDate(d) {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date)) return String(d);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
}
function fmtDateTime(d) {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date)) return String(d);
  return date.toLocaleString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// GET /api/officer/cases — paginated queue with filters.
router.get('/cases', requireOfficer, (req, res) => {
  try {
    const { status, violation_type_id, from, to } = req.query;
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const offset = (page - 1) * limit;

    const where = [];
    const params = {};
    if (status) { where.push('c.status = @status'); params.status = status; }
    if (violation_type_id) { where.push('c.violation_type_id = @vt'); params.vt = Number(violation_type_id); }
    if (from) { where.push('c.submitted_at >= @from'); params.from = from; }
    if (to) { where.push('c.submitted_at <= @to'); params.to = to; }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const total = db.prepare(`SELECT COUNT(*) AS n FROM cases c ${whereSql}`).get(params).n;
    const rows = db
      .prepare(
        `SELECT c.id, c.case_number, c.status, c.plate_number, c.plate_confidence,
                c.media_type, c.thumbnail_path, c.location_address, c.latitude, c.longitude,
                c.submitted_at, c.incident_time, c.vehicle_owner_name,
                vt.label_en AS violation_label, vt.code AS violation_code, vt.fine_amount
         FROM cases c
         JOIN violation_types vt ON vt.id = c.violation_type_id
         ${whereSql}
         ORDER BY c.submitted_at DESC
         LIMIT @limit OFFSET @offset`
      )
      .all({ ...params, limit, offset });

    return res.json({ success: true, data: { cases: rows, page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('[officer] queue error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load case queue' });
  }
});

// GET /api/officer/cases/:id — full detail incl. OCR + VAHAN + evidence integrity.
router.get('/cases/:id', requireOfficer, (req, res) => {
  try {
    const c = db
      .prepare(
        `SELECT c.*, vt.label_en AS violation_label, vt.label_hi AS violation_label_hi,
                vt.code AS violation_code, vt.fine_amount, vt.mv_act_section, vt.points_for_reporter,
                u.full_name AS reporter_name, u.phone AS reporter_phone
         FROM cases c
         JOIN violation_types vt ON vt.id = c.violation_type_id
         JOIN users u ON u.id = c.reporter_id
         WHERE c.id = ?`
      )
      .get(Number(req.params.id));
    if (!c) return res.status(404).json({ success: false, error: 'Case not found' });

    // Evidence integrity check — re-hash the stored media file.
    let integrity = { verified: false, currentHash: null, storedHash: c.media_hash };
    if (c.media_path) {
      const abs = path.join(UPLOAD_DIR, c.media_path);
      integrity = verifyFile(abs, c.media_hash);
    }

    let ocrParsed = null;
    try { ocrParsed = c.ocr_raw_result ? JSON.parse(c.ocr_raw_result) : null; } catch { /* ignore */ }

    const challan = db.prepare('SELECT * FROM challans WHERE case_id = ?').get(c.id);
    const auditTrail = db
      .prepare('SELECT actor_type, actor_id, action, metadata, created_at FROM audit_log WHERE case_id = ? ORDER BY created_at ASC')
      .all(c.id);

    return res.json({
      success: true,
      data: {
        ...c,
        ocr_raw_result: ocrParsed,
        evidence_integrity: integrity,
        challan: challan || null,
        audit_trail: auditTrail,
      },
    });
  } catch (err) {
    console.error('[officer] detail error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load case' });
  }
});

// PATCH /api/officer/cases/:id/approve — confirm violation and issue challan.
router.patch('/cases/:id/approve', requireOfficer, async (req, res) => {
  try {
    const caseId = Number(req.params.id);
    const { officer_note, confirmed_plate, violation_type_id } = req.body;

    const c = db.prepare('SELECT * FROM cases WHERE id = ?').get(caseId);
    if (!c) return res.status(404).json({ success: false, error: 'Case not found' });
    if (c.status === 'CHALLAN_ISSUED') {
      return res.status(409).json({ success: false, error: 'Challan already issued for this case' });
    }
    if (c.status === 'REJECTED') {
      return res.status(409).json({ success: false, error: 'Case was rejected and cannot be approved' });
    }

    // Officer may correct the OCR plate and the violation type.
    const finalPlate = (confirmed_plate || c.plate_number || '').toUpperCase().replace(/\s/g, '');
    if (!finalPlate) {
      return res.status(400).json({ success: false, error: 'A plate number is required to issue a challan' });
    }
    const vtId = violation_type_id ? Number(violation_type_id) : c.violation_type_id;
    const vt = db.prepare('SELECT * FROM violation_types WHERE id = ?').get(vtId);
    if (!vt) return res.status(400).json({ success: false, error: 'Invalid violation_type_id' });

    // Refresh VAHAN owner details for the (possibly corrected) plate.
    const vahan = lookupVahan(finalPlate);

    const now = new Date();
    const dueDate = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 days

    // Update the case.
    db.prepare(
      `UPDATE cases SET status='CHALLAN_ISSUED', plate_number=@plate, violation_type_id=@vt,
        vehicle_owner_name=@owner, vehicle_owner_address=@addr, vehicle_type=@vtype,
        vehicle_registration_date=@regdate, officer_note=@note,
        assigned_officer_id=@officer, reviewed_at=@now, resolved_at=@now
       WHERE id=@id`
    ).run({
      plate: finalPlate, vt: vtId, owner: vahan.owner_name, addr: vahan.owner_address,
      vtype: vahan.vehicle_type, regdate: vahan.registration_date, note: officer_note || null,
      officer: req.auth.id, now: now.toISOString(), id: caseId,
    });

    // Create the challan record.
    const challanNumber = nextChallanNumber();
    const challanInfo = db
      .prepare(
        `INSERT INTO challans (case_id, challan_number, issued_by_officer_id, fine_amount, mv_act_section, status, issued_at, due_date)
         VALUES (?, ?, ?, ?, ?, 'UNPAID', ?, ?)`
      )
      .run(caseId, challanNumber, req.auth.id, vt.fine_amount, vt.mv_act_section, now.toISOString(), dueDate.toISOString());

    // Award points to the reporter and bump accepted count.
    db.prepare('UPDATE users SET points = points + ?, accepted_reports = accepted_reports + 1 WHERE id = ?')
      .run(vt.points_for_reporter, c.reporter_id);

    // Generate the challan PDF (with embedded evidence thumbnail if present).
    const officer = db.prepare('SELECT badge_number, full_name FROM officers WHERE id = ?').get(req.auth.id);
    let thumbDataUri = null;
    if (c.thumbnail_path) {
      try {
        const abs = path.join(UPLOAD_DIR, c.thumbnail_path);
        if (fs.existsSync(abs)) {
          const b64 = fs.readFileSync(abs).toString('base64');
          thumbDataUri = `data:image/jpeg;base64,${b64}`;
        }
      } catch { /* ignore */ }
    }

    const pdfData = {
      challan_number: challanNumber,
      issued_date: fmtDate(now),
      due_date: fmtDate(dueDate),
      offender_name: vahan.owner_name,
      offender_address: vahan.owner_address,
      vehicle_number: finalPlate,
      vehicle_type: vahan.vehicle_type,
      violation: vt.label_en,
      mv_act_section: vt.mv_act_section,
      fine_amount: `₹${Number(vt.fine_amount).toLocaleString('en-IN')}/-`,
      location: c.location_address || 'Madhya Pradesh',
      incident_time: fmtDateTime(c.incident_time),
      case_number: c.case_number,
      issued_by: `${officer.full_name}, Badge ${officer.badge_number}`,
      court_name: 'Motor Accidents Claims Tribunal, Bhopal',
    };

    let pdfResult = { pdfPath: null, fallbackHtml: false };
    try {
      pdfResult = await generateChallanPdf(pdfData, thumbDataUri);
      db.prepare('UPDATE challans SET pdf_path = ? WHERE id = ?').run(path.basename(pdfResult.pdfPath), challanInfo.lastInsertRowid);
    } catch (e) {
      console.error('[officer] PDF generation failed (challan still issued):', e.message);
    }

    audit(caseId, 'officer', req.auth.id, 'CHALLAN_ISSUED', { challan_number: challanNumber, plate: finalPlate });

    // DEMO ONLY: notification stub.
    console.log(`[notify] (mock SMS) Challan ${challanNumber} issued to ${vahan.owner_name} for ${finalPlate}`);

    return res.json({
      success: true,
      data: {
        case_id: caseId,
        status: 'CHALLAN_ISSUED',
        challan_number: challanNumber,
        fine_amount: vt.fine_amount,
        due_date: dueDate.toISOString(),
        pdf_available: !!pdfResult.pdfPath,
        points_awarded: vt.points_for_reporter,
      },
    });
  } catch (err) {
    console.error('[officer] approve error:', err);
    return res.status(500).json({ success: false, error: 'Failed to issue challan' });
  }
});

// PATCH /api/officer/cases/:id/reject — reject with mandatory reason.
router.patch('/cases/:id/reject', requireOfficer, (req, res) => {
  try {
    const caseId = Number(req.params.id);
    const { rejection_reason, officer_note } = req.body;
    if (!rejection_reason) {
      return res.status(400).json({ success: false, error: 'A rejection reason is required' });
    }
    const c = db.prepare('SELECT * FROM cases WHERE id = ?').get(caseId);
    if (!c) return res.status(404).json({ success: false, error: 'Case not found' });
    if (c.status === 'CHALLAN_ISSUED') {
      return res.status(409).json({ success: false, error: 'Cannot reject a case that already has a challan' });
    }

    const now = new Date().toISOString();
    db.prepare(
      `UPDATE cases SET status='REJECTED', rejection_reason=?, officer_note=?,
        assigned_officer_id=?, reviewed_at=?, resolved_at=? WHERE id=?`
    ).run(rejection_reason, officer_note || null, req.auth.id, now, now, caseId);

    audit(caseId, 'officer', req.auth.id, 'REJECTED', { rejection_reason });
    console.log(`[notify] (mock SMS) Case ${c.case_number} rejected: ${rejection_reason}`);

    return res.json({ success: true, data: { case_id: caseId, status: 'REJECTED', rejection_reason } });
  } catch (err) {
    console.error('[officer] reject error:', err);
    return res.status(500).json({ success: false, error: 'Failed to reject case' });
  }
});

// GET /api/officer/analytics — summary stats for the dashboard.
router.get('/analytics', requireOfficer, (req, res) => {
  try {
    const totals = db
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM cases) AS total_cases,
           (SELECT COUNT(*) FROM cases WHERE status='PENDING') AS pending,
           (SELECT COUNT(*) FROM cases WHERE status='UNDER_REVIEW') AS under_review,
           (SELECT COUNT(*) FROM challans) AS challans_issued,
           (SELECT COUNT(*) FROM cases WHERE status='REJECTED') AS rejected,
           (SELECT COALESCE(SUM(fine_amount),0) FROM challans) AS total_fines`
      )
      .get();
    return res.json({ success: true, data: totals });
  } catch (err) {
    console.error('[officer] analytics error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load analytics' });
  }
});

module.exports = router;
