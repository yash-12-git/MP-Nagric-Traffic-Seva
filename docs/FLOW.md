# MP Nagrik Traffic Seva — System Flow & Architecture

This document explains how the whole system fits together: the services, the data
model, the full lifecycle of a case from capture to challan, the API surface, and
the cross-cutting concerns (auth, evidence integrity, OCR, mocks).

For setup and the live demo walkthrough, see [DEMO_GUIDE.md](./DEMO_GUIDE.md).

---

## 1. The four services

```
┌─────────────────────────┐         ┌──────────────────────────────┐
│  Mobile App (Expo)       │         │  Officer Dashboard (Vite)    │
│  React Native            │         │  React + Tailwind            │
│  citizen: capture+submit │         │  officer: review+challan     │
└────────────┬─────────────┘         └───────────────┬──────────────┘
             │  HTTP (JSON + multipart)              │  HTTP (JSON)
             │                                       │
             ▼                                       ▼
        ┌───────────────────────────────────────────────────┐
        │      Backend API — Node.js + Express  :3001        │
        │   routes / middleware / services (mocks)           │
        └───────┬───────────────────────────┬───────────────┘
                │                            │
        ┌───────▼────────┐          ┌────────▼─────────┐
        │  SQLite app.db │          │  /uploads (files)│
        │  better-sqlite3│          │  media+thumbs+pdf│
        └────────────────┘          └──────────────────┘
                │
                │  HTTP multipart (file)
                ▼
        ┌────────────────────────────────────────┐
        │  OCR Service — Python FastAPI  :8001    │
        │  OpenCV frame pick → EasyOCR plate read │
        └────────────────────────────────────────┘
```

| Service | Tech | Port | Role |
|---|---|---|---|
| API Server | Node.js + Express | 3001 | Source of truth: DB, file storage, orchestration, all mocks |
| OCR Service | Python + FastAPI | 8001 | Extracts best frame from video, reads number plate |
| Officer Dashboard | React + Vite + Tailwind | 5173 | Officer reviews cases, issues/rejects challans, analytics |
| Mobile App | React Native (Expo) | Expo | Citizen captures evidence, submits, tracks status, points |

**Independence:** every service boots on its own. The API treats the OCR service as
a *soft dependency* — if OCR is down, a submission still succeeds with `plate=null`
and the officer enters the plate manually. The challan PDF generator degrades the
same way: if Puppeteer/Chromium is unavailable it writes a viewable HTML document
instead of crashing.

---

## 2. Data model (SQLite)

Schema lives in [backend/src/db/schema.sql](../backend/src/db/schema.sql).

```
users ───────┐ (reporter_id)
             │
violation_types ──┐ (violation_type_id)
                  │
                  ▼
               cases ──────1:1──────▶ challans
                  │                      ▲
                  │ (assigned_officer)   │ (issued_by_officer_id)
                  ▼                      │
              officers ─────────────────┘
                  ▲
                  │
              audit_log (case_id, actor_type, actor_id, action, metadata)
```

| Table | Purpose | Key columns |
|---|---|---|
| `users` | Citizens who report | `phone`, `points`, `total_reports`, `accepted_reports` |
| `officers` | Traffic police reviewers | `badge_number`, `password_hash` (bcrypt), `jurisdiction` |
| `violation_types` | Reference data (7 types) | `code`, `fine_amount`, `mv_act_section`, `points_for_reporter` |
| `cases` | The core entity | evidence (`media_path`,`media_hash`), OCR (`plate_number`,`plate_confidence`), VAHAN (`vehicle_owner_*`), GPS, `status` |
| `challans` | Issued e-challans | `challan_number`, `fine_amount`, `pdf_path`, `due_date` (60 days) |
| `audit_log` | Every action on a case | `action` = SUBMITTED \| REVIEWED \| CHALLAN_ISSUED \| REJECTED |

### Case status machine

```
                 ┌───────────────► REJECTED   (officer rejects, reason required)
                 │
  PENDING ──────►│
                 │
  (UNDER_REVIEW) └───────────────► CHALLAN_ISSUED  (officer approves → challan + PDF)
```

