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
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '20px 1fr auto',
      alignItems: 'center', gap: 8, padding: '7px 12px',
      borderBottom: `1px solid ${T.border2}`,
    }}>
      <span style={{ color: T.textMute, fontSize: 10 }}>#{rank}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{ticker}</div>
        <div style={{ fontSize: 10, color: T.textSub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.accent }}>{value}</div>
        <div style={{ fontSize: 9, color: T.textMute }}>{rightLabel}</div>
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
    padding: '5px 10px', fontSize: 12, fontWeight: 600,
    border: `1px solid ${T.border}`, borderRadius: 6,
    background: '#ffffff', color: T.text,
    cursor: 'pointer',
  };

  const dropdownStyle = {
    position: 'absolute', top: 'calc(100% + 6px)', left: 0,
    minWidth: 420, zIndex: 200,
    background: '#ffffff',
    border: `1px solid ${T.border}`,
    borderRadius: 8,
    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
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
              <div style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border}`, fontSize: 10, fontWeight: 700, color: T.textMute, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Most Searched
              </div>
              {loading && <div style={{ padding: 12, fontSize: 11, color: T.textMute }}>Loading…</div>}
              {!loading && searched.length === 0 && <div style={{ padding: 12, fontSize: 11, color: T.textMute }}>No search telemetry yet.</div>}
              {!loading && searched.map(item => (
                <Row key={`s-${item.ticker}`} rank={item.rank} ticker={item.ticker} name={item.name} value={item.searchCount} rightLabel="searches" T={T} />
              ))}
            </div>

            {/* Most Traded */}
            <div>
              <div style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border}`, fontSize: 10, fontWeight: 700, color: T.textMute, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Most Traded
              </div>
              {loading && <div style={{ padding: 12, fontSize: 11, color: T.textMute }}>Loading…</div>}
              {!loading && traded.length === 0 && <div style={{ padding: 12, fontSize: 11, color: T.textMute }}>No trade telemetry yet.</div>}
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

          <div style={{ borderTop: `1px solid ${T.border}`, background: T.inputBg, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', fontSize: 10, color: T.textSub }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: T.textMute }}>Status:</span>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, display: 'inline-block' }} />
              <span style={{ color: dotColor, fontWeight: 700 }}>{statusLabel}</span>
            </div>
            <div>
              <span style={{ color: T.textMute }}>Last update:</span>{' '}
              <span style={{ color: T.text }}>{formatTimestamp(lastTelemetryAt)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
