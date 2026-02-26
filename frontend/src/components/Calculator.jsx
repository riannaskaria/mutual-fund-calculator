import { useState, useEffect, useRef } from "react";

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

export default function MutualFundCalculator() {
  const [fund, setFund] = useState(FUNDS[0]);
  const [principal, setPrincipal] = useState(10000);
  const [principalInput, setPrincipalInput] = useState("10000");
  const [years, setYears] = useState(10);
  const [result, setResult] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const rate = RISK_FREE_RATE + fund.beta * (fund.historicalReturn - RISK_FREE_RATE);

  const handleCalculate = () => {
    const fv = calcFV(principal, rate, years);
    setResult({ fv, gain: fv - principal, gainPct: ((fv - principal) / principal * 100).toFixed(2), rate, principal, years });
  };

  const handlePrincipalChange = (e) => {
    const raw = e.target.value.replace(/[^0-9.]/g, "");
    setPrincipalInput(raw);
    const val = parseFloat(raw);
    if (!isNaN(val) && val > 0) setPrincipal(val);
  };

  const inp = {
    width: "100%", boxSizing: "border-box", background: "#ffffff",
    border: "1px solid #D1D5DB", borderRadius: 10, padding: "14px 18px",
    color: "#111111", fontSize: 18, fontFamily: "'Inter', sans-serif", outline: "none",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#ffffff", fontFamily: "'Inter', sans-serif", color: "#111111", display: "flex", flexDirection: "column", alignItems: "center", padding: "0" }}>
      {/* Header */}
      <div style={{ width: "100%", maxWidth: 760, marginBottom: 44, marginTop: 44 }}>
      </div>

      {/* Card */}
      <div style={{ width: "100%", maxWidth: 760, background: "#ffffff", border: "1px solid #E5E7EB", borderRadius: 16, overflow: "hidden", boxShadow: "0 28px 80px rgba(0,0,0,0.1)" }}>
        <div style={{ height: 3, background: "linear-gradient(90deg,#6B4F10,#C9A84C,#6B4F10)" }} />

        <div style={{ padding: "36px 40px" }}>
          {/* Fund Selector */}
          <div style={{ marginBottom: 28 }}>
            <label style={{ display: "block", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#6B7280", marginBottom: 10 }}>Select Fund</label>
            <div style={{ position: "relative" }}>
              <button
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
                    <button
                      key={f.ticker}
                      onClick={() => { setFund(f); setDropdownOpen(false); setResult(null); }}
                      style={{ width: "100%", background: fund.ticker === f.ticker ? "#F3F4F6" : "transparent", border: "none", borderBottom: "1px solid #F3F4F6", padding: "12px 18px", color: "#111111", cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "background 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#F9FAFB"}
                      onMouseLeave={e => e.currentTarget.style.background = fund.ticker === f.ticker ? "#F3F4F6" : "transparent"}
                    >
                      <div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#C9A84C", marginRight: 8 }}>{f.ticker}</span>
                        <span style={{ fontSize: 14 }}>{f.name}</span>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                        <div style={{ fontSize: 13, color: "#10B981" }}>{(f.historicalReturn * 100).toFixed(2)}%</div>
                        <div style={{ fontSize: 10, color: "#6B7280" }}>Hist. Return</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fund stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginTop: 10 }}>
              {[
                { label: "Hist. Return", value: `${(fund.historicalReturn * 100).toFixed(2)}%`, color: "#10B981" },
                { label: "Beta (β)", value: fund.beta.toFixed(2), color: "#3B82F6" },
                { label: "Risk-Free (r_f)", value: `${(RISK_FREE_RATE * 100).toFixed(2)}%`, color: "#F59E0B" },
                { label: "CAPM Rate (r)", value: `${(rate * 100).toFixed(3)}%`, color: "#C9A84C" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 8, padding: "10px 14px" }}>
                  <div style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6B7280", marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 16, color, fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Principal & Duration */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
            <div>
              <label style={{ display: "block", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#6B7280", marginBottom: 10 }}>Initial Investment (P)</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#C9A84C", fontSize: 18 }}>$</span>
                <input type="text" value={principalInput} onChange={handlePrincipalChange} style={{ ...inp, paddingLeft: 28 }}
                  onFocus={e => e.target.style.borderColor = "#C9A84C"}
                  onBlur={e => e.target.style.borderColor = "#D1D5DB"} />
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                {[1000, 5000, 10000, 50000].map(v => (
                  <button key={v} onClick={() => { setPrincipal(v); setPrincipalInput(String(v)); setResult(null); }}
                    style={{ flex: 1, background: principal === v ? "#ECFDF5" : "#F9FAFB", border: `1px solid ${principal === v ? "#10B981" : "#E5E7EB"}`, borderRadius: 6, padding: "5px 0", color: principal === v ? "#10B981" : "#6B7280", fontSize: 11, cursor: "pointer", transition: "all 0.15s", fontWeight: principal === v ? 600 : 400 }}>
                    {v >= 1000 ? `$${v / 1000}K` : `$${v}`}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#6B7280", marginBottom: 10 }}>Duration (t)</label>
              <div style={{ background: "#ffffff", border: "1px solid #D1D5DB", borderRadius: 10, padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <button onClick={() => { setYears(y => Math.max(1, y - 1)); setResult(null); }}
                  style={{ background: "none", border: "1px solid #E5E7EB", borderRadius: 6, width: 34, height: 34, color: "#C9A84C", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>−</button>
                <div style={{ textAlign: "center" }}>
                  <span style={{ fontSize: 30, fontFamily: "'Inter', sans-serif", color: "#111111", fontWeight: 500 }}>{years}</span>
                  <span style={{ fontSize: 13, color: "#6B7280", marginLeft: 6 }}>{years === 1 ? "year" : "years"}</span>
                </div>
                <button onClick={() => { setYears(y => Math.min(40, y + 1)); setResult(null); }}
                  style={{ background: "none", border: "1px solid #E5E7EB", borderRadius: 6, width: 34, height: 34, color: "#C9A84C", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>+</button>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                {[5, 10, 20, 30].map(v => (
                  <button key={v} onClick={() => { setYears(v); setResult(null); }}
                    style={{ flex: 1, background: years === v ? "#EFF6FF" : "#F9FAFB", border: `1px solid ${years === v ? "#3B82F6" : "#E5E7EB"}`, borderRadius: 6, padding: "5px 0", color: years === v ? "#3B82F6" : "#6B7280", fontSize: 11, cursor: "pointer", transition: "all 0.15s", fontWeight: years === v ? 600 : 400 }}>
                    {v}yr
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* CTA */}
          <button onClick={handleCalculate}
            style={{ width: "100%", background: "linear-gradient(135deg,#7A5A10,#C9A84C,#7A5A10)", border: "none", borderRadius: 10, padding: "16px", color: "#ffffff", fontSize: 15, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer", fontFamily: "'Inter', sans-serif", boxShadow: "0 4px 24px rgba(201,168,76,0.28)", transition: "opacity 0.2s, transform 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "translateY(0)"; }}>
            Calculate Future Value
          </button>
        </div>

        {/* Results */}
        {result && (
          <div style={{ borderTop: "1px solid #E5E7EB", background: "#F9FAFB", padding: "36px 40px" }}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "#6B7280", marginBottom: 10 }}>Projected Future Value</div>
              <div style={{ fontSize: "clamp(40px,8vw,64px)", fontFamily: "'Inter', sans-serif", color: "#C9A84C", letterSpacing: "-0.02em", fontWeight: 600 }}>
                <AnimatedNumber value={result.fv} prefix="$" decimals={2} />
              </div>
              <div style={{ marginTop: 10, display: "flex", justifyContent: "center", gap: 20 }}>
                <span style={{ color: "#10B981", fontSize: 15, fontWeight: 500 }}>+<AnimatedNumber value={result.gain} prefix="$" decimals={2} /></span>
                <span style={{ color: "#10B981", fontSize: 15, fontWeight: 500 }}>+{result.gainPct}%</span>
              </div>
            </div>

            {/* Chart */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "#6B7280", marginBottom: 10 }}>Growth Projection</div>
              <GrowthChart principal={result.principal} rate={result.rate} years={result.years} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span style={{ fontSize: 11, color: "#6B7280" }}>Year 0 · {formatCurrency(result.principal)}</span>
                <span style={{ fontSize: 11, color: "#6B7280" }}>Year {result.years} · {formatCurrency(result.fv)}</span>
              </div>
            </div>

            {/* Breakdown */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
              {[
                { label: "Principal (P)", value: `$${result.principal.toLocaleString()}`, color: "#111111" },
                { label: "Net Gain", value: `$${result.gain.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: "#10B981" },
                { label: "Applied Rate (r)", value: `${(result.rate * 100).toFixed(3)}%`, color: "#C9A84C" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: "#ffffff", border: "1px solid #E5E7EB", borderRadius: 10, padding: "16px", textAlign: "center" }}>
                  <div style={{ fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: "#6B7280", marginBottom: 6 }}>{label}</div>
                  <div style={{ fontSize: 16, color, fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Formula */}
            <div style={{ background: "#ffffff", border: "1px solid #E5E7EB", borderRadius: 10, padding: "16px 20px", fontSize: 13, color: "#4B5563", lineHeight: 1.8 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "#6B7280", marginBottom: 6 }}>Formula Applied</div>
              <div><em style={{ color: "#C9A84C", fontWeight: 500 }}>FV = P × e^(rt)</em> where <span style={{ color: "#111111" }}>r = r_f + β × (r_m − r_f)</span></div>
              <div style={{ marginTop: 4, fontSize: 12 }}>
                r = {(RISK_FREE_RATE * 100).toFixed(2)}% + {fund.beta.toFixed(2)} × ({(fund.historicalReturn * 100).toFixed(2)}% − {(RISK_FREE_RATE * 100).toFixed(2)}%) = <strong style={{ color: "#C9A84C" }}>{(result.rate * 100).toFixed(3)}%</strong>
              </div>
              <div style={{ marginTop: 4, fontSize: 12 }}>
                FV = ${result.principal.toLocaleString()} × e^({(result.rate * 100).toFixed(3)}% × {result.years}) = <strong style={{ color: "#C9A84C" }}>${result.fv.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatCurrency(v) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(2)}K`;
  return `$${v.toFixed(2)}`;
}
