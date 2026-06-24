// Pre-built demo cases so the officer dashboard is not empty during the pitch.
//
// DEMO ONLY. Generates placeholder evidence: SVG thumbnails always, and a short
// black MP4 (with the plate drawn on it) when ffmpeg is available — otherwise the
// case falls back to a generated SVG "photo" so it is still viewable.
//
// Matches PRD section 13:
//   MP-BHO-2025-000001 | MP04AB1234 | Signal Jump    | CHALLAN_ISSUED
//   MP-BHO-2025-000002 | MP04CD5678 | No Helmet       | PENDING
//   MP-BHO-2025-000003 | MP07GH9012 | Triple Riding   | UNDER_REVIEW
//   MP-BHO-2025-000004 | MP04XY3456 | Wrong Way       | REJECTED
//   MP-BHO-2025-000005 | MP09KL7890 | Mobile Use      | PENDING

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { hashFile } = require('../services/evidenceHash');
const { lookupVahan } = require('../services/vahanMock');
const { generateChallanPdf } = require('../services/challanPdf');

const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.cwd(), process.env.UPLOAD_DIR)
  : path.resolve(__dirname, '../../uploads');
const THUMB_DIR = path.join(UPLOAD_DIR, 'thumbnails');

const DEMO_CASES = [
  { num: 'MP-BHO-2025-000001', plate: 'MP04AB1234', vt: 1, status: 'CHALLAN_ISSUED', lat: 23.2563, lng: 77.4009, note: 'Clear signal jump visible at 00:03', daysAgo: 5 },
  { num: 'MP-BHO-2025-000002', plate: 'MP04CD5678', vt: 2, status: 'PENDING', lat: 23.2329, lng: 77.4343, note: null, daysAgo: 1 },
  { num: 'MP-BHO-2025-000003', plate: 'MP07GH9012', vt: 3, status: 'UNDER_REVIEW', lat: 22.7533, lng: 75.8937, note: 'Reviewing footage', daysAgo: 2 },
  { num: 'MP-BHO-2025-000004', plate: 'MP04XY3456', vt: 4, status: 'REJECTED', lat: 23.2336, lng: 77.4011, note: null, daysAgo: 3, reject: 'Evidence unclear / video too short' },
  { num: 'MP-BHO-2025-000005', plate: 'MP09KL7890', vt: 5, status: 'PENDING', lat: 23.2330, lng: 77.4350, note: null, daysAgo: 0 },
];

function isoDaysAgo(days, hour = 9, minute = 32) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function svgEvidence(plate, caseNum, label, lat, lng, ts) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
  <rect width="640" height="360" fill="#1a1a1a"/>
  <rect x="0" y="0" width="640" height="34" fill="#0b3d91"/>
  <text x="12" y="23" fill="#fff" font-family="Arial" font-size="15" font-weight="bold">${caseNum}</text>
  <text x="320" y="200" fill="#ffd24d" font-family="monospace" font-size="44" font-weight="bold" text-anchor="middle">${plate}</text>
  <text x="320" y="150" fill="#bbb" font-family="Arial" font-size="18" text-anchor="middle">${label}</text>
  <text x="12" y="338" fill="#9fe" font-family="monospace" font-size="13">GPS ${lat.toFixed(4)}, ${lng.toFixed(4)}</text>
  <text x="628" y="338" fill="#ccc" font-family="Arial" font-size="12" text-anchor="end">${ts}</text>
  <text x="320" y="320" fill="#c62828" font-family="Arial" font-size="13" font-weight="bold" text-anchor="middle" opacity="0.85" transform="rotate(-8 320 320)">MP TRAFFIC DEPT — DEMO</text>
