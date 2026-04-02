const fs = require('fs/promises');
const path = require('path');
const axios = require('axios');
const { fetchBeta } = require('./betaService');
const { getAllFunds } = require('./mutualFundService');
const { FUND_DISCOVERY_SLOW_METRICS } = require('../data/fundDiscoverySlowMetrics');

const YAHOO_URL = 'https://query1.finance.yahoo.com/v8/finance/chart/';
const SNAPSHOT_DIR = path.resolve(__dirname, '../../data/fund-discovery');
const LATEST_SNAPSHOT_PATH = path.join(SNAPSHOT_DIR, 'latest.json');

const SCORE_WEIGHTS = {
  recentReturn: 0.35,
  volatility: 0.25,
  expenseRatio: 0.20,
  aum: 0.10,
  beta: 0.10,
};

const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

const trackedFunds = getAllFunds()
  .filter(f => FUND_DISCOVERY_SLOW_METRICS[f.ticker])
  .slice(0, 12)
  .map(f => ({ ticker: f.ticker, name: f.name }));

let latestSnapshot = null;
let refreshMeta = {
  lastAttemptAt: null,
  lastSuccessAt: null,
  lastError: null,
};

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function formatDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function isStale(snapshot) {
  if (!snapshot?.generatedAt) return true;
  const ageMs = Date.now() - new Date(snapshot.generatedAt).getTime();
  return ageMs > 36 * 60 * 60 * 1000;
}

