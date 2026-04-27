const express = require('express');
const router = express.Router();
const NodeCache = require('node-cache');
const { getMonthlySummary } = require('../services/salesService');
const { getMemberMetrics, getMemberList, getWeeklyMemberHistory } = require('../services/memberService');
const { getPlanBreakdown } = require('../services/planService');
const { getBudgetForMonth, getBudgetTimeline } = require('../data/budgetData');
const { getLineMetrics } = require('../services/lineService');
const { getOverrides, saveOverride } = require('../data/budgetOverrides');
const { getActualsRange, actualsToCSV } = require('../services/actualsExport');

const cache = new NodeCache({
  stdTTL: parseInt(process.env.CACHE_TTL_SECONDS) || 300,
});

function cacheMiddleware(keyPrefix) {
  return (req, res, next) => {
    const key = `${keyPrefix}_${JSON.stringify(req.query)}`;
    const cached = cache.get(key);
    if (cached) {
      return res.json(cached);
    }
    const originalJson = res.json.bind(res);
    res.json = (data) => {
      cache.set(key, data);
      return originalJson(data);
    };
    next();
  };
}

router.get('/summary', cacheMiddleware('summary'), async (req, res, next) => {
  try {
    const now = new Date();
    const year = parseInt(req.query.year) || now.getFullYear();
    const month = parseInt(req.query.month) || now.getMonth() + 1;
    const data = await getMonthlySummary(year, month);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/members', cacheMiddleware('members'), async (req, res, next) => {
  try {
    const now = new Date();
    const year = parseInt(req.query.year) || now.getFullYear();
    const month = parseInt(req.query.month) || now.getMonth() + 1;
    const data = await getMemberMetrics(year, month);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/members/list', cacheMiddleware('memberList'), async (req, res, next) => {
  try {
    const now = new Date();
    const year = parseInt(req.query.year) || now.getFullYear();
    const month = parseInt(req.query.month) || now.getMonth() + 1;
    const data = await getMemberList(year, month);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/members/weekly', cacheMiddleware('weeklyMembers'), async (req, res, next) => {
  try {
    const data = await getWeeklyMemberHistory();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/plans', cacheMiddleware('plans'), async (req, res, next) => {
  try {
    const data = await getPlanBreakdown();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Budget data endpoint (includes LINE actual data)
router.get('/budget', cacheMiddleware('budget'), async (req, res, next) => {
  try {
    const now = new Date();
    const year = parseInt(req.query.year) || now.getFullYear();
    const month = parseInt(req.query.month) || now.getMonth() + 1;
    const budget = getBudgetForMonth(year, month);
    const timeline = getBudgetTimeline();
    const lineMetrics = await getLineMetrics(year, month);
    const overrides = await getOverrides(year, month);
    res.json({ budget, timeline, lineMetrics, overrides });
  } catch (err) {
    next(err);
  }
});

// Update budget override
router.put('/budget/override', async (req, res, next) => {
  try {
    const { year, month, key, field, value } = req.body;
    if (!year || !month || !key || !field || value === undefined) {
      return res.status(400).json({ error: 'year, month, key, field, value are required' });
    }
    const validKeys = ['revenue', 'newUsers', 'line', 'cv'];
    const validFields = ['budget', 'actual'];
    if (!validKeys.includes(key) || !validFields.includes(field)) {
      return res.status(400).json({ error: 'Invalid key or field' });
    }
    const overrides = await saveOverride(year, month, key, field, Number(value));
    // Clear budget cache so next GET reflects the override
    cache.del(`budget_${JSON.stringify({ year: String(year), month: String(month) })}`);
    res.json({ success: true, overrides });
  } catch (err) {
    next(err);
  }
});

// Clear cache endpoint (for manual refresh)
router.post('/refresh', (req, res) => {
  cache.flushAll();
  res.json({ message: 'Cache cleared' });
});

// 実績データのエクスポート（スプシ貼り付け用）
// クエリ: ?from=2026-3&to=2026-12 で範囲指定 or デフォルトはサービス開始から現在まで
// format=csv|json で出力形式選択
router.get('/actuals/export', async (req, res, next) => {
  try {
    const fmt = (req.query.format || 'csv').toLowerCase();

    // デフォルト範囲: 2026年3月から現在月まで
    const now = new Date();
    let fromY = 2026, fromM = 3;
    let toY = now.getFullYear(), toM = now.getMonth() + 1;
    if (req.query.from) {
      const [y, m] = req.query.from.split('-').map(Number);
      if (y && m) { fromY = y; fromM = m; }
    }
    if (req.query.to) {
      const [y, m] = req.query.to.split('-').map(Number);
      if (y && m) { toY = y; toM = m; }
    }

    // 月リスト生成
    const months = [];
    let cy = fromY, cm = fromM;
    while (cy < toY || (cy === toY && cm <= toM)) {
      months.push({ year: cy, month: cm });
      cm++; if (cm > 12) { cm = 1; cy++; }
    }

    const cacheKey = `actuals_${fromY}_${fromM}_${toY}_${toM}`;
    let actuals = cache.get(cacheKey);
    if (!actuals) {
      actuals = await getActualsRange(months);
      cache.set(cacheKey, actuals);
    }

    if (fmt === 'json') {
      return res.json({ actuals });
    }
    // CSV (default)
    const csv = actualsToCSV(actuals);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="digirise_actuals_${fromY}-${fromM}_to_${toY}-${toM}.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
