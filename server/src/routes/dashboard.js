const express = require('express');
const router = express.Router();
const NodeCache = require('node-cache');
const { getMonthlySummary } = require('../services/salesService');
const { getMemberMetrics } = require('../services/memberService');
const { getPlanBreakdown } = require('../services/planService');

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

router.get('/plans', cacheMiddleware('plans'), async (req, res, next) => {
  try {
    const data = await getPlanBreakdown();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Clear cache endpoint (for manual refresh)
router.post('/refresh', (req, res) => {
  cache.flushAll();
  res.json({ message: 'Cache cleared' });
});

module.exports = router;
