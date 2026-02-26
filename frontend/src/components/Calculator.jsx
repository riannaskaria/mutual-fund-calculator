import { useState, useEffect, useRef } from "react";
import Input from './Input';

// === Main's features: CAPM calculator with GrowthChart, AnimatedNumber ===
const RISK_FREE_RATE = 0.0425; // US 10-yr Treasury ~4.25%

const FUNDS = [
  { ticker: "VFIAX", name: "Vanguard 500 Index Fund", category: "Large Blend", historicalReturn: 0.1289, beta: 1.0 },
  { ticker: "FXAIX", name: "Fidelity 500 Index Fund", category: "Large Blend", historicalReturn: 0.1291, beta: 1.0 },
  { ticker: "VWELX", name: "Vanguard Wellington Fund", category: "Moderate Allocation", historicalReturn: 0.0874, beta: 0.62 },
  { ticker: "AGTHX", name: "American Funds Growth Fund", category: "Large Growth", historicalReturn: 0.1342, beta: 1.06 },
  { ticker: "PTTAX", name: "PIMCO Total Return Fund", category: "Core-Plus Bond", historicalReturn: 0.0421, beta: 0.18 },
  { ticker: "FCNTX", name: "Fidelity Contrafund", category: "Large Growth", historicalReturn: 0.1456, beta: 1.03 },
  { ticker: "VBTLX", name: "Vanguard Total Bond Market Index", category: "Core Bond", historicalReturn: 0.0312, beta: 0.05 },
  { ticker: "DODGX", name: "Dodge & Cox Stock Fund", category: "Large Value", historicalReturn: 0.1178, beta: 0.97 },
];

function calcFV(principal, rate, time) {
  return principal * Math.exp(rate * time);
}

function AnimatedNumber({ value, prefix = "", decimals = 2 }) {
  const [display, setDisplay] = useState(value);
  const rafRef = useRef(null);
  const startRef = useRef(null);
  const fromRef = useRef(value);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    const duration = 900;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const animate = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (to - from) * ease);
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
      else { fromRef.current = to; startRef.current = null; }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => rafRef.current && cancelAnimationFrame(rafRef.current);
  }, [value]);

  return <span>{prefix}{display.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</span>;
}

function GrowthChart({ principal, rate, years }) {
  const W = 600, H = 150, PAD = 12;
  const pts = [];
  const maxVal = calcFV(principal, rate, years);
  const range = Math.max(maxVal - principal, 1);

  for (let t = 0; t <= years; t++) {
    const fv = calcFV(principal, rate, t);
    const x = PAD + ((W - PAD * 2) * t) / Math.max(years, 1);
    const y = H - PAD - ((H - PAD * 2) * (fv - principal)) / range;
    pts.push({ x, y: isFinite(y) ? y : H - PAD });
  }

  const area = pts.length > 1
    ? `M ${pts[0].x} ${H - PAD} ${pts.map(p => `L ${p.x} ${p.y}`).join(" ")} L ${pts[pts.length - 1].x} ${H - PAD} Z`
    : "";
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C9A84C" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#C9A84C" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#g)" />
      <path d={line} fill="none" stroke="#C9A84C" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {[0, Math.floor(years / 2), years].map(t => {
        const p = pts[t];
        return p ? <circle key={t} cx={p.x} cy={p.y} r="4" fill="#C9A84C" /> : null;
      })}
    </svg>
  );
}

