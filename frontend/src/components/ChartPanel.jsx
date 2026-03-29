import { useState, useEffect, useMemo, useRef } from 'react';
import {
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useT } from '../theme';
import { fetchYahooPriceHistory } from '../api/mutualFundApi';
import { getFundInformationRows } from '../data/fundInformation';

const TABS = ['Price Chart', 'CAPM Calculator', 'Information'];

const CONTRIB_FREQUENCIES = [
  { id: 'weekly', label: 'Weekly', periodsPerYear: 52, suffix: '/wk' },
  { id: 'monthly', label: 'Monthly', periodsPerYear: 12, suffix: '/mo' },
  { id: 'quarterly', label: 'Quarterly', periodsPerYear: 4, suffix: '/qtr' },
  { id: 'semiannual', label: 'Semiannual', periodsPerYear: 2, suffix: '/6mo' },
  { id: 'annual', label: 'Annual', periodsPerYear: 1, suffix: '/yr' },
];

const PRICE_RANGES = [
  { label: '1W', range: '7d', interval: '1h' },
  { label: '1M', range: '1mo', interval: '1d' },
  { label: '3M', range: '3mo', interval: '1d' },
  { label: '1Y', range: '1y', interval: '1d' },
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
    { label: '52W Low *', value: quote?.fiftyTwoWeekLow?.toFixed(2) || '—' },
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
                <stop offset="5%" stopColor={color} stopOpacity={0.2} />
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

const CALC_HISTORY_KEY = 'mf_calc_history_v1';

function CAPMCalculator({ ticker, investmentAmount, years, futureValue, calculating, onCalculate, setInvestmentAmount, setYears, calcHistory }) {
  const T = useT();
  const [advancedCapm, setAdvancedCapm] = useState(false);
  const [recurringContrib, setRecurringContrib] = useState('');
  const [contribFrequencyId, setContribFrequencyId] = useState('monthly');
  const [ltcgRatePct, setLtcgRatePct] = useState('');
  const [savedCalcs, setSavedCalcs] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CALC_HISTORY_KEY)) || []; }
    catch { return []; }
  });
  const [justSaved, setJustSaved] = useState(false);
  const onCalculateRef = useRef(onCalculate);
  useEffect(() => { onCalculateRef.current = onCalculate; }, [onCalculate]);

  // Cleanup justSaved timeout properly
  useEffect(() => {
    if (!justSaved) return;
    const t = setTimeout(() => setJustSaved(false), 1800);
    return () => clearTimeout(t);
  }, [justSaved]);

  // Sync savedCalcs if another component (AccountPanel) modifies localStorage
  useEffect(() => {
    function onStorage(e) {
      if (e.key === CALC_HISTORY_KEY) {
        try { setSavedCalcs(JSON.parse(e.newValue) || []); }
        catch { setSavedCalcs([]); }
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const principal = parseFloat(investmentAmount) || 10000;
  const yearsNum = parseFloat(years) || 10;
  const freqMeta = CONTRIB_FREQUENCIES.find(f => f.id === contribFrequencyId) ?? CONTRIB_FREQUENCIES[1];
  const periodsPerYear = freqMeta.periodsPerYear;
  const pmt = advancedCapm ? (parseFloat(recurringContrib) || 0) : 0;

  useEffect(() => {
    setRecurringContrib('');
    setContribFrequencyId('monthly');
  }, [ticker]);

  // Auto-recalculate on input change
  useEffect(() => {
    const amount = parseFloat(investmentAmount);
    const y = parseFloat(years);
    if (!amount || !y || amount <= 0 || y <= 0) return;
    const t = setTimeout(() => onCalculateRef.current(), 600);
    return () => clearTimeout(t);
  }, [investmentAmount, years, ticker]);

  const DEFAULT_RF = 0.0425;
  const effective = useMemo(() => {
    if (!futureValue) return null;
    return {
      rf: futureValue.riskFreeRate ?? DEFAULT_RF,
      beta: futureValue.beta ?? 0,
      capmRate: futureValue.capmRate ?? 0,
      fvLump: futureValue.futureValue ?? futureValue.value ?? null,
    };
  }, [futureValue]);

  // ── derived values ──
  const fv = effective?.fvLump ?? null;
  const rf = (effective?.rf ?? DEFAULT_RF) * 100;
  const beta = effective?.beta ?? 0;
  const rawRate = effective?.capmRate ?? 0;
  const rate = rawRate * 100;
  const periodRate = rawRate / periodsPerYear;
  const nPeriods = yearsNum * periodsPerYear;

  // Recurring contributions: ordinary annuity FV; if rate ≈ 0, FV is n × payment
  const fvSip = pmt <= 0 ? 0
    : periodRate > 1e-12
      ? pmt * ((Math.pow(1 + periodRate, nPeriods) - 1) / periodRate)
      : pmt * nPeriods;
  const totalFV = (fv ?? 0) + fvSip;
  const totalContributed = principal + pmt * nPeriods;
  const totalGain = totalFV > 0 ? totalFV - totalContributed : null;
  const totalGainPct = totalGain != null && totalContributed > 0 ? (totalGain / totalContributed) * 100 : null;

  // Rule of 72 — approximate years to double
  const doubleYears = rawRate > 0 ? Math.round(72 / (rawRate * 100)) : null;

  // After-tax projected value — LTCG on gains only (editable when Additional parameters is on)
  const DEFAULT_LTCG_DEC = 0.20;
  const ltcgRateDecimal = (() => {
    if (!advancedCapm) return DEFAULT_LTCG_DEC;
    const t = String(ltcgRatePct).trim();
    if (t === '') return DEFAULT_LTCG_DEC;
    const n = parseFloat(t);
    if (!Number.isFinite(n)) return DEFAULT_LTCG_DEC;
    return Math.min(100, Math.max(0, n)) / 100;
  })();
  const ltcgHundredths = Math.round(ltcgRateDecimal * 10000) / 100;
  const ltcgLabelPct = Number.isInteger(ltcgHundredths)
    ? String(ltcgHundredths)
    : ltcgHundredths.toFixed(2).replace(/\.?0+$/, '');
  const afterTaxFV = totalFV > 0 && totalGain != null && totalGain > 0
    ? totalContributed + totalGain * (1 - ltcgRateDecimal) : null;

  // Alpha vs risk-free rate
  const alpha = rate - rf;

  function saveProjection() {
    const entry = {
      id: Date.now(),
      ticker,
      principal,
      years: yearsNum,
      pmt,
      freqId: contribFrequencyId,
      totalFV,
      totalGain,
      totalGainPct,
      rate,
      afterTaxFV,
      savedAt: new Date().toISOString(),
    };
    const next = [entry, ...savedCalcs].slice(0, 50);
    setSavedCalcs(next);
    localStorage.setItem(CALC_HISTORY_KEY, JSON.stringify(next));
    setJustSaved(true);
  }

  function deleteProjection(id) {
    const next = savedCalcs.filter(c => c.id !== id);
    setSavedCalcs(next);
    localStorage.setItem(CALC_HISTORY_KEY, JSON.stringify(next));
  }

  // Build quarterly chart data (lump + SIP combined)
  const chartData = useMemo(() => {
    if (!effective || !ticker) return [];
    const r = effective.capmRate ?? 0.08;
    const iPer = r / periodsPerYear;
    const points = [];
    for (let j = 0; j <= Math.ceil(yearsNum) * 4; j++) {
      const t = j / 4;
      if (t > yearsNum + 0.01) break;
      const lump = principal * Math.exp(r * t);
      const n = t * periodsPerYear;
      const sip = pmt <= 0 ? 0
        : iPer > 1e-12
          ? pmt * ((Math.pow(1 + iPer, n) - 1) / iPer)
          : pmt * n;
      points.push({ quarter: t, value: Math.round((lump + sip) * 100) / 100 });
    }
    return points;
  }, [effective, principal, yearsNum, ticker, periodsPerYear, pmt]);

  const pillInput = { background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: 9999, padding: '9px 16px', fontSize: 13, color: T.text, outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.15s' };

  const switchStyle = {
    width: 36, height: 20, borderRadius: 9999, border: 'none', cursor: 'pointer', position: 'relative',
    background: advancedCapm ? T.accent : T.border, transition: 'background 0.18s', flexShrink: 0,
  };

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
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            role="switch"
            aria-checked={advancedCapm}
            aria-label="Toggle additional parameters (recurring contributions and LTCG rate)"
            onClick={() => setAdvancedCapm(v => !v)}
            style={switchStyle}
          >
            <span style={{
              position: 'absolute', top: 2, left: advancedCapm ? 18 : 2,
              width: 16, height: 16, borderRadius: '50%', background: '#fff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.18s',
            }} />
          </button>
          <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Additional parameters</span>
          <span style={{ fontSize: 10, color: T.textFaint }}>Optional</span>
        </div>
        {advancedCapm && (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            alignItems: 'flex-end',
            padding: 12,
            background: T.cardBg,
            border: `1px solid ${T.border}`,
            borderRadius: 10,
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 9, color: T.textMute, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Amount ($)</label>
              <input type="number" value={recurringContrib} onChange={e => setRecurringContrib(e.target.value)}
                placeholder="0" min={0} step={10} style={{ ...pillInput, width: 140, borderRadius: 8 }}
                onFocus={e => e.target.style.borderColor = T.focusRing}
                onBlur={e => e.target.style.borderColor = T.border}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 9, color: T.textMute, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Frequency</label>
              <select
                value={contribFrequencyId}
                onChange={e => setContribFrequencyId(e.target.value)}
                style={{
                  ...pillInput,
                  minWidth: 140,
                  borderRadius: 8,
                  cursor: 'pointer',
                  appearance: 'none',
                  backgroundImage: `linear-gradient(45deg, transparent 50%, ${T.textMute} 50%), linear-gradient(135deg, ${T.textMute} 50%, transparent 50%)`,
                  backgroundPosition: 'calc(100% - 14px) 55%, calc(100% - 9px) 55%',
                  backgroundSize: '5px 4px, 5px 4px',
                  backgroundRepeat: 'no-repeat',
                  paddingRight: 28,
                }}
              >
                {CONTRIB_FREQUENCIES.map(f => (
                  <option key={f.id} value={f.id}>{f.label}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 9, color: T.textMute, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>LTCG rate %</label>
              <input type="number" value={ltcgRatePct} onChange={e => setLtcgRatePct(e.target.value)}
                placeholder="20" min={0} max={100} step={0.5} style={{ ...pillInput, width: 88, borderRadius: 8 }}
                onFocus={e => e.target.style.borderColor = T.focusRing}
                onBlur={e => e.target.style.borderColor = T.border}
              />
            </div>
            <div style={{ flex: '1 1 220px', fontSize: 10, color: T.textFaint, lineHeight: 1.45, paddingBottom: 2 }}>
              Initial balance compounds continuously; each deposit uses the periodic rate <span style={{ color: T.textMute, fontWeight: 600 }}>(CAPM ÷ periods per year)</span>.
              After-tax figure taxes total gain only at the LTCG rate (empty field = 20%).
            </div>
          </div>
        )}
      </div>

      {/* ── Results ── */}
      {fv != null && chartData.length > 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
          {/* Projection header — mirrors Price Chart header row */}
          <div style={{ flexShrink: 0 }}>
            <div style={{ fontSize: 10, color: T.textMute, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600, marginBottom: 6 }}>
              Projected after {yearsNum}yr
              {pmt > 0 && (
                <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: '0' }}>
                  {' '}· +${pmt.toLocaleString()}{freqMeta.suffix}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{ fontSize: 32, fontWeight: 700, color: T.positive, letterSpacing: '-0.03em', lineHeight: 1 }}>
                  {fmtMoneyFull(totalFV)}
                </span>
                {totalContributed > 0 && (
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.positive }}>
                    {(totalFV / totalContributed).toFixed(2)}×
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 20, alignItems: 'flex-end' }}>
                {totalGain != null && (
                  <div>
                    <div style={{ fontSize: 9, color: T.textMute, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Total Gain</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: totalGain >= 0 ? T.positive : T.negative }}>
                      {totalGain >= 0 ? '+' : ''}{fmtMoney(totalGain)}
                    </div>
                    <div style={{ fontSize: 10, color: T.textMute }}>{totalGainPct?.toFixed(1)}%</div>
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 9, color: T.textMute, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>CAPM Rate</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{rate.toFixed(2)}%</div>
                  {doubleYears && <div style={{ fontSize: 10, color: T.textMute }}>2× in ~{doubleYears}yr</div>}
                </div>
              </div>
            </div>
            {afterTaxFV != null && (
              <div style={{ marginTop: 4, fontSize: 11, color: T.textFaint }}>
                After-tax: <span style={{ fontWeight: 600, color: T.textMute }}>{fmtMoneyFull(afterTaxFV)}</span>
                <span style={{ marginLeft: 5 }}>{ltcgLabelPct}% LTCG applied to gains{!advancedCapm ? ' (default)' : ''}</span>
              </div>
            )}
            <div style={{ marginTop: 8 }}>
              <button
                onClick={saveProjection}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontSize: 11, fontWeight: 600,
                  color: justSaved ? T.positive : T.accent,
                  background: 'transparent',
                  border: `1px solid ${justSaved ? T.positive : T.accent}`,
                  borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
                  transition: 'all 0.18s', fontFamily: 'inherit',
                }}
              >
                {justSaved ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    Saved
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
                    Save projection
                  </>
                )}
              </button>
            </div>
          </div>


          {/* Growth chart */}
          <div style={{ flex: 1, minHeight: 130, position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
                <defs>
                  <linearGradient id={`capm_${ticker}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={T.accent} stopOpacity={0.2} />
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
                    <div style={{ background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 12px' }}>
                      <div style={{ fontSize: 10, color: T.textSub, marginBottom: 3 }}>Year {d.quarter.toFixed(2)}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: T.accent }}>{fmtMoney(d.value)}</div>
                    </div>
                  );
                }} />
                <Area type="monotone" dataKey="value" stroke={T.accent} strokeWidth={1.5}
                  fill={`url(#capm_${ticker})`}
                  dot={(props) => {
                    const { cx, cy, payload } = props;
                    if (!Number.isInteger(payload.quarter) || payload.quarter === 0) return null;
                    return <circle key={payload.quarter} cx={cx} cy={cy} r={3} fill={T.accent} stroke={T.pageBg} strokeWidth={1.5} />;
                  }}
                  activeDot={{ r: 3, fill: T.accent, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* CAPM params — matches Price Chart footer style */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, borderTop: `1px solid ${T.border}`, paddingTop: 10 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { label: 'Beta', value: beta.toFixed(3) },
                { label: 'Risk-Free Rate', value: `${rf.toFixed(2)}%` },
                { label: 'Alpha vs Rf', value: `${alpha >= 0 ? '+' : ''}${alpha.toFixed(2)}%`, accent: alpha >= 0 },
                { label: 'CAPM Rate', value: `${rate.toFixed(2)}%` },
              ].map(s => (
                <div key={s.label} style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 6, padding: '7px 14px' }}>
                  <div style={{ fontSize: 9, color: T.textMute, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{s.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: s.accent != null ? (s.accent ? T.positive : T.negative) : T.text }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Saved projections history */}
          {savedCalcs.length > 0 && (
            <div style={{ flexShrink: 0, borderTop: `1px solid ${T.border}`, paddingTop: 10 }}>
              <div style={{ fontSize: 10, color: T.textMute, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600, marginBottom: 8 }}>
                Saved projections ({savedCalcs.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 220, overflowY: 'auto' }}>
                {savedCalcs.map(c => (
                  <div key={c.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                    background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 8,
                    padding: '7px 10px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: T.accent, flexShrink: 0 }}>{c.ticker}</span>
                      <span style={{ fontSize: 11, color: T.textMute, flexShrink: 0 }}>
                        {fmtMoney(c.principal)} · {c.years}yr{c.pmt > 0 ? ` +${fmtMoney(c.pmt)}/${c.freqId?.replace('ly', '')}` : ''}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: T.positive, flexShrink: 0 }}>
                        → {fmtMoneyFull(c.totalFV)}
                      </span>
                      <span style={{ fontSize: 10, color: T.textFaint, flexShrink: 0 }}>
                        {c.rate?.toFixed(2)}% CAPM
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <span style={{ fontSize: 9, color: T.textFaint, whiteSpace: 'nowrap' }}>
                        {new Date(c.savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                      </span>
                      <button
                        onClick={() => deleteProjection(c.id)}
                        title="Remove"
                        style={{
                          background: 'transparent', border: 'none', cursor: 'pointer',
                          color: T.textFaint, padding: '2px 4px', borderRadius: 4,
                          display: 'flex', alignItems: 'center', transition: 'color 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = T.negative}
                        onMouseLeave={e => e.currentTarget.style.color = T.textFaint}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : !calculating && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={T.border} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <span style={{ fontSize: 12, color: T.textFaint }}>Enter an amount and years, then hit Calculate</span>
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
  const longKeys = ['Investment Objective', 'Strategy & Approach', 'Risk Considerations', 'Notes'];

  const quickFacts = quickKeys.map(k => byKey[k]).filter(Boolean);
  const longItems = longKeys.map(k => byKey[k]).filter(Boolean);
  const hasAny = rows.some(r => !r.isPlaceholder);

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 760 }}>
      {/* Quick facts — same pill style as Price Chart footer stats */}
      {quickFacts.some(f => !f.isPlaceholder) && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {quickFacts.map(({ label, value, isPlaceholder }) => (
            <div key={label} style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 6, padding: '7px 14px' }}>
              <div style={{ fontSize: 9, color: T.textMute, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: isPlaceholder ? T.textFaint : T.text, fontStyle: isPlaceholder ? 'italic' : 'normal' }}>
                {isPlaceholder ? '—' : value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Long-form sections */}
      {longItems.filter(f => !f.isPlaceholder).map(({ label, value }) => (
        <div key={label} style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
          <div style={{ fontSize: 9, color: T.textMute, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 6 }}>{label}</div>
          <div style={{ fontSize: 13, color: T.text, lineHeight: 1.65 }}>{value}</div>
        </div>
      ))}

      <div style={{ fontSize: 9, color: T.textFaint, lineHeight: 1.5, borderTop: `1px solid ${T.border}`, paddingTop: 10 }}>
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
