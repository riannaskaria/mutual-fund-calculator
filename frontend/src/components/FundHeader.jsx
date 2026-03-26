import { useT, FONT_DISPLAY } from '../theme';

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 56 }}>
          <div style={{ width: 14, height: 14, border: `2px solid ${T.spinnerTrack}`, borderTopColor: T.spinnerAccent, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontSize: 12, color: T.textMute }}>Loading quote…</span>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 24,
                fontWeight: 700,
                color: T.brand,
                letterSpacing: '-0.02em',
                fontFamily: FONT_DISPLAY,
                lineHeight: 1.2,
              }}>
                {quote?.longName || fundName || quote?.symbol || ticker}
              </span>
              {quote?.fullExchangeName && (
                <span style={{ fontSize: 10, color: T.accentSoft, background: T.cardBg, border: `1px solid ${T.borderSub}`, borderRadius: 4, padding: '2px 7px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  {quote.fullExchangeName}
                </span>
              )}
              {quote?.instrumentType && (
                <span style={{ fontSize: 10, color: T.accentSoft, background: T.cardBg, border: `1px solid ${T.borderSub}`, borderRadius: 4, padding: '2px 7px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  {quote.instrumentType}
                </span>
              )}
            </div>
            <div style={{ fontSize: 13, color: T.textMute, fontWeight: 500, marginTop: 1 }}>{quote?.symbol || ticker}</div>
          </div>

          <div style={{ marginLeft: 'auto', textAlign: 'right', flexShrink: 0 }}>
            {price != null ? (
              <>
                <div style={{ fontSize: 22, fontWeight: 700, color: T.text, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
                  {price.toFixed(2)}
                </div>
                {chg != null && (
                  <div style={{ fontSize: 12, fontWeight: 600, color: up ? T.positive : T.negative, marginTop: 4 }}>
                    {up ? '▲' : '▼'} {up ? '+' : ''}{chg.toFixed(2)} ({up ? '+' : ''}{pct.toFixed(2)}%)
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontSize: 15, color: T.textMute }}>—</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