function formatCurrencyDisplay(v) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(2)}K`;
  return `$${v.toFixed(2)}`;
}

function formatCurrencyInput(num) {
  if (num === '' || num == null || isNaN(num)) return '';
  const n = Number(num);
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0, minimumFractionDigits: 0 });
}

function parseCurrencyInput(str) {
  if (str == null || str === '') return '';
  const parsed = parseInt(String(str).replace(/\D/g, ''), 10);
  return isNaN(parsed) ? '' : parsed;
}

// Main's MutualFundCalculator (CAPM-based with hardcoded funds) + 5 input fields
function MutualFundCalculator() {
  const [fund, setFund] = useState(FUNDS[0]);
  const [principal, setPrincipal] = useState(10000);
  const [futureContributions, setFutureContributions] = useState(5000);
  const [years, setYears] = useState(10);
  const [rateOfReturn, setRateOfReturn] = useState('');
  const [expenseRatio, setExpenseRatio] = useState(0.25);
  const [result, setResult] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const capmRate = RISK_FREE_RATE + fund.beta * (fund.historicalReturn - RISK_FREE_RATE);
  const userRate = rateOfReturn !== '' && !isNaN(Number(rateOfReturn)) ? Number(rateOfReturn) / 100 : null;
  const rate = userRate != null ? userRate - (Number(expenseRatio) || 0) / 100 : capmRate - (Number(expenseRatio) || 0) / 100;

  const handleCalculate = (e) => {
    e?.preventDefault();
    const contrib = Number(futureContributions) || 0;
    const fvPrincipal = calcFV(principal, rate, years);
    const fvContributions = rate > 0 && contrib > 0
      ? contrib * (Math.exp(rate * years) - 1) / (Math.exp(rate) - 1)
      : contrib * years;
    const fv = fvPrincipal + fvContributions;
    const totalInvested = principal + contrib * years;
    const gain = fv - totalInvested;
    const gainPct = totalInvested > 0 ? ((gain / totalInvested) * 100).toFixed(2) : "0.00";
    setResult({ fv, gain, gainPct, rate, principal, years, totalInvested });
  };

  return (
    <div style={{ width: "100%", maxWidth: 760, margin: "0 auto 48px" }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: "#374151", marginBottom: 16 }}>CAPM Calculator</h2>
      <form onSubmit={handleCalculate}>
        <div style={{ background: "#ffffff", border: "1px solid #E5E7EB", borderRadius: 16, overflow: "hidden", boxShadow: "0 28px 80px rgba(0,0,0,0.1)" }}>
          <div style={{ height: 3, background: "linear-gradient(90deg,#6B4F10,#C9A84C,#6B4F10)" }} />
          <div style={{ padding: "36px 40px" }}>
            <div style={{ marginBottom: 28 }}>
              <label style={{ display: "block", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#6B7280", marginBottom: 10 }}>Select Fund</label>
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(v => !v)}
                  style={{ width: "100%", background: "#ffffff", border: `1px solid ${dropdownOpen ? "#C9A84C" : "#D1D5DB"}`, borderRadius: 10, padding: "14px 18px", color: "#111111", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", outline: "none", transition: "border-color 0.2s" }}
                >
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#C9A84C", marginRight: 8 }}>{fund.ticker}</span>
                    <span style={{ fontSize: 15 }}>{fund.name}</span>
                    <span style={{ marginLeft: 10, fontSize: 11, color: "#6B7280", fontStyle: "italic" }}>{fund.category}</span>
                  </div>
                  <span style={{ color: "#C9A84C", fontSize: 12, marginLeft: 8, transform: dropdownOpen ? "scaleY(-1)" : "scaleY(1)", display: "inline-block", transition: "transform 0.2s" }}>▼</span>
                </button>
                {dropdownOpen && (
                  <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#ffffff", border: "1px solid #E5E7EB", borderRadius: 10, zIndex: 50, overflow: "hidden", boxShadow: "0 20px 50px rgba(0,0,0,0.1)" }}>
                    {FUNDS.map(f => (
                      <button key={f.ticker} type="button" onClick={() => { setFund(f); setDropdownOpen(false); setResult(null); }}
                        style={{ width: "100%", background: fund.ticker === f.ticker ? "#F3F4F6" : "transparent", border: "none", borderBottom: "1px solid #F3F4F6", padding: "12px 18px", color: "#111111", cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "background 0.15s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#F9FAFB"}
                        onMouseLeave={e => e.currentTarget.style.background = fund.ticker === f.ticker ? "#F3F4F6" : "transparent"}
                      >
                        <div><span style={{ fontSize: 12, fontWeight: 700, color: "#C9A84C", marginRight: 8 }}>{f.ticker}</span><span style={{ fontSize: 14 }}>{f.name}</span></div>
                        <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}><div style={{ fontSize: 13, color: "#10B981" }}>{(f.historicalReturn * 100).toFixed(2)}%</div><div style={{ fontSize: 10, color: "#6B7280" }}>Hist. Return</div></div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginTop: 10 }}>
                {[{ label: "Hist. Return", value: `${(fund.historicalReturn * 100).toFixed(2)}%`, color: "#10B981" }, { label: "Beta (β)", value: fund.beta.toFixed(2), color: "#3B82F6" }, { label: "Risk-Free (r_f)", value: `${(RISK_FREE_RATE * 100).toFixed(2)}%`, color: "#F59E0B" }, { label: "CAPM Rate (r)", value: `${(capmRate * 100).toFixed(3)}%`, color: "#C9A84C" }].map(({ label, value, color }) => (
                  <div key={label} style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 8, padding: "10px 14px" }}>
                    <div style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6B7280", marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 16, color, fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 5 input fields */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
              <div>
                <Input id="capm-initial" label="Initial investment amount" required prefix="$" type="text" inputMode="decimal" value={formatCurrencyInput(principal)} onChange={(v) => { const p = parseCurrencyInput(v); setPrincipal(p === '' ? 0 : p); setResult(null); }} placeholder="0" />
              </div>
              <div>
                <Input id="capm-future" label="Future planned contributions (per year)" required prefix="$" type="text" inputMode="decimal" value={formatCurrencyInput(futureContributions)} onChange={(v) => { const p = parseCurrencyInput(v); setFutureContributions(p === '' ? 0 : p); setResult(null); }} placeholder="0" />
              </div>
              <div>
                <Input id="capm-years" label="Time horizon (years)" required type="number" value={years} onChange={(v) => { const n = Number(v); if (!isNaN(n) && n >= 1) { setYears(n); setResult(null); } }} placeholder="e.g. 30" min={1} max={50} step={1} />
              </div>
              <div>
                <Input id="capm-rate" label="Rate of return (%) (optional override)" type="number" value={rateOfReturn} onChange={(v) => { setRateOfReturn(v); setResult(null); }} placeholder="Uses CAPM if blank" min={0} step={0.01} />
              </div>
            </div>
            <div style={{ marginBottom: 28 }}>
              <Input id="capm-expense" label="Fund expense ratio (%)" required type="number" value={expenseRatio} onChange={(v) => { const n = Number(v); if (!isNaN(n) && n >= 0) { setExpenseRatio(n); setResult(null); } }} placeholder="e.g. 0.25" min={0} step={0.01} />
            </div>
            <button type="submit" style={{ width: "100%", background: "linear-gradient(135deg,#7A5A10,#C9A84C,#7A5A10)", border: "none", borderRadius: 10, padding: "16px", color: "#ffffff", fontSize: 15, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer", fontFamily: "'Inter', sans-serif", boxShadow: "0 4px 24px rgba(201,168,76,0.28)", transition: "opacity 0.2s, transform 0.15s" }} onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; e.currentTarget.style.transform = "translateY(-1px)"; }} onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "translateY(0)"; }}>
              Calculate Future Value
            </button>
          </div>
        {result && (
          <div style={{ borderTop: "1px solid #E5E7EB", background: "#F9FAFB", padding: "36px 40px" }}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "#6B7280", marginBottom: 10 }}>Projected Future Value</div>
              <div style={{ fontSize: "clamp(40px,8vw,64px)", fontFamily: "'Inter', sans-serif", color: "#C9A84C", letterSpacing: "-0.02em", fontWeight: 600 }}><AnimatedNumber value={result.fv} prefix="$" decimals={2} /></div>
              <div style={{ marginTop: 10, display: "flex", justifyContent: "center", gap: 20 }}><span style={{ color: "#10B981", fontSize: 15, fontWeight: 500 }}>+<AnimatedNumber value={result.gain} prefix="$" decimals={2} /></span><span style={{ color: "#10B981", fontSize: 15, fontWeight: 500 }}>+{result.gainPct}%</span></div>
            </div>
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "#6B7280", marginBottom: 10 }}>Growth Projection</div>
              <GrowthChart principal={result.principal} rate={result.rate} years={result.years} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}><span style={{ fontSize: 11, color: "#6B7280" }}>Year 0 · {formatCurrencyDisplay(result.principal)}</span><span style={{ fontSize: 11, color: "#6B7280" }}>Year {result.years} · {formatCurrencyDisplay(result.fv)}</span></div>
            </div>
            <div style={{ background: "#ffffff", border: "1px solid #E5E7EB", borderRadius: 10, padding: "16px 20px", fontSize: 13, color: "#4B5563", lineHeight: 1.8 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "#6B7280", marginBottom: 6 }}>Formula Applied</div>
              <div><em style={{ color: "#C9A84C", fontWeight: 500 }}>FV = P × e^(rt)</em> where <span style={{ color: "#111111" }}>r = r_f + β × (r_m − r_f)</span></div>
              <div style={{ marginTop: 4, fontSize: 12 }}>r = {(RISK_FREE_RATE * 100).toFixed(2)}% + {fund.beta.toFixed(2)} × ({(fund.historicalReturn * 100).toFixed(2)}% − {(RISK_FREE_RATE * 100).toFixed(2)}%) = <strong style={{ color: "#C9A84C" }}>{(result.rate * 100).toFixed(3)}%</strong></div>
              <div style={{ marginTop: 4, fontSize: 12 }}>FV = ${result.principal.toLocaleString()} × e^({(result.rate * 100).toFixed(3)}% × {result.years}) = <strong style={{ color: "#C9A84C" }}>${result.fv.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
            </div>
          </div>
        )}
        </div>
      </form>
    </div>
  );
}

export default function Calculator() {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <MutualFundCalculator />
    </div>
  );
}
