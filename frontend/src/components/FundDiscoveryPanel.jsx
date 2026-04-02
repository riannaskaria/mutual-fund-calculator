import { useEffect, useMemo, useState } from 'react';
import { useT, getFundBadgeColor } from '../theme';
import {
  fetchFundDiscovery,
  fetchFundDiscoveryBreakdown,
  fetchFundDiscoveryStatus,
  refreshFundDiscovery,
  logSearchEvent,
} from '../api/mutualFundApi';

function fmtPct(value, digits = 2) {
  if (!Number.isFinite(value)) return 'N/A';
  return `${value.toFixed(digits)}%`;
}

function fmtNum(value, digits = 2) {
  if (!Number.isFinite(value)) return 'N/A';
  return value.toFixed(digits);
}

function fmtAum(value) {
  if (!Number.isFinite(value)) return 'N/A';
  return `$${value.toFixed(1)}B`;
}

function FactorBar({ label, value, color, T }) {
  const clamped = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.textMute }}>
        <span>{label}</span>
        <span style={{ color: T.textSub, fontWeight: 600 }}>{Number.isFinite(value) ? value.toFixed(1) : 'N/A'}</span>
      </div>
      <div style={{ height: 6, borderRadius: 999, background: T.inputBg, overflow: 'hidden' }}>
        <div style={{ width: `${clamped}%`, height: '100%', background: color, transition: 'width 0.2s ease' }} />
      </div>
    </div>
  );
}

