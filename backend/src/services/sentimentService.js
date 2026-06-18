/**
 * Sentiment Service
 * --------------------------------------------------------------
 * Dual-engine sentiment scoring for reflection text:
 *
 *  - "local"  : zero-dependency dictionary scan using sentiment-zh.json
 *               (works offline, fast, deterministic).
 *  - "openai" / "deepseek" :  delegated to llmService (optional).
 *
 * Engine is selected by SystemSetting `analytics.sentimentEngine`.
 * The dictionary engine recognises a small set of CN negation prefixes
 * ("不","没","无","未","别") that flip the polarity of the next word.
 */
const path = require('path');
const fs = require('fs');
const settings = require('./settingsService');
const llm = require('./llmService');

const DICT = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', '..', 'data', 'sentiment-zh.json'), 'utf-8')
);
const POS = new Set(DICT.positive.map((w) => w.toLowerCase()));
const NEG = new Set(DICT.negative.map((w) => w.toLowerCase()));

const NEGATION = ['不', '没', '无', '未', '别', '勿', '甭', '莫'];

function normalize(t) {
  return String(t || '').toLowerCase();
}

/**
 * Dictionary scoring:
 *   score = (pos - neg) / max(pos+neg, 1)   in [-1, 1]
 *   label = score > 0.15  positive
 *           score < -0.15 negative
 *           else          neutral
 */
function scoreLocal(text) {
  const t = normalize(text);
  if (!t) return { sentiment: 'neutral', score: 0, hitsPos: [], hitsNeg: [] };

  let pos = 0;
  let neg = 0;
  const hitsPos = [];
  const hitsNeg = [];

  // For each sentiment word, count occurrences. Detect a negation char
  // immediately before the match → flip polarity.
  function countWord(word, isPositive) {
    let from = 0;
    let cnt = 0;
    while (true) {
      const idx = t.indexOf(word, from);
      if (idx < 0) break;
      cnt++;
      const before = idx > 0 ? t[idx - 1] : '';
      const negated = NEGATION.includes(before);
      if (isPositive) {
        if (negated) { neg++; hitsNeg.push('不' + word); }
        else        { pos++; hitsPos.push(word); }
      } else {
        if (negated) { pos++; hitsPos.push('不' + word); }
        else        { neg++; hitsNeg.push(word); }
      }
      from = idx + word.length;
    }
    return cnt;
  }

  for (const w of POS) countWord(w, true);
  for (const w of NEG) countWord(w, false);

  const total = pos + neg;
  const score = total === 0 ? 0 : (pos - neg) / total;
  let sentiment = 'neutral';
  if (score > 0.15) sentiment = 'positive';
  else if (score < -0.15) sentiment = 'negative';

  return {
    sentiment,
    score: Number(score.toFixed(3)),
    hitsPos,
    hitsNeg,
    pos,
    neg,
  };
}

/**
 * Main entry — pick engine from settings.
 * @param {string} text
 * @returns {Promise<{sentiment:'positive'|'neutral'|'negative', score:number, engine:string}>}
 */
async function analyze(text) {
  const engine = (await settings.get('analytics.sentimentEngine', 'local')).toLowerCase();
  if (engine === 'openai' || engine === 'deepseek') {
    try {
      const r = await llm.analyzeSentiment(text);
      return { ...r, engine };
    } catch (e) {
      // Fall back to local on any LLM failure
      const r = scoreLocal(text);
      return { sentiment: r.sentiment, score: r.score, engine: 'local-fallback', error: e.message };
    }
  }
  const r = scoreLocal(text);
  return { sentiment: r.sentiment, score: r.score, engine: 'local' };
}

module.exports = {
  scoreLocal,
  analyze,
};
