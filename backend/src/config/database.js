// SQLite database connection (singleton).
//
// SWAP-TO-PRODUCTION: replace better-sqlite3 with a PostgreSQL pool (e.g. `pg`).
//   1. Set DATABASE_URL in .env
//   2. Replace the Database() init below with a pg.Pool
//   3. Adjust raw SQL placeholders (? -> $1) and switch prepared-statement calls
//      to async pool.query(). The route layer uses a thin helper so the surface
//      area to change is small.
// DEMO ONLY: SQLite gives us zero-setup, file-based storage perfect for a laptop demo.

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.cwd(), process.env.DB_PATH)
  : path.resolve(__dirname, '../../data/app.db');

// Ensure the data directory exists.
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log(`[db] connected to SQLite at ${DB_PATH}`);

module.exports = db;
module.exports.DB_PATH = DB_PATH;
