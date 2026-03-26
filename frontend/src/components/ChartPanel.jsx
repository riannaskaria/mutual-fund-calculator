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
  const [monthlyContrib, setMonthlyContrib] = useState('');
  const [inflationRate, setInflationRate] = useState('2.5');
  const [showInflation, setShowInflation] = useState(false);
  const onCalculateRef = useRef(onCalculate);
  useEffect(() => { onCalculateRef.current = onCalculate; }, [onCalculate]);

  const principal = parseFloat(investmentAmount) || 10000;
  const yearsNum = parseFloat(years) || 10;
  const monthly = parseFloat(monthlyContrib) || 0;

  // Auto-recalculate on input change
  useEffect(() => {
    const amount = parseFloat(investmentAmount);
    const y = parseFloat(years);
    if (!amount || !y || amount <= 0 || y <= 0) return;
    const t = setTimeout(() => onCalculateRef.current(), 600);
    return () => clearTimeout(t);
  }, [investmentAmount, years, ticker]);

  // ── derived values ──
  const fv = futureValue?.futureValue ?? futureValue?.value ?? null;
  const rf = (futureValue?.riskFreeRate ?? 0.0425) * 100;
  const rm = (futureValue?.expectedReturnRate ?? 0) * 100;
  const beta = futureValue?.beta ?? 0;
  const rate = (futureValue?.capmRate ?? 0) * 100;
  const rawRate = futureValue?.capmRate ?? 0;
  const mRate = rawRate / 12;
  const months = yearsNum * 12;

  // SIP (monthly contribution) future value using discrete compounding
  const fvSip = monthly > 0 && mRate > 0
    ? monthly * ((Math.pow(1 + mRate, months) - 1) / mRate)
    : 0;
  const totalFV = (fv ?? 0) + fvSip;
  const totalContributed = principal + monthly * months;
  const totalGain = totalFV > 0 ? totalFV - totalContributed : null;
  const totalGainPct = totalGain != null && totalContributed > 0 ? (totalGain / totalContributed) * 100 : null;

  // Inflation-adjusted (real) future value
  const inflation = parseFloat(inflationRate) / 100 || 0.025;
  const realFV = showInflation && totalFV > 0 ? totalFV / Math.pow(1 + inflation, yearsNum) : null;

  // Rule of 72 — approximate years to double
  const doubleYears = rawRate > 0 ? Math.round(72 / (rawRate * 100)) : null;

  // After-tax projected value (20% long-term capital gains)
  const LTCG_RATE = 0.20;
  const afterTaxFV = totalFV > 0 && totalGain != null && totalGain > 0
    ? principal + totalGain * (1 - LTCG_RATE) : null;

  // Alpha vs risk-free rate
  const alpha = rate - rf;

  // Milestone value helper (lump + SIP at year y)
  const milestoneVal = (y) => {
    const lump = principal * Math.exp(rawRate * y);
    const m = y * 12;
    const sip = monthly > 0 && mRate > 0 ? monthly * ((Math.pow(1 + mRate, m) - 1) / mRate) : 0;
    return lump + sip;
  };

  // Build quarterly chart data (lump + SIP combined)
  const chartData = useMemo(() => {
    if (!futureValue || !ticker) return [];
    const r = futureValue.capmRate ?? 0.08;
    const mr = r / 12;
    const m = parseFloat(monthlyContrib) || 0;
    const points = [];
    for (let i = 0; i <= Math.ceil(yearsNum) * 4; i++) {
      const t = i / 4;
      if (t > yearsNum + 0.01) break;
      const lump = principal * Math.exp(r * t);
      const sipM = t * 12;
      const sip = m > 0 && mr > 0 ? m * ((Math.pow(1 + mr, sipM) - 1) / mr) : 0;
      points.push({ quarter: t, value: Math.round((lump + sip) * 100) / 100 });
    }
    return points;
  }, [futureValue, principal, yearsNum, ticker, monthlyContrib]);

  const pillInput = { background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: 9999, padding: '9px 16px', fontSize: 13, color: T.text, outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.15s' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      {/* ── Inputs row 1: principal + years + calculate + formula ── */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 10, color: T.textMute, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, paddingLeft: 4 }}>Investment ($)</label>
          <input type="number" value={investmentAmount} onChange={e => setInvestmentAmount(e.target.value)}
            placeholder="10000" min={1} step={1} style={{ ...pillInput, width: 140 }}
            onFocus={e => e.target.style.borderColor = T.focusRing}
            onBlur={e => e.target.style.borderColor = T.border}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 10, color: T.textMute, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, paddingLeft: 4 }}>Years</label>
          <input type="number" value={years} onChange={e => setYears(e.target.value)}
            placeholder="10" min={1} max={50} step={1} style={{ ...pillInput, width: 80 }}
            onFocus={e => e.target.style.borderColor = T.focusRing}
            onBlur={e => e.target.style.borderColor = T.border}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 10, color: T.textMute, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, paddingLeft: 4 }}>Monthly SIP ($)</label>
          <input type="number" value={monthlyContrib} onChange={e => setMonthlyContrib(e.target.value)}
            placeholder="0" min={0} step={10} style={{ ...pillInput, width: 110 }}
            onFocus={e => e.target.style.borderColor = T.focusRing}
            onBlur={e => e.target.style.borderColor = T.border}
          />
        </div>
        <button onClick={onCalculate} disabled={calculating} style={{
          background: calculating ? T.inputBg : T.accent,
          color: calculating ? T.textMute : '#ffffff',
          border: `1px solid ${calculating ? T.border : T.accent}`,
          borderRadius: 9999, padding: '9px 22px',
          fontSize: 13, fontWeight: 600, cursor: calculating ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s',
        }}>
          {calculating && <div style={{ width: 11, height: 11, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />}
          {calculating ? 'Calculating…' : 'Calculate'}
        </button>
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
          {/* Inflation toggle */}
          <button onClick={() => setShowInflation(v => !v)} title={showInflation ? 'Showing inflation-adjusted (real) value' : 'Adjust for inflation'} style={{
            background: showInflation ? `${T.accent}18` : 'transparent',
            border: `1px solid ${showInflation ? T.accent : T.border}`,
            borderRadius: 9999, padding: '8px 12px',
            fontSize: 11, fontWeight: showInflation ? 600 : 400,
            color: showInflation ? T.accent : T.textMute, cursor: 'pointer', transition: 'all 0.15s',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1,4 5,10 9,7 15,12" />
              <line x1="11" y1="12" x2="15" y2="12" />
              <line x1="15" y1="9" x2="15" y2="12" />
            </svg>
            {showInflation ? 'Real' : 'Adj.'}
          </button>
          <button onClick={() => setShowFormula(f => !f)} style={{
            background: showFormula ? T.inputBg : 'transparent',
            border: `1px solid ${T.border}`, borderRadius: 9999, padding: '9px 14px',
            fontSize: 11, color: showFormula ? T.text : T.textMute, cursor: 'pointer', transition: 'all 0.15s',
          }}>
            {showFormula ? 'Hide' : '∫ Formula'}
          </button>
        </div>
      </div>

      {/* Inflation rate input (shown when inflation is toggled) */}
      {showInflation && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 14, padding: '10px 16px', flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: T.textMute }}>Expected annual inflation:</span>
          <input type="number" value={inflationRate} onChange={e => setInflationRate(e.target.value)}
            min={0} max={20} step={0.1} style={{ ...pillInput, width: 70, padding: '5px 12px', fontSize: 12 }}
            onFocus={e => e.target.style.borderColor = T.focusRing}
            onBlur={e => e.target.style.borderColor = T.border}
          />
          <span style={{ fontSize: 11, color: T.textMute }}>%</span>
          <span style={{ fontSize: 11, color: T.textFaint, marginLeft: 4 }}>
            Real purchasing power of your projected value in today's dollars.
          </span>
        </div>
      )}

      {/* Collapsible formula */}
      {showFormula && (
        <div style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 14, padding: '14px 20px', flexShrink: 0 }}>
          <div style={{ textAlign: 'center', marginBottom: futureValue ? 10 : 0 }}
            dangerouslySetInnerHTML={{ __html: katex.renderToString(
              `FV = P \\cdot e^{\\,\\left(r_f + \\beta(R_m - r_f)\\right)\\cdot t}`,
              { throwOnError: false, displayMode: true }
            )}}
          />
          {futureValue && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
              {[
                { sym: `r_f = ${rf.toFixed(2)}\\%`,    label: 'Risk-Free' },
                { sym: `\\beta = ${beta.toFixed(3)}`,   label: 'Beta'      },
                { sym: `R_m = ${rm.toFixed(2)}\\%`,     label: 'Mkt Ret.'  },
                { sym: `r = ${rate.toFixed(2)}\\%`,     label: 'CAPM'      },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <span dangerouslySetInnerHTML={{ __html: katex.renderToString(item.sym, { throwOnError: false }) }} />
                  <span style={{ fontSize: 9, color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.label}</span>
                </div>
              ))}
            </div>
          )}
          <style>{`
            .katex { font-size: 0.95em !important; color: ${T.text}; }
            .katex-display { margin: 0 !important; overflow: visible !important; }
          `}</style>
        </div>
      )}

      {/* ── Results ── */}
      {fv != null && chartData.length > 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
          {/* Hero projection card */}
          <div style={{
            flexShrink: 0, background: T.cardBg,
            border: `1px solid ${T.glassBorder || T.borderSub}`,
            borderRadius: 20, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            boxShadow: T.glassShadow || 'none', padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: 20,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: T.textMute, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600, marginBottom: 6 }}>
                Projected after {yearsNum}yr{monthly > 0 ? ` · +$${monthly.toLocaleString()}/mo SIP` : ''}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 36, fontWeight: 700, color: T.accent, letterSpacing: '-0.03em', lineHeight: 1 }}>
                  {fmtMoneyFull(totalFV)}
                </span>
                {totalContributed > 0 && (
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.accent, background: `${T.accent}18`, border: `1px solid ${T.accent}30`, borderRadius: 20, padding: '2px 10px' }}>
                    {(totalFV / totalContributed).toFixed(2)}×
                  </span>
                )}
              </div>
              {realFV != null && (
                <div style={{ marginTop: 5, fontSize: 12, color: T.textMute }}>
                  Real value (today's $): <span style={{ fontWeight: 700, color: T.text }}>{fmtMoneyFull(realFV)}</span>
                  <span style={{ fontSize: 10, color: T.textFaint, marginLeft: 6 }}>at {inflationRate}% inflation</span>
                </div>
              )}
              {afterTaxFV != null && (
                <div style={{ marginTop: 4, fontSize: 11, color: T.textFaint }}>
                  After-tax: <span style={{ fontWeight: 600, color: T.textMute }}>{fmtMoneyFull(afterTaxFV)}</span>
                  <span style={{ fontSize: 9, marginLeft: 5 }}>20% LTCG applied to gains</span>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 18, flexShrink: 0 }}>
              {totalGain != null && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 9, color: T.textMute, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Total Gain</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: totalGain >= 0 ? T.positive : T.negative }}>
                    +{fmtMoney(totalGain)}
                  </div>
                  <div style={{ fontSize: 11, color: T.textMute }}>{totalGainPct?.toFixed(1)}%</div>
                </div>
              )}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 9, color: T.textMute, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>CAPM Rate</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{rate.toFixed(2)}%</div>
                {doubleYears && <div style={{ fontSize: 10, color: T.textFaint }}>2× in ~{doubleYears}yr</div>}
              </div>
            </div>
          </div>

          {/* Milestone pills */}
          {yearsNum >= 2 && (() => {
            const milestoneYears = yearsNum <= 5 ? [1, Math.round(yearsNum / 2), yearsNum]
              : yearsNum <= 15 ? [1, 5, Math.round(yearsNum / 2), yearsNum] : [1, 5, 10, yearsNum];
            return (
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                {[...new Set(milestoneYears)].map(y => (
                  <div key={y} style={{
                    flex: 1, background: T.cardBg, border: `1px solid ${T.border}`,
                    borderRadius: 16, padding: '8px 10px', textAlign: 'center',
                    backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                  }}>
                    <div style={{ fontSize: 9, color: T.textMute, marginBottom: 3 }}>Year {y}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: y === yearsNum ? T.accent : T.text }}>
                      {fmtMoney(milestoneVal(y))}
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
                <XAxis dataKey="quarter" tickFormatter={v => Number.isInteger(v) ? `Y${v}` : ''} tick={{ fontSize: 10, fill: T.textMute }} axisLine={false} tickLine={false} interval={3} />
                <YAxis tick={{ fontSize: 10, fill: T.textMute }} tickFormatter={v => fmtMoney(v)} axisLine={false} tickLine={false} width={72} />
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div style={{ background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: 12, padding: '8px 12px' }}>
                      <div style={{ fontSize: 10, color: T.textSub, marginBottom: 3 }}>Year {d.quarter.toFixed(2)}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: T.accent }}>{fmtMoney(d.value)}</div>
                    </div>
                  );
                }} />
                <Area type="monotone" dataKey="value" stroke={T.accent} strokeWidth={2}
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
              { label: 'Beta', value: beta.toFixed(3) },
              { label: 'Risk-Free Rate', value: `${rf.toFixed(2)}%` },
              { label: 'Alpha vs Rf', value: `${alpha >= 0 ? '+' : ''}${alpha.toFixed(2)}%`, accent: alpha >= 0 },
              { label: 'CAPM Rate', value: `${rate.toFixed(2)}%` },
            ].map(s => (
              <div key={s.label} style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 14, padding: '8px 12px', flex: 1, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
                <div style={{ fontSize: 9, color: T.textMute, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: s.accent != null ? (s.accent ? T.positive : T.negative) : T.text }}>{s.value}</div>
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
                  display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px',
                  background: isCurrent ? T.cardBg : 'transparent',
                  border: `1px solid ${isCurrent ? T.borderSub : T.border2}`,
                  borderRadius: 10,
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: isCurrent ? T.accent : T.text, minWidth: 56 }}>{h.ticker}</span>
                  <span style={{ fontSize: 10, color: T.textMute, flex: 1 }}>${h.amount.toLocaleString()} × {h.years}yr</span>
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
        display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0,
        background: T.panelBg,
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      }}>
        {TABS.map((tab, i) => (
          <div key={tab} style={{ display: 'flex', alignItems: 'center' }}>
            {i > 0 && (
              <span style={{ width: 1, height: 14, background: T.border, opacity: 0.6, flexShrink: 0, margin: '0 6px' }} />
            )}
            <button onClick={() => setActiveTab(tab)} style={{
              background: activeTab === tab ? T.accent : 'transparent',
              border: activeTab === tab ? 'none' : `1px solid transparent`,
              borderRadius: 9999,
              padding: '5px 18px', fontSize: 12,
              fontWeight: activeTab === tab ? 600 : 400,
              color: activeTab === tab ? '#fff' : T.textMute,
              cursor: 'pointer', transition: 'all 0.18s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { if (activeTab !== tab) e.currentTarget.style.background = T.hover; }}
            onMouseLeave={e => { if (activeTab !== tab) e.currentTarget.style.background = 'transparent'; }}
            >{tab}</button>
          </div>
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
