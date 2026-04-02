import { useEffect, useState } from 'react';
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
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function Row({ rank, ticker, name, value, rightLabel, T }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '24px 1fr auto',
      alignItems: 'center',
      gap: 8,
      padding: '7px 10px',
      borderBottom: `1px solid ${T.border2}`,
    }}>
      <span style={{ color: T.textMute, fontSize: 10 }}>#{rank}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.text }}>{ticker}</div>
        <div style={{ fontSize: 10, color: T.textSub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.accent }}>{value}</div>
        <div style={{ fontSize: 9, color: T.textMute }}>{rightLabel}</div>
      </div>
    </div>
  );
}

function Empty({ text, T }) {
  return <div style={{ padding: '10px', fontSize: 11, color: T.textMute }}>{text}</div>;
}

export default function TrendingPanel() {
  const T = useT();
  const [searched, setSearched] = useState([]);
  const [traded, setTraded] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastTelemetryAt, setLastTelemetryAt] = useState(null);

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
          ...(mostSearched?.funds || []).map(item => item.lastSearchedAt),
          ...(mostTraded?.funds || []).map(item => item.lastTradedAt),
        ]
          .map(parseIso)
          .filter(Boolean)
          .sort((a, b) => b.getTime() - a.getTime());

        setLastTelemetryAt(candidates[0] ? candidates[0].toISOString() : null);
      } catch (err) {
        if (!mounted) return;
        setError(err.message || 'Failed to load recommendations');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 3 * 60 * 1000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const hasAnyEvents = searched.length > 0 || traded.length > 0;
  const latestEvent = parseIso(lastTelemetryAt);
  const ageMs = latestEvent ? (Date.now() - latestEvent.getTime()) : null;

  let statusLabel = 'Checking...';
  let statusColor = T.textMute;

  if (error) {
    statusLabel = 'Disconnected';
    statusColor = '#b91c1c';
  } else if (!loading && !hasAnyEvents) {
    statusLabel = 'Waiting for first event';
    statusColor = T.textMute;
  } else if (ageMs != null && ageMs <= 5 * 60 * 1000) {
    statusLabel = 'Live';
    statusColor = '#16a34a';
  } else if (ageMs != null) {
    statusLabel = 'No recent events';
    statusColor = '#d97706';
  }

  return (
    <div style={{
      flexShrink: 0,
      borderBottom: `1px solid ${T.border}`,
      background: T.cardBg,
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      minHeight: 176,
    }}>
      <div style={{ borderRight: `1px solid ${T.border}` }}>
        <div style={{ padding: '9px 10px', borderBottom: `1px solid ${T.border}`, fontSize: 10, fontWeight: 700, color: T.textMute, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Most Searched
        </div>
        {loading ? <Empty text="Loading..." T={T} /> : null}
        {!loading && !error && searched.length === 0 ? <Empty text="No search telemetry yet." T={T} /> : null}
        {!loading && !error && searched.map(item => (
          <Row
            key={`s-${item.ticker}`}
            rank={item.rank}
            ticker={item.ticker}
            name={item.name}
            value={item.searchCount}
            rightLabel="searches"
            T={T}
          />
        ))}
      </div>

      <div>
        <div style={{ padding: '9px 10px', borderBottom: `1px solid ${T.border}`, fontSize: 10, fontWeight: 700, color: T.textMute, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Most Traded
        </div>
        {loading ? <Empty text="Loading..." T={T} /> : null}
        {!loading && !error && traded.length === 0 ? <Empty text="No trade telemetry yet." T={T} /> : null}
        {!loading && !error && traded.map(item => (
          <Row
            key={`t-${item.ticker}`}
            rank={item.rank}
            ticker={item.ticker}
            name={item.name}
            value={item.tradeCount}
            rightLabel="trades"
            T={T}
          />
        ))}
      </div>

      {!!error && (
        <div style={{
          gridColumn: '1 / -1',
          borderTop: `1px solid ${T.border}`,
          padding: '8px 10px',
          fontSize: 11,
          color: '#b91c1c',
          background: 'rgba(239,68,68,0.08)',
        }}>
          {error}
        </div>
      )}

      <div style={{
        gridColumn: '1 / -1',
        borderTop: `1px solid ${T.border}`,
        background: T.inputBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        padding: '7px 10px',
        fontSize: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.textSub }}>
          <span style={{ color: T.textMute }}>Event logging status:</span>
          <span style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: statusColor,
            display: 'inline-block',
          }} />
          <span style={{ color: statusColor, fontWeight: 700 }}>{statusLabel}</span>
        </div>
        <div style={{ color: T.textSub }}>
          <span style={{ color: T.textMute }}>Last telemetry update:</span>{' '}
          <span style={{ color: T.text }}>{formatTimestamp(lastTelemetryAt)}</span>
        </div>
      </div>
    </div>
  );
}
