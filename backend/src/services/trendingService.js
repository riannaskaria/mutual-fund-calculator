const fs = require('fs/promises');
const path = require('path');
const { getAllFunds } = require('./mutualFundService');

const DATA_DIR = path.resolve(__dirname, '../../data/trending');
const DATA_PATH = path.join(DATA_DIR, 'latest.json');

function normalizeTicker(ticker = '') {
  return String(ticker).trim().toUpperCase();
}

function clampLimit(limit, fallback = 10) {
  const value = Number(limit);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(50, Math.floor(value)));
}

function safeIso(ts) {
  const date = ts ? new Date(ts) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

function emptyStore() {
  return {
    updatedAt: new Date().toISOString(),
    searches: {},
    trades: {},
  };
}

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readStore() {
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      updatedAt: parsed.updatedAt || null,
      searches: parsed.searches || {},
      trades: parsed.trades || {},
    };
  } catch {
    return emptyStore();
  }
}

async function writeStore(store) {
  const payload = {
    ...store,
    updatedAt: new Date().toISOString(),
  };
  await ensureDataDir();
  await fs.writeFile(DATA_PATH, JSON.stringify(payload, null, 2));
}

function resolveFundName(ticker, fallbackName) {
  if (fallbackName && fallbackName.trim()) return fallbackName.trim();
  const all = getAllFunds();
  const found = all.find(f => f.ticker === ticker);
  return found?.name || ticker;
}

async function logSearchEvent({ ticker, name, timestamp }) {
  const symbol = normalizeTicker(ticker);
  if (!symbol) {
    const err = new Error('ticker is required');
    err.status = 400;
    throw err;
  }

  const store = await readStore();
  const row = store.searches[symbol] || { ticker: symbol, name: resolveFundName(symbol, name), count: 0, lastSearchedAt: null };

  row.name = resolveFundName(symbol, name || row.name);
  row.count += 1;
  row.lastSearchedAt = safeIso(timestamp);

  store.searches[symbol] = row;
  await writeStore(store);
  return row;
}

async function logTradeEvent({ ticker, name, amount, timestamp }) {
  const symbol = normalizeTicker(ticker);
  if (!symbol) {
    const err = new Error('ticker is required');
    err.status = 400;
    throw err;
  }

  const tradeAmount = Number(amount);
  const normalizedAmount = Number.isFinite(tradeAmount) ? Math.abs(tradeAmount) : 0;

  const store = await readStore();
  const row = store.trades[symbol] || {
    ticker: symbol,
    name: resolveFundName(symbol, name),
    count: 0,
    totalAmount: 0,
    lastTradedAt: null,
  };

  row.name = resolveFundName(symbol, name || row.name);
  row.count += 1;
  row.totalAmount = Number((row.totalAmount + normalizedAmount).toFixed(2));
  row.lastTradedAt = safeIso(timestamp);

  store.trades[symbol] = row;
  await writeStore(store);
  return row;
}

async function getMostSearched({ limit = 10 } = {}) {
  const store = await readStore();
  const safeLimit = clampLimit(limit);

  const funds = Object.values(store.searches)
    .sort((a, b) => (b.count - a.count) || String(b.lastSearchedAt).localeCompare(String(a.lastSearchedAt)))
    .slice(0, safeLimit)
    .map((item, idx) => ({
      rank: idx + 1,
      ticker: item.ticker,
      name: item.name,
      searchCount: item.count,
      lastSearchedAt: item.lastSearchedAt,
    }));

  return {
    generatedAt: new Date().toISOString(),
    metric: 'most-searched',
    window: 'all-time',
    funds,
  };
}

async function getMostTraded({ limit = 10 } = {}) {
  const store = await readStore();
  const safeLimit = clampLimit(limit);

  const funds = Object.values(store.trades)
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      if (b.totalAmount !== a.totalAmount) return b.totalAmount - a.totalAmount;
      return String(b.lastTradedAt).localeCompare(String(a.lastTradedAt));
    })
    .slice(0, safeLimit)
    .map((item, idx) => ({
      rank: idx + 1,
      ticker: item.ticker,
      name: item.name,
      tradeCount: item.count,
      totalAmount: item.totalAmount,
      lastTradedAt: item.lastTradedAt,
    }));

  return {
    generatedAt: new Date().toISOString(),
    metric: 'most-traded',
    window: 'all-time',
    funds,
  };
}

module.exports = {
  logSearchEvent,
  logTradeEvent,
  getMostSearched,
  getMostTraded,
};
