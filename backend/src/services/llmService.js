/**
 * LLM Service (OpenAI-compatible)
 * --------------------------------------------------------------
 * Uses the OpenAI-compatible /v1/chat/completions endpoint.
 * Works with:
 *   - OpenAI       (baseUrl https://api.openai.com/v1, model gpt-4o-mini)
 *   - DeepSeek     (baseUrl https://api.deepseek.com/v1, model deepseek-chat)
 *   - any vendor that mimics this API (Moonshot, Qwen-DashScope...)
 *
 * Reads engine/api key/baseUrl/model from SystemSetting:
 *   analytics.sentimentEngine  : 'local' | 'openai' | 'deepseek'
 *   analytics.llmApiKey
 *   analytics.llmBaseUrl
 *   analytics.llmModel
 *
 * Network failure → throws (caller falls back to local).
 */
const settings = require('./settingsService');

const DEFAULTS = {
  openai:   { baseUrl: 'https://api.openai.com/v1',   model: 'gpt-4o-mini'    },
  deepseek: { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat'  },
};

async function getConfig() {
  const engine = (await settings.get('analytics.sentimentEngine', 'local')).toLowerCase();
  if (engine === 'local') throw new Error('LLM engine disabled (local mode).');
  const apiKey = await settings.get('analytics.llmApiKey', '');
  if (!apiKey) throw new Error('Missing analytics.llmApiKey in admin settings.');
  const d = DEFAULTS[engine] || DEFAULTS.openai;
  const baseUrl = (await settings.get('analytics.llmBaseUrl', '')) || d.baseUrl;
  const model = (await settings.get('analytics.llmModel', '')) || d.model;
  return { engine, apiKey, baseUrl: baseUrl.replace(/\/$/, ''), model };
}

async function chat(messages, { temperature = 0.2, maxTokens = 200 } = {}) {
  const { apiKey, baseUrl, model } = await getConfig();
  const url = `${baseUrl}/chat/completions`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`LLM HTTP ${resp.status}: ${text.slice(0, 200)}`);
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Sentiment classification via LLM.
 * Returns { sentiment, score, summary? }.
 */
async function analyzeSentiment(text) {
  const prompt = `请对以下中文/英文反思文字做情感分类。仅返回一个 JSON 对象：
{"sentiment":"positive|neutral|negative","score":-1~1的小数,"summary":"一句话中文总结"}
反思内容：
"""
${String(text).slice(0, 4000)}
"""`;
  const content = await chat(
    [
      { role: 'system', content: '你是一个专业的会议反思情感分析助手，严格输出 JSON。' },
      { role: 'user', content: prompt },
    ],
    { temperature: 0.0, maxTokens: 200 }
  );

  // Robust JSON extraction
  const m = content.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('LLM did not return JSON');
  const obj = JSON.parse(m[0]);
  let score = Number(obj.score);
  if (!Number.isFinite(score)) score = 0;
  if (score > 1) score = 1;
  if (score < -1) score = -1;
  const sentiment = ['positive', 'neutral', 'negative'].includes(obj.sentiment)
    ? obj.sentiment
    : 'neutral';
  return { sentiment, score: Number(score.toFixed(3)), summary: obj.summary || '' };
}

/**
 * Higher-level meeting summary across many reflections.
 * Returns markdown text.
 */
async function summarizeReflections(samples, { topic = '会议反思总结' } = {}) {
  const joined = samples
    .map((s, i) => `【${i + 1}】${s}`)
    .join('\n')
    .slice(0, 12000);
  const prompt = `以下是参会人员对 YCYW 2026 Global IT Meeting 的反思留言。请用中文输出一份简洁的分析报告（Markdown），包含：
1) 总体情感与满意度判断（一句话）
2) 高频议题/关键词 Top 5（带占比）
3) 正面观点 3 条 + 待改进点 3 条
4) 给组织者 1-2 条具体建议

主题：${topic}
反思列表：
${joined}`;
  return await chat(
    [
      { role: 'system', content: '你是资深教育 IT 行业的会议分析师。' },
      { role: 'user', content: prompt },
    ],
    { temperature: 0.4, maxTokens: 900 }
  );
}

module.exports = {
  chat,
  analyzeSentiment,
  summarizeReflections,
};
