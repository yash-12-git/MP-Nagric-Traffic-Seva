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

const axios = require('axios');

// Known MP demo landmarks — an OFFLINE shortcut so the scripted Bhopal/Indore demo
// shows nice names without a network call.
const LANDMARKS = [
  { name: 'Near Roshanpura Square, Bhopal', lat: 23.2563, lng: 77.4009 },
  { name: 'MP Nagar Zone-1, Bhopal', lat: 23.2329, lng: 77.4343 },
  { name: 'New Market, TT Nagar, Bhopal', lat: 23.2336, lng: 77.4011 },
  { name: 'Habibganj Railway Crossing, Bhopal', lat: 23.2330, lng: 77.4350 },
  { name: 'Vijay Nagar Square, Indore', lat: 22.7533, lng: 75.8937 },
];

// Reverse geocode coordinates to a human address.
//   1. If near a known MP demo landmark, return its name (offline, instant).
//   2. Otherwise call OpenStreetMap Nominatim (free, no key, same data as the map).
//   3. If that fails (offline / rate-limited), return the raw coordinates WITHOUT
//      fabricating a state — never assert a wrong location on a challan.
// SWAP-TO-PRODUCTION: use a paid/self-hosted geocoder (Google, MapmyIndia, or a
// self-hosted Nominatim) for reliability and higher rate limits.
async function reverseGeocode(lat, lng) {
  if (lat == null || lng == null) return 'Location not available';

  let best = null;
  let bestD = Infinity;
  for (const l of LANDMARKS) {
    const d = Math.hypot(l.lat - lat, l.lng - lng);
    if (d < bestD) { bestD = d; best = l; }
  }
  if (best && bestD < 0.05) return best.name;

  try {
    const res = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: { lat, lon: lng, format: 'json', zoom: 16, addressdetails: 1 },
      headers: { 'User-Agent': 'MP-Nagrik-Traffic-Seva/0.1 (demo)' },
      timeout: 4000,
    });
    const a = res.data && res.data.address;
    if (a) {
      const parts = [
        a.suburb || a.neighbourhood || a.road || a.village || a.town || a.city_district,
        a.city || a.town || a.county,
        a.state,
      ].filter(Boolean);
      if (parts.length) return parts.join(', ');
    }
    if (res.data && res.data.display_name) return res.data.display_name;
  } catch (err) {
    console.warn('[geocode] reverse lookup failed, returning coordinates:', err.message);
  }
  return `Lat ${Number(lat).toFixed(4)}, Lng ${Number(lng).toFixed(4)}`;
}

module.exports = { nextCaseNumber, nextChallanNumber, audit, reverseGeocode };