</svg>`;
}

let _ffmpegChecked = false;
let _ffmpegPath = null;
function findFfmpeg() {
  if (_ffmpegChecked) return _ffmpegPath;
  _ffmpegChecked = true;
  for (const cmd of ['ffmpeg']) {
    try {
      execFileSync(cmd, ['-version'], { stdio: 'ignore' });
      _ffmpegPath = cmd;
      break;
    } catch { /* not found */ }
  }
  return _ffmpegPath;
}

// Returns { mediaFile, mediaType } — an mp4 if ffmpeg is present, else an SVG photo.
function makeEvidenceMedia(c, label, ts) {
  const ffmpeg = findFfmpeg();
  if (ffmpeg) {
    const out = path.join(UPLOAD_DIR, `demo_${c.num}.mp4`);
    try {
      execFileSync(
        ffmpeg,
        [
          '-y', '-f', 'lavfi', '-i', 'color=c=black:s=640x360:d=2',
          '-vf', `drawtext=text='${c.plate} - ${label}':fontcolor=yellow:fontsize=36:x=(w-text_w)/2:y=(h-text_h)/2`,
          '-pix_fmt', 'yuv420p', out,
        ],
        { stdio: 'ignore' }
      );
      return { mediaFile: out, mediaType: 'video' };
    } catch (e) {
      console.warn(`[demo] ffmpeg failed for ${c.num}, using SVG photo:`, e.message);
    }
  }
  const out = path.join(UPLOAD_DIR, `demo_${c.num}.svg`);
  fs.writeFileSync(out, svgEvidence(c.plate, c.num, label, c.lat, c.lng, ts), 'utf8');
  return { mediaFile: out, mediaType: 'photo' };
}

async function loadDemoData(db) {
  // Idempotent: skip if demo cases already loaded.
  const exists = db.prepare('SELECT 1 FROM cases WHERE case_number = ?').get(DEMO_CASES[0].num);
  if (exists) {
    console.log('[demo] demo cases already present — skipping.');
    return;
  }

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.mkdirSync(THUMB_DIR, { recursive: true });

  const reporter = db.prepare('SELECT id FROM users WHERE phone = ?').get('+919876543210');
  const reporterId = reporter ? reporter.id : 1;
  const officer1 = db.prepare('SELECT id FROM officers WHERE badge_number = ?').get('BHO-TC-001');
  const officer2 = db.prepare('SELECT id FROM officers WHERE badge_number = ?').get('BHO-TC-002');

  const insertCase = db.prepare(`
    INSERT INTO cases (
      case_number, reporter_id, violation_type_id,
      media_path, media_type, media_hash, thumbnail_path,
      plate_number, plate_confidence, ocr_raw_result,
      vehicle_owner_name, vehicle_owner_address, vehicle_registration_date, vehicle_type,
      latitude, longitude, location_address,
      status, assigned_officer_id, officer_note, rejection_reason,
      incident_time, submitted_at, reviewed_at, resolved_at
    ) VALUES (
      @case_number, @reporter_id, @vt,
      @media_path, @media_type, @media_hash, @thumbnail_path,
      @plate, @conf, @ocr,
      @owner, @addr, @regdate, @vtype,
      @lat, @lng, @loc,
      @status, @officer, @onote, @reject,
      @incident, @submitted, @reviewed, @resolved
    )
  `);

  for (const c of DEMO_CASES) {
    const vt = db.prepare('SELECT * FROM violation_types WHERE id = ?').get(c.vt);
    const vahan = lookupVahan(c.plate);
    const incident = isoDaysAgo(c.daysAgo);
    const tsLabel = new Date(incident).toLocaleString('en-IN');

    // Evidence + thumbnail.
    const { mediaFile, mediaType } = makeEvidenceMedia(c, vt.label_en, tsLabel);
    const thumbFile = path.join(THUMB_DIR, `${c.num}.svg`);
    fs.writeFileSync(thumbFile, svgEvidence(c.plate, c.num, vt.label_en, c.lat, c.lng, tsLabel), 'utf8');
    const mediaHash = hashFile(mediaFile);

    const resolved = c.status === 'CHALLAN_ISSUED' || c.status === 'REJECTED';
    const reviewed = resolved || c.status === 'UNDER_REVIEW';
    const officerId = c.status === 'UNDER_REVIEW' ? (officer2 && officer2.id) : (officer1 && officer1.id);

    insertCase.run({
      case_number: c.num,
      reporter_id: reporterId,
      vt: c.vt,
      media_path: path.basename(mediaFile),
      media_type: mediaType,
      media_hash: mediaHash,
      thumbnail_path: path.basename(thumbFile),
      plate: c.plate,
      conf: 0.9 + Math.random() * 0.08,
      ocr: JSON.stringify({ best_plate: c.plate, best_confidence: 0.92, plates: [{ text: c.plate, confidence: 0.92 }], frame_extracted: true, demo: true }),
      owner: vahan.owner_name,
      addr: vahan.owner_address,
      regdate: vahan.registration_date,
      vtype: vahan.vehicle_type,
      lat: c.lat,
      lng: c.lng,
      loc: c.num === 'MP-BHO-2025-000001' ? 'Near Roshanpura Square, Bhopal' : null,
      status: c.status,
      officer: reviewed ? officerId : null,
      onote: c.note,
      reject: c.reject || null,
      incident,
      submitted: incident,
      reviewed: reviewed ? incident : null,
      resolved: resolved ? incident : null,
    });

    const caseRow = db.prepare('SELECT id FROM cases WHERE case_number = ?').get(c.num);
    db.prepare('INSERT INTO audit_log (case_id, actor_type, actor_id, action, metadata) VALUES (?, ?, ?, ?, ?)')
      .run(caseRow.id, 'user', reporterId, 'SUBMITTED', JSON.stringify({ plate: c.plate, demo: true }));

    // Pre-issue the challan for the CHALLAN_ISSUED demo case.
    if (c.status === 'CHALLAN_ISSUED') {
      const now = new Date(incident);
      const due = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
      const challanNumber = 'CH-MP-2025-000001';
      const info = db.prepare(`
        INSERT INTO challans (case_id, challan_number, issued_by_officer_id, fine_amount, mv_act_section, status, issued_at, due_date)
        VALUES (?, ?, ?, ?, ?, 'UNPAID', ?, ?)
      `).run(caseRow.id, challanNumber, officerId, vt.fine_amount, vt.mv_act_section, now.toISOString(), due.toISOString());

      db.prepare('UPDATE users SET points = points + ?, accepted_reports = accepted_reports + 0 WHERE id = ?')
        .run(0, reporterId); // points already seeded; avoid double-count for demo

      const officer = db.prepare('SELECT full_name, badge_number FROM officers WHERE id = ?').get(officerId);
      try {
        const { pdfPath } = await generateChallanPdf({
          challan_number: challanNumber,
          issued_date: now.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }),
          due_date: due.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }),
          offender_name: vahan.owner_name,
          offender_address: vahan.owner_address,
          vehicle_number: c.plate,
          vehicle_type: vahan.vehicle_type,
          violation: vt.label_en,
          mv_act_section: vt.mv_act_section,
          fine_amount: `₹${Number(vt.fine_amount).toLocaleString('en-IN')}/-`,
          location: 'Near Roshanpura Square, Bhopal',
          incident_time: now.toLocaleString('en-IN'),
          case_number: c.num,
          issued_by: `${officer.full_name}, Badge ${officer.badge_number}`,
          court_name: 'Motor Accidents Claims Tribunal, Bhopal',
        });
        db.prepare('UPDATE challans SET pdf_path = ? WHERE id = ?').run(path.basename(pdfPath), info.lastInsertRowid);
      } catch (e) {
        console.warn('[demo] challan PDF generation skipped:', e.message);
      }
      db.prepare('INSERT INTO audit_log (case_id, actor_type, actor_id, action, metadata) VALUES (?, ?, ?, ?, ?)')
        .run(caseRow.id, 'officer', officerId, 'CHALLAN_ISSUED', JSON.stringify({ challan_number: challanNumber }));
    }

    if (c.status === 'REJECTED') {
      db.prepare('INSERT INTO audit_log (case_id, actor_type, actor_id, action, metadata) VALUES (?, ?, ?, ?, ?)')
        .run(caseRow.id, 'officer', officerId, 'REJECTED', JSON.stringify({ rejection_reason: c.reject }));
    }

    console.log(`[demo] loaded ${c.num} (${c.status})`);
  }

  console.log(`[demo] ${DEMO_CASES.length} demo cases loaded.`);
}

module.exports = { loadDemoData, DEMO_CASES };
