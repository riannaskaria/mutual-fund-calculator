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
  return yf.quoteSummary(ticker, { modules: MODULES });
}

module.exports = { fetchStockInfo };
