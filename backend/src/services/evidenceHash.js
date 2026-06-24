// Evidence integrity — SHA-256 chain of custody for uploaded media.
// On upload we hash the original file and store it on the case. When an officer
// opens the case the backend re-hashes the file and confirms it still matches,
// showing "Evidence verified" on the dashboard.

const crypto = require('crypto');
const fs = require('fs');

/**
 * Compute the SHA-256 hex digest of a file.
 * @param {string} filePath
 * @returns {string|null} 64-char hex digest, or null if the file is missing.
 */
function hashFile(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  } catch (err) {
    console.error(`[evidenceHash] could not hash ${filePath}:`, err.message);
    return null;
  }
}

/**
 * Re-hash a file and compare against a stored hash.
 * @returns {{ verified: boolean, currentHash: string|null, storedHash: string }}
 */
function verifyFile(filePath, storedHash) {
  const currentHash = hashFile(filePath);
  return {
    verified: !!currentHash && currentHash === storedHash,
    currentHash,
    storedHash,
  };
}

module.exports = { hashFile, verifyFile };
