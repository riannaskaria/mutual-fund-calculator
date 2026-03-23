const express = require('express');
const router = express.Router();

const {
  getFundDiscoverySnapshot,
  getFundDiscoveryFund,
  refreshFundDiscoverySnapshot,
  getFundDiscoveryStatus,
} = require('../services/fundDiscoveryService');

// GET /api/discovery?limit=10
router.get('/', async (req, res) => {
  try {
    const snapshot = await getFundDiscoverySnapshot({ limit: req.query.limit });
    if (!snapshot) return res.status(503).json({ error: 'Discovery snapshot unavailable' });
    return res.json(snapshot);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/discovery/fund/VFIAX
router.get('/fund/:ticker', async (req, res) => {
  try {
    const fund = await getFundDiscoveryFund(req.params.ticker);
    if (!fund) return res.status(404).json({ error: 'Fund not found in discovery snapshot' });
    return res.json(fund);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/discovery/status
router.get('/status', (_req, res) => {
  return res.json(getFundDiscoveryStatus());
});

// POST /api/discovery/refresh
router.post('/refresh', async (_req, res) => {
  try {
    const snapshot = await refreshFundDiscoverySnapshot({ force: true });
    return res.json({
      ok: true,
      generatedAt: snapshot.generatedAt,
      stale: snapshot.stale,
      fallbackUsed: snapshot.fallbackUsed,
      universeSize: snapshot.universeSize,
    });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;