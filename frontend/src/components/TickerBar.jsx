import { useState, useEffect } from 'react';
import { useT, MARKET_INDICES } from '../theme';

function TickerItem({ t }) {
  const T = useT();
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, whiteSpace: 'nowrap', padding: '0 24px' }}>
      <span style={{ fontSize: 11, color: T.textMute, fontWeight: 500 }}>{t.sym}</span>
      <span style={{ fontSize: 12, color: T.text, fontWeight: 600 }}>
        {t.price != null ? t.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
      </span>
      {t.chg != null && (
        <span style={{ fontSize: 11, color: t.up ? T.positive : T.negative, fontWeight: 500 }}>
          {t.up ? '+' : ''}{t.chg.toFixed(2)} ({t.up ? '+' : ''}{t.pct.toFixed(2)}%)
        </span>
      )}
    </div>
  );
}

export default function TickerBar() {
  const T = useT();
  const [tickers, setTickers] = useState([]);

  useEffect(() => {
    const load = () => {
      Promise.all(
        MARKET_INDICES.map(({ sym, yahoo }) =>
          fetch(`/yahoo-api/v8/finance/chart/${yahoo}?interval=1d&range=1d`, { signal: AbortSignal.timeout(8000) })
            .then(r => r.json())
            .then(j => {
              const meta = j?.chart?.result?.[0]?.meta;
              if (!meta) return null;
              const price = meta.regularMarketPrice;
              const prev = meta.chartPreviousClose;
              const chg = price != null && prev != null ? price - prev : null;
              const pct = chg != null && prev ? (chg / prev) * 100 : null;
              return { sym, price, chg, pct, up: chg != null ? chg >= 0 : true };
            })
            .catch(() => null)
        )
      ).then(results => setTickers(results.filter(Boolean)));
    };
    load();
    const iv = setInterval(load, 60000);
    return () => clearInterval(iv);
  }, []);

  const items = tickers.length > 0
    ? tickers
    : MARKET_INDICES.map(m => ({ sym: m.sym, price: null, chg: null, pct: null, up: true }));

  return (
    <div style={{ background: T.panelBg, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: `1px solid ${T.border}`, flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
      <div style={{ display: 'flex', animation: 'tickerScroll 40s linear infinite', width: 'max-content' }}>
        {[...items, ...items].map((t, i) => <TickerItem key={i} t={t} />)}
      </div>
      <style>{`
        @keyframes tickerScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
