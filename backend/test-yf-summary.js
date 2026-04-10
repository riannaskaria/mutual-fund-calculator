const YahooFinanceClass = require('yahoo-finance2').default;
const yf = new YahooFinanceClass({ suppressNotices: ['yahooSurvey'] });
async function test() {
  try {
    const res = await yf.quoteSummary('AAPL', { modules: ['assetProfile', 'summaryDetail', 'defaultKeyStatistics', 'financialData'] });
    console.log("SUCCESS:", Object.keys(res));
  } catch(e) {
    console.log("ERROR:", e.message);
  }
}
test();
