const yf = require('yahoo-finance2').default;
async function test() {
  const res = await yf.quoteSummary('AAPL', { modules: ['assetProfile'] });
  console.log(Object.keys(res.assetProfile || {}));
  console.log("description:", res.assetProfile?.longBusinessSummary ? "exists" : "missing");
}
test();
