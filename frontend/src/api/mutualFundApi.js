/**
 * API service for Mutual Fund Calculator backend.
 * Update baseURL to match your Java backend (default: /api when using Vite proxy).
 * Set VITE_USE_MOCK=true to use mock data when backend is not available.
 */
import { mockMutualFunds, mockFutureValue } from './mockData';
import API_BASE from '../apiBase';

const baseURL = API_BASE + '/api';
const useMock = import.meta.env.VITE_USE_MOCK === 'true';

async function handleResponse(response) {
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    const bodyPreview = (await response.text()).slice(0, 120).replace(/\s+/g, ' ');
    throw new Error(
      `Expected JSON but received ${contentType || 'unknown content-type'} from ${response.url}. ` +
      `Preview: ${bodyPreview}`
    );
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }
  return response.json();
}

/**
 * GET list of mutual funds
 * Expected backend: GET /api/mutual-funds
 */
export async function fetchMutualFunds() {
  if (useMock) return mockMutualFunds;
  const response = await fetch(`${baseURL}/mutual-funds`);
  return handleResponse(response);
}

// Large list of well-known US mutual fund tickers
const MUTUAL_FUND_TICKERS = [
  'VFIAX','VTSAX','FXAIX','VBTLX','VSMPX','VIIIX','VTBNX','AGTHX','VGTSX','PIMIX',
  'FCNTX','VTBIX','DODGX','VWUSX','SWPPX','FSKAX','FZROX','FZILX','FBIDX','VBMFX',
  'VWNDX','VWIGX','FZROX','TRBCX','PRNHX','RPMGX','PRWCX','VGHAX','FSPHX','FPHAX',
  'OAKMX','FCPVX','MSEQX','JENSX','CGMFX','WBSIX','ACMVX','LMVTX','BALPX','VGHCX',
  'FMILX','FPURX','FFIDX','FTBFX','FTTAX','FADMX','FPADX','FSDIX','FGRIX','FMAGX',
  'VWELX','VWINX','VWNFX','VPMAX','VMVAX','VEXAX','VEMAX','VTMGX','VPADX','VIMAX',
  'VSCIX','VSIAX','VSMAX','VTMSX','VTCLX','VTMFX','VWITX','VWAHX','VWIUX','VWLUX',
  'VWSUX','VWAUX','VWSAX','VWLAX','VMLTX','VMLUX','VICSX','VICSIX','VIIIX','VMRXX',
  'SWTSX','SWLGX','SWLSX','SWHGX','SWHSX','SWMCX','SNXFX','SOGIX','SFNNX','SFILX',
  'DODFX','DODWX','DLTNX','DLFNX','DFUSX','DFSCX','DFSTX','DFESX','DFEVX','DFIHX',
];

/**
 * Fetch live mutual fund quotes via v8 chart endpoint (no auth required).
 * Fires all requests in parallel, extracts price + prevClose from meta.
 */
export async function fetchYahooMutualFundScreener(count = 100) {
  const tickers = MUTUAL_FUND_TICKERS.slice(0, count);
  const results = await Promise.all(
    tickers.map(sym =>
      fetch(`${API_BASE}/yahoo-api/v8/finance/chart/${sym}?interval=1d&range=1d`, {
        signal: AbortSignal.timeout(8000),
      })
        .then(r => r.json())
        .then(j => {
          const meta = j?.chart?.result?.[0]?.meta;
          if (!meta?.symbol) return null;
          const price = meta.regularMarketPrice ?? null;
          const prev = meta.chartPreviousClose ?? null;
          const change = price != null && prev != null ? price - prev : null;
          const changePct = change != null && prev ? (change / prev) * 100 : null;
          return {
            id: meta.symbol,
            name: meta.longName || meta.shortName || meta.symbol,
            ticker: meta.symbol,
            price,
            change,
            changePct,
          };
        })
        .catch(() => null)
    )
  );
  return results.filter(Boolean);
}

/**
 * GET live quote metadata from Yahoo Finance for a ticker.
 * Uses the /yahoo-api Vite proxy → https://query1.finance.yahoo.com
 * Returns the `meta` object from the chart response.
 * @param {string} ticker - e.g. "VFIAX"
 */
