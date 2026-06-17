/**
 * Video Embed Utility
 *
 * Detects common video platform URLs and converts them to embeddable iframe URLs.
 * Supported platforms:
 *   - Tencent Video (腾讯视频)
 *   - YouTube
 *   - Bilibili (哔哩哔哩)
 *   - Vimeo
 */

const RULES = [
  // ── Tencent Video ──
  // https://v.qq.com/x/page/k33706g6chd.html
  // https://v.qq.com/x/cover/xxxxx/k33706g6chd.html
  {
    name: 'tencent',
    test: /v\.qq\.com/,
    extract: (url) => {
      // Already an iframe player URL → extract vid
      const iframeMatch = url.match(/player\.html\?vid=([a-zA-Z0-9]+)/);
      if (iframeMatch) return iframeMatch[1];
      // Standard page URL → last path segment before .html
      const pageMatch = url.match(/\/([a-zA-Z0-9]+)\.html/);
      return pageMatch ? pageMatch[1] : null;
    },
    embed: (vid) =>
      `https://v.qq.com/txp/iframe/player.html?vid=${vid}`,
    thumbnail: (vid) =>
      `https://puui.qpic.cn/vpic_cover/${vid}/${vid}_hz.jpg/0`,
  },

  // ── YouTube ──
  // https://www.youtube.com/watch?v=dQw4w9WgXcQ
  // https://youtu.be/dQw4w9WgXcQ
  // https://www.youtube.com/embed/dQw4w9WgXcQ
  {
    name: 'youtube',
    test: /youtu(?:\.be|be\.com)/,
    extract: (url) => {
      const m =
        url.match(/[?&]v=([a-zA-Z0-9_-]{11})/) ||
        url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/) ||
        url.match(/embed\/([a-zA-Z0-9_-]{11})/);
      return m ? m[1] : null;
    },
    embed: (vid) =>
      `https://www.youtube.com/embed/${vid}`,
    thumbnail: (vid) =>
      `https://img.youtube.com/vi/${vid}/hqdefault.jpg`,
  },

  // ── Bilibili ──
  // https://www.bilibili.com/video/BV1xx411c7mD
  // https://player.bilibili.com/player.html?bvid=BV1xx411c7mD
  {
    name: 'bilibili',
    test: /bilibili\.com/,
    extract: (url) => {
      const bvMatch = url.match(/(BV[a-zA-Z0-9]+)/);
      return bvMatch ? bvMatch[1] : null;
    },
    embed: (bvid) =>
      `https://player.bilibili.com/player.html?bvid=${bvid}&high_quality=1`,
  },

  // ── Vimeo ──
  // https://vimeo.com/123456789
  // https://player.vimeo.com/video/123456789
  {
    name: 'vimeo',
    test: /vimeo\.com/,
    extract: (url) => {
      const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
      return m ? m[1] : null;
    },
    embed: (vid) =>
      `https://player.vimeo.com/video/${vid}`,
  },
];

/**
 * Try to convert a video URL into an embeddable iframe src.
 * @param {string} url – The original video link pasted by the user.
 * @returns {{ embedUrl: string, platform: string } | null}
 *   Returns null when the URL is not recognised as a supported video platform.
 */
export function getEmbedInfo(url) {
  if (!url) return null;
  for (const rule of RULES) {
    if (rule.test.test(url)) {
      const id = rule.extract(url);
      if (id) {
        return {
          embedUrl: rule.embed(id),
          platform: rule.name,
        };
      }
    }
  }
  return null;
}

/**
 * Convenience helper – returns just the embed URL string, or null.
 */
export function getEmbedUrl(url) {
  const info = getEmbedInfo(url);
  return info ? info.embedUrl : null;
}

/**
 * Get a thumbnail / cover image URL for a video link.
 * Returns null when no thumbnail can be determined.
 *
 * @param {string} url – The original video link.
 * @returns {string | null}
 */
export function getThumbnailUrl(url) {
  if (!url) return null;
  for (const rule of RULES) {
    if (rule.test.test(url) && rule.thumbnail) {
      const id = rule.extract(url);
      if (id) return rule.thumbnail(id);
    }
  }
  return null;
}
