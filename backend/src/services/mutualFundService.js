// Service layer for mutual fund calculations

const { fetchBeta } = require('./betaService');
const { fetchExpectedReturn } = require('./historicalReturnService');

// Risk-free rate: US 10-year Treasury yield - 2026-02-17
// Source: Federal Reserve Bank of St. Louis (FRED) - https://fred.stlouisfed.org/series/DGS10
const RISK_FREE_RATE = 0.0425;

// 12 equity/bond mutual funds sourced from MarketWatch Top 25 Mutual Funds.
// Source: https://www.marketwatch.com/tools/top-25-mutual-funds
// Only equity/bond funds are included. Money market funds from the original list
// are excluded because CAPM is not applicable to them — their returns are largely
// risk-free and they exhibit an effective beta near zero, making CAPM meaningless.
//
// Example Newton Analytics responses for excluded money market funds:
//   SPAXX: https://api.newtonanalytics.com/stock-beta/?ticker=SPAXX&index=^GSPC&interval=1mo&observations=12
//          => { "status": "400", "message": "not enough observations to make calculation" }
//   VMFXX: https://api.newtonanalytics.com/stock-beta/?ticker=VMFXX&index=^GSPC&interval=1mo&observations=12
//          => { "status": "200", "data": 0 }
//
// Compare with a valid equity fund:
//   VFIAX: https://api.newtonanalytics.com/stock-beta/?ticker=VFIAX&index=^GSPC&interval=1mo&observations=12
//          => { "status": "200", "data": 0.2961 }
const FUNDS = [
  // Original 12 — MarketWatch Top 25 equity/bond funds
  { name: 'Vanguard Total Stock Market Index Fund;Institutional Plus', ticker: 'VSMPX' },
  { name: 'Fidelity 500 Index Fund',                                   ticker: 'FXAIX' },
  { name: 'Vanguard 500 Index Fund;Admiral',                           ticker: 'VFIAX' },
  { name: 'Vanguard Total Stock Market Index Fund;Admiral',            ticker: 'VTSAX' },
  { name: 'Vanguard Total International Stock Index Fund;Investor',    ticker: 'VGTSX' },
  { name: 'Fidelity Strategic Advisers Fidelity US Total Stk',        ticker: 'FCTDX' },
  { name: 'Vanguard Institutional Index Fund;Inst Plus',               ticker: 'VIIIX' },
  { name: 'Vanguard Total Bond Market II Index Fund;Institutional',    ticker: 'VTBNX' },
  { name: 'American Funds Growth Fund of America;A',                   ticker: 'AGTHX' },
  { name: 'Vanguard Total Bond Market II Index Fund;Investor',         ticker: 'VTBIX' },
  { name: 'Fidelity Contrafund',                                       ticker: 'FCNTX' },
  { name: 'PIMCO Income Fund;Institutional',                           ticker: 'PIMIX' },
  // Additional equity funds with sufficient price history for Newton Analytics
  { name: 'Vanguard Wellington Fund;Admiral',                          ticker: 'VWENX' },
  { name: 'Vanguard Balanced Index Fund;Admiral',                      ticker: 'VBIAX' },
  { name: 'Vanguard Growth Index Fund;Admiral',                        ticker: 'VIGAX' },
  { name: 'Vanguard Value Index Fund;Admiral',                         ticker: 'VVIAX' },
  { name: 'Vanguard Mid-Cap Index Fund;Admiral',                       ticker: 'VIMAX' },
  { name: 'Vanguard Small-Cap Index Fund;Admiral',                     ticker: 'VSMAX' },
  { name: 'Vanguard Extended Market Index Fund;Admiral',               ticker: 'VEXAX' },
  { name: 'Vanguard Developed Markets Index Fund;Admiral',             ticker: 'VTMGX' },
  { name: 'Vanguard Emerging Markets Stock Index Fund;Admiral',        ticker: 'VEMAX' },
  { name: 'Vanguard PRIMECAP Fund;Admiral',                            ticker: 'VPMAX' },
  { name: 'Vanguard Health Care Fund;Admiral',                         ticker: 'VGHAX' },
  { name: 'Fidelity Growth Company Fund',                              ticker: 'FDGRX' },
  { name: 'Fidelity Blue Chip Growth Fund',                            ticker: 'FBGRX' },
  { name: 'Fidelity Low-Priced Stock Fund',                            ticker: 'FLPSX' },
  { name: 'Fidelity Magellan Fund',                                    ticker: 'FMAGX' },
  { name: 'Fidelity Puritan Fund',                                     ticker: 'FPURX' },
  { name: 'T. Rowe Price Blue Chip Growth Fund',                       ticker: 'TRBCX' },
  { name: 'T. Rowe Price Growth Stock Fund',                           ticker: 'PRGFX' },
  { name: 'T. Rowe Price Mid-Cap Growth Fund',                         ticker: 'RPMGX' },
  { name: 'T. Rowe Price Capital Appreciation Fund',                   ticker: 'PRWCX' },
  { name: 'Dodge & Cox Stock Fund',                                    ticker: 'DODGX' },
  { name: 'Dodge & Cox International Stock Fund',                      ticker: 'DODFX' },
  { name: 'American Funds EuroPacific Growth Fund;A',                  ticker: 'AEPGX' },
  { name: 'American Funds Capital Income Builder;A',                   ticker: 'CAIBX' },
  { name: 'American Funds Washington Mutual Investors;A',              ticker: 'AWSHX' },
  { name: 'Schwab S&P 500 Index Fund',                                 ticker: 'SWPPX' },
  { name: 'Schwab Total Stock Market Index Fund',                      ticker: 'SWTSX' },
  { name: 'Oakmark Fund;Investor',                                     ticker: 'OAKMX' },
];

function getAllFunds() {
  return FUNDS;
}

function validateTicker(ticker) {
  const found = FUNDS.some(f => f.ticker.toUpperCase() === ticker.toUpperCase());
  if (!found) {
    const error = new Error(`Ticker not found in supported fund list: ${ticker}`);
    error.status = 404;
    throw error;
  }
}

// Steps:
//  1. Fetch beta from Newton Analytics
//  2. Fetch expected return from Yahoo Finance (previous year)
//  3. r = riskFreeRate + beta * (expectedReturn - riskFreeRate)  [CAPM]
//  4. FV = principal * e^(r * years)                             [continuous compounding]
async function calculate(ticker, principal, years) {
  const beta = await fetchBeta(ticker);
  const expectedReturnRate = await fetchExpectedReturn(ticker);

  const capmRate = RISK_FREE_RATE + beta * (expectedReturnRate - RISK_FREE_RATE);
  const futureValue = principal * Math.exp(capmRate * years);

  return { ticker, principal, years, beta, expectedReturnRate, riskFreeRate: RISK_FREE_RATE, capmRate, futureValue };
}

module.exports = { getAllFunds, validateTicker, calculate };