- New submissions land in **PENDING**.
- **UNDER_REVIEW** is a demo seed state showing a case an officer has picked up.
- Terminal states **CHALLAN_ISSUED** and **REJECTED** set `resolved_at` and cannot
  transition further (the approve/reject routes guard against double-action).

---

## 3. End-to-end case lifecycle

### 3.1 Citizen submission pipeline

Implemented in [backend/src/routes/cases.js](../backend/src/routes/cases.js) `POST /api/cases`.

```
Mobile App                 Backend API                       OCR :8001     VAHAN mock
    │                          │                                 │             │
    │  multipart: media,       │                                 │             │
    │  violation_type_id,      │                                 │             │
    │  lat, lng, incident_time │                                 │             │
    ├─────────────────────────►│                                 │             │
    │                          │ 1. multer saves file to /uploads│             │
    │                          │ 2. SHA-256 hash of original file│             │
    │                          │ 3. reserve case_number          │             │
    │                          ├──── POST /ocr/plate (file) ─────►│             │
    │                          │                                 │ frame pick  │
    │                          │                                 │ + plate OCR │
    │                          │◄──── {best_plate, confidence,───┤             │
    │                          │       thumbnail_b64}            │             │
    │                          │ 4. save watermarked thumbnail   │             │
    │                          ├──── lookupVahan(plate) ─────────┼────────────►│
    │                          │◄──── {owner_name, address, ...}─┼─────────────┤
    │                          │ 5. mock reverse-geocode (lat,lng)             │
    │                          │ 6. INSERT case (status=PENDING) │             │
    │                          │ 7. users.total_reports += 1     │             │
    │                          │ 8. audit_log: SUBMITTED         │             │
    │◄── {case_number, plate,──┤                                 │             │
    │     owner_name, status}  │                                 │             │
```

Why the case number is reserved *before* OCR: it is watermarked into the evidence
thumbnail (case number + GPS + timestamp + "MP TRAFFIC DEPT — DEMO"), per PRD §7.2.

If OCR returns no plate (low light, blur, obscured), the case is still created with
`plate_number = null` and the response message tells the citizen "officer manual
entry required."

### 3.2 Officer review & challan issuance

Implemented in [backend/src/routes/officer.js](../backend/src/routes/officer.js).

```
Dashboard                  Backend API
    │                          │
    │ GET /officer/cases       │  paginated queue (filter by status/type/date)
    ├─────────────────────────►│
    │ GET /officer/cases/:id    │  full detail + re-hash file → evidence_integrity
    ├─────────────────────────►│  (verified ✓ if current SHA-256 == stored)
    │                          │
    │ PATCH .../approve         │  body: officer_note, confirmed_plate, violation_type_id
    ├─────────────────────────►│  1. guard: not already issued/rejected
    │                          │  2. officer may correct plate + violation type
    │                          │  3. re-lookup VAHAN for final plate
    │                          │  4. cases.status = CHALLAN_ISSUED, resolved_at = now
    │                          │  5. INSERT challan (number, fine, due_date +60d)
    │                          │  6. users.points += points_for_reporter
    │                          │     users.accepted_reports += 1
    │                          │  7. generate challan PDF (Puppeteer → HTML fallback)
    │                          │  8. audit_log: CHALLAN_ISSUED
    │                          │  9. console "notify" stub (mock SMS)
    │◄── {challan_number,──────┤
    │     points_awarded}      │
```

The **reject** path (`PATCH .../reject`) requires a `rejection_reason`, sets status
to REJECTED, writes the audit entry, and logs a mock-SMS notification. It refuses to
reject a case that already has a challan.

### 3.3 Citizen sees the result

The mobile app polls `GET /api/cases/my` and `GET /api/cases/:id`. Once a challan
exists, the case detail includes the `challan` object and the status badge flips to
**Challan Issued**; the profile points balance reflects the awarded points.

---

## 4. API reference

