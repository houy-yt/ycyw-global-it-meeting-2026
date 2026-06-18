/**
 * Simple zero-dependency tokenizer for mixed CN/EN text.
 *
 *  - Chinese: emit single characters AND 2-gram bigrams (no jieba dep).
 *    The bigrams catch most "words" used in sentiment & analytics.
 *  - English: lowercased word tokens via regex.
 *  - Filter via stopwords lists in ./data/stopwords-{zh,en}.json.
 *
 * Exports:
 *   tokenize(text, { withBigrams=true })  -> string[]
 *   wordCount(text)                       -> number  (CN chars + EN words)
 *   topKeywords(text, k=20)               -> [{word, count}]
 */
const path = require('path');
const fs = require('fs');

const STOP_ZH = new Set(
  JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'data', 'stopwords-zh.json'), 'utf-8'))
);
const STOP_EN = new Set(
  JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'data', 'stopwords-en.json'), 'utf-8'))
);

const CN_CHAR = /[\u4e00-\u9fa5]/;
const EN_WORD = /[A-Za-z][A-Za-z0-9'_-]*/g;

function isAllPunct(s) {
  return !/[\u4e00-\u9fa5A-Za-z0-9]/.test(s);
}

function tokenize(text, { withBigrams = true } = {}) {
  if (!text) return [];
  const out = [];

  // ---- 1. English words ----
  const enMatches = String(text).match(EN_WORD) || [];
  for (let w of enMatches) {
    w = w.toLowerCase();
    if (w.length < 2) continue;
    if (STOP_EN.has(w)) continue;
    out.push(w);
  }

  // ---- 2. Chinese characters & bigrams ----
  // Walk the string, when we find a CN char, accumulate a CN segment.
  const s = String(text);
  let i = 0;
  while (i < s.length) {
    if (CN_CHAR.test(s[i])) {
      let j = i;
      while (j < s.length && CN_CHAR.test(s[j])) j++;
      const seg = s.slice(i, j);
      // bigrams
      if (withBigrams) {
        for (let k = 0; k < seg.length - 1; k++) {
          const bg = seg.slice(k, k + 2);
          if (STOP_ZH.has(bg)) continue;
          if (isAllPunct(bg)) continue;
          out.push(bg);
        }
      }
      // unigrams (only keep if not stopword and not trivial)
      for (let k = 0; k < seg.length; k++) {
        const ch = seg[k];
        if (STOP_ZH.has(ch)) continue;
        out.push(ch);
      }
      i = j;
    } else {
      i++;
    }
  }
  return out;
}

function wordCount(text) {
  if (!text) return 0;
  const s = String(text);
  // CN: count characters (ignore punctuation)
  const cnCount = (s.match(/[\u4e00-\u9fa5]/g) || []).length;
  const enCount = (s.match(EN_WORD) || []).length;
  return cnCount + enCount;
}

/**
 * Frequency map over tokens (bigrams + unigrams + english words).
 * For ranking keywords we prefer bigrams (length>=2) which are usually
 * more informative. We multiply CN bigram weight by 2.
 */
function topKeywords(text, k = 20) {
  const toks = tokenize(text, { withBigrams: true });
  const freq = new Map();
  for (const t of toks) {
    // Skip single CN chars in the keyword view — too noisy
    if (t.length < 2) continue;
    freq.set(t, (freq.get(t) || 0) + 1);
  }
  return [...freq.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, k);
}

module.exports = { tokenize, wordCount, topKeywords };
