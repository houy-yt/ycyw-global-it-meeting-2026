/**
 * Settings Service
 * --------------------------------------------------------------
 * Read/Write key-value config from DB (SystemSetting table) with
 * an in-memory cache (10s TTL).  Used by upload limits, sentiment
 * engine selector, etc.  Editable in the admin UI without restart.
 */
const prisma = require('../utils/prisma');

const CACHE_TTL = 10 * 1000; // 10 seconds
let cache = null;
let cacheTs = 0;

async function loadAll() {
  if (cache && Date.now() - cacheTs < CACHE_TTL) return cache;
  const rows = await prisma.systemSetting.findMany();
  const map = {};
  for (const r of rows) map[r.key] = r.value;
  cache = map;
  cacheTs = Date.now();
  return map;
}

function invalidate() {
  cache = null;
  cacheTs = 0;
}

async function get(key, fallback = null) {
  const m = await loadAll();
  return m[key] !== undefined ? m[key] : fallback;
}

async function getInt(key, fallback = 0) {
  const v = await get(key, null);
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

async function getNumber(key, fallback = 0) {
  const v = await get(key, null);
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

async function set(key, value, category = 'general') {
  await prisma.systemSetting.upsert({
    where: { key },
    update: { value: String(value), category },
    create: { key, value: String(value), category },
  });
  invalidate();
}

async function setMany(items) {
  // items: [{key,value,category?}]
  for (const it of items) {
    await prisma.systemSetting.upsert({
      where: { key: it.key },
      update: { value: String(it.value ?? ''), category: it.category || undefined },
      create: { key: it.key, value: String(it.value ?? ''), category: it.category || 'general' },
    });
  }
  invalidate();
}

/** Convenience helpers used across the codebase */
async function getUploadLimitsBytes() {
  const [imgMB, vidMB, resMB] = await Promise.all([
    getInt('upload.maxImageMB', 10),
    getInt('upload.maxVideoMB', 100),
    getInt('upload.maxResourceMB', 100),
  ]);
  return {
    image: imgMB * 1024 * 1024,
    video: vidMB * 1024 * 1024,
    resource: resMB * 1024 * 1024,
    imgMB,
    vidMB,
    resMB,
  };
}

module.exports = {
  loadAll,
  invalidate,
  get,
  getInt,
  getNumber,
  set,
  setMany,
  getUploadLimitsBytes,
};
