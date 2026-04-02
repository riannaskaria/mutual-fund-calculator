const express = require('express');

const {
  logSearchEvent,
  logTradeEvent,
  getMostSearched,
  getMostTraded,
} = require('../services/trendingService');

const router = express.Router();

router.post('/log-search', async (req, res) => {
  try {
    const { ticker, name, timestamp } = req.body || {};
    const row = await logSearchEvent({ ticker, name, timestamp });
    return res.status(201).json({ ok: true, event: row });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || 'Failed to log search event' });
  }
});

router.post('/log-trade', async (req, res) => {
  try {
    const { ticker, name, amount, timestamp } = req.body || {};
    const row = await logTradeEvent({ ticker, name, amount, timestamp });
    return res.status(201).json({ ok: true, event: row });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || 'Failed to log trade event' });
  }
});

router.get('/most-searched', async (req, res) => {
  try {
    const result = await getMostSearched({ limit: req.query.limit });
    return res.json(result);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || 'Failed to load most searched funds' });
  }
});

router.get('/most-traded', async (req, res) => {
  try {
    const result = await getMostTraded({ limit: req.query.limit });
    return res.json(result);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || 'Failed to load most traded funds' });
  }
});

module.exports = router;
