import { useT } from '../theme';

export default function FundHeader({ ticker, fundName, quote, quoteLoading }) {
  const T = useT();
  const price = quote?.regularMarketPrice;
  const prev  = quote?.chartPreviousClose;
  const chg   = price != null && prev != null ? price - prev : null;
  const pct   = chg != null && prev ? (chg / prev) * 100 : null;
  const up    = chg != null ? chg >= 0 : true;

  return (
    <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, flexShrink: 0, background: T.pageBg }}>
      {quoteLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 52 }}>
          <div style={{ width: 14, height: 14, border: '2px solid #1a2535', borderTopColor: '#22c55e', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontSize: 11, color: '#334455' }}>Loading quote…</span>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: T.text, letterSpacing: '-0.01em' }}>
                {quote?.longName || fundName || quote?.symbol || ticker}
              </span>
              {quote?.fullExchangeName && (
                <span style={{ fontSize: 9, color: '#446688', background: T.cardBg, border: `1px solid ${T.borderSub}`, borderRadius: 3, padding: '1px 6px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  {quote.fullExchangeName}
                </span>
              )}
              {quote?.instrumentType && (
                <span style={{ fontSize: 9, color: '#446688', background: T.cardBg, border: `1px solid ${T.borderSub}`, borderRadius: 3, padding: '1px 6px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  {quote.instrumentType}
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: T.textMute }}>{quote?.symbol || ticker}</div>
          </div>

          <div style={{ marginLeft: 'auto', textAlign: 'right', flexShrink: 0 }}>
            {price != null ? (
              <>
                <div style={{ fontSize: 24, fontWeight: 700, color: T.text, lineHeight: 1, letterSpacing: '-0.02em' }}>
                  {price.toFixed(2)}
                </div>
                {chg != null && (
                  <div style={{ fontSize: 11, fontWeight: 600, color: up ? '#22c55e' : '#ef4444', marginTop: 3 }}>
                    {up ? '▲' : '▼'} {up ? '+' : ''}{chg.toFixed(2)} ({up ? '+' : ''}{pct.toFixed(2)}%)
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontSize: 13, color: '#334455' }}>—</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
