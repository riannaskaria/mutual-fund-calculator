const YF = require('yahoo-finance2');
console.log(typeof YF.default);
try {
  const yf = new YF.default({ suppressNotices: ['yahooSurvey'] });
  console.log("Constructor worked!");
} catch(e) {
  console.log("Error:", e.message);
}