export default function FundDiscoveryPanel({ compact = false }) {
  const T = useT();
  const [snapshot, setSnapshot] = useState(null);
  const [status, setStatus] = useState(null);
  const [selectedTicker, setSelectedTicker] = useState(null);
  const [selectedBreakdown, setSelectedBreakdown] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadData = async ({ forceRefresh = false } = {}) => {
    setError(null);
    if (!snapshot) setLoading(true);
    try {
      if (forceRefresh) {
        setRefreshing(true);
        await refreshFundDiscovery();
      }

      const [snap, stat] = await Promise.all([
        fetchFundDiscovery(10),
        fetchFundDiscoveryStatus(),
      ]);

      setSnapshot(snap);
      setStatus(stat);
      if (!selectedTicker && snap?.funds?.length) {
        setSelectedTicker(snap.funds[0].ticker);
      }
    } catch (err) {
      setError(err.message || 'Failed to load fund discovery data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedTicker) {
      setSelectedBreakdown(null);
      return;
    }
    fetchFundDiscoveryBreakdown(selectedTicker)
      .then(setSelectedBreakdown)
      .catch(() => setSelectedBreakdown(null));
  }, [selectedTicker, snapshot?.generatedAt]);

  const selectedFromList = useMemo(() => (
    snapshot?.funds?.find(f => f.ticker === selectedTicker) || null
  ), [snapshot, selectedTicker]);

  const active = selectedBreakdown || selectedFromList;
  const rows = snapshot?.funds || [];
  const visibleRows = compact ? rows.slice(0, 6) : rows;

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.textMute, fontSize: 12, border: `1px solid ${T.border}`, borderRadius: 10, background: T.cardBg }}>
        Loading fund discovery...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 8 : 12, height: '100%' }}>
      <div style={{
        background: T.cardBg,
        border: `1px solid ${T.border}`,
        borderRadius: 10,
        padding: '11px 14px 10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: T.text, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Fund Discovery</span>
          {snapshot?.generatedAt && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10, padding: '1px 6px' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              <span style={{ fontSize: 9, color: '#22c55e', fontWeight: 600, letterSpacing: '0.03em' }}>LIVE</span>
            </span>
          )}
        </div>
        <button
          onClick={() => loadData({ forceRefresh: true })}
          disabled={refreshing}
          title="Refresh"
          style={{
            background: 'none',
            border: '1px solid #141f2e',
            borderRadius: 5,
            cursor: refreshing ? 'not-allowed' : 'pointer',
            padding: '4px 5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'border-color 0.15s',
            opacity: refreshing ? 0.75 : 1,
          }}
          onMouseEnter={e => { if (!refreshing) e.currentTarget.style.borderColor = '#2a3a50'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#141f2e'; }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={refreshing ? '#22c55e' : '#446688'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>
      </div>

      {(snapshot?.stale || status?.stale) && (
        <div style={{
          border: '1px solid #f59e0b',
          background: 'rgba(245, 158, 11, 0.08)',
          color: '#b45309',
          borderRadius: 8,
          padding: '8px 10px',
          fontSize: 11,
        }}>
          Showing cached snapshot because latest refresh failed. {snapshot?.staleReason || status?.lastError || ''}
        </div>
      )}

      {error && (
        <div style={{ border: '1px solid #ef4444', background: 'rgba(239,68,68,0.08)', color: '#b91c1c', borderRadius: 8, padding: '8px 10px', fontSize: 11 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1.15fr 0.85fr', gap: compact ? 8 : 12, minHeight: 0, flex: 1 }}>
        <div className="panel-scroll" style={{ overflowY: 'auto', border: `1px solid ${T.border}`, borderRadius: 10, background: T.cardBg }}>
          {visibleRows.map((fund) => {
            const activeRow = selectedTicker === fund.ticker;
            const badgeColor = getFundBadgeColor(fund.ticker);
            return (
              <button
                key={fund.ticker}
                onClick={() => {
                  setSelectedTicker(fund.ticker);
                  logSearchEvent({ ticker: fund.ticker, name: fund.name, timestamp: new Date().toISOString() }).catch(() => {});
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  border: 'none',
                  background: activeRow ? T.inputBg : 'transparent',
                  borderBottom: `1px solid ${T.border2}`,
                  padding: '10px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 20, fontSize: 11, color: T.textMute }}>#{fund.rank}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: badgeColor }}>{fund.ticker}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: T.text }}>{fund.score.toFixed(1)}</span>
                </div>
                <div style={{ fontSize: 10, color: T.textSub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {fund.name}
                </div>
                <div style={{ fontSize: 10, color: T.textMute }}>
                  {fund.explainability?.summary}
                </div>
              </button>
            );
          })}
          {!rows.length && (
            <div style={{ padding: 12, fontSize: 11, color: T.textMute }}>No discovery results available.</div>
          )}
        </div>

        {!compact && (
        <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, background: T.cardBg, padding: compact ? 10 : 12, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
          {!active && <div style={{ fontSize: 11, color: T.textMute }}>Select a fund to inspect score details.</div>}
          {active && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{active.ticker}</div>
                  <div style={{ fontSize: 10, color: T.textSub }}>{active.name}</div>
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: T.text }}>{fmtNum(active.score, 1)}</div>
              </div>

              <div style={{ fontSize: 10, color: T.textMute }}>
                Weights: Return 35% | Volatility 25% | Expense 20% | AUM 10% | Beta 10%
              </div>

              <FactorBar label="Recent Return" value={active.subscores?.recentReturn} color="#22c55e" T={T} />
              <FactorBar label="Volatility (inverse)" value={active.subscores?.volatility} color="#38bdf8" T={T} />
              <FactorBar label="Expense Ratio (inverse)" value={active.subscores?.expenseRatio} color="#f59e0b" T={T} />
              <FactorBar label="AUM" value={active.subscores?.aum} color="#8b5cf6" T={T} />
              <FactorBar label="Beta" value={active.subscores?.beta} color="#ef4444" T={T} />

              <div style={{ borderTop: `1px solid ${T.border2}`, paddingTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <div style={{ fontSize: 10, color: T.textMute }}>1M Return</div>
                <div style={{ fontSize: 10, color: T.text, textAlign: 'right' }}>{fmtPct(active.metrics?.oneMonthReturnPct)}</div>
                <div style={{ fontSize: 10, color: T.textMute }}>3M Return</div>
                <div style={{ fontSize: 10, color: T.text, textAlign: 'right' }}>{fmtPct(active.metrics?.threeMonthReturnPct)}</div>
                <div style={{ fontSize: 10, color: T.textMute }}>Annualized Volatility</div>
                <div style={{ fontSize: 10, color: T.text, textAlign: 'right' }}>{fmtPct(active.metrics?.annualizedVolatilityPct)}</div>
                <div style={{ fontSize: 10, color: T.textMute }}>Expense Ratio</div>
                <div style={{ fontSize: 10, color: T.text, textAlign: 'right' }}>{fmtPct(active.metrics?.expenseRatioPct)}</div>
                <div style={{ fontSize: 10, color: T.textMute }}>AUM</div>
                <div style={{ fontSize: 10, color: T.text, textAlign: 'right' }}>{fmtAum(active.metrics?.aumBillions)}</div>
                <div style={{ fontSize: 10, color: T.textMute }}>Beta</div>
                <div style={{ fontSize: 10, color: T.text, textAlign: 'right' }}>{fmtNum(active.metrics?.beta, 4)}</div>
              </div>

              <div style={{ fontSize: 10, color: T.textMute, lineHeight: 1.5 }}>
                {active.explainability?.summary}
              </div>
            </>
          )}
        </div>
        )}
      </div>
    </div>
  );
}