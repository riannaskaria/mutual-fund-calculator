import { useEffect, useRef, useState } from 'react';
import { useT } from '../theme';
import { fetchMostSearchedFunds, fetchMostTradedFunds } from '../api/mutualFundApi';

function parseIso(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatTimestamp(value) {
  const d = parseIso(value);
  if (!d) return 'No events yet';
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function Row({ rank, ticker, name, value, rightLabel, T }) {
  const showName = name && name !== ticker;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '7px 14px', borderBottom: `1px solid ${T.border2}`,
    }}>
      <span style={{
        fontSize: 11, color: T.textFaint, fontVariantNumeric: 'tabular-nums',
        width: 14, textAlign: 'right', flexShrink: 0,
      }}>{rank}</span>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: T.text, letterSpacing: '-0.01em' }}>
          {ticker}
        </span>
        {showName && (
          <span style={{
            fontSize: 10.5, color: T.textMute, fontWeight: 400,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{name}</span>
        )}
      </div>

      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 3, flexShrink: 0,
        fontSize: 12, fontWeight: 600, color: T.accent,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
        <span style={{ fontSize: 10, color: T.textFaint, fontWeight: 400 }}>{rightLabel}</span>
      </div>
    </div>
  );
}

export default function TrendingPanel() {
  const T = useT();
  const [open, setOpen] = useState(false);
  const [searched, setSearched] = useState([]);
  const [traded, setTraded] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastTelemetryAt, setLastTelemetryAt] = useState(null);
  const wrapRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setError('');
      try {
        const [mostSearched, mostTraded] = await Promise.all([
          fetchMostSearchedFunds(5),
          fetchMostTradedFunds(5),
        ]);
        if (!mounted) return;
        setSearched(mostSearched?.funds || []);
        setTraded(mostTraded?.funds || []);
        const candidates = [
          ...(mostSearched?.funds || []).map(i => i.lastSearchedAt),
          ...(mostTraded?.funds || []).map(i => i.lastTradedAt),
        ].map(parseIso).filter(Boolean).sort((a, b) => b - a);
        setLastTelemetryAt(candidates[0]?.toISOString() ?? null);
      } catch (err) {
        if (mounted) setError(err.message || 'Failed to load');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 3 * 60 * 1000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const latestEvent = parseIso(lastTelemetryAt);
  const ageMs = latestEvent ? Date.now() - latestEvent.getTime() : null;
  const hasEvents = searched.length > 0 || traded.length > 0;

  let statusLabel = 'Checking…';
  let dotColor = T.textMute;
  if (error) { statusLabel = 'Disconnected'; dotColor = '#b91c1c'; }
  else if (!loading && !hasEvents) { statusLabel = 'Waiting for first event'; dotColor = T.textMute; }
  else if (ageMs != null && ageMs <= 5 * 60 * 1000) { statusLabel = 'Live'; dotColor = '#16a34a'; }
  else if (ageMs != null) { statusLabel = 'No recent events'; dotColor = '#d97706'; }

  const triggerStyle = {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '5px 10px', fontSize: 11, fontWeight: 600,
    border: `1px solid ${T.border}`, borderRadius: 6,
    background: T.solidPanel, color: T.text,
    cursor: 'pointer', letterSpacing: '0.02em',
  };

  const dropdownStyle = {
    position: 'absolute', top: 'calc(100% + 6px)', left: 0,
    minWidth: 420, zIndex: 200,
    background: T.solidPanel,
    border: `1px solid ${T.border}`,
    borderRadius: 10,
    boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
    overflow: 'hidden',
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button style={triggerStyle} onClick={() => setOpen(o => !o)}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, display: 'inline-block' }} />
        Trending
        <span style={{ fontSize: 9, color: T.textMute, marginLeft: 2 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={dropdownStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            {/* Most Searched */}
            <div style={{ borderRight: `1px solid ${T.border}` }}>
              <div style={{ padding: '7px 14px 5px', borderBottom: `1px solid ${T.border2}`, fontSize: 10, fontWeight: 500, color: T.textMute }}>
                Most searched
              </div>
              {loading && <div style={{ padding: 12, fontSize: 11, color: T.textMute }}>Loading…</div>}
              {!loading && searched.length === 0 && <div style={{ padding: 12, fontSize: 11, color: T.textMute }}>No data yet.</div>}
              {!loading && searched.map(item => (
                <Row key={`s-${item.ticker}`} rank={item.rank} ticker={item.ticker} name={item.name} value={item.searchCount} rightLabel="searches" T={T} />
              ))}
            </div>

            {/* Most Traded */}
            <div>
              <div style={{ padding: '7px 14px 5px', borderBottom: `1px solid ${T.border2}`, fontSize: 10, fontWeight: 500, color: T.textMute }}>
                Most traded
              </div>
              {loading && <div style={{ padding: 12, fontSize: 11, color: T.textMute }}>Loading…</div>}
              {!loading && traded.length === 0 && <div style={{ padding: 12, fontSize: 11, color: T.textMute }}>No data yet.</div>}
              {!loading && traded.map(item => (
                <Row key={`t-${item.ticker}`} rank={item.rank} ticker={item.ticker} name={item.name} value={item.tradeCount} rightLabel="trades" T={T} />
              ))}
            </div>
          </div>

          {!!error && (
            <div style={{ borderTop: `1px solid ${T.border}`, padding: '8px 12px', fontSize: 11, color: '#b91c1c', background: 'rgba(239,68,68,0.08)' }}>
              {error}
            </div>
          )}

          <div style={{ borderTop: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 14px', fontSize: 10, color: T.textMute }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: dotColor, display: 'inline-block' }} />
              <span style={{ color: dotColor }}>{statusLabel}</span>
            </div>
            <span>{formatTimestamp(lastTelemetryAt)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