Base URL `http://localhost:3001/api`. All responses are
`{ success: true, data }` or `{ success: false, error }`.
Auth is a JWT Bearer token; tokens carry `{ kind: 'user' | 'officer', id }`.

> **Media/PDF auth note:** `<img>`, `<video>`, and `<iframe>` tags cannot set an
> `Authorization` header, so the auth middleware also accepts the token as a
> `?token=` query parameter (DEMO ONLY) — see
> [backend/src/middleware/auth.js](../backend/src/middleware/auth.js).

### Auth
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/citizen/send-otp` | — | Mock OTP; always "sends" `123456` |
| POST | `/auth/citizen/verify-otp` | — | Verify OTP → JWT (auto-registers new phone) |
| POST | `/auth/officer/login` | — | Badge + password (bcrypt) → JWT |
| GET | `/auth/me` | any | Current user/officer profile |

### Cases (citizen)
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/cases` | citizen | Submit case (multipart) → runs the §3.1 pipeline |
| GET | `/cases/my` | citizen | Own cases, newest first |
| GET | `/cases/:id` | citizen | Own case detail (+ challan if issued) |

### Officer
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/officer/cases` | officer | Paginated queue, filters: `status`, `violation_type_id`, `from`, `to`, `page`, `limit` |
| GET | `/officer/cases/:id` | officer | Full detail incl. OCR JSON, evidence integrity, audit trail |
| PATCH | `/officer/cases/:id/approve` | officer | Issue challan |
| PATCH | `/officer/cases/:id/reject` | officer | Reject (reason required) |
| GET | `/officer/analytics` | officer | Quick totals |

### Media / Challans / Analytics / Reference
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/media/:filename` | any | Serve evidence file (path-traversal guarded) |
| GET | `/media/thumbnail/:case_id` | any | Serve case thumbnail |
| GET | `/challans/:challan_number` | any | Challan details (joined with case) |
| GET | `/challans/:challan_number/pdf` | any | Stream challan PDF (or HTML fallback) |
| GET | `/analytics/overview` | officer | Totals + avg resolution time |
| GET | `/analytics/violations` | officer | Count by violation type (bar chart) |
| GET | `/analytics/hotspots` | officer | GPS points for the map |
| GET | `/analytics/timeseries` | officer | Cases/day last 30 days (line chart) |
| GET | `/api/violation-types` | — | The 7 reference violation types |
| GET | `/health` | — | Liveness probe |

---

## 5. OCR service internals

[ocr-service/main.py](../ocr-service/main.py) exposes:

- `GET /health` — liveness (the API pings this at boot, non-fatally).
- `POST /ocr/plate` — accepts a `file` (image or video), returns:

```json
{
  "plates": [{ "text": "MP04AB1234", "confidence": 0.94, "bbox": [...] }],
  "best_plate": "MP04AB1234",
  "best_confidence": 0.94,
  "frame_extracted": true,
  "processing_time_ms": 1240,
  "thumbnail_b64": "<jpeg base64 of the chosen frame>"
}
```

Pipeline in [ocr-service/plate_reader.py](../ocr-service/plate_reader.py):

1. **If video:** sample every Nth frame, score each by the variance of its Laplacian
   (a sharpness measure), keep the sharpest frame. **If image:** use it directly.
2. Run **EasyOCR** at **several downscaled resolutions** (longest side ≤ 1600 / 1000
   / 640 px) with a plate-character allowlist (`A–Z0–9`). Multiple scales make
   detection robust, and the smaller scales blur away fine high-contrast textures —
   notably the repeating "INDIA" hologram printed over high-security (HSRP) plates —
   that otherwise hide the large embossed characters. The raw camera resolution
   (e.g. 4080 px) is never OCR'd directly: it is slow and mostly detects the hologram.
