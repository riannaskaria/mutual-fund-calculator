import { useState, useEffect } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useT } from '../theme';
import { fetchYahooPriceHistory } from '../api/mutualFundApi';

const TABS = ['Price Chart', 'CAPM Calculator'];

const PRICE_RANGES = [
  { label: '1W', range: '7d',  interval: '1h' },
  { label: '1M', range: '1mo', interval: '1d' },
  { label: '1Y', range: '1y',  interval: '1d' },
];

function formatCurrency(value) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function fmtCap(v) {
  if (!v) return '—';
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6)  return `$${(v / 1e6).toFixed(2)}M`;
  return `$${v.toLocaleString()}`;
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
  const color = isUp ? '#22c55e' : '#ef4444';
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
            background: activeRange === r.label ? T.inputBg : 'transparent',
            border: `1px solid ${activeRange === r.label ? T.borderSub : T.border2}`,
            borderRadius: 6, padding: '4px 12px', fontSize: 11,
            color: activeRange === r.label ? '#22c55e' : T.textMute,
            cursor: 'pointer', fontWeight: activeRange === r.label ? 600 : 400,
            transition: 'all 0.15s',
          }}>{r.label}</button>
        ))}
      </div>

      <div style={{ flex: 1, minHeight: 180, position: 'relative' }}>
        {loading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.pageBg, zIndex: 1, borderRadius: 8 }}>
            <div style={{ width: 16, height: 16, border: '2px solid #1a2535', borderTopColor: '#22c55e', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
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

export default function ChartPanel({ ticker, quote, investmentAmount, years, futureValue, calculating, onCalculate, setInvestmentAmount, setYears }) {
  const T = useT();
  const [activeTab, setActiveTab] = useState('Price Chart');
  const principal = parseFloat(investmentAmount) || 10000;
  const yearsNum = parseFloat(years) || 10;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: T.pageBg }}>
      <div style={{ padding: '0 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', flexShrink: 0, background: T.panelBg }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            background: 'none', border: 'none',
            borderBottom: activeTab === tab ? '2px solid #22c55e' : '2px solid transparent',
            padding: '10px 16px', fontSize: 12,
            fontWeight: activeTab === tab ? 600 : 400,
            color: activeTab === tab ? T.text : T.textMute,
            cursor: 'pointer', transition: 'all 0.15s',
          }}>{tab}</button>
        ))}
      </div>

      <div style={{ flex: 1, padding: 16, overflow: 'auto' }}>
        {activeTab === 'Price Chart' && <PriceChart ticker={ticker} quote={quote} />}

        {activeTab === 'CAPM Calculator' && (() => {
          const rf = (futureValue?.riskFreeRate ?? 0.0425) * 100;
          const rm = (futureValue?.expectedReturnRate ?? 0) * 100;
          const b  = futureValue?.beta ?? 0;
          const r  = (futureValue?.capmRate ?? 0) * 100;
          const fv = futureValue?.futureValue ?? futureValue?.value ?? 0;

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
              {/* Inputs */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexShrink: 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 10, color: T.textMute, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Investment ($)</label>
                  <input type="number" value={investmentAmount} onChange={e => setInvestmentAmount(e.target.value)}
                    placeholder="10000" min={1} step={0.01}
                    style={{ background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: 8, padding: '10px 14px', fontSize: 14, color: T.text, outline: 'none', width: 160, fontFamily: 'inherit', transition: 'border-color 0.15s' }}
                    onFocus={e => e.target.style.borderColor = '#3b82f6'}
                    onBlur={e => e.target.style.borderColor = T.border}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 10, color: T.textMute, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Years</label>
                  <input type="number" value={years} onChange={e => setYears(e.target.value)}
                    placeholder="10" min={1} max={50} step={1}
                    style={{ background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: 8, padding: '10px 14px', fontSize: 14, color: T.text, outline: 'none', width: 100, fontFamily: 'inherit', transition: 'border-color 0.15s' }}
                    onFocus={e => e.target.style.borderColor = '#3b82f6'}
                    onBlur={e => e.target.style.borderColor = T.border}
                  />
                </div>
                <button onClick={onCalculate} disabled={calculating} style={{
                  background: calculating ? T.inputBg : '#1d4ed8',
                  color: calculating ? T.textMute : '#ffffff',
                  border: `1px solid ${calculating ? T.border : '#2563eb'}`,
                  borderRadius: 8, padding: '10px 24px',
                  fontSize: 13, fontWeight: 600, cursor: calculating ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'all 0.15s', letterSpacing: '0.02em',
                }}>
                  {calculating && <div style={{ width: 11, height: 11, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />}
                  {calculating ? 'Calculating…' : 'Calculate'}
                </button>
              </div>

              {/* Equation */}
              <div style={{ flex: 1, background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 10, padding: '28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: 16, textAlign: 'center' }}>
                  <div dangerouslySetInnerHTML={{ __html: katex.renderToString(
                    futureValue
                      ? `FV = \\underbrace{\\$${principal.toLocaleString()}}_{P} \\cdot e^{\\Bigl(\\underbrace{${rf.toFixed(2)}\\%}_{r_f}\\; +\\; \\underbrace{${b.toFixed(4)}}_{\\beta}(\\underbrace{${rm.toFixed(2)}\\%}_{R_m} - \\underbrace{${rf.toFixed(2)}\\%}_{r_f})\\Bigr)\\,\\cdot\\,\\underbrace{${yearsNum}}_{t}} = \\boldsymbol{\\$${fv.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}}`
                      : `FV = P \\cdot e^{\\,\\bigl(r_f + \\beta(R_m - r_f)\\bigr)\\,\\cdot\\, t}`,
                    { throwOnError: false, displayMode: true }
                  )}} />
                </div>
              </div>

              {/* Legend */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px 20px', flexShrink: 0 }}>
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
          );
        })()}
      </div>
    </div>
  );
}