export async function fetchYahooQuote(ticker) {
  const res = await fetch(`${API_BASE}/yahoo-api/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`);
  const json = await handleResponse(res);
  const meta = json?.chart?.result?.[0]?.meta;
  if (!meta) throw new Error('No quote data returned');
  return meta;
}

export async function fetchYahooPriceHistory(ticker, range = '1y', interval = '1d') {
  const response = await fetch(
    `${API_BASE}/yahoo-api/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${interval}&range=${range}`
  );
  const json = await handleResponse(response);
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error('No price data returned');
  const timestamps = result.timestamp || [];
  const closes = result.indicators?.quote?.[0]?.close || [];
  return {
    data: timestamps
      .map((t, i) => ({ time: t * 1000, value: closes[i] }))
      .filter(d => d.value != null),
    prevClose: result.meta?.chartPreviousClose,
  };
}

/**
 * GET future value of investment
 * Expected backend: GET /api/future-value?fundId=...&amount=...&years=...
 * @param {string} fundId - Mutual fund identifier
 * @param {number} amount - Initial investment amount
 * @param {number} years - Investment time horizon in years
 */
export async function fetchFutureValue(fundId, amount, years) {
  if (useMock) {
    const result = mockFutureValue(amount, years);
    return new Promise((r) => setTimeout(() => r(result), 500));
  }
  const params = new URLSearchParams({ fundId, amount: String(amount), years: String(years) });
  const response = await fetch(`${baseURL}/future-value?${params}`);
  return handleResponse(response);
}

export async function fetchFundDiscovery(limit = 8) {
  if (useMock) {
    return {
      asOfDate: new Date().toISOString().slice(0, 10),
      generatedAt: new Date().toISOString(),
      stale: false,
      funds: [],
      scoring: { weights: { recentReturn: 0.35, volatility: 0.25, expenseRatio: 0.2, aum: 0.1, beta: 0.1 } },
    };
  }
  const params = new URLSearchParams({ limit: String(limit) });
  const response = await fetch(`${baseURL}/discovery?${params}`);
  return handleResponse(response);
}

export async function fetchFundDiscoveryBreakdown(ticker) {
  if (useMock) return null;
  const response = await fetch(`${baseURL}/discovery/fund/${encodeURIComponent(ticker)}`);
  return handleResponse(response);
}

export async function fetchFundDiscoveryStatus() {
  if (useMock) {
    return {
      lastAttemptAt: null,
      lastSuccessAt: new Date().toISOString(),
      lastError: null,
      stale: false,
      snapshotDate: new Date().toISOString().slice(0, 10),
      fundCount: 0,
    };
  }
  const response = await fetch(`${baseURL}/discovery/status`);
  return handleResponse(response);
}

export async function refreshFundDiscovery() {
  if (useMock) return { ok: true, generatedAt: new Date().toISOString(), stale: false, fallbackUsed: false };
  const response = await fetch(`${baseURL}/discovery/refresh`, { method: 'POST' });
  return handleResponse(response);
}

export async function logSearchEvent({ ticker, name, timestamp } = {}) {
  if (useMock) return { ok: true };
  const response = await fetch(`${baseURL}/trending/log-search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticker, name, timestamp }),
  });
  return handleResponse(response);
}

export async function logTradeEvent({ ticker, name, amount, timestamp } = {}) {
  if (useMock) return { ok: true };
  const response = await fetch(`${baseURL}/trending/log-trade`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticker, name, amount, timestamp }),
  });
  return handleResponse(response);
}

export async function fetchMostSearchedFunds(limit = 10) {
  if (useMock) return { generatedAt: new Date().toISOString(), metric: 'most-searched', window: 'all-time', funds: [] };
  const params = new URLSearchParams({ limit: String(limit) });
  const response = await fetch(`${baseURL}/trending/most-searched?${params}`);
  return handleResponse(response);
}

export async function fetchMostTradedFunds(limit = 10) {
  if (useMock) return { generatedAt: new Date().toISOString(), metric: 'most-traded', window: 'all-time', funds: [] };
  const params = new URLSearchParams({ limit: String(limit) });
  const response = await fetch(`${baseURL}/trending/most-traded?${params}`);
  return handleResponse(response);
}
