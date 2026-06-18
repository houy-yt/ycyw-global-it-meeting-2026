/**
 * Reflection Analytics
 *   GET  /api/admin/analytics/overview
 *   GET  /api/admin/analytics/keywords?limit=30
 *   GET  /api/admin/analytics/timeline?bucket=day|week
 *   GET  /api/admin/analytics/contributors?limit=10
 *   POST /api/admin/analytics/scan        -> (re)compute sentiment for all reflections
 *   POST /api/admin/analytics/summary     -> { topic? } -> markdown summary via LLM (optional)
 *
 * Sentiment columns on Reflection: sentiment ('positive'|'neutral'|'negative'),
 * sentimentScore (-1..1), sentimentEngine ('local'|'openai'|'deepseek'|...),
 * wordCount (CN chars + EN words), analyzedAt.
 */
const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const { authRequired, adminRequired } = require('../middleware/auth');

const sentiment = require('../services/sentimentService');
const tokenizer = require('../services/tokenizer');
const llm = require('../services/llmService');

// ────────────── overview ──────────────

router.get('/overview', authRequired, adminRequired, async (req, res) => {
  const [
    total,
    anonymous,
    likes,
    comments,
    bySentiment,
    avgScoreAgg,
    avgWordsAgg,
    topLiked,
  ] = await Promise.all([
    prisma.reflection.count(),
    prisma.reflection.count({ where: { isAnonymous: true } }),
    prisma.like.count(),
    prisma.comment.count(),
    prisma.reflection.groupBy({ by: ['sentiment'], _count: { _all: true } }),
    prisma.reflection.aggregate({ _avg: { sentimentScore: true } }),
    prisma.reflection.aggregate({ _avg: { wordCount: true } }),
    prisma.reflection.findMany({
      orderBy: { likeCount: 'desc' },
      take: 5,
      include: { author: true, _count: { select: { comments: true } } },
    }),
  ]);

  const sentimentMap = { positive: 0, neutral: 0, negative: 0, unscored: 0 };
  for (const s of bySentiment) {
    const k = s.sentiment || 'unscored';
    sentimentMap[k] = (sentimentMap[k] || 0) + s._count._all;
  }

  res.json({
    total,
    anonymous,
    likes,
    comments,
    averageSentimentScore: Number((avgScoreAgg._avg.sentimentScore || 0).toFixed(3)),
    averageWordCount: Math.round(avgWordsAgg._avg.wordCount || 0),
    sentimentDistribution: sentimentMap,
    topLiked: topLiked.map((r) => ({
      id: r.id,
      title: r.title,
      likeCount: r.likeCount,
      commentCount: r._count.comments,
      author: r.isAnonymous ? '匿名' : (r.author?.nickname || r.author?.email || '用户'),
      sentiment: r.sentiment,
      score: r.sentimentScore,
    })),
  });
});

// ────────────── keywords ──────────────

router.get('/keywords', authRequired, adminRequired, async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 5), 200);
  const items = await prisma.reflection.findMany({ select: { title: true, content: true } });
  const text = items.map((x) => `${x.title}\n${x.content}`).join('\n');
  const top = tokenizer.topKeywords(text, limit);
  res.json({ count: items.length, keywords: top });
});

// ────────────── timeline ──────────────

router.get('/timeline', authRequired, adminRequired, async (req, res) => {
  const bucket = req.query.bucket === 'week' ? 'week' : 'day';
  const items = await prisma.reflection.findMany({
    select: { createdAt: true, sentiment: true, sentimentScore: true },
    orderBy: { createdAt: 'asc' },
  });

  function bucketKey(d) {
    const dt = new Date(d);
    if (bucket === 'week') {
      // ISO week (year-Wxx)
      const tmp = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
      const day = (tmp.getUTCDay() + 6) % 7;
      tmp.setUTCDate(tmp.getUTCDate() - day + 3);
      const firstThursday = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 4));
      const week = 1 + Math.round(((tmp - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
      return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
    }
    return dt.toISOString().slice(0, 10);
  }

  const map = new Map();
  for (const r of items) {
    const k = bucketKey(r.createdAt);
    const cur = map.get(k) || { date: k, total: 0, positive: 0, neutral: 0, negative: 0, scoreSum: 0 };
    cur.total++;
    if (r.sentiment === 'positive') cur.positive++;
    else if (r.sentiment === 'negative') cur.negative++;
    else cur.neutral++;
    cur.scoreSum += r.sentimentScore || 0;
    map.set(k, cur);
  }

  const out = [...map.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((x) => ({
      date: x.date,
      total: x.total,
      positive: x.positive,
      neutral: x.neutral,
      negative: x.negative,
      avgScore: Number((x.scoreSum / x.total).toFixed(3)),
    }));
  res.json(out);
});

// ────────────── contributors ──────────────

router.get('/contributors', authRequired, adminRequired, async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
  const groups = await prisma.reflection.groupBy({
    by: ['authorId'],
    _count: { _all: true },
    _sum: { likeCount: true },
    _avg: { sentimentScore: true },
    orderBy: { _count: { _all: 'desc' } },
    take: limit,
  });

  const userIds = groups.map((g) => g.authorId).filter(Boolean);
  const users = await prisma.user.findMany({ where: { id: { in: userIds } } });
  const map = new Map(users.map((u) => [u.id, u]));

  res.json(
    groups.map((g) => {
      const u = map.get(g.authorId);
      return {
        userId: g.authorId,
        nickname: u?.nickname || u?.email || '未知用户',
        email: u?.email || null,
        count: g._count._all,
        totalLikes: g._sum.likeCount || 0,
        avgScore: Number((g._avg.sentimentScore || 0).toFixed(3)),
      };
    })
  );
});

// ────────────── scan ──────────────
/**
 * Re-compute sentiment & wordCount for all reflections (or only the ones
 * without sentiment if ?onlyMissing=1).
 */
router.post('/scan', authRequired, adminRequired, async (req, res) => {
  const onlyMissing = req.query.onlyMissing === '1' || req.body?.onlyMissing === true;
  const where = onlyMissing ? { sentiment: null } : {};
  const list = await prisma.reflection.findMany({ where, select: { id: true, title: true, content: true } });

  let updated = 0;
  for (const r of list) {
    const text = `${r.title}\n${r.content}`;
    try {
      const sa = await sentiment.analyze(text);
      const wc = tokenizer.wordCount(text);
      await prisma.reflection.update({
        where: { id: r.id },
        data: {
          sentiment: sa.sentiment,
          sentimentScore: sa.score,
          sentimentEngine: sa.engine,
          wordCount: wc,
          analyzedAt: new Date(),
        },
      });
      updated++;
    } catch (e) {
      console.warn(`[analytics] scan failed for #${r.id}:`, e.message);
    }
  }
  res.json({ ok: true, scanned: list.length, updated });
});

// ────────────── LLM summary ──────────────

router.post('/summary', authRequired, adminRequired, async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.body?.limit, 10) || 100, 5), 500);
  const items = await prisma.reflection.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: { title: true, content: true },
  });
  const samples = items.map((i) => `${i.title} — ${i.content}`).filter(Boolean);
  if (samples.length === 0) return res.status(400).json({ message: 'No reflections to summarise' });

  try {
    const md = await llm.summarizeReflections(samples, {
      topic: req.body?.topic || '会议反思总结',
    });
    res.json({ ok: true, summary: md, count: samples.length });
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message });
  }
});

module.exports = router;
