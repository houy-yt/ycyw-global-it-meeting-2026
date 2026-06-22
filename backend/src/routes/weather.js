/**
 * Weather API proxy route with caching.
 *
 * Supports TWO providers:
 *   1. QWeather (和风天气) – requires JWT auth with Ed25519 private key
 *   2. Open-Meteo – FREE, no key needed (fallback / default)
 *
 * The system tries QWeather first (if configured); falls back to Open-Meteo.
 *
 * Environment variables:
 *   QWEATHER_API_HOST      – unique API host (e.g. xxx.re.qweatherapi.com)
 *   QWEATHER_CREDENTIAL_ID – credential ID for JWT signing
 *   QWEATHER_PRIVATE_KEY   – Ed25519 private key (base64 body only)
 *   WEATHER_LOCATION       – QWeather location ID, default 101010100 (北京)
 *   WEATHER_PROVIDER       – "qweather" | "openmeteo" (default: auto)
 */

const crypto = require('crypto');
const express = require('express');
const router = express.Router();

// ── Config ──────────────────────────────────────────────
const API_HOST = process.env.QWEATHER_API_HOST || '';
const CREDENTIAL_ID = process.env.QWEATHER_CREDENTIAL_ID || '';
const PRIVATE_KEY_B64 = process.env.QWEATHER_PRIVATE_KEY || '';
const LOCATION = process.env.WEATHER_LOCATION || '101010100';
const PROVIDER = process.env.WEATHER_PROVIDER || 'auto'; // "qweather" | "openmeteo" | "auto"

// Beijing coordinates for Open-Meteo
const BEIJING_LAT = 39.9042;
const BEIJING_LON = 116.4074;

// ── Simple in-memory cache ──────────────────────────────
const cache = {};
function getCached(key, ttlMs) {
  const entry = cache[key];
  if (entry && Date.now() - entry.ts < ttlMs) return entry.data;
  return null;
}
function setCache(key, data) {
  cache[key] = { data, ts: Date.now() };
}

// ══════════════════════════════════════════════════════════
//  QWeather Provider (和风天气)
// ══════════════════════════════════════════════════════════

function base64url(data) {
  const buf = typeof data === 'string' ? Buffer.from(data) : data;
  return buf.toString('base64url');
}

let cachedToken = null;
let tokenExpiry = 0;

function generateJWT() {
  const pem = `-----BEGIN PRIVATE KEY-----\n${PRIVATE_KEY_B64}\n-----END PRIVATE KEY-----`;
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'EdDSA', kid: CREDENTIAL_ID };
  const payload = { sub: CREDENTIAL_ID, iat: now, exp: now + 86400 };
  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const message = `${headerB64}.${payloadB64}`;
  const key = crypto.createPrivateKey(pem);
  const signature = crypto.sign(null, Buffer.from(message), key);
  return `${message}.${base64url(signature)}`;
}

function getQWeatherToken() {
  const now = Date.now();
  if (!cachedToken || now >= tokenExpiry) {
    cachedToken = generateJWT();
    tokenExpiry = now + 23 * 60 * 60 * 1000;
  }
  return cachedToken;
}

function isQWeatherConfigured() {
  return !!(API_HOST && CREDENTIAL_ID && PRIVATE_KEY_B64);
}

async function qweatherFetch(path) {
  const token = getQWeatherToken();
  const url = new URL(`https://${API_HOST}${path}`);
  url.searchParams.set('location', LOCATION);
  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`QWeather ${res.status}: ${body.substring(0, 200)}`);
  }
  const data = await res.json();
  if (data.code && data.code !== '200') throw new Error(`QWeather code ${data.code}`);
  return data;
}

