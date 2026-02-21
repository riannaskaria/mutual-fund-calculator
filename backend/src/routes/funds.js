// Four endpoints:
//   GET /api/funds                                              - full fund list
//   GET /api/mutual-funds                                       - frontend alias [{id, name}]
//   GET /api/calculate?ticker=VFIAX&principal=10000&years=5    - full CAPM result
//   GET /api/future-value?fundId=VFIAX&amount=10000&years=5    - frontend alias {futureValue,...}

const express = require('express');
const router = express.Router();
const { getAllFunds, validateTicker, calculate } = require('../services/mutualFundService');

// GET /api/funds
router.get('/funds', (req, res) => {
  res.json(getAllFunds());
});

// GET /api/mutual-funds — returns [{id, name}] for the frontend dropdown
router.get('/mutual-funds', (req, res) => {
  const funds = getAllFunds().map(f => ({
    id: f.ticker,
    name: `${f.name} (${f.ticker})`,
  }));
  res.json(funds);
});

// GET /api/calculate?ticker=VFIAX&principal=10000&years=5
router.get('/calculate', async (req, res) => {
  const { ticker, principal, years } = req.query;

  if (!ticker || ticker.trim() === '')
    return res.status(400).json({ error: 'ticker is required' });
  if (!principal || isNaN(principal) || Number(principal) <= 0)
    return res.status(400).json({ error: 'principal must be greater than 0' });
  if (!years || isNaN(years) || !Number.isInteger(Number(years)) || Number(years) < 1)
    return res.status(400).json({ error: 'years must be an integer of at least 1' });

  try {
    validateTicker(ticker);
    const result = await calculate(ticker, Number(principal), Number(years));
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/future-value?fundId=VFIAX&amount=10000&years=5 — frontend-compatible alias
router.get('/future-value', async (req, res) => {
  const { fundId, amount, years } = req.query;

  if (!fundId || fundId.trim() === '')
    return res.status(400).json({ error: 'fundId is required' });
  if (!amount || isNaN(amount) || Number(amount) <= 0)
    return res.status(400).json({ error: 'amount must be greater than 0' });
  if (!years || isNaN(years) || !Number.isInteger(Number(years)) || Number(years) < 1)
    return res.status(400).json({ error: 'years must be an integer of at least 1' });

  try {
    validateTicker(fundId);
    const result = await calculate(fundId, Number(amount), Number(years));
    res.json({
      futureValue: result.futureValue,
      capmRate: result.capmRate,
      beta: result.beta,
      expectedReturnRate: result.expectedReturnRate,
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
