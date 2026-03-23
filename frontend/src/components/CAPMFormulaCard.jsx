import katex from 'katex';
import 'katex/dist/katex.min.css';

function renderMath(expression, displayMode = false) {
  return {
    __html: katex.renderToString(expression, { throwOnError: false, displayMode }),
  };
}

function formatPercent(value, digits = 2) {
  if (!Number.isFinite(value)) return 'N/A';
  return `${value.toFixed(digits)}%`;
}

function formatMoney(value) {
  if (!Number.isFinite(value)) return 'N/A';
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function CAPMFormulaCard({ futureValue, principal, years }) {
  const riskFreeRatePct = (futureValue?.riskFreeRate ?? 0.0425) * 100;
  const marketReturnPct = Number.isFinite(futureValue?.expectedReturnRate)
    ? futureValue.expectedReturnRate * 100
    : NaN;
  const beta = Number.isFinite(futureValue?.beta) ? futureValue.beta : NaN;
  const capmRatePct = Number.isFinite(futureValue?.capmRate) ? futureValue.capmRate * 100 : NaN;
  const projectedFutureValue = Number.isFinite(futureValue?.futureValue)
    ? futureValue.futureValue
    : Number.isFinite(futureValue?.value)
      ? futureValue.value
      : NaN;

  const hasResult = Number.isFinite(projectedFutureValue);
  const equation = hasResult
    ? `r = r_f + \\beta(R_m - r_f) = ${capmRatePct.toFixed(4)}\\%\\qquad FV = P \\cdot e^{r t} = \\boldsymbol{\\$${projectedFutureValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}}`
    : 'r = r_f + \\beta(R_m - r_f), \\qquad FV = P \\cdot e^{r t}';

  const variableRows = [
    {
      symbol: 'r_f',
      value: formatPercent(riskFreeRatePct),
      description: 'Risk-free rate used in CAPM.',
      source: 'FRED 10Y Treasury (constant from backend config).',
    },
    {
      symbol: 'R_m',
      value: formatPercent(marketReturnPct),
      description: 'Market return proxy from prior-year performance.',
      source: 'Yahoo Finance previous calendar-year close series.',
    },
    {
      symbol: '\\beta',
      value: Number.isFinite(beta) ? beta.toFixed(4) : 'N/A',
      description: 'Fund sensitivity versus S&P 500.',
      source: 'Newton Analytics stock-beta API (index: ^GSPC).',
    },
    {
      symbol: 'r',
      value: formatPercent(capmRatePct, 4),
      description: 'Expected annual return from CAPM formula.',
      source: 'Computed by backend CAPM service.',
    },
    {
      symbol: 'P',
      value: formatMoney(principal),
      description: 'Initial investment amount.',
      source: 'User input in calculator form.',
    },
    {
      symbol: 't',
      value: Number.isFinite(years) ? `${years} years` : 'N/A',
      description: 'Investment time horizon.',
      source: 'User input in calculator form.',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-teal-50 p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <p className="text-sm font-semibold text-emerald-900">CAPM Formula</p>
        </div>
        <div className="overflow-x-auto rounded-xl border border-emerald-100 bg-white/80 px-4 py-5">
          <div className="min-w-max text-slate-900" dangerouslySetInnerHTML={renderMath(equation, true)} />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {variableRows.map((item) => (
          <div key={item.symbol} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-base text-slate-900" dangerouslySetInnerHTML={renderMath(item.symbol)} />
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                {item.value}
              </span>
            </div>
            <p className="text-sm text-slate-700">{item.description}</p>
            <p className="mt-1 text-xs text-slate-500">Source: {item.source}</p>
          </div>
        ))}
      </div>
    </div>
  );
}