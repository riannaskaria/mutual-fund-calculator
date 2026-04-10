// Four endpoints:
//   GET /api/funds                                              - full fund list
//   GET /api/mutual-funds                                       - frontend alias [{id, name}]
//   GET /api/calculate?ticker=VFIAX&principal=10000&years=5    - full CAPM result
//   GET /api/future-value?fundId=VFIAX&amount=10000&years=5    - frontend alias {futureValue,...}

const express = require('express');
const router = express.Router();
const { getAllFunds, validateTicker, calculate, BENCHMARK_TICKER } = require('../services/mutualFundService');
const { fetchStockInfo } = require('../services/stockInfoService');

const stockInfoCache = new Map(); // ticker → { data, expiresAt }
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

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
      riskFreeRate: result.riskFreeRate,
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/compare?ticker=AGTHX&principal=10000&years=10
// Returns side-by-side CAPM projections for the fund vs. the S&P 500 benchmark (VFIAX)
router.get('/compare', async (req, res) => {
  const { ticker, principal, years } = req.query;

  if (!ticker || ticker.trim() === '')
    return res.status(400).json({ error: 'ticker is required' });
  if (!principal || isNaN(principal) || Number(principal) <= 0)
    return res.status(400).json({ error: 'principal must be greater than 0' });
  if (!years || isNaN(years) || !Number.isInteger(Number(years)) || Number(years) < 1)
    return res.status(400).json({ error: 'years must be an integer of at least 1' });

  try {
    validateTicker(ticker);
    const [fund, benchmark] = await Promise.all([
      calculate(ticker, Number(principal), Number(years)),
      calculate(BENCHMARK_TICKER, Number(principal), Number(years)),
    ]);
    res.json({
      fund: {
        ticker: fund.ticker,
        capmRate: fund.capmRate,
        beta: fund.beta,
        futureValue: fund.futureValue,
      },
      benchmark: {
        ticker: benchmark.ticker,
        capmRate: benchmark.capmRate,
        beta: benchmark.beta,
        futureValue: benchmark.futureValue,
      },
      excessReturn: fund.capmRate - benchmark.capmRate,
      outperforms: fund.futureValue > benchmark.futureValue,
      projectedDifference: fund.futureValue - benchmark.futureValue,
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/stock-info/:ticker — rich summary from Yahoo Finance quoteSummary
router.get('/stock-info/:ticker', async (req, res) => {
  const { ticker } = req.params;
  if (!ticker || ticker.trim() === '')
    return res.status(400).json({ error: 'ticker is required' });

  try {
    const key = ticker.trim().toUpperCase();
    const cached = stockInfoCache.get(key);
    if (cached && Date.now() < cached.expiresAt) return res.json(cached.data);

    const data = await fetchStockInfo(key);

    const profile = data.assetProfile || {};
    const detail  = data.summaryDetail || {};
    const stats   = data.defaultKeyStatistics || {};
    const fin     = data.financialData || {};

    // yahoo-finance2 v3 returns plain numbers — helpers to normalise
    const num  = v => (v != null && !isNaN(v) ? v : null);
    const pct  = v => { const n = num(v); return n != null ? (n * 100).toFixed(2) + '%' : null; };
    const fmtVol = v => {
      if (v == null) return null;
      if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(2) + 'B';
      if (v >= 1_000_000)     return (v / 1_000_000).toFixed(2) + 'M';
      if (v >= 1_000)         return (v / 1_000).toFixed(0) + 'K';
      return String(v);
    };

    const payload = {
      ticker: key,
      // company identity
      sector:      profile.sector    || null,
      industry:    profile.industry  || null,
      country:     profile.country   || null,
      website:     profile.website   || null,
      employees:   profile.fullTimeEmployees || null,
      description: profile.longBusinessSummary || null,
      // valuation — plain numbers; frontend formats these with toFixed / fmtVol
      marketCap:   num(detail.marketCap),
      beta:        num(detail.beta) ?? num(stats.beta),
      trailingPE:  num(detail.trailingPE),
      forwardPE:   num(detail.forwardPE),
      priceToBook: num(stats.priceToBook),
      bookValue:   num(stats.bookValue),
      // income / returns — pre-formatted as percentage strings for direct display
      dividendYield:  pct(detail.dividendYield ?? detail.trailingAnnualDividendYield),
      earningsGrowth: pct(fin.earningsGrowth),
      revenueGrowth:  pct(fin.revenueGrowth),
      returnOnEquity: pct(fin.returnOnEquity),
      returnOnAssets: pct(fin.returnOnAssets),
      // price context
      fiftyTwoWeekHigh: num(detail.fiftyTwoWeekHigh),
      fiftyTwoWeekLow:  num(detail.fiftyTwoWeekLow),
      fiftyDayAverage:  num(detail.fiftyDayAverage),
      avgVolume:        fmtVol(detail.averageVolume),
    };
    stockInfoCache.set(key, { data: payload, expiresAt: Date.now() + CACHE_TTL_MS });
    if (stockInfoCache.size > 500) {
      const OldestKey = stockInfoCache.keys().next().value;
      stockInfoCache.delete(OldestKey);
    }
    res.json(payload);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

module.exports = router;