// ── QWeather weather code → icon mapping ────────────────
const qweatherMap = {
  100: { text: '晴', icon: 'sun' }, 101: { text: '多云', icon: 'cloud-sun' },
  102: { text: '少云', icon: 'cloud-sun' }, 103: { text: '晴间多云', icon: 'cloud-sun' },
  104: { text: '阴', icon: 'cloud' }, 150: { text: '晴', icon: 'moon' },
  151: { text: '多云', icon: 'cloud-moon' }, 152: { text: '少云', icon: 'cloud-moon' },
  153: { text: '晴间多云', icon: 'cloud-moon' },
  300: { text: '阵雨', icon: 'cloud-sun-rain' }, 301: { text: '强阵雨', icon: 'cloud-showers-heavy' },
  302: { text: '雷阵雨', icon: 'cloud-bolt' }, 303: { text: '强雷阵雨', icon: 'cloud-bolt' },
  304: { text: '雷阵雨伴冰雹', icon: 'cloud-bolt' },
  305: { text: '小雨', icon: 'cloud-rain' }, 306: { text: '中雨', icon: 'cloud-rain' },
  307: { text: '大雨', icon: 'cloud-showers-heavy' }, 308: { text: '极端降雨', icon: 'cloud-showers-heavy' },
  309: { text: '毛毛雨', icon: 'cloud-rain' }, 310: { text: '暴雨', icon: 'cloud-showers-heavy' },
  311: { text: '大暴雨', icon: 'cloud-showers-heavy' }, 312: { text: '特大暴雨', icon: 'cloud-showers-heavy' },
  313: { text: '冻雨', icon: 'cloud-rain' }, 314: { text: '小到中雨', icon: 'cloud-rain' },
  315: { text: '中到大雨', icon: 'cloud-rain' }, 316: { text: '大到暴雨', icon: 'cloud-showers-heavy' },
  400: { text: '小雪', icon: 'snowflake' }, 401: { text: '中雪', icon: 'snowflake' },
  402: { text: '大雪', icon: 'snowflake' }, 403: { text: '暴雪', icon: 'snowflake' },
  404: { text: '雨夹雪', icon: 'cloud-rain' }, 407: { text: '阵雪', icon: 'snowflake' },
  500: { text: '薄雾', icon: 'smog' }, 501: { text: '雾', icon: 'smog' },
  502: { text: '霾', icon: 'smog' }, 503: { text: '扬沙', icon: 'wind' },
  504: { text: '浮尘', icon: 'smog' }, 507: { text: '沙尘暴', icon: 'wind' },
  900: { text: '热', icon: 'temperature-high' }, 901: { text: '冷', icon: 'temperature-low' },
};
function resolveQWeather(code) {
  return qweatherMap[Number(code)] || { text: `天气${code}`, icon: 'cloud' };
}

// ══════════════════════════════════════════════════════════
//  Open-Meteo Provider (FREE, no API key needed)
// ══════════════════════════════════════════════════════════

// WMO Weather Code → Chinese text & FontAwesome icon
const wmoMap = {
  0: { text: '晴', icon: 'sun' },
  1: { text: '大部晴', icon: 'sun' },
  2: { text: '多云', icon: 'cloud-sun' },
  3: { text: '阴', icon: 'cloud' },
  45: { text: '雾', icon: 'smog' },
  48: { text: '冻雾', icon: 'smog' },
  51: { text: '小毛毛雨', icon: 'cloud-rain' },
  53: { text: '毛毛雨', icon: 'cloud-rain' },
  55: { text: '大毛毛雨', icon: 'cloud-rain' },
  56: { text: '冻毛毛雨', icon: 'cloud-rain' },
  57: { text: '冻毛毛雨', icon: 'cloud-rain' },
  61: { text: '小雨', icon: 'cloud-rain' },
  63: { text: '中雨', icon: 'cloud-rain' },
  65: { text: '大雨', icon: 'cloud-showers-heavy' },
  66: { text: '冻雨', icon: 'cloud-rain' },
  67: { text: '冻雨', icon: 'cloud-showers-heavy' },
  71: { text: '小雪', icon: 'snowflake' },
  73: { text: '中雪', icon: 'snowflake' },
  75: { text: '大雪', icon: 'snowflake' },
  77: { text: '雪粒', icon: 'snowflake' },
  80: { text: '阵雨', icon: 'cloud-sun-rain' },
  81: { text: '中阵雨', icon: 'cloud-rain' },
  82: { text: '强阵雨', icon: 'cloud-showers-heavy' },
  85: { text: '阵雪', icon: 'snowflake' },
  86: { text: '大阵雪', icon: 'snowflake' },
  95: { text: '雷暴', icon: 'cloud-bolt' },
  96: { text: '雷暴伴冰雹', icon: 'cloud-bolt' },
  99: { text: '强雷暴伴冰雹', icon: 'cloud-bolt' },
};
function resolveWMO(code) {
  return wmoMap[Number(code)] || { text: '未知', icon: 'cloud' };
}

