// Shared helpers: case/challan number generation, audit logging, mock geocoding.

const db = require('../config/database');

/** Generate the next sequential case number, e.g. MP-BHO-2025-000006. */
function nextCaseNumber() {
  const year = new Date().getFullYear();
  const row = db.prepare('SELECT COUNT(*) AS n FROM cases').get();
  const seq = String((row.n || 0) + 1).padStart(6, '0');
  return `MP-BHO-${year}-${seq}`;
}

/** Generate the next sequential challan number, e.g. CH-MP-2025-000003. */
function nextChallanNumber() {
  const year = new Date().getFullYear();
  const row = db.prepare('SELECT COUNT(*) AS n FROM challans').get();
  const seq = String((row.n || 0) + 1).padStart(6, '0');
  return `CH-MP-${year}-${seq}`;
}

/** Append an entry to the audit log. Never throws. */
function audit(caseId, actorType, actorId, action, metadata = {}) {
  try {
    db.prepare(
      `INSERT INTO audit_log (case_id, actor_type, actor_id, action, metadata)
       VALUES (?, ?, ?, ?, ?)`
    ).run(caseId, actorType, actorId, action, JSON.stringify(metadata));
    console.log(`[audit] case=${caseId} ${actorType}#${actorId} ${action}`);
  } catch (err) {
    console.error('[audit] failed:', err.message);
  }
}

// DEMO ONLY: mock reverse geocoder. Maps a few Bhopal landmarks by proximity,
// otherwise returns a generic MP address from the coordinates.
// SWAP-TO-PRODUCTION: call a real reverse-geocoding API (e.g. Nominatim/Google).
const LANDMARKS = [
  { name: 'Near Roshanpura Square, Bhopal', lat: 23.2563, lng: 77.4009 },
  { name: 'MP Nagar Zone-1, Bhopal', lat: 23.2329, lng: 77.4343 },
  { name: 'New Market, TT Nagar, Bhopal', lat: 23.2336, lng: 77.4011 },
  { name: 'Habibganj Railway Crossing, Bhopal', lat: 23.2330, lng: 77.4350 },
  { name: 'Vijay Nagar Square, Indore', lat: 22.7533, lng: 75.8937 },
];

function mockReverseGeocode(lat, lng) {
  if (lat == null || lng == null) return 'Location not available';
  let best = null;
  let bestD = Infinity;
  for (const l of LANDMARKS) {
    const d = Math.hypot(l.lat - lat, l.lng - lng);
    if (d < bestD) {
      bestD = d;
      best = l;
    }
  }
  if (best && bestD < 0.05) return best.name;
  return `Lat ${Number(lat).toFixed(4)}, Lng ${Number(lng).toFixed(4)}, Madhya Pradesh`;
}

module.exports = { nextCaseNumber, nextChallanNumber, audit, mockReverseGeocode };