function computeStdDev(values) {
  if (!Array.isArray(values) || values.length < 2) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function computeSimpleReturn(closes, lookbackDays) {
  if (!Array.isArray(closes) || closes.length <= lookbackDays) return null;
  const end = closes[closes.length - 1];
  const start = closes[closes.length - 1 - lookbackDays];
  if (!Number.isFinite(start) || !Number.isFinite(end) || start === 0) return null;
  return (end - start) / start;
}

function computePercentileScore(values, value, higherBetter = true) {
  const valid = values.filter(v => Number.isFinite(v));
  if (!Number.isFinite(value) || valid.length === 0) return null;

  const less = valid.filter(v => v < value).length;
  const equal = valid.filter(v => v === value).length;
  const percentile = ((less + 0.5 * equal) / valid.length) * 100;
  return higherBetter ? percentile : 100 - percentile;
}

async function ensureSnapshotDir() {
  await fs.mkdir(SNAPSHOT_DIR, { recursive: true });
}

async function loadLatestSnapshot() {
  try {
    const raw = await fs.readFile(LATEST_SNAPSHOT_PATH, 'utf8');
    latestSnapshot = JSON.parse(raw);
    if (latestSnapshot?.generatedAt) {
      refreshMeta.lastSuccessAt = latestSnapshot.generatedAt;
    }
  } catch {
    latestSnapshot = null;
  }
}

async function persistSnapshot(snapshot) {
  await ensureSnapshotDir();
  const datePath = path.join(SNAPSHOT_DIR, `${formatDateKey(new Date(snapshot.generatedAt))}.json`);
  const payload = JSON.stringify(snapshot, null, 2);
  await fs.writeFile(datePath, payload);
  await fs.writeFile(LATEST_SNAPSHOT_PATH, payload);
}

async function fetchDailyMetricsForTicker(ticker) {
  const response = await axios.get(`${YAHOO_URL}${ticker}`, {
    params: { range: '6mo', interval: '1d' },
    headers: { 'User-Agent': 'Mozilla/5.0' },
    timeout: 10000,
  });

  const closesRaw = response.data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close;
  const closes = Array.isArray(closesRaw)
    ? closesRaw.filter(v => Number.isFinite(v))
    : [];

  if (closes.length < 70) {
    const error = new Error(`Insufficient price history for ${ticker}`);
    error.status = 502;
    throw error;
  }

  const oneMonthReturn = computeSimpleReturn(closes, 21);
  const threeMonthReturn = computeSimpleReturn(closes, 63);
  const recentReturn =
    Number.isFinite(oneMonthReturn) && Number.isFinite(threeMonthReturn)
      ? 0.6 * oneMonthReturn + 0.4 * threeMonthReturn
      : Number.isFinite(threeMonthReturn)
        ? threeMonthReturn
        : oneMonthReturn;

  const dailyReturns = [];
  for (let i = Math.max(1, closes.length - 63); i < closes.length; i += 1) {
    const prev = closes[i - 1];
    const curr = closes[i];
    if (!Number.isFinite(prev) || !Number.isFinite(curr) || prev === 0) continue;
    dailyReturns.push((curr - prev) / prev);
  }

  const volatility = computeStdDev(dailyReturns);
  const annualizedVolatility = Number.isFinite(volatility) ? volatility * Math.sqrt(252) : null;

  const beta = await fetchBeta(ticker);

  return {
    oneMonthReturnPct: Number.isFinite(oneMonthReturn) ? oneMonthReturn * 100 : null,
    threeMonthReturnPct: Number.isFinite(threeMonthReturn) ? threeMonthReturn * 100 : null,
    recentReturnPct: Number.isFinite(recentReturn) ? recentReturn * 100 : null,
    annualizedVolatilityPct: Number.isFinite(annualizedVolatility) ? annualizedVolatility * 100 : null,
    beta,
  };
}

function computeBetaScore(beta) {
  if (!Number.isFinite(beta)) return null;
  return clamp(100 - Math.abs(beta - 1) * 60, 0, 100);
}

function computeExplainability(subscores, weighted) {
  const factors = [
    { key: 'recentReturn', label: 'Recent return' },
    { key: 'volatility', label: 'Volatility control' },
    { key: 'expenseRatio', label: 'Low expense ratio' },
    { key: 'aum', label: 'AUM scale' },
    { key: 'beta', label: 'Market beta alignment' },
  ].map(item => ({
    ...item,
    subscore: subscores[item.key],
    contribution: weighted[item.key],
  }));

  const sorted = factors
    .filter(f => Number.isFinite(f.contribution))
    .sort((a, b) => b.contribution - a.contribution);

  const top = sorted.slice(0, 2).map(f => f.label);
  const weakest = sorted[sorted.length - 1]?.label;

  return {
    topDrivers: top,
    weakestFactor: weakest || null,
    summary: top.length
      ? `Strength from ${top.join(' and ')}${weakest ? `; limited by ${weakest.toLowerCase()}` : ''}.`
      : 'Insufficient data for full explainability.',
  };
}

function withFallbackSnapshot(errorMessage) {
  if (!latestSnapshot) return null;
  return {
    ...latestSnapshot,
    stale: true,
    staleReason: errorMessage,
    fallbackUsed: true,
  };
}

async function buildFreshSnapshot() {
  const dailyRows = await Promise.all(
    trackedFunds.map(async (fund) => {
      const daily = await fetchDailyMetricsForTicker(fund.ticker);
      const slow = FUND_DISCOVERY_SLOW_METRICS[fund.ticker] || {};
      return {
        ticker: fund.ticker,
        name: fund.name,
        daily,
        slow,
      };
    })
  );

  const returns = dailyRows.map(r => r.daily.recentReturnPct);
  const vols = dailyRows.map(r => r.daily.annualizedVolatilityPct);
  const expenses = dailyRows.map(r => r.slow.expenseRatioPct);
  const aums = dailyRows.map(r => r.slow.aumBillions);

  const scored = dailyRows.map((row) => {
    const subscores = {
      recentReturn: computePercentileScore(returns, row.daily.recentReturnPct, true),
      volatility: computePercentileScore(vols, row.daily.annualizedVolatilityPct, false),
      expenseRatio: computePercentileScore(expenses, row.slow.expenseRatioPct, false),
      aum: computePercentileScore(aums, row.slow.aumBillions, true),
      beta: computeBetaScore(row.daily.beta),
    };

    const weighted = {
      recentReturn: (subscores.recentReturn ?? 0) * SCORE_WEIGHTS.recentReturn,
      volatility: (subscores.volatility ?? 0) * SCORE_WEIGHTS.volatility,
      expenseRatio: (subscores.expenseRatio ?? 0) * SCORE_WEIGHTS.expenseRatio,
      aum: (subscores.aum ?? 0) * SCORE_WEIGHTS.aum,
      beta: (subscores.beta ?? 0) * SCORE_WEIGHTS.beta,
    };

    const score = Object.values(weighted).reduce((acc, v) => acc + v, 0);

    return {
      ticker: row.ticker,
      name: row.name,
      score: Number(score.toFixed(2)),
      metrics: {
        recentReturnPct: row.daily.recentReturnPct,
        oneMonthReturnPct: row.daily.oneMonthReturnPct,
        threeMonthReturnPct: row.daily.threeMonthReturnPct,
        annualizedVolatilityPct: row.daily.annualizedVolatilityPct,
        expenseRatioPct: row.slow.expenseRatioPct,
        aumBillions: row.slow.aumBillions,
        beta: row.daily.beta,
      },
      subscores,
      weightedContributions: weighted,
      explainability: computeExplainability(subscores, weighted),
      sources: {
        daily: 'Yahoo Finance + Newton Analytics',
        slow: 'Curated slow-metrics table (expense ratio, AUM)',
      },
    };
  });

  scored.sort((a, b) => b.score - a.score);
  scored.forEach((fund, idx) => {
    fund.rank = idx + 1;
  });

  const generatedAt = new Date().toISOString();
  return {
    asOfDate: formatDateKey(new Date(generatedAt)),
    generatedAt,
    stale: false,
    fallbackUsed: false,
    staleReason: null,
    universeSize: scored.length,
    trackedTickers: trackedFunds.map(f => f.ticker),
    scoring: {
      model: 'rule-based-v1',
      weights: SCORE_WEIGHTS,
      notes: {
        recentReturn: '0.6 * 1M return + 0.4 * 3M return',
        volatility: '63-trading-day annualized volatility',
        beta: 'Distance-to-1 scoring for broad market alignment',
      },
    },
    funds: scored,
  };
}

async function refreshFundDiscoverySnapshot({ force = false } = {}) {
  refreshMeta.lastAttemptAt = new Date().toISOString();
  refreshMeta.lastError = null;

  if (!force && latestSnapshot && !isStale(latestSnapshot)) {
    return latestSnapshot;
  }

  try {
    const snapshot = await buildFreshSnapshot();
    await persistSnapshot(snapshot);
    latestSnapshot = snapshot;
    refreshMeta.lastSuccessAt = snapshot.generatedAt;
    return snapshot;
  } catch (err) {
    refreshMeta.lastError = err.message;
    const fallback = withFallbackSnapshot(err.message);
    if (fallback) {
      latestSnapshot = fallback;
      return fallback;
    }
    throw err;
  }
}

async function getFundDiscoverySnapshot({ limit } = {}) {
  if (!latestSnapshot) {
    await loadLatestSnapshot();
  }
  if (!latestSnapshot || isStale(latestSnapshot)) {
    await refreshFundDiscoverySnapshot({ force: true });
  }

  if (!latestSnapshot) return null;

  const safeLimit = Number.isFinite(Number(limit)) ? Math.max(1, Math.min(50, Number(limit))) : null;
  const funds = safeLimit ? latestSnapshot.funds.slice(0, safeLimit) : latestSnapshot.funds;

  return {
    ...latestSnapshot,
    stale: latestSnapshot.stale || isStale(latestSnapshot),
    funds,
  };
}

async function getFundDiscoveryFund(ticker) {
  const snapshot = await getFundDiscoverySnapshot();
  if (!snapshot) return null;
  return snapshot.funds.find(f => f.ticker.toUpperCase() === ticker.toUpperCase()) || null;
}

function getFundDiscoveryStatus() {
  return {
    lastAttemptAt: refreshMeta.lastAttemptAt,
    lastSuccessAt: refreshMeta.lastSuccessAt,
    lastError: refreshMeta.lastError,
    stale: latestSnapshot ? (latestSnapshot.stale || isStale(latestSnapshot)) : true,
    snapshotDate: latestSnapshot?.asOfDate || null,
    fundCount: latestSnapshot?.funds?.length || 0,
  };
}

async function initializeFundDiscoveryRefresh() {
  await loadLatestSnapshot();
  try {
    await refreshFundDiscoverySnapshot({ force: !latestSnapshot });
  } catch (err) {
    refreshMeta.lastError = err.message;
    console.warn(`Fund discovery initial refresh failed: ${err.message}`);
  }

  setInterval(() => {
    refreshFundDiscoverySnapshot({ force: true }).catch((err) => {
      refreshMeta.lastError = err.message;
      console.warn(`Fund discovery scheduled refresh failed: ${err.message}`);
    });
  }, REFRESH_INTERVAL_MS);
}

module.exports = {
  getFundDiscoverySnapshot,
  getFundDiscoveryFund,
  refreshFundDiscoverySnapshot,
  getFundDiscoveryStatus,
  initializeFundDiscoveryRefresh,
  SCORE_WEIGHTS,
};