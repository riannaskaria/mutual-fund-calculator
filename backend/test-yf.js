const yf = require('yahoo-finance2').default;
yf.suppressNotices(['yahooSurvey']);
async function test() {
  try {
    const res = await yf.quoteSummary('AAPL', { modules: ['assetProfile', 'summaryDetail', 'defaultKeyStatistics', 'financialData'] });
    console.log("SUCCESS:", !!res.assetProfile.longBusinessSummary);
  } catch (e) {
    console.error("ERROR:", e.name, e.message);
  }
}
test();
