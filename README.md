# MP Nagrik Traffic Seva — Demo Build (Phase 0)

A citizen-powered traffic-violation reporting system for Madhya Pradesh. Citizens
capture violations on a mobile app, an AI OCR pipeline reads the number plate, and
a traffic officer reviews each case and issues an e-challan from a web dashboard.

> **This is a fully local demo.** Every external dependency (VAHAN, Aadhaar, NIC
> cloud, SMS, payment) is mocked and clearly marked `DEMO ONLY`. Each mock is
> built to be swapped for the real service with a single env/code change — search
> the codebase for `SWAP-TO-PRODUCTION`.

## Documentation

- **[docs/FLOW.md](docs/FLOW.md)** — full system flow: services, data model, the
  case lifecycle (capture → OCR → VAHAN → review → challan), API reference, OCR
  internals, evidence integrity, and every mock.
- **[docs/DEMO_GUIDE.md](docs/DEMO_GUIDE.md)** — end-to-end demo run guide: one-time
  setup, starting all services, the 3-minute pitch script, a no-phone curl fallback,
  reset, and troubleshooting.

## Architecture

```
[React Native App (Expo)]  ──HTTP──▶  [Node.js + Express API :3001]
                                          │            │
                                   [SQLite app.db]  [/uploads files]
                                          │
                                          ▼
                              [Python FastAPI OCR :8001]
                              (OpenCV frame pick + EasyOCR plate read)
                                          │
                                          ▼
                                 [Mock VAHAN registry]
[React (Vite) Officer Dashboard :5173]  ──HTTP──▶  same API
```

| Service | Tech | Port |
|---|---|---|
| API Server | Node.js + Express | 3001 |
| OCR Service | Python FastAPI | 8001 |
| Officer Dashboard | React + Vite + Tailwind | 5173 |
| Mobile App | React Native (Expo) | Expo default |

Each service starts independently. If the OCR service is down, submissions still
succeed and fall back to manual plate entry by the officer.

## Prerequisites

- Node.js 18+
- Python 3.10+ (works on 3.9)
- npm
- (Optional) `ffmpeg` — if present, demo evidence is a short MP4; otherwise an SVG image is used.
- (Optional) Chromium for Puppeteer — challan PDFs render via Puppeteer; without it they fall back to a viewable HTML document.

## Setup & Run

Open four terminals.

### 1. Backend API

```bash
cd backend
npm install              # downloads Chromium for Puppeteer (skip with PUPPETEER_SKIP_DOWNLOAD=true)
cp .env.example .env
node src/db/init.js       # creates SQLite DB, seeds reference data + 5 demo cases
node src/index.js         # http://localhost:3001
```

Reset the DB anytime with `npm run reset` (in `backend/`).

### 2. OCR Service

```bash
cd ocr-service
python3 -m venv .venv && source .venv/bin/activate   # optional but recommended
pip install -r requirements.txt                      # EasyOCR pulls in torch — large, one-time
uvicorn main:app --port 8001 --reload                # http://localhost:8001
```

### 3. Officer Dashboard

```bash
cd dashboard
npm install
npm run dev               # http://localhost:5173
```

### 4. Mobile App

```bash
cd mobile
npm install
npx expo start            # scan QR in Expo Go, or press 'w' for web preview
```

**For a real device:** set `API_BASE_URL` in `mobile/src/services/api.js` to your
computer's LAN IP (e.g. `http://192.168.1.5:3001`) and keep the phone on the same
Wi-Fi. Find your IP with `ipconfig getifaddr en0` (macOS).

## Demo credentials

- **Citizen app:** phone `9876543210`, OTP `123456`
- **Officer dashboard:** badge `BHO-TC-001`, password `officer123`

## 3-minute demo script

1. Open the mobile app → log in (phone `9876543210`, OTP `123456`).
2. Tap **Report Violation** → pick a violation type → record a short video (or photo).
3. The app tags GPS + timestamp and uploads to the backend.
4. Backend extracts a frame, OCR reads the plate, VAHAN mock returns the owner.
5. Submit screen shows the case number, detected plate, and registered owner.
6. Open the **officer dashboard** → the case appears in the queue.
7. Open the case → review evidence (SHA-256 verified ✓), confirm plate → **Issue Challan**.
8. A government-styled challan PDF is generated and viewable in-browser.
9. Back in the mobile app, the case status flips to **Challan Issued** and points are added.

The dashboard ships with 5 pre-built demo cases so it is never empty during a pitch.

## What is mocked (and where to swap it)

| Demo mock | Production replacement | File |
|---|---|---|
| SQLite | PostgreSQL | `backend/src/config/database.js` |
| Local file storage | AWS S3 / NIC MeghRaj | `backend/src/middleware/upload.js` |
| Mock OTP | MSG91 / TextLocal SMS | `backend/src/routes/auth.js` |
| Mock VAHAN | MoRTH VAHAN API | `backend/src/services/vahanMock.js` |
| JWT (no refresh) | JWT + refresh tokens | `backend/src/middleware/auth.js` |
| Puppeteer PDF | NIC DigiLocker signed PDF | `backend/src/services/challanPdf.js` |
| Mock reverse-geocode | Nominatim / Google Geocoding | `backend/src/services/helpers.js` |

## Out of scope for Phase 0

Real Aadhaar/VAHAN, payment gateway, cloud deploy, push/SMS sending (console
stubs only), supervisor/admin roles, appeals, court integration, full i18n,
offline mode, rate limiting, HTTPS. See the PRD §15.

## One-command startup (optional)

`docker-compose up` builds and runs the backend + OCR + dashboard together. The
mobile app is always run separately via Expo. See `docker-compose.yml`.
