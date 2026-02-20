// Fetches the beta for a mutual fund ticker against the S&P 500
// using the Newton Analytics open-source API.
//
// Per project spec: "Keep index, interval, and observations the same as example"
// Spec reference: 2026 Engineering ELS Technical Challenge
//
// API: https://api.newtonanalytics.com/stock-beta/
// Spec example: https://api.newtonanalytics.com/stock-beta/?ticker=VFIAX&index=^GSPC&interval=1mo&observations=12
//
// Fixed parameters (as required by spec):
//   index=^GSPC     - S&P 500 as the benchmark market index
//   interval=1mo    - monthly data intervals
//   observations=12 - 12 months of data (1 year rolling window)
//
// Example response (equity fund):
//   VFIAX: { "status": "200", "data": 0.2961 }
//
// Example response (money market fund — excluded from supported list):
//   SPAXX: { "status": "400", "message": "not enough observations to make calculation" }
//   VMFXX: { "status": "200", "data": 0 }

const axios = require('axios');

const BETA_URL = 'https://api.newtonanalytics.com/stock-beta/';

async function fetchBeta(ticker) {
  try {
    const response = await axios.get(BETA_URL, {
      params: {
        ticker,
        index: '^GSPC',
        interval: '1mo',
        observations: 12,
      },
      timeout: 10000,
    });

    const data = response.data?.data;

    if (data === undefined || data === null || typeof data !== 'number') {
      const error = new Error(`Newton Analytics response missing numeric beta for ticker: ${ticker}`);
      error.status = 502;
      throw error;
    }

    return data;
  } catch (err) {
    if (err.status) throw err;
    const error = new Error(`Failed to reach Newton Analytics API: ${err.message}`);
    error.status = 503;
    throw error;
  }
}

module.exports = { fetchBeta };
