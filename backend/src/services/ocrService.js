// OCR client — calls the Python FastAPI OCR service to read a number plate
// from an uploaded image or video.
//
// The OCR service is a SEPARATE process (port 8001). It is intentionally a soft
// dependency: if it is down or slow, we degrade gracefully and the case is still
// created with no plate, so the officer can enter the plate manually.

const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const OCR_SERVICE_URL = process.env.OCR_SERVICE_URL || 'http://localhost:8001';
const OCR_TIMEOUT_MS = 60000;

/**
 * Send a media file to the OCR service and return the parsed plate result.
 * Never throws — on any failure it returns a safe "no plate" result.
 *
 * @param {string} filePath absolute path to the uploaded media
 * @param {object} [opts]
 * @param {string} [opts.violationCode] stated violation (e.g. 'NO_HELMET') for the
 *   YOLO verification step.
 * @returns {Promise<object>} { best_plate, best_confidence, plates, verification, raw, error? }
 */
async function readPlate(filePath, opts = {}) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`file not found: ${filePath}`);
    }
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
    if (opts.violationCode) form.append('violation_code', opts.violationCode);

    console.log(`[ocr] sending ${filePath} -> ${OCR_SERVICE_URL}/ocr/plate (violation=${opts.violationCode || '-'})`);
    const res = await axios.post(`${OCR_SERVICE_URL}/ocr/plate`, form, {
      headers: form.getHeaders(),
      timeout: OCR_TIMEOUT_MS,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    const data = res.data || {};
    console.log(`[ocr] result: plate=${data.best_plate} confidence=${data.best_confidence}`);
    return {
      best_plate: data.best_plate || null,
      best_confidence: data.best_confidence || 0,
      plates: data.plates || [],
      verification: data.verification || null,
      frame_extracted: data.frame_extracted || false,
      processing_time_ms: data.processing_time_ms || 0,
      raw: data,
    };
  } catch (err) {
    // DEMO ONLY graceful degradation: OCR being down must NOT crash a submission.
    console.error('[ocr] service unavailable or failed:', err.message);
    return {
      best_plate: null,
      best_confidence: 0,
      plates: [],
      verification: { available: false, notes: 'OCR/verification service unavailable.' },
      frame_extracted: false,
      processing_time_ms: 0,
      error: err.message,
      raw: { error: err.message, message: 'OCR service unavailable — officer manual entry required.' },
    };
  }
}

/** Health check used by the backend at startup (non-fatal if it fails). */
async function ping() {
  try {
    const res = await axios.get(`${OCR_SERVICE_URL}/health`, { timeout: 3000 });
    return res.data;
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = { readPlate, ping, OCR_SERVICE_URL };