async function openMeteoFetchNow() {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${BEIJING_LAT}&longitude=${BEIJING_LON}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure&timezone=Asia/Shanghai`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const data = await res.json();
  const c = data.current;
  const w = resolveWMO(c.weather_code);
  // Convert wind direction degrees to Chinese compass direction
  const dirs = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
  const windDir = dirs[Math.round(c.wind_direction_10m / 45) % 8];
  // Beaufort scale approximation
  const ws = c.wind_speed_10m;
  const windScale = ws < 1 ? '0' : ws < 6 ? '1' : ws < 12 ? '2' : ws < 20 ? '3' : ws < 29 ? '4' : ws < 39 ? '5' : ws < 50 ? '6' : '7+';
  return {
    location: '北京',
    temp: String(Math.round(c.temperature_2m)),
    feelsLike: String(Math.round(c.apparent_temperature)),
    text: w.text,
    icon: w.icon,
    weatherCode: String(c.weather_code),
    humidity: String(c.relative_humidity_2m),
    windDir,
    windScale,
    windSpeed: String(Math.round(c.wind_speed_10m)),
    pressure: String(Math.round(c.surface_pressure)),
    vis: '--',
    obsTime: c.time,
    updateTime: new Date().toISOString(),
  };
}

async function openMeteoFetchForecast(days) {
  const n = Math.min(Number(days) || 15, 16);
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${BEIJING_LAT}&longitude=${BEIJING_LON}&daily=weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max,wind_direction_10m_dominant,relative_humidity_2m_mean,uv_index_max,sunrise,sunset&forecast_days=${n}&timezone=Asia/Shanghai`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const data = await res.json();
  const d = data.daily;
  const daily = d.time.map((date, i) => {
    const dayW = resolveWMO(d.weather_code[i]);
    const dirs = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
    const windDir = dirs[Math.round((d.wind_direction_10m_dominant?.[i] || 0) / 45) % 8];
    const ws = d.wind_speed_10m_max?.[i] || 0;
    const windScale = ws < 1 ? '0' : ws < 6 ? '1' : ws < 12 ? '2' : ws < 20 ? '3' : ws < 29 ? '4' : ws < 39 ? '5' : ws < 50 ? '6' : '7+';
    return {
      date,
      tempMax: String(Math.round(d.temperature_2m_max[i])),
      tempMin: String(Math.round(d.temperature_2m_min[i])),
      textDay: dayW.text,
      textNight: dayW.text,
      iconDay: dayW.icon,
      iconNight: dayW.icon,
      weatherCodeDay: String(d.weather_code[i]),
      weatherCodeNight: String(d.weather_code[i]),
      windDirDay: windDir,
      windScaleDay: windScale,
      windDirNight: windDir,
      windScaleNight: windScale,
      humidity: String(Math.round(d.relative_humidity_2m_mean?.[i] || 0)),
      uvIndex: String(Math.round(d.uv_index_max?.[i] || 0)),
      sunrise: d.sunrise?.[i]?.split('T')[1] || '',
      sunset: d.sunset?.[i]?.split('T')[1] || '',
    };
  });
  return {
    location: '北京',
    days: daily.length,
    daily,
    updateTime: new Date().toISOString(),
  };
}

// ══════════════════════════════════════════════════════════
//  Provider selection logic
// ══════════════════════════════════════════════════════════

