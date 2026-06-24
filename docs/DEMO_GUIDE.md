# MP Nagrik Traffic Seva — End-to-End Demo Guide

How to bring the whole system up and run the pitch, start to finish. For the system
internals (architecture, data model, API), see [FLOW.md](./FLOW.md).

- **Total live demo runtime:** under 3 minutes.
- **Demo credentials**
  - Citizen app: phone `9876543210`, OTP `123456`
  - Officer dashboard: badge `BHO-TC-001`, password `officer123`

---

## 0. Prerequisites

- Node.js 18+, npm
- Python 3.10+ (works on 3.9)
- Optional but recommended for a polished demo:
  - **ffmpeg** — makes demo evidence a real short MP4 (otherwise an SVG image is used)
  - **Chromium for Puppeteer** — renders the challan as a real PDF (otherwise a viewable HTML challan is produced)

Everything runs locally. No internet is needed *during* the demo — only once up front
to install dependencies (npm packages, EasyOCR's PyTorch, Puppeteer's Chromium).

---

## 1. One-time setup

Do this **before** the demo (the EasyOCR/PyTorch and Chromium downloads are large).

### Terminal A — Backend API
```bash
cd mp-traffic-app/backend
npm install                 # installs deps incl. Puppeteer's Chromium
cp .env.example .env
node src/db/init.js          # creates SQLite DB + seeds 5 demo cases
```
You should see `[demo] 5 demo cases loaded.`

### Terminal B — OCR service
```bash
cd mp-traffic-app/ocr-service
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt    # EasyOCR pulls in torch — large, one-time
```

### Terminal C — Dashboard
```bash
cd mp-traffic-app/dashboard
npm install
```

### Terminal D — Mobile app
```bash
cd mp-traffic-app/mobile
npm install
```

---

## 2. Start the services (4 terminals)

Bring them up in this order. Each prints a banner when ready.

| # | Terminal | Command | Ready when you see |
|---|---|---|---|
| 1 | backend | `node src/index.js` | `Listening on http://localhost:3001` |
| 2 | ocr-service | `uvicorn main:app --port 8001 --reload` | `Uvicorn running on http://127.0.0.1:8001` |
| 3 | dashboard | `npm run dev` | `Local: http://localhost:5173` |
| 4 | mobile | `npx expo start` | Expo QR code |

Backend logs `[api] OCR service reachable` once OCR (terminal 2) is up. If OCR is
down, submissions still work — the officer just enters the plate manually.

**Quick health check (optional):**
```bash
curl http://localhost:3001/health        # {"success":true,...}
curl http://localhost:8001/health        # {"ok":true,...}
```

> **One-command alternative:** `docker-compose up` starts backend + OCR + dashboard
> together. The mobile app is always run separately via Expo.

---

## 3. The live demo (the 3-minute story)

Have the **officer dashboard** (browser, `http://localhost:5173`) and the **mobile
app** side by side on screen.

### Act 1 — Citizen reports a violation (mobile)
1. App opens on the splash screen → Login.
2. Enter phone `9876543210` → **Send OTP** → enter `123456` → **Verify**.
   *(The demo OTP is shown on screen.)*
3. Home screen greets the citizen and shows their points. Tap **Report Violation**.
4. Pick a violation type chip (e.g. **Signal Jump**). Record a short video (or switch
   to photo). The GPS indicator shows location is captured.
5. Confirm → **Submit screen** shows the thumbnail, geocoded location, time, and type.
   Tap **Submit Report**.
6. The progress bar runs, then the success view shows:
   **case number**, **"Plate detected: MP04AB1234"**, the **registered owner**, and
   **points earned**.

> Talking point: "The frame was extracted, the plate was read by AI, and the VAHAN
> registry returned the owner — all in a couple of seconds, fully on-device-adjacent."

### Act 2 — Officer reviews and issues the challan (dashboard)
7. Log in: badge `BHO-TC-001`, password `officer123`.
8. The new case is at the top of the **Case Queue** (alongside the 5 seeded cases).
   Click it.
9. **Case Detail**: play the evidence video, see the **detected plate** (editable) with
   its confidence score, the **VAHAN owner details**, the **GPS location on the map**,
   and **"SHA-256 verified ✓"** (the backend re-hashed the file and it matched).
10. Optionally correct the plate/type, add an officer note, then click **Issue Challan**.
11. The **challan PDF** opens — a government-styled e-challan with offender details,
    fine amount, MV Act section, embedded evidence, and a payment-QR placeholder.

> Talking point: "Tamper-evident evidence, officer-in-the-loop adjudication, and a
> formatted challan ready for the existing eChallan rails."

### Act 3 — Citizen sees the outcome (mobile)
12. Back in the app, open **My Reports** → the case status is now **Challan Issued**
    (green badge). The **Profile** screen shows the points balance increased.

That's the loop: capture → AI → review → challan → citizen reward.

