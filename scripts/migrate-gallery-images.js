/**
 * One-off migration for existing Gallery images already in production:
 * for every image GalleryItem stored on local disk, generate a compressed
 * webp display copy (max side 1920px, target <=500KB), move the untouched
 * original into a sibling `original/` folder, and update fileUrl/originalUrl.
 *
 * Safe to re-run: records that already have a .webp fileUrl + originalUrl
 * are skipped.
 *
 * Usage:
 *   node scripts/migrate-gallery-images.js --dry-run   # preview only
 *   node scripts/migrate-gallery-images.js              # apply
 */

const path = require('path');
const fs = require('fs');

// dotenv only lives in backend/node_modules, not at the repo root -> resolve explicitly
require(path.join(__dirname, '..', 'backend', 'node_modules', 'dotenv')).config({
  path: path.resolve(__dirname, '..', 'backend', '.env'),
});

const prisma = require('../backend/src/utils/prisma');
const { compressToWebp } = require('../backend/src/utils/imageProcessor');

const DRY_RUN = process.argv.includes('--dry-run');
const UPLOADS_ROOT = path.resolve(__dirname, '..', 'backend', 'uploads');

function urlToAbsolutePath(fileUrl) {
  // fileUrl looks like "/uploads/gallery/2026-07-08/xxx.jpg"
  const rel = fileUrl.replace(/^\/uploads\//, '');
  return path.join(UPLOADS_ROOT, rel);
}

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN (no files or DB rows will be changed) ===' : '=== APPLYING CHANGES ===');

  const items = await prisma.galleryItem.findMany({ where: { type: 'image' } });
  console.log(`Found ${items.length} image record(s).`);

  let done = 0;
  let skippedAlready = 0;
  let skippedRemote = 0;
  let missingFile = 0;
  let failed = 0;
  const failures = [];

  for (const item of items) {
    try {
      if (!item.fileUrl) {
        skippedRemote++;
        continue;
      }
      if (item.fileUrl.endsWith('.webp') && item.originalUrl) {
        skippedAlready++;
        continue;
      }
      if (!item.fileUrl.startsWith('/uploads/')) {
        console.warn(`[skip] id=${item.id} not a local file: ${item.fileUrl}`);
        skippedRemote++;
        continue;
      }

      const srcPath = urlToAbsolutePath(item.fileUrl);
      if (!fs.existsSync(srcPath)) {
        console.warn(`[missing] id=${item.id} file not found: ${srcPath}`);
        missingFile++;
        continue;
      }

      const buffer = fs.readFileSync(srcPath);
      const webpBuffer = await compressToWebp(buffer);
      if (!webpBuffer) {
        console.warn(`[skip] id=${item.id} could not be compressed (unsupported format): ${srcPath}`);
        failed++;
        failures.push({ id: item.id, reason: 'compress-failed', path: srcPath });
        continue;
      }

      const dir = path.dirname(srcPath);
      const ext = path.extname(srcPath);
      const base = path.basename(srcPath, ext);
      const originalDir = path.join(dir, 'original');
      const originalPath = path.join(originalDir, `${base}${ext}`);
      const webpPath = path.join(dir, `${base}.webp`);

      const dateSegment = path.basename(dir);
      const gallerySegment = path.basename(path.dirname(dir));
      const newFileUrl = `/uploads/${gallerySegment}/${dateSegment}/${base}.webp`;
      const newOriginalUrl = `/uploads/${gallerySegment}/${dateSegment}/original/${base}${ext}`;

      console.log(`[${DRY_RUN ? 'would-process' : 'processing'}] id=${item.id} ${srcPath}`);
      console.log(`    -> original: ${originalPath}`);
      console.log(`    -> webp:     ${webpPath} (${webpBuffer.length} bytes)`);

      if (!DRY_RUN) {
        if (!fs.existsSync(originalDir)) {
          fs.mkdirSync(originalDir, { recursive: true });
        }
        fs.renameSync(srcPath, originalPath);
        fs.writeFileSync(webpPath, webpBuffer);

        await prisma.galleryItem.update({
          where: { id: item.id },
          data: { fileUrl: newFileUrl, originalUrl: newOriginalUrl },
        });
      }

      done++;
    } catch (e) {
      failed++;
      failures.push({ id: item.id, reason: e.message });
      console.error(`[error] id=${item.id}:`, e.message);
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Processed:        ${done}`);
  console.log(`Already done:     ${skippedAlready}`);
  console.log(`Skipped (remote): ${skippedRemote}`);
  console.log(`Missing files:    ${missingFile}`);
  console.log(`Failed:           ${failed}`);
  if (failures.length) {
    console.log('Failure details:', JSON.stringify(failures, null, 2));
  }
  if (DRY_RUN) {
    console.log('\nThis was a dry run. Re-run without --dry-run to apply.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
