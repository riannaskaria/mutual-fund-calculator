// Slow-moving metrics updated less frequently than daily market data.
// Values are intentionally lightweight for MVP ranking explainability.

const FUND_DISCOVERY_SLOW_METRICS = {
  VFIAX: { expenseRatioPct: 0.04, aumBillions: 1240 },
  FXAIX: { expenseRatioPct: 0.02, aumBillions: 510 },
  VTSAX: { expenseRatioPct: 0.04, aumBillions: 1560 },
  SWPPX: { expenseRatioPct: 0.02, aumBillions: 95 },
  FCNTX: { expenseRatioPct: 0.82, aumBillions: 140 },
  VWENX: { expenseRatioPct: 0.16, aumBillions: 130 },
  VIGAX: { expenseRatioPct: 0.05, aumBillions: 190 },
  VVIAX: { expenseRatioPct: 0.05, aumBillions: 120 },
  FDGRX: { expenseRatioPct: 0.79, aumBillions: 75 },
  TRBCX: { expenseRatioPct: 0.69, aumBillions: 95 },
  PRWCX: { expenseRatioPct: 0.70, aumBillions: 75 },
  SWTSX: { expenseRatioPct: 0.03, aumBillions: 120 },
};

module.exports = { FUND_DISCOVERY_SLOW_METRICS };