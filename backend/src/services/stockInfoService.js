/**
 * Fetches rich stock/ETF/fund data via the yahoo-finance2 package,
 * which handles Yahoo Finance crumb authentication server-side.
 */
const YahooFinanceClass = require('yahoo-finance2').default;
const yf = new YahooFinanceClass({ suppressNotices: ['yahooSurvey'] });

const MODULES = ['assetProfile', 'summaryDetail', 'defaultKeyStatistics', 'financialData'];

/**
 * @param {string} ticker
 * @returns {Promise<object>} raw quoteSummary result keyed by module name
 */
async function fetchStockInfo(ticker) {
  let attempts = 0;
  while (attempts < 3) {
    try {
      return await yf.quoteSummary(ticker, { modules: MODULES });
    } catch (err) {
      attempts++;
      console.warn(`[stockInfoService] fetch fail for ${ticker} (attempt ${attempts}):`, err.message);
      if (attempts >= 3) throw err;
      await new Promise(r => setTimeout(r, 1500));
    }
  }
}

module.exports = { fetchStockInfo };
