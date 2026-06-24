-- MP Nagrik Traffic Seva — Database Schema (Phase 0 demo)
-- DEMO ONLY: SQLite. Swap to PostgreSQL for production (see config/database.js).

-- Users (citizens who report violations)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone VARCHAR(15) UNIQUE NOT NULL,
  full_name VARCHAR(100),
  aadhaar_last4 VARCHAR(4),       -- mock: just store last 4 digits
  is_verified INTEGER DEFAULT 0,  -- 0 = unverified, 1 = verified
  points INTEGER DEFAULT 0,
  total_reports INTEGER DEFAULT 0,
  accepted_reports INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Officers (traffic police who review cases)
CREATE TABLE IF NOT EXISTS officers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  badge_number VARCHAR(20) UNIQUE NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  jurisdiction VARCHAR(100),      -- e.g. "Bhopal North Traffic Circle"
  jurisdiction_geojson TEXT,      -- GeoJSON polygon of their area
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Violation types reference
CREATE TABLE IF NOT EXISTS violation_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code VARCHAR(20) UNIQUE NOT NULL,   -- e.g. "SIGNAL_JUMP"
  label_en VARCHAR(100) NOT NULL,
  label_hi VARCHAR(100) NOT NULL,
  fine_amount INTEGER NOT NULL,       -- in INR
  mv_act_section VARCHAR(50),         -- e.g. "Section 119 MV Act 2019"
  points_for_reporter INTEGER DEFAULT 10
);

-- Cases (the core entity)
CREATE TABLE IF NOT EXISTS cases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_number VARCHAR(20) UNIQUE NOT NULL,  -- e.g. "MP-BHO-2025-000001"
  reporter_id INTEGER NOT NULL REFERENCES users(id),
  violation_type_id INTEGER NOT NULL REFERENCES violation_types(id),

  -- Evidence
  media_path VARCHAR(255),          -- local file path
  media_type VARCHAR(10),           -- 'video' or 'photo'
  media_hash VARCHAR(64),           -- SHA-256 of original file
  thumbnail_path VARCHAR(255),

  -- OCR results
  plate_number VARCHAR(20),         -- extracted by OCR e.g. "MP04AB1234"
  plate_confidence REAL,            -- 0.0 to 1.0
  ocr_raw_result TEXT,              -- full JSON from OCR service

  -- VAHAN mock result
  vehicle_owner_name VARCHAR(100),
  vehicle_owner_address TEXT,
  vehicle_registration_date VARCHAR(20),
  vehicle_type VARCHAR(50),

  -- Location
  latitude REAL,
  longitude REAL,
  location_address TEXT,            -- reverse geocoded (mocked)

  -- Status
  status VARCHAR(20) DEFAULT 'PENDING',
  -- PENDING -> UNDER_REVIEW -> CHALLAN_ISSUED | REJECTED

  assigned_officer_id INTEGER REFERENCES officers(id),
  reporter_note TEXT,
  officer_note TEXT,
  rejection_reason TEXT,

  -- Timestamps
  incident_time DATETIME,           -- when violation happened (from device)
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME,
  resolved_at DATETIME
);

-- Challans
CREATE TABLE IF NOT EXISTS challans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id INTEGER UNIQUE NOT NULL REFERENCES cases(id),
  challan_number VARCHAR(30) UNIQUE NOT NULL,  -- e.g. "CH-MP-2025-000001"
  issued_by_officer_id INTEGER NOT NULL REFERENCES officers(id),
  fine_amount INTEGER NOT NULL,
  mv_act_section VARCHAR(50),
  pdf_path VARCHAR(255),
  status VARCHAR(20) DEFAULT 'UNPAID',         -- UNPAID | PAID | CANCELLED
  issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  due_date DATETIME,                           -- 60 days from issued_at
  paid_at DATETIME
);

-- Audit log (every action on a case is logged)
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id INTEGER REFERENCES cases(id),
  actor_type VARCHAR(10),           -- 'user' or 'officer'
  actor_id INTEGER,
  action VARCHAR(50),               -- 'SUBMITTED', 'REVIEWED', 'APPROVED', 'REJECTED', 'CHALLAN_ISSUED'
  metadata TEXT,                    -- JSON with extra context
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_reporter ON cases(reporter_id);
CREATE INDEX IF NOT EXISTS idx_audit_case ON audit_log(case_id);
