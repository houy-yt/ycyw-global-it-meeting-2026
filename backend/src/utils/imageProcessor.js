const sharp = require('sharp');

const MAX_DIMENSION = 1600;
const MAX_BYTES = 300 * 1024;
const QUALITY_LADDER = [100, 90, 82, 75, 68, 60, 52, 45, 38, 30];

/**
 * Resize (max side 1600px, no upscale, aspect ratio kept) and re-encode
 * an image buffer as webp, trying to land at or under 300KB.
 *
 * @param {Buffer} buffer
 * @returns {Promise<Buffer|null>} webp buffer, or null if the input can't be processed by sharp
 */
async function compressToWebp(buffer) {
  try {
    const base = sharp(buffer)
      .rotate()
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
      .sharpen({ sigma: 1.0 });

    let last = null;
    for (const quality of QUALITY_LADDER) {
      const out = await base.clone().webp({ quality, effort: 6, smartSubsample: true }).toBuffer();
      last = out;
      if (out.length <= MAX_BYTES) return out;
    }
    console.warn(`[imageProcessor] could not reach ${MAX_BYTES} bytes even at lowest quality; using ${last.length} bytes`);
    return last;
  } catch (e) {
    console.warn('[imageProcessor] compressToWebp failed, falling back to original:', e.message);
    return null;
  }
}

module.exports = { compressToWebp, MAX_DIMENSION, MAX_BYTES };
