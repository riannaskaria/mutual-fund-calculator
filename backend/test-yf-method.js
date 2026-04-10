const YF = require('yahoo-finance2').default;
const yf = new YF({ suppressNotices: ['yahooSurvey'] });
console.log("quoteSummary exists?", typeof yf.quoteSummary);
