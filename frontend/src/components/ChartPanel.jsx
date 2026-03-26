import { useState, useEffect, useMemo, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import {
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useT } from '../theme';
import { fetchYahooPriceHistory } from '../api/mutualFundApi';
import { getFundInformationRows } from '../data/fundInformation';

const TABS = ['Price Chart', 'CAPM Calculator', 'Information'];

const PRICE_RANGES = [
  { label: '1W', range: '7d',  interval: '1h' },
  { label: '1M', range: '1mo', interval: '1d' },
  { label: '3M', range: '3mo', interval: '1d' },
  { label: '1Y', range: '1y',  interval: '1d' },
];

function fmtMoney(v) {
  if (v == null) return '—';
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}

// Full precision — always shows cents, no abbreviation
function fmtMoneyFull(v) {
  if (v == null) return '—';
  return v.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}


function PriceChart({ ticker, quote }) {
  const T = useT();
  const [activeRange, setActiveRange] = useState('1M');
  const [chartData, setChartData] = useState({ data: [], prevClose: null });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ticker) return;
    const cfg = PRICE_RANGES.find(r => r.label === activeRange);
    setChartData({ data: [], prevClose: null });
    setLoading(true);
    fetchYahooPriceHistory(ticker, cfg.range, cfg.interval)
      .then(setChartData)
      .catch(err => console.warn('Price history fetch failed:', err))
      .finally(() => setLoading(false));
  }, [ticker, activeRange]);

  const { data, prevClose } = chartData;
  const lastPrice = data[data.length - 1]?.value;
  const isUp = lastPrice != null && prevClose != null ? lastPrice >= prevClose : true;
  const color = isUp ? T.positive : T.negative;
  const gradientId = `pg_${ticker}`;

  const formatXAxis = (time) => {
    const d = new Date(time);
    if (activeRange === '1W') return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    if (activeRange === '1M') return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  const vals = data.map(d => d.value);
  const minVal = Math.min(...vals, prevClose ?? Infinity);
  const maxVal = Math.max(...vals, prevClose ?? -Infinity);
  const pad = (maxVal - minVal) * 0.1 || 1;
  const domain = [minVal - pad, maxVal + pad];

  const footerStats = [
    { label: '52W High *', value: quote?.fiftyTwoWeekHigh?.toFixed(2) || '—' },
    { label: '52W Low *',  value: quote?.fiftyTwoWeekLow?.toFixed(2)  || '—' },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {PRICE_RANGES.map(r => (
          <button key={r.label} onClick={() => setActiveRange(r.label)} style={{
            background: activeRange === r.label ? T.accent : 'transparent',
            border: 'none',
            borderRadius: 9999, padding: '4px 14px', fontSize: 11,
            color: activeRange === r.label ? '#fff' : T.textMute,
            cursor: 'pointer', fontWeight: activeRange === r.label ? 600 : 400,
            transition: 'all 0.18s',
          }}>{r.label}</button>
        ))}
      </div>

      <div style={{ flex: 1, minHeight: 180, position: 'relative' }}>
        {loading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.pageBg, zIndex: 1, borderRadius: 8 }}>
            <div style={{ width: 16, height: 16, border: `2px solid ${T.spinnerTrack}`, borderTopColor: T.spinnerAccent, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={color} stopOpacity={0.2} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
            <XAxis dataKey="time" tickFormatter={formatXAxis} tick={{ fontSize: 10, fill: T.textMute }} axisLine={false} tickLine={false} minTickGap={60} />
            <YAxis domain={domain} tick={{ fontSize: 10, fill: T.textMute }} tickFormatter={v => v.toFixed(0)} axisLine={false} tickLine={false} width={55} />
            <Tooltip content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div style={{ background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ fontSize: 10, color: T.textSub, marginBottom: 3 }}>
                    {new Date(label).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color }}>${payload[0].value?.toFixed(2)}</div>
                </div>
              );
            }} />
            {prevClose != null && (
              <ReferenceLine y={prevClose} stroke={T.textMute} strokeDasharray="4 4"
                label={{ value: `Prev Close ${prevClose.toFixed(2)}`, position: 'insideTopRight', fontSize: 9, fill: T.textMute }} />
            )}
            <Area type="monotone" dataKey="value" stroke={color} strokeWidth={1.5}
              fill={`url(#${gradientId})`} dot={false}
              activeDot={{ r: 3, fill: color, strokeWidth: 0 }} connectNulls={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, borderTop: `1px solid ${T.border}`, paddingTop: 10 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {footerStats.map(s => (
            <div key={s.label} style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 6, padding: '7px 14px' }}>
              <div style={{ fontSize: 9, color: T.textMute, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{s.label}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{s.value}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 9, color: T.textMute, letterSpacing: '0.02em' }}>
          * Price data sourced from Yahoo Finance (end-of-day NAV). Beta sourced from Newton Analytics API.
        </div>
      </div>
    </div>
  );
}