3. Order the detected boxes into reading order (top line L→R, then bottom line),
   dropping the `IND` country logo, and build candidates from every **contiguous run
   of 1–3 boxes**. This reassembles a plate split across boxes or **across two lines**
   (most motorcycles / HSRP plates, e.g. `RJ41S` over `H7917`) while avoiding an
   overlapping hologram misread of the same region. Each candidate is matched against
   the Indian format `[A-Z]{2}\d{1,2}[A-Z]{1,2}\d{4}` (e.g. `MP04AB1234`), then run
   through a **position-aware canonicalisation** that fixes OCR confusions by zone (a
   `Z`/`L` in the trailing 4-digit block must be `7`/`4`, an `A` must be `4`, an `O`/`I`
   must be `0`/`1`, …), so `RJA1S`+`H7917` → `RJ41SH7917`.
4. **Rank** candidates by completeness (a full 10-char plate beats a truncated read),
   then by recurrence across scales/positions, then OCR confidence. Return the winner
   as `best_plate` with its confidence, plus a downscaled JPEG of the frame as
   `thumbnail_b64`. The OCR is a best-effort **assist**: every plate is reviewed and
   editable by the officer before a challan issues, the confidence is surfaced, and
   plates OCR genuinely cannot read fall through to manual entry. (Embossed HSRP plates
   with holographic overlays remain hard; production-grade accuracy needs a dedicated
   ALPR detector + recognizer, not generic EasyOCR.)

EasyOCR pulls in PyTorch (large, one-time install). The backend never blocks on this:
the OCR call has a timeout and any failure degrades to manual entry.

---

## 6. Cross-cutting concerns

### Evidence integrity (chain of custody)
[backend/src/services/evidenceHash.js](../backend/src/services/evidenceHash.js)

- On upload, the **original file** is SHA-256 hashed and stored in `cases.media_hash`.
- When an officer opens a case, the backend **re-hashes the file on disk** and compares.
  Match → the dashboard shows "Evidence verified ✓" with the hash; mismatch → tamper warning.

### Authentication
[backend/src/middleware/auth.js](../backend/src/middleware/auth.js) — stateless JWT,
7-day expiry. `requireAuth` / `requireOfficer` / `requireCitizen` guards. Officer
passwords are bcrypt-hashed at seed time (`officer123`).

### The mocks (all marked `DEMO ONLY` / `SWAP-TO-PRODUCTION`)
| Mock | File | Behaviour |
|---|---|---|
| OTP / SMS | `routes/auth.js` | Always `123456`; "sends" via console.log |
| VAHAN registry | `services/vahanMock.js` | 20 known MP plates + generic fallback |
| Reverse geocode | `services/helpers.js` | Known MP demo landmarks (offline) → OpenStreetMap Nominatim → raw coords if offline |
| Challan PDF | `services/challanPdf.js` | Puppeteer HTML→PDF, HTML fallback, QR placeholder |
| Notifications | `routes/officer.js` | console.log stubs only |
| File storage | `middleware/upload.js` | Local `/uploads` |
| Database | `config/database.js` | SQLite file |

Search the codebase for `SWAP-TO-PRODUCTION` to find every integration seam.

---

## 7. Demo seed data

`node src/db/init.js` runs the schema, seeds the 7 violation types + 2 officers +
1 citizen (Rahul Sharma, `+919876543210`), then loads **5 pre-built cases** via
[backend/src/db/demo-data.js](../backend/src/db/demo-data.js) so the dashboard is
never empty:

| Case # | Plate | Violation | Status |
|---|---|---|---|
| MP-BHO-2025-000001 | MP04AB1234 | Signal Jump | CHALLAN_ISSUED (PDF pre-generated) |
| MP-BHO-2025-000002 | MP04CD5678 | No Helmet | PENDING |
| MP-BHO-2025-000003 | MP07GH9012 | Triple Riding | UNDER_REVIEW |
| MP-BHO-2025-000004 | MP04XY3456 | Wrong Way | REJECTED |
| MP-BHO-2025-000005 | MP09KL7890 | Mobile Use | PENDING |

Demo evidence is a short black MP4 with the plate drawn on it when `ffmpeg` is present,
otherwise a generated SVG "photo". Init is idempotent; `npm run reset` rebuilds from scratch.
