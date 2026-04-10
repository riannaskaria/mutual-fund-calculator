const yf = require('yahoo-finance2').default;
async function test() {
  const q = await yf.quote('AAPL');
  console.log(Object.keys(q));
}
test();