function CAPMCalculator({ ticker, investmentAmount, years, futureValue, calculating, onCalculate, setInvestmentAmount, setYears, calcHistory }) {
  const T = useT();
  const [showFormula, setShowFormula] = useState(false);
  const onCalculateRef = useRef(onCalculate);
  useEffect(() => { onCalculateRef.current = onCalculate; }, [onCalculate]);

  const principal = parseFloat(investmentAmount) || 10000;
  const yearsNum = parseFloat(years) || 10;

  // Auto-recalculate on input change with debounce
  useEffect(() => {
    const amount = parseFloat(investmentAmount);
    const y = parseFloat(years);
    if (!amount || !y || amount <= 0 || y <= 0) return;
    const t = setTimeout(() => onCalculateRef.current(), 600);
    return () => clearTimeout(t);
  }, [investmentAmount, years, ticker]);

  // Build quarterly chart data
  const chartData = useMemo(() => {
    if (!futureValue || !ticker) return [];
    const rate = futureValue.capmRate ?? 0.08;
    const points = [];
    for (let i = 0; i <= Math.ceil(yearsNum) * 4; i++) {
      const t = i / 4;
      if (t > yearsNum + 0.01) break;
      points.push({
        quarter: t,
        value: Math.round(principal * Math.exp(rate * t) * 100) / 100,
      });
    }
    return points;
  }, [futureValue, principal, yearsNum, ticker]);

  const fv = futureValue?.futureValue ?? futureValue?.value ?? null;
  const rf = (futureValue?.riskFreeRate ?? 0.0425) * 100;
  const rm = (futureValue?.expectedReturnRate ?? 0) * 100;
  const beta = futureValue?.beta ?? 0;
  const rate = (futureValue?.capmRate ?? 0) * 100;
  const gain = fv != null ? fv - principal : null;
  const gainPct = gain != null && principal > 0 ? (gain / principal) * 100 : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
      {/* Inputs row */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexShrink: 0, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 10, color: T.textMute, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Investment ($)</label>
          <input type="number" value={investmentAmount} onChange={e => setInvestmentAmount(e.target.value)}
            placeholder="10000" min={1} step={1}
            style={{ background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: 8, padding: '9px 14px', fontSize: 14, color: T.text, outline: 'none', width: 148, fontFamily: 'inherit', transition: 'border-color 0.15s' }}
            onFocus={e => e.target.style.borderColor = T.focusRing}
            onBlur={e => e.target.style.borderColor = T.border}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 10, color: T.textMute, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Years</label>
          <input type="number" value={years} onChange={e => setYears(e.target.value)}
            placeholder="10" min={1} max={50} step={1}
            style={{ background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: 8, padding: '9px 14px', fontSize: 14, color: T.text, outline: 'none', width: 90, fontFamily: 'inherit', transition: 'border-color 0.15s' }}
            onFocus={e => e.target.style.borderColor = T.focusRing}
            onBlur={e => e.target.style.borderColor = T.border}
          />
        </div>
        <button onClick={onCalculate} disabled={calculating} style={{
          background: calculating ? T.inputBg : T.accent,
          color: calculating ? T.textMute : '#ffffff',
          border: `1px solid ${calculating ? T.border : T.accent}`,
          borderRadius: 8, padding: '9px 22px',
          fontSize: 13, fontWeight: 600, cursor: calculating ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', gap: 8,
          transition: 'all 0.15s', letterSpacing: '0.02em',
        }}>
          {calculating && <div style={{ width: 11, height: 11, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />}
          {calculating ? 'Calculating…' : 'Calculate'}
        </button>
        <button onClick={() => setShowFormula(f => !f)} style={{
          background: showFormula ? T.inputBg : 'transparent',
          border: `1px solid ${T.border}`,
          borderRadius: 8, padding: '9px 14px',
          fontSize: 11, color: showFormula ? T.text : T.textMute, cursor: 'pointer',
          transition: 'all 0.15s',
        }}>
          {showFormula ? 'Hide Formula' : '∫ Formula'}
        </button>
      </div>

      {/* Collapsible formula */}
      {showFormula && (
        <div style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 10, padding: '18px 24px', flexShrink: 0 }}>
          <div style={{ fontSize: 14, textAlign: 'center' }}>
            <div dangerouslySetInnerHTML={{ __html: katex.renderToString(
              futureValue
                ? `FV = \\underbrace{\\$${principal.toLocaleString()}}_{P} \\cdot e^{\\Bigl(\\underbrace{${rf.toFixed(2)}\\%}_{r_f} + \\underbrace{${beta.toFixed(4)}}_{\\beta}(\\underbrace{${rm.toFixed(2)}\\%}_{R_m} - \\underbrace{${rf.toFixed(2)}\\%}_{r_f})\\Bigr) \\cdot \\underbrace{${yearsNum}}_{t}} = \\boldsymbol{\\$${fv?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}}`
                : `FV = P \\cdot e^{\\,\\bigl(r_f + \\beta(R_m - r_f)\\bigr)\\,\\cdot\\, t}`,
              { throwOnError: false, displayMode: true }
            )}} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px 20px', marginTop: 12 }}>
            {[
              { sym: 'r_f',    desc: 'Risk-free rate (10yr Treasury)' },
              { sym: 'R_m',    desc: 'Historical return (last year)'  },
              { sym: '\\beta', desc: 'Beta — sensitivity vs S&P 500'  },
              { sym: 'r',      desc: 'CAPM rate (expected return)'     },
              { sym: 'P',      desc: 'Principal investment'            },
              { sym: 't',      desc: 'Time horizon in years'           },
            ].map(item => (
              <div key={item.sym} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
                <span style={{ fontSize: 12, minWidth: 28 }} dangerouslySetInnerHTML={{ __html: katex.renderToString(item.sym, { throwOnError: false }) }} />
                <span style={{ fontSize: 10, color: T.textFaint }}>{item.desc}</span>
              </div>
            ))}
          </div>
          <style>{`
            .katex { font-size: 1em !important; color: ${T.text}; }
            .katex-display { margin: 0 !important; overflow: visible !important; }
          `}</style>
        </div>
      )}

      {/* Results */}
      {fv != null && chartData.length > 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
          {/* Hero projection card */}
          <div style={{
            flexShrink: 0,
            background: T.cardBg,
            border: `1px solid ${T.glassBorder || T.borderSub}`,
            borderRadius: 16,
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            boxShadow: T.glassShadow || 'none',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 20,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: T.textMute, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600, marginBottom: 6 }}>
                Projected after {yearsNum}yr
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 36, fontWeight: 700, color: T.accent, letterSpacing: '-0.03em', lineHeight: 1 }}>
                  {fmtMoneyFull(fv)}
                </span>
                {fv != null && principal > 0 && (
                  <span style={{
                    fontSize: 13, fontWeight: 700,
                    color: T.accent,
                    background: `rgba(24,106,222,0.10)`,
                    border: `1px solid rgba(24,106,222,0.22)`,
                    borderRadius: 20, padding: '2px 9px',
                  }}>
                    {(fv / principal).toFixed(2)}×
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 18, flexShrink: 0 }}>
              {gain != null && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 9, color: T.textMute, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Total Gain</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: gain >= 0 ? T.positive : T.negative }}>
                    +{fmtMoney(gain)}
                  </div>
                  <div style={{ fontSize: 11, color: T.textMute }}>{gainPct?.toFixed(2)}%</div>
                </div>
              )}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 9, color: T.textMute, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Annual Rate</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{rate.toFixed(2)}%</div>
                <div style={{ fontSize: 11, color: T.textMute }}>β {beta.toFixed(3)}</div>
              </div>
            </div>
          </div>

          {/* Milestone pills */}
          {yearsNum >= 2 && (() => {
            const milestoneYears = yearsNum <= 5
              ? [1, Math.round(yearsNum / 2), yearsNum]
              : yearsNum <= 15
                ? [1, 5, Math.round(yearsNum / 2), yearsNum]
                : [1, 5, 10, yearsNum];
            const r = futureValue.capmRate ?? 0.08;
            return (
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                {[...new Set(milestoneYears)].map(y => (
                  <div key={y} style={{
                    flex: 1, background: T.cardBg, border: `1px solid ${T.border}`,
                    borderRadius: 12, padding: '7px 10px', textAlign: 'center',
                    backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                  }}>
                    <div style={{ fontSize: 9, color: T.textMute, marginBottom: 3 }}>Year {y}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: y === yearsNum ? T.accent : T.text }}>
                      {fmtMoney(principal * Math.exp(r * y))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Growth chart */}
          <div style={{ flex: 1, minHeight: 130 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
                <defs>
                  <linearGradient id={`capm_${ticker}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={T.accent} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={T.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
                <XAxis
                  dataKey="quarter"
                  tickFormatter={v => Number.isInteger(v) ? `Y${v}` : ''}
                  tick={{ fontSize: 10, fill: T.textMute }}
                  axisLine={false} tickLine={false}
                  interval={3}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: T.textMute }}
                  tickFormatter={v => fmtMoney(v)}
                  axisLine={false} tickLine={false}
                  width={72}
                />
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div style={{ background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 12px' }}>
                      <div style={{ fontSize: 10, color: T.textSub, marginBottom: 3 }}>Year {d.quarter.toFixed(2)}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: T.accent }}>{fmtMoney(d.value)}</div>
                    </div>
                  );
                }} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={T.accent}
                  strokeWidth={2}
                  fill={`url(#capm_${ticker})`}
                  dot={(props) => {
                    const { cx, cy, payload } = props;
                    if (!Number.isInteger(payload.quarter) || payload.quarter === 0) return null;
                    return <circle key={payload.quarter} cx={cx} cy={cy} r={3} fill={T.accent} stroke={T.pageBg} strokeWidth={1.5} />;
                  }}
                  activeDot={{ r: 4, fill: T.accent, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* CAPM params */}
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {[
              { label: 'Beta', value: beta.toFixed(4) },
              { label: 'Risk-Free Rate', value: `${rf.toFixed(2)}%` },
              { label: 'Market Return', value: `${rm.toFixed(2)}%` },
              { label: 'CAPM Rate', value: `${rate.toFixed(2)}%` },
            ].map(s => (
              <div key={s.label} style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 12, padding: '7px 12px', flex: 1, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
                <div style={{ fontSize: 9, color: T.textMute, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      ) : !calculating && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={T.border} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <span style={{ fontSize: 12, color: T.textFaint }}>Enter an amount and years, then hit Calculate</span>
        </div>
      )}

      {/* Fund Comparison table */}
      {calcHistory.length > 1 && (
        <div style={{ flexShrink: 0, borderTop: `1px solid ${T.border}`, paddingTop: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: T.textMute, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
            Fund Comparison
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {calcHistory.map(h => {
              const isCurrent = h.ticker === ticker;
              const hFv = h.result?.futureValue ?? h.result?.value;
              const hRate = (h.result?.capmRate ?? 0) * 100;
              const hGainPct = hFv != null ? ((hFv - h.amount) / h.amount) * 100 : null;
              return (
                <div key={h.ticker} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px',
                  background: isCurrent ? T.cardBg : 'transparent',
                  border: `1px solid ${isCurrent ? T.borderSub : T.border2}`,
                  borderRadius: 6,
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: isCurrent ? T.accent : T.text, minWidth: 56 }}>{h.ticker}</span>
                  <span style={{ fontSize: 10, color: T.textMute, flex: 1 }}>
                    ${h.amount.toLocaleString()} × {h.years}yr
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: T.text, minWidth: 78, textAlign: 'right' }}>{fmtMoney(hFv)}</span>
                  <span style={{ fontSize: 10, color: T.positive, minWidth: 52, textAlign: 'right' }}>+{hGainPct?.toFixed(1)}%</span>
                  <span style={{ fontSize: 10, color: T.textMute, minWidth: 44, textAlign: 'right' }}>{hRate.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function FundInformationTab({ ticker }) {
  const T = useT();
  const rows = getFundInformationRows(ticker);
  const byKey = Object.fromEntries(rows.map(r => [
    r.label, r
  ]));

  const quickKeys = ['Benchmark', 'Category', 'Expense Ratio', 'Inception'];
  const longKeys  = ['Investment Objective', 'Strategy & Approach', 'Risk Considerations', 'Notes'];

  const quickFacts = quickKeys.map(k => byKey[k]).filter(Boolean);
  const longItems  = longKeys.map(k => byKey[k]).filter(Boolean);
  const hasAny     = rows.some(r => !r.isPlaceholder);

  if (!hasAny) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', gap: 10, textAlign: 'center' }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={T.border} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.textMute }}>No fund data for {ticker}</div>
        <div style={{ fontSize: 11, color: T.textFaint, maxWidth: 340, lineHeight: 1.6 }}>
          Add an entry for <code style={{ fontSize: 10, background: T.inputBg, padding: '1px 5px', borderRadius: 3 }}>{ticker}</code> in{' '}
          <code style={{ fontSize: 10, background: T.inputBg, padding: '1px 5px', borderRadius: 3 }}>src/data/fundInformation.js</code> to populate this tab.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 760 }}>
      {/* Quick facts grid */}
      {quickFacts.some(f => !f.isPlaceholder) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {quickFacts.map(({ label, value, isPlaceholder }) => (
            <div key={label} style={{
              background: T.cardBg,
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              padding: '10px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}>
              <span style={{ fontSize: 9, color: T.textMute, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>{label}</span>
              <span style={{
                fontSize: 13, fontWeight: 600,
                color: isPlaceholder ? T.textFaint : T.text,
                fontStyle: isPlaceholder ? 'italic' : 'normal',
              }}>
                {isPlaceholder ? '—' : value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Long-form sections */}
      {longItems.filter(f => !f.isPlaceholder).map(({ label, value }) => (
        <div key={label} style={{
          background: T.cardBg,
          border: `1px solid ${T.border}`,
          borderRadius: 8,
          padding: '14px 16px',
        }}>
          <div style={{
            fontSize: 10, color: T.accent,
            textTransform: 'uppercase', letterSpacing: '0.07em',
            fontWeight: 700, marginBottom: 8,
          }}>{label}</div>
          <div style={{ fontSize: 13, color: T.text, lineHeight: 1.65 }}>{value}</div>
        </div>
      ))}

      <div style={{ fontSize: 9, color: T.textFaint, lineHeight: 1.5 }}>
        Data is editorial and for reference only. Markets and prospectus details change — verify material facts independently before investing.
      </div>
    </div>
  );
}

export default function ChartPanel({ ticker, quote, investmentAmount, years, futureValue, calculating, onCalculate, setInvestmentAmount, setYears, calcHistory }) {
  const T = useT();
  const [activeTab, setActiveTab] = useState('Price Chart');

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: T.pageBg }}>
      <div style={{
        padding: '8px 14px', borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
        background: T.panelBg,
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            background: activeTab === tab ? T.accent : 'transparent',
            border: activeTab === tab ? 'none' : `1px solid transparent`,
            borderRadius: 9999,
            padding: '5px 16px', fontSize: 12,
            fontWeight: activeTab === tab ? 600 : 400,
            color: activeTab === tab ? '#fff' : T.textMute,
            cursor: 'pointer', transition: 'all 0.18s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => { if (activeTab !== tab) e.currentTarget.style.background = T.hover; }}
          onMouseLeave={e => { if (activeTab !== tab) e.currentTarget.style.background = 'transparent'; }}
          >{tab}</button>
        ))}
      </div>

      <div style={{ flex: 1, padding: 16, overflow: 'auto' }}>
        {activeTab === 'Price Chart' && <PriceChart ticker={ticker} quote={quote} />}
        {activeTab === 'CAPM Calculator' && (
          <CAPMCalculator
            ticker={ticker}
            investmentAmount={investmentAmount}
            years={years}
            futureValue={futureValue}
            calculating={calculating}
            onCalculate={onCalculate}
            setInvestmentAmount={setInvestmentAmount}
            setYears={setYears}
            calcHistory={calcHistory}
          />
        )}
        {activeTab === 'Information' && <FundInformationTab ticker={ticker} />}
      </div>
    </div>
  );
}
