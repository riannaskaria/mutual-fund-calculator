// Fetches the previous calendar year's return rate for a mutual fund from Yahoo Finance.
// Formula: (lastClose - firstClose) / firstClose

const axios = require('axios');

const YAHOO_URL = 'https://query1.finance.yahoo.com/v8/finance/chart/';

async function fetchExpectedReturn(ticker) {
  const previousYear = new Date().getFullYear() - 1;
  // Yahoo Finance API expects timestamps in seconds
  // period1 is Jan 1 of the previous year (inclusive lower bound)
  const period1 = Math.floor(new Date(`${previousYear}-01-01T00:00:00Z`).getTime() / 1000);
  // period2 is Jan 1 of the current year (exclusive upper bound) to capture all of last year
  const period2 = Math.floor(new Date(`${previousYear + 1}-01-01T00:00:00Z`).getTime() / 1000);

  try {
    const response = await axios.get(`${YAHOO_URL}${ticker}`, {
      params: { period1, period2, interval: '1d' },
      // Set a user-agent to avoid potential blocking by Yahoo Finance
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 10000,
    });

    return parseReturnRate(response.data, ticker);
  } catch (err) {
    if (err.status) throw err;
    const error = new Error(`Failed to reach Yahoo Finance API: ${err.message}`);
    error.status = 503;
    throw error;
  }
}

function parseReturnRate(json, ticker) {
  const chart = json?.chart;

  if (chart?.error && chart.error !== null) {
    const error = new Error(`Yahoo Finance error for ${ticker}: ${JSON.stringify(chart.error)}`);
    error.status = 502;
    throw error;
  }

  // Yahoo Finance can return null entries for non-trading days — filter those out
  const closes = chart?.result?.[0]?.indicators?.quote?.[0]?.close
    ?.filter(v => v !== null && v !== undefined && typeof v === 'number');

  if (!closes || closes.length < 2) {
    const error = new Error(`Insufficient historical data from Yahoo Finance for ticker: ${ticker}`);
    error.status = 502;
    throw error;
  }

  const firstClose = closes[0];
  if (firstClose === 0) {
    const error = new Error(`First close price is zero for ticker: ${ticker}`);
    error.status = 500;
    throw error;
  }

  // Returns a decimal rate, e.g. 0.12 represents a 12% annual return
  return (closes[closes.length - 1] - firstClose) / firstClose;
}

module.exports = { fetchExpectedReturn };
