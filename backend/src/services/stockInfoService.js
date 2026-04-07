/**
 * Fetches rich stock/ETF/fund data from Yahoo Finance quoteSummary.
 * Obtains the required crumb by parsing it from the Yahoo Finance page HTML,
 * then uses it (with session cookies) to call the quoteSummary API.
 */
const https = require('https');
const axios = require('axios');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Yahoo Finance sends large response headers — increase the limit
const httpsAgent = new https.Agent({ maxHeaderSize: 65536 });

let session = null; // { crumb, cookie, fetchedAt }

async function refreshSession() {
  const res = await axios.get('https://finance.yahoo.com/quote/AAPL', {
    httpsAgent,
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    timeout: 14000,
    maxRedirects: 5,
    validateStatus: () => true,
  });

  const setCookies = res.headers['set-cookie'] || [];
  const cookieStr = setCookies.map(c => c.split(';')[0]).join('; ');

  const html = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
  const match = html.match(/"crumb"\s*:\s*"([^"]+)"/);
  if (!match) throw new Error('Could not extract crumb from Yahoo Finance page');

  const crumb = match[1].replace(/\\u002F/g, '/');
  session = { crumb, cookie: cookieStr, fetchedAt: Date.now() };
  return session;
}

async function getSession() {
  if (session && Date.now() - session.fetchedAt < 45 * 60 * 1000) return session;
  return refreshSession();
}

const MODULES = 'assetProfile,summaryDetail,defaultKeyStatistics,financialData';

/**
 * @param {string} ticker
 * @returns {Promise<object>}
 */
async function fetchStockInfo(ticker) {
  let sess = await getSession();

  const doFetch = (s) =>
    axios.get(
      `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}` +
      `?modules=${encodeURIComponent(MODULES)}&crumb=${encodeURIComponent(s.crumb)}`,
      {
        httpsAgent,
        headers: { 'User-Agent': UA, Cookie: s.cookie },
        timeout: 10000,
        validateStatus: () => true,
      }
    );

  let res = await doFetch(sess);

  if (res.status === 401 || res.status === 403) {
    session = null;
    sess = await refreshSession();
    res = await doFetch(sess);
  }

  if (res.status !== 200) {
    const msg = res.data?.quoteSummary?.error?.description || `Yahoo Finance returned ${res.status} for ${ticker}`;
    throw new Error(msg);
  }

  const result = res.data?.quoteSummary?.result?.[0];
  if (!result) throw new Error(`No data returned for ${ticker}`);
  return result;
}

module.exports = { fetchStockInfo };
