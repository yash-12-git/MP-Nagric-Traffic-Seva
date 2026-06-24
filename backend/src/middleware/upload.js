// Multer upload config for evidence media (video/photo).
//
// SWAP-TO-PRODUCTION: replace diskStorage with multer-s3 (AWS S3 / NIC MeghRaj).
//   - keep the same fieldname ("media") so routes don't change
//   - store the returned object key in cases.media_path
// DEMO ONLY: files land in backend/uploads on the local filesystem.

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.cwd(), process.env.UPLOAD_DIR)
  : path.resolve(__dirname, '../../uploads');
const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '50', 10);

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || guessExt(file.mimetype);
    const stamp = Date.now();
    const rand = crypto.randomBytes(4).toString('hex');
    cb(null, `evidence_${stamp}_${rand}${ext}`);
  },
});

function guessExt(mimetype = '') {
  if (mimetype.includes('mp4')) return '.mp4';
  if (mimetype.includes('quicktime')) return '.mov';
  if (mimetype.includes('jpeg')) return '.jpg';
  if (mimetype.includes('png')) return '.png';
  return '.bin';
}

function fileFilter(req, file, cb) {
  const ok = /^(image|video)\//.test(file.mimetype);
  if (!ok) return cb(new Error('Only image or video files are allowed'));
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
});

module.exports = { upload, UPLOAD_DIR };
