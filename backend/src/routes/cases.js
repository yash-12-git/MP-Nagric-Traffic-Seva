// Citizen case routes: submit a new violation, list own cases, view detail.

const fs = require('fs');
const path = require('path');
const express = require('express');
const db = require('../config/database');
const { requireCitizen } = require('../middleware/auth');
const { upload, UPLOAD_DIR } = require('../middleware/upload');
const { hashFile } = require('../services/evidenceHash');
const { readPlate } = require('../services/ocrService');
const { lookupVahan } = require('../services/vahanMock');
const { nextCaseNumber, audit, mockReverseGeocode } = require('../services/helpers');

const router = express.Router();

const THUMB_DIR = path.join(UPLOAD_DIR, 'thumbnails');
fs.mkdirSync(THUMB_DIR, { recursive: true });

function videoLikely(mimetype = '', filename = '') {
  return /video\//.test(mimetype) || /\.(mp4|mov|avi|mkv|webm)$/i.test(filename);
}

// POST /api/cases — submit a new case (multipart/form-data, field "media").
router.post('/', requireCitizen, upload.single('media'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Evidence media file is required' });
    }
    const { violation_type_id, latitude, longitude, incident_time, reporter_note } = req.body;

    const vt = db.prepare('SELECT * FROM violation_types WHERE id = ?').get(Number(violation_type_id));
    if (!vt) {
      return res.status(400).json({ success: false, error: 'Invalid violation_type_id' });
    }

    const filePath = req.file.path;
    const mediaType = videoLikely(req.file.mimetype, req.file.originalname) ? 'video' : 'photo';

    // 1. Evidence integrity — hash the original file.
    const mediaHash = hashFile(filePath);
    console.log(`[cases] media hashed: ${mediaHash}`);

    // 2. Reserve the case number up front so it can be watermarked into the thumbnail.
    const caseNumber = nextCaseNumber();

    // 3. Run OCR (soft dependency — never throws). Pass metadata for the watermark.
    const ocr = await readPlate(filePath);

    // 4. Save watermarked thumbnail if the OCR service returned one.
    let thumbnailPath = null;
    if (ocr.raw && ocr.raw.thumbnail_b64) {
      try {
        thumbnailPath = path.join(THUMB_DIR, `${caseNumber}.jpg`);
        fs.writeFileSync(thumbnailPath, Buffer.from(ocr.raw.thumbnail_b64, 'base64'));
      } catch (e) {
        console.error('[cases] failed to write thumbnail:', e.message);
        thumbnailPath = null;
      }
    } else if (mediaType === 'photo') {
      // For a photo with no OCR thumbnail, the media itself is the thumbnail.
      thumbnailPath = filePath;
    }

    // 5. VAHAN lookup (mock) for the detected plate.
    const plate = ocr.best_plate;
    const vahan = plate ? lookupVahan(plate) : null;

    // 6. Reverse geocode (mock).
    const lat = latitude != null ? Number(latitude) : null;
    const lng = longitude != null ? Number(longitude) : null;
    const locationAddress = mockReverseGeocode(lat, lng);

    // 7. Persist the case.
    const info = db
      .prepare(
        `INSERT INTO cases (
          case_number, reporter_id, violation_type_id,
          media_path, media_type, media_hash, thumbnail_path,
          plate_number, plate_confidence, ocr_raw_result,
          vehicle_owner_name, vehicle_owner_address, vehicle_registration_date, vehicle_type,
          latitude, longitude, location_address,
          status, reporter_note, incident_time
        ) VALUES (
          @case_number, @reporter_id, @violation_type_id,
          @media_path, @media_type, @media_hash, @thumbnail_path,
          @plate_number, @plate_confidence, @ocr_raw_result,
          @owner_name, @owner_address, @reg_date, @vehicle_type,
          @latitude, @longitude, @location_address,
          'PENDING', @reporter_note, @incident_time
        )`
      )
      .run({
        case_number: caseNumber,
        reporter_id: req.auth.id,
        violation_type_id: vt.id,
        media_path: path.basename(filePath),
        media_type: mediaType,
        media_hash: mediaHash,
        thumbnail_path: thumbnailPath ? path.basename(thumbnailPath) : null,
        plate_number: plate,
        plate_confidence: ocr.best_confidence || null,
        ocr_raw_result: JSON.stringify(ocr.raw || {}),
        owner_name: vahan ? vahan.owner_name : null,
        owner_address: vahan ? vahan.owner_address : null,
        reg_date: vahan ? vahan.registration_date : null,
        vehicle_type: vahan ? vahan.vehicle_type : null,
        latitude: lat,
        longitude: lng,
        location_address: locationAddress,
        reporter_note: reporter_note || null,
        incident_time: incident_time || new Date().toISOString(),
      });

    const caseId = info.lastInsertRowid;

    // 8. Bump reporter's report count.
    db.prepare('UPDATE users SET total_reports = total_reports + 1 WHERE id = ?').run(req.auth.id);

    // 9. Audit.
    audit(caseId, 'user', req.auth.id, 'SUBMITTED', { plate, confidence: ocr.best_confidence });

    const message = plate
      ? `Case submitted. Plate detected: ${plate}`
      : 'Case submitted. No plate detected — officer manual entry required.';

    return res.json({
      success: true,
      data: {
        case_id: caseId,
        case_number: caseNumber,
        status: 'PENDING',
        plate_number: plate,
        plate_confidence: ocr.best_confidence || 0,
        owner_name: vahan ? vahan.owner_name : null,
        message,
      },
    });
  } catch (err) {
    console.error('[cases] submit error:', err);
    return res.status(500).json({ success: false, error: 'Failed to submit case' });
  }
});

// GET /api/cases/my — citizen's own cases.
router.get('/my', requireCitizen, (req, res) => {
  try {
    const rows = db
      .prepare(
        `SELECT c.id, c.case_number, c.status, c.plate_number, c.media_type,
                c.thumbnail_path, c.location_address, c.submitted_at, c.incident_time,
                vt.label_en AS violation_label, vt.label_hi AS violation_label_hi, vt.code AS violation_code
         FROM cases c
         JOIN violation_types vt ON vt.id = c.violation_type_id
         WHERE c.reporter_id = ?
         ORDER BY c.submitted_at DESC`
      )
      .all(req.auth.id);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[cases] my error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load cases' });
  }
});

// GET /api/cases/:id — case detail (citizen sees a limited view of their own case).
router.get('/:id', requireCitizen, (req, res) => {
  try {
    const c = db
      .prepare(
        `SELECT c.id, c.case_number, c.status, c.plate_number, c.media_type, c.media_path,
                c.thumbnail_path, c.location_address, c.latitude, c.longitude,
                c.submitted_at, c.incident_time, c.reviewed_at, c.resolved_at,
                c.reporter_note, c.officer_note, c.rejection_reason,
                vt.label_en AS violation_label, vt.label_hi AS violation_label_hi,
                vt.fine_amount, vt.points_for_reporter
         FROM cases c
         JOIN violation_types vt ON vt.id = c.violation_type_id
         WHERE c.id = ? AND c.reporter_id = ?`
      )
      .get(Number(req.params.id), req.auth.id);
    if (!c) return res.status(404).json({ success: false, error: 'Case not found' });

    const challan = db
      .prepare('SELECT challan_number, fine_amount, status, due_date, issued_at FROM challans WHERE case_id = ?')
      .get(c.id);

    return res.json({ success: true, data: { ...c, challan: challan || null } });
  } catch (err) {
    console.error('[cases] detail error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load case' });
  }
});

module.exports = router;
