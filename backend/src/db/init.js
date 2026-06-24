// Initialise the SQLite database: create tables, seed reference data,
// hash the demo officer passwords, and load pre-built demo cases.
//
// Run with:  node src/db/init.js
// Safe to re-run — all inserts use INSERT OR IGNORE / idempotent guards.

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { loadDemoData } = require('./demo-data');

async function run() {
  console.log('[init] initialising database...');

  // 1. Schema
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);
  console.log('[init] schema applied');

  // 2. Reference seed (violation types, demo citizen)
  const seed = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
  db.exec(seed);
  console.log('[init] reference seed applied');

  // 3. Officers — hash the real demo password "officer123" with bcrypt.
  // DEMO ONLY: both officers share the same password for the pitch.
  const officerPassword = bcrypt.hashSync('officer123', 10);
  const insertOfficer = db.prepare(`
    INSERT OR IGNORE INTO officers (badge_number, full_name, jurisdiction, password_hash)
    VALUES (@badge, @name, @jurisdiction, @hash)
  `);
  const officers = [
    { badge: 'BHO-TC-001', name: 'SI Ramesh Kumar Verma', jurisdiction: 'Bhopal North Traffic Circle' },
    { badge: 'BHO-TC-002', name: 'ASI Priya Malhotra', jurisdiction: 'Bhopal South Traffic Circle' },
  ];
  for (const o of officers) {
    insertOfficer.run({ badge: o.badge, name: o.name, jurisdiction: o.jurisdiction, hash: officerPassword });
  }
  console.log('[init] officers seeded (password: officer123)');

  // 4. Pre-built demo cases so the dashboard is not empty during the pitch.
  await loadDemoData(db);

  console.log('[init] done. Database ready.');
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[init] FAILED:', err);
    process.exit(1);
  });
