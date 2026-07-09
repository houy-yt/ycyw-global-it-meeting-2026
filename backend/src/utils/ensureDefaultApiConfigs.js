const prisma = require('./prisma');

/**
 * Ensure a default Weather ApiConfig exists.
 *
 * Why: Home page WeatherCard visibility depends on /api/api-configs/widgets,
 * which returns only ApiConfig rows with { isActive: true, widgetEnabled: true }.
 * If the DB is missing a weather row (common in fresh DB / after accidental delete),
 * the widget disappears even though /api/weather/* can still work.
 *
 * This function is intentionally conservative:
 * - If ANY weather config exists, it will NOT modify it.
 * - Only creates a default one when none exist.
 */
async function ensureDefaultWeatherApiConfig() {
  try {
    const existingCount = await prisma.apiConfig.count({ where: { type: 'weather' } });

    // If ANY weather config exists, do not auto-create Open-Meteo.
    // (But we may still auto-create a QWeather config from env if missing.)
    if (existingCount === 0) {
      await prisma.apiConfig.create({
        data: {
          name: 'Open-Meteo（默认）',
          type: 'weather',
          provider: 'openmeteo',
          // Default to Beijing. Open-Meteo does not require any secret.
          config: JSON.stringify({
            latitude: 39.9042,
            longitude: 116.4074,
            locationName: '北京',
          }),
          widgetEnabled: true,
          widgetConfig: '{}',
          isActive: true,
          sortOrder: 0,
        },
      });

      console.log('[ApiConfig] Created default weather ApiConfig (Open-Meteo, 北京)');
    }

    // Auto-create QWeather config from env if provided and not existing.
    const hasQWeather = await prisma.apiConfig.count({ where: { type: 'weather', provider: 'qweather' } });
    if (hasQWeather > 0) return { created: existingCount === 0, createdQWeather: false };

    const apiHost = (process.env.QWEATHER_API_HOST || '').trim();
    const credentialId = (process.env.QWEATHER_CREDENTIAL_ID || '').trim();
    const privateKey = (process.env.QWEATHER_PRIVATE_KEY || '').trim();
    const location = (process.env.WEATHER_LOCATION || '101010100').trim();

    // Only create when env is actually configured.
    if (apiHost && credentialId && privateKey) {
      await prisma.apiConfig.create({
        data: {
          name: '和风天气（QWeather）',
          type: 'weather',
          provider: 'qweather',
          config: JSON.stringify({
            apiHost,
            credentialId,
            privateKey,
            location,
            locationName: '北京',
          }),
          // IMPORTANT: Do NOT change runtime behavior by default
          isActive: false,
          widgetEnabled: false,
          widgetConfig: '{}',
          // Put it after default Open-Meteo by default
          sortOrder: 10,
        },
      });
      console.log('[ApiConfig] Created default weather ApiConfig (QWeather, from env, inactive)');
      return { created: existingCount === 0, createdQWeather: true };
    }

    return { created: existingCount === 0, createdQWeather: false };

  } catch (e) {
    // Do NOT crash the server for a non-critical bootstrap step.
    console.warn('[ApiConfig] Failed to ensure default weather ApiConfig:', e.message);
    return { created: false, error: e.message };
  }
}

module.exports = {
  ensureDefaultWeatherApiConfig,
};
