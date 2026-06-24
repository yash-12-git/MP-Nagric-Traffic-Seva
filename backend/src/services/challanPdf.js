// Challan PDF generation.
//
// Renders an official-looking government e-challan HTML template to PDF with
// Puppeteer (pixel-perfect from HTML).
//
// SWAP-TO-PRODUCTION: replace Puppeteer with NIC DigiLocker signed-PDF issuance
// so the challan carries a verifiable digital signature. The HTML template here
// can be reused as the visual layout.
//
// Robustness: if Puppeteer can't launch a browser (e.g. Chromium wasn't
// downloaded), we fall back to writing the HTML alongside .pdf so the demo
// still produces a viewable document instead of crashing.

const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.cwd(), process.env.UPLOAD_DIR)
  : path.resolve(__dirname, '../../uploads');
const CHALLAN_DIR = path.join(UPLOAD_DIR, 'challans');

function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Build the challan HTML. `data` matches the shape in PRD section 8.1.
 * `thumbnailDataUri` is an optional embedded evidence image (data: URI).
 */
function buildHtml(data, thumbnailDataUri) {
  const evidenceBlock = thumbnailDataUri
    ? `<img src="${thumbnailDataUri}" alt="evidence" style="width:100%;border:1px solid #ccc;border-radius:4px;" />`
    : `<div class="evidence-placeholder">Evidence thumbnail<br/>(captured by citizen)</div>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a1a; margin: 0; padding: 32px; }
  .sheet { max-width: 760px; margin: 0 auto; border: 2px solid #0b3d91; }
  .header { display:flex; align-items:center; gap:16px; background:#0b3d91; color:#fff; padding:16px 20px; }
  .emblem { width:54px; height:54px; flex:0 0 auto; }
  .header h1 { margin:0; font-size:20px; letter-spacing:0.5px; }
  .header .sub { margin:2px 0 0; font-size:12px; opacity:0.9; }
  .title-bar { text-align:center; padding:12px; border-bottom:2px solid #0b3d91; }
  .title-bar .hi { font-size:22px; font-weight:700; color:#0b3d91; }
  .title-bar .en { font-size:14px; letter-spacing:3px; color:#444; }
  .meta { display:flex; justify-content:space-between; padding:10px 20px; font-size:12px; background:#f3f6fb; border-bottom:1px solid #d6deeb; }
  .cols { display:flex; gap:20px; padding:20px; }
  .col { flex:1; }
  .section-label { font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#0b3d91; font-weight:700; border-bottom:1px solid #d6deeb; padding-bottom:4px; margin-bottom:8px; }
  .row { font-size:13px; margin-bottom:8px; }
  .row .k { color:#666; display:block; font-size:11px; }
  .row .v { font-weight:600; }
  .fine-box { margin:0 20px 16px; background:#fff4e5; border:2px solid #e8a33d; border-radius:6px; padding:14px 20px; display:flex; justify-content:space-between; align-items:center; }
  .fine-box .label { font-size:13px; color:#8a5a00; }
  .fine-box .amount { font-size:30px; font-weight:800; color:#b5651d; }
  .evidence-wrap { padding:0 20px 16px; }
  .evidence-placeholder { width:100%; height:150px; display:flex; align-items:center; justify-content:center; text-align:center; background:#f0f0f0; border:1px dashed #aaa; color:#777; font-size:12px; border-radius:4px; }
  .qr { width:110px; height:110px; background:#e9e9e9; border:1px solid #ccc; display:flex; align-items:center; justify-content:center; text-align:center; font-size:10px; color:#777; padding:6px; }
  .qr-wrap { display:flex; gap:16px; align-items:center; padding:0 20px 16px; }
  .footer { font-size:10px; color:#555; padding:14px 20px; border-top:1px solid #d6deeb; background:#f3f6fb; line-height:1.5; }
  .badge-demo { position:fixed; top:40px; right:-50px; transform:rotate(45deg); background:#c62828; color:#fff; padding:6px 60px; font-size:11px; font-weight:700; letter-spacing:1px; }
</style>
</head>
<body>
  <div class="badge-demo">DEMO — NOT LEGALLY VALID</div>
  <div class="sheet">
    <div class="header">
      <!-- Placeholder state emblem (Ashoka pillar stylised) -->
      <svg class="emblem" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="46" fill="#fff" stroke="#0b3d91" stroke-width="3"/>
        <circle cx="50" cy="50" r="14" fill="none" stroke="#0b3d91" stroke-width="3"/>
        ${Array.from({ length: 24 }).map((_, i) => {
          const a = (i * 15 * Math.PI) / 180;
          const x1 = 50 + 14 * Math.cos(a);
          const y1 = 50 + 14 * Math.sin(a);
          const x2 = 50 + 30 * Math.cos(a);
          const y2 = 50 + 30 * Math.sin(a);
          return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#0b3d91" stroke-width="2"/>`;
        }).join('')}
      </svg>
      <div>
        <h1>Government of Madhya Pradesh</h1>
        <p class="sub">Transport Department &middot; Traffic Police</p>
      </div>
    </div>

    <div class="title-bar">
      <div class="hi">ई-चालान</div>
      <div class="en">E - C H A L L A N</div>
    </div>

    <div class="meta">
      <span><strong>Challan No:</strong> ${esc(data.challan_number)}</span>
      <span><strong>Case No:</strong> ${esc(data.case_number)}</span>
      <span><strong>Issued:</strong> ${esc(data.issued_date)}</span>
    </div>

    <div class="cols">
      <div class="col">
        <div class="section-label">Offence Details</div>
        <div class="row"><span class="k">Violation</span><span class="v">${esc(data.violation)}</span></div>
        <div class="row"><span class="k">MV Act Section</span><span class="v">${esc(data.mv_act_section)}</span></div>
        <div class="row"><span class="k">Location</span><span class="v">${esc(data.location)}</span></div>
        <div class="row"><span class="k">Date &amp; Time of Incident</span><span class="v">${esc(data.incident_time)}</span></div>
        <div class="row"><span class="k">Payment Due By</span><span class="v">${esc(data.due_date)}</span></div>
      </div>
      <div class="col">
        <div class="section-label">Vehicle &amp; Owner</div>
        <div class="row"><span class="k">Registration No.</span><span class="v">${esc(data.vehicle_number)}</span></div>
        <div class="row"><span class="k">Vehicle Type</span><span class="v">${esc(data.vehicle_type)}</span></div>
        <div class="row"><span class="k">Owner Name</span><span class="v">${esc(data.offender_name)}</span></div>
        <div class="row"><span class="k">Owner Address</span><span class="v">${esc(data.offender_address)}</span></div>
      </div>
    </div>

    <div class="fine-box">
      <span class="label">Total Fine Payable</span>
      <span class="amount">${esc(data.fine_amount)}</span>
    </div>

    <div class="evidence-wrap">
      <div class="section-label">Photographic Evidence</div>
      ${evidenceBlock}
    </div>

    <div class="qr-wrap">
      <div class="qr">Payment QR<br/>Available in production</div>
      <div style="font-size:12px;">
        <div class="row"><span class="k">Issued By</span><span class="v">${esc(data.issued_by)}</span></div>
        <div class="row"><span class="k">Adjudicating Authority</span><span class="v">${esc(data.court_name)}</span></div>
      </div>
    </div>

    <div class="footer">
      This e-challan is issued under the Motor Vehicles Act, 2019. Payment may be made within 60 days of issuance.
      To contest this challan, appear before the ${esc(data.court_name)} with this document.
      <br/><strong>DEMO ONLY:</strong> This is a prototype document generated by MP Nagrik Traffic Seva (Phase 0) and is not a legally enforceable instrument.
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generate a challan PDF and return its absolute path.
 * @param {object} data PRD 8.1 shape
 * @param {string|null} thumbnailDataUri optional embedded evidence image
 * @returns {Promise<{ pdfPath: string, fallbackHtml: boolean }>}
 */
async function generateChallanPdf(data, thumbnailDataUri = null) {
  fs.mkdirSync(CHALLAN_DIR, { recursive: true });
  const html = buildHtml(data, thumbnailDataUri);
  const pdfPath = path.join(CHALLAN_DIR, `${data.challan_number}.pdf`);

  try {
    // Lazy-require so a missing puppeteer install doesn't break server boot.
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({ path: pdfPath, format: 'A4', printBackground: true, margin: { top: '12mm', bottom: '12mm', left: '10mm', right: '10mm' } });
    await browser.close();
    console.log(`[challanPdf] generated ${pdfPath}`);
    return { pdfPath, fallbackHtml: false };
  } catch (err) {
    // DEMO ONLY fallback: write the HTML next to the .pdf path so there is still
    // a viewable artifact. The challan route serves whichever exists.
    console.error('[challanPdf] Puppeteer unavailable, falling back to HTML:', err.message);
    const htmlPath = pdfPath.replace(/\.pdf$/, '.html');
    fs.writeFileSync(htmlPath, html, 'utf8');
    console.log(`[challanPdf] wrote fallback HTML ${htmlPath}`);
    return { pdfPath: htmlPath, fallbackHtml: true };
  }
}

module.exports = { generateChallanPdf, buildHtml };