### Showing analytics (optional closer)
On the dashboard, open **Analytics**: total cases, challans, total fines, average
resolution time, a violations-by-type bar chart, a cases-per-day line chart, and a
**hotspot map** with a marker per case GPS location.

---

## 4. No-phone fallback (drive the pipeline with curl)

If a device/simulator isn't handy, you can demo the exact same backend pipeline from
a terminal. This proves OCR → VAHAN → case → challan without the app.

```bash
# 1. Citizen logs in → grab a JWT
CITIZEN=$(curl -s -X POST http://localhost:3001/api/auth/citizen/verify-otp \
  -H 'Content-Type: application/json' \
  -d '{"phone":"9876543210","otp":"123456"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["data"]["token"])')

# 2. Submit a case (reuse a seeded demo evidence file as the upload)
EVID=$(ls backend/uploads/demo_MP-BHO-2025-000001.* | head -1)
curl -s -X POST http://localhost:3001/api/cases \
  -H "Authorization: Bearer $CITIZEN" \
  -F "media=@${EVID}" \
  -F "violation_type_id=1" \
  -F "latitude=23.2563" -F "longitude=77.4009" \
  -F "incident_time=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  -F "reporter_note=Ran the red light at Roshanpura" | python3 -m json.tool

# 3. Officer logs in
OFFICER=$(curl -s -X POST http://localhost:3001/api/auth/officer/login \
  -H 'Content-Type: application/json' \
  -d '{"badge_number":"BHO-TC-001","password":"officer123"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["data"]["token"])')

# 4. See the queue, then approve the newest case (replace :id)
curl -s "http://localhost:3001/api/officer/cases?status=PENDING" \
  -H "Authorization: Bearer $OFFICER" | python3 -m json.tool

curl -s -X PATCH http://localhost:3001/api/officer/cases/6/approve \
  -H "Authorization: Bearer $OFFICER" -H 'Content-Type: application/json' \
  -d '{"officer_note":"Clear signal jump","confirmed_plate":"MP04AB1234","violation_type_id":1}' \
  | python3 -m json.tool

# 5. Fetch the generated challan PDF
curl -s "http://localhost:3001/api/challans/CH-MP-2025-000002/pdf?token=$OFFICER" -o /tmp/challan.pdf
open /tmp/challan.pdf      # macOS
```

The case `:id` and challan number depend on how many cases exist — read them from the
responses in steps 2–4.

---

## 5. Reset between runs

```bash
cd backend
npm run reset      # deletes app.db and re-seeds schema + 5 demo cases + PDFs
```

Then restart the backend (`node src/index.js`). The dashboard/mobile reconnect
automatically. Use this if a rehearsal left extra cases in the queue.

---

## 6. Troubleshooting

| Symptom | Cause / Fix |
|---|---|
| Mobile app can't reach backend on a real phone | `API_BASE_URL` in `mobile/src/services/api.js` is `localhost`. Set it to your machine's LAN IP (`ipconfig getifaddr en0` on macOS) and keep the phone on the same Wi-Fi. |
| Web preview (`expo start` → `w`) errors about `react-dom` | Expo will offer to install `react-dom`, `react-native-web`, `@expo/metro-runtime` — accept. Camera/GPS are best shown on a real device anyway. |
| Submit succeeds but no plate detected | OCR service (terminal 2) isn't running, or the media is blurry/dark. The case is still created; the officer enters the plate manually on the dashboard. |
| Challan opens as HTML, not PDF | Puppeteer couldn't launch Chromium. It fell back to a viewable HTML challan. Re-run `npm install` in `backend/`, or set up Chromium; not blocking for the demo. |
| Demo evidence is a static image, not a video | `ffmpeg` isn't installed. Install it before re-running `npm run reset` to get short MP4 evidence. |
| "Evidence verified ✓" not shown | The media file under `backend/uploads/` was moved/deleted after submission, so the re-hash doesn't match. Re-submit or reset. |
| Port already in use | Something else holds 3001/8001/5173. Stop it, or change `PORT` in `backend/.env` / the `--port` flags. |
| OCR install is huge / slow | EasyOCR pulls PyTorch. It's a one-time download; do it well before the demo. The system runs without OCR (manual entry fallback) if needed. |

---

## 7. What's real vs mocked (set expectations in the pitch)

**Real in this build:** the full data flow, JWT auth, SQLite persistence, SHA-256
evidence integrity, EasyOCR plate reading, officer review workflow, challan PDF
generation, points/rewards, audit log, analytics.

**Mocked (clearly marked `DEMO ONLY`, swappable via `SWAP-TO-PRODUCTION`):** OTP/SMS,
VAHAN registry (20 sample MP plates), reverse geocoding, notifications, payment QR,
cloud storage. See the swap table in the [README](../README.md#what-is-mocked-and-where-to-swap-it).