function shouldUseQWeather() {
  if (PROVIDER === 'openmeteo') return false;
  if (PROVIDER === 'qweather') return true;
  // auto: use QWeather if configured
  return isQWeatherConfigured();
}

// ── Routes ──────────────────────────────────────────────

/**
 * GET /api/weather/now  →  当前实时天气
 */
router.get('/now', async (req, res) => {
  try {
    const cached = getCached('weather_now', 30 * 60 * 1000);
    if (cached) return res.json(cached);

    let result;

    if (shouldUseQWeather()) {
      try {
        const data = await qweatherFetch('/v7/weather/now');
        const now = data.now;
        const w = resolveQWeather(now.icon);
        result = {
          location: '北京', temp: now.temp, feelsLike: now.feelsLike,
          text: now.text || w.text, icon: w.icon, weatherCode: now.icon,
          humidity: now.humidity, windDir: now.windDir, windScale: now.windScale,
          windSpeed: now.windSpeed, pressure: now.pressure, vis: now.vis,
          obsTime: now.obsTime, updateTime: data.updateTime,
        };
      } catch (qErr) {
        console.warn('[Weather] QWeather failed, falling back to Open-Meteo:', qErr.message);
        result = await openMeteoFetchNow();
      }
    } else {
      result = await openMeteoFetchNow();
    }

    setCache('weather_now', result);
    res.json(result);
  } catch (err) {
    console.error('[Weather] now error:', err.message);
    res.status(502).json({ message: '天气服务暂不可用', error: err.message });
  }
});

/**
 * GET /api/weather/forecast?days=3|7|15  →  多天天气预报
 */
router.get('/forecast', async (req, res) => {
  try {
    const requestedDays = req.query.days || '15';
    const cacheKey = `weather_forecast_${requestedDays}`;
    const cached = getCached(cacheKey, 2 * 60 * 60 * 1000);
    if (cached) return res.json(cached);

    let result;

    if (shouldUseQWeather()) {
      try {
        // Try QWeather with fallback chain
        const tryPaths = [];
        if (requestedDays === '15') tryPaths.push('/v7/weather/15d', '/v7/weather/7d', '/v7/weather/3d');
        else if (requestedDays === '7') tryPaths.push('/v7/weather/7d', '/v7/weather/3d');
        else tryPaths.push('/v7/weather/3d');

        let data = null;
        for (const path of tryPaths) {
          try { data = await qweatherFetch(path); break; }
          catch (e) { console.warn(`[Weather] ${path} failed: ${e.message}`); }
        }
        if (!data) throw new Error('All QWeather forecast endpoints failed');

        const daily = (data.daily || []).map((d) => {
          const dayW = resolveQWeather(d.iconDay);
          const nightW = resolveQWeather(d.iconNight);
          return {
            date: d.fxDate, tempMax: d.tempMax, tempMin: d.tempMin,
            textDay: d.textDay || dayW.text, textNight: d.textNight || nightW.text,
            iconDay: dayW.icon, iconNight: nightW.icon,
            weatherCodeDay: d.iconDay, weatherCodeNight: d.iconNight,
            windDirDay: d.windDirDay, windScaleDay: d.windScaleDay,
            windDirNight: d.windDirNight, windScaleNight: d.windScaleNight,
            humidity: d.humidity, uvIndex: d.uvIndex,
            sunrise: d.sunrise, sunset: d.sunset,
          };
        });
        result = { location: '北京', days: daily.length, daily, updateTime: data.updateTime };
      } catch (qErr) {
        console.warn('[Weather] QWeather forecast failed, falling back to Open-Meteo:', qErr.message);
        result = await openMeteoFetchForecast(requestedDays);
      }
    } else {
      result = await openMeteoFetchForecast(requestedDays);
    }

    setCache(cacheKey, result);
    res.json(result);
  } catch (err) {
    console.error('[Weather] forecast error:', err.message);
    res.status(502).json({ message: '天气预报服务暂不可用', error: err.message });
  }
});

module.exports = router;
