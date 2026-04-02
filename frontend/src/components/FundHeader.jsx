import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useT, FONT_DISPLAY } from '../theme';

export default function FundHeader({ ticker, fundName, quote, quoteLoading, alerts = [], onAddAlert, onRemoveAlert }) {
  const T = useT();
  const price = quote?.regularMarketPrice;
  const prev  = quote?.chartPreviousClose;
  const chg   = price != null && prev != null ? price - prev : null;
  const pct   = chg != null && prev ? (chg / prev) * 100 : null;
  const up    = chg != null ? chg >= 0 : true;

  const [alertOpen, setAlertOpen] = useState(false);
  const [alertPrice, setAlertPrice] = useState('');
  const [alertDir, setAlertDir] = useState('above');
  const [popoverPos, setPopoverPos] = useState({ top: 0, right: 0 });
  const bellRef    = useRef(null);
  const popoverRef = useRef(null);

  // Close on outside click — must check both the bell button AND the portal popover
  // (the portal renders into document.body, outside bellRef's DOM subtree)
  useEffect(() => {
    if (!alertOpen) return;
    const handler = (e) => {
      const inBell    = bellRef.current    && bellRef.current.contains(e.target);
      const inPopover = popoverRef.current && popoverRef.current.contains(e.target);
      if (!inBell && !inPopover) setAlertOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [alertOpen]);

  const toggleAlert = () => {
    if (!alertOpen && bellRef.current) {
      const rect = bellRef.current.getBoundingClientRect();
      setPopoverPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
    setAlertOpen(v => !v);
  };

  const tickerAlerts   = alerts.filter(a => a.ticker === ticker && !a.triggered);
  const triggeredAlerts = alerts.filter(a => a.ticker === ticker && a.triggered);

  const handleAddAlert = () => {
    const p = parseFloat(alertPrice);
    if (!p || p <= 0 || !ticker) return;
    onAddAlert?.(ticker, p, alertDir);
    setAlertPrice('');
  };

  return (
    <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, flexShrink: 0, background: T.panelBg, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', position: 'relative' }}>
      {quoteLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 56 }}>
          <div style={{ width: 14, height: 14, border: `2px solid ${T.spinnerTrack}`, borderTopColor: T.spinnerAccent, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontSize: 12, color: T.textMute }}>Loading quote…</span>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Left: name + meta */}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: T.brand, letterSpacing: '-0.02em', fontFamily: FONT_DISPLAY, lineHeight: 1.2 }}>
                {quote?.longName || fundName || quote?.symbol || ticker}
              </span>
              {quote?.fullExchangeName && (
                <span style={{ fontSize: 10, color: T.accentSoft, background: T.cardBg, border: `1px solid ${T.borderSub}`, borderRadius: 20, padding: '2px 8px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  {quote.fullExchangeName}
                </span>
              )}
              {quote?.instrumentType && (
                <span style={{ fontSize: 10, color: T.accentSoft, background: T.cardBg, border: `1px solid ${T.borderSub}`, borderRadius: 20, padding: '2px 8px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  {quote.instrumentType}
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: T.textMute, fontWeight: 500 }}>
              {quote?.symbol || ticker}
              {quote?.regularMarketTime && (
                <span style={{ marginLeft: 8, fontSize: 10, color: T.textFaint }}>
                  · NAV as of {new Date(quote.regularMarketTime * 1000).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>

          {/* Right: price + bell */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
            <div style={{ textAlign: 'right' }}>
              {price != null ? (
                <>
                  <div style={{ fontSize: 22, fontWeight: 700, color: T.text, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
                    {price.toFixed(2)}
                  </div>
                  {chg != null && pct != null && (
                    <div style={{ fontSize: 12, fontWeight: 600, color: up ? T.positive : T.negative, marginTop: 4 }}>
                      {up ? '▲' : '▼'} {up ? '+' : ''}{chg.toFixed(2)} ({up ? '+' : ''}{pct.toFixed(2)}%)
                    </div>
                  )}
                </>
              ) : (
                <div style={{ fontSize: 15, color: T.textMute }}>—</div>
              )}
            </div>

            {/* Minimal circular bell button */}
            {ticker && (
              <div ref={bellRef} style={{ position: 'relative' }}>
                <button
                  onClick={toggleAlert}
                  title="Price alerts"
                  style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: alertOpen ? `${T.accent}18` : 'transparent',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.15s', position: 'relative', flexShrink: 0,
                  }}
                  onMouseEnter={e => { if (!alertOpen) e.currentTarget.style.background = T.hover; }}
                  onMouseLeave={e => { e.currentTarget.style.background = alertOpen ? `${T.accent}18` : 'transparent'; }}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
                    stroke={tickerAlerts.length > 0 ? T.accent : T.textMute}
                    strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  {tickerAlerts.length > 0 && (
                    <span style={{
                      position: 'absolute', top: 5, right: 5,
                      width: 7, height: 7, borderRadius: '50%',
                      background: T.accent, border: `1.5px solid ${T.panelBg}`,
                    }} />
                  )}
                </button>

                {/* Alert popover — rendered into document.body via portal to escape all stacking contexts */}
                {alertOpen && createPortal(
                  <div ref={popoverRef} style={{
                    position: 'fixed', top: popoverPos.top, right: popoverPos.right, zIndex: 9999,
                    width: 296,
                    background: T.glassPanel || T.panelBg,
                    border: `1px solid ${T.glassBorder || T.border}`,
                    borderRadius: 20,
                    boxShadow: '0 20px 60px rgba(0,0,0,0.14)',
                    backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
                    padding: '16px 16px 14px',
                    display: 'flex', flexDirection: 'column', gap: 12,
                  }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>Price Alert · {ticker}</div>
                      {price != null && <div style={{ fontSize: 11, color: T.textMute }}>Now: <strong style={{ color: T.text }}>${price.toFixed(2)}</strong></div>}
                    </div>

                    {/* iOS segmented control */}
                    <div style={{ display: 'flex', background: 'rgba(0,0,0,0.07)', borderRadius: 9999, padding: 3, gap: 0 }}>
                      {[['above', '↑ Above'], ['below', '↓ Below']].map(([val, label]) => (
                        <button key={val} onClick={() => setAlertDir(val)} style={{
                          flex: 1, background: alertDir === val ? T.accent : 'transparent',
                          border: 'none', borderRadius: 9999, cursor: 'pointer',
                          fontSize: 11, fontWeight: 600, padding: '7px 0',
                          color: alertDir === val ? '#fff' : T.text,
                          boxShadow: alertDir === val ? '0 1px 4px rgba(0,0,0,0.15)' : 'none',
                          transition: 'all 0.18s',
                        }}>{label}</button>
                      ))}
                    </div>

                    {/* Target price + Set */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="number"
                        value={alertPrice}
                        onChange={e => setAlertPrice(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddAlert(); }}
                        placeholder={price ? `e.g. ${price.toFixed(2)}` : 'Target price'}
                        min={0} step={0.01}
                        style={{
                          flex: 1, background: T.inputBg,
                          border: `1px solid ${T.border}`, borderRadius: 9999,
                          padding: '8px 14px', fontSize: 13, color: T.text,
                          outline: 'none', fontFamily: 'inherit',
                        }}
                        onFocus={e => e.target.style.borderColor = T.focusRing}
                        onBlur={e => e.target.style.borderColor = T.border}
                      />
                      <button
                        onClick={handleAddAlert}
                        disabled={!alertPrice || parseFloat(alertPrice) <= 0}
                        style={{
                          background: (!alertPrice || parseFloat(alertPrice) <= 0) ? T.border : T.accent,
                          color: (!alertPrice || parseFloat(alertPrice) <= 0) ? T.textMute : '#fff',
                          border: 'none', borderRadius: 9999, padding: '8px 18px',
                          fontSize: 12, fontWeight: 600,
                          cursor: (!alertPrice || parseFloat(alertPrice) <= 0) ? 'default' : 'pointer',
                          transition: 'all 0.15s', flexShrink: 0,
                        }}
                      >Set</button>
                    </div>

                    {/* Active alerts */}
                    {tickerAlerts.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ fontSize: 9, color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>Active</div>
                        {tickerAlerts.map(a => (
                          <div key={a.id} style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            background: T.cardBg, borderRadius: 12,
                            padding: '8px 12px', border: `1px solid ${T.border}`,
                          }}>
                            <span style={{ fontSize: 14, color: T.accent }}>{a.direction === 'above' ? '↑' : '↓'}</span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: T.text, flex: 1 }}>${a.targetPrice.toFixed(2)}</span>
                            <button onClick={() => onRemoveAlert?.(a.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textFaint, fontSize: 16, padding: 0, lineHeight: 1 }}
                              onMouseEnter={e => e.currentTarget.style.color = T.negative}
                              onMouseLeave={e => e.currentTarget.style.color = T.textFaint}
                            >×</button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Triggered */}
                    {triggeredAlerts.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ fontSize: 9, color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>Triggered</div>
                        {triggeredAlerts.map(a => (
                          <div key={a.id} style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            background: T.cardBg, borderRadius: 12, opacity: 0.6,
                            padding: '8px 12px', border: `1px solid ${T.border}`,
                          }}>
                            <span style={{ fontSize: 13, color: T.positive }}>✓</span>
                            <span style={{ fontSize: 12, color: T.textMute, flex: 1 }}>{a.direction === 'above' ? '↑' : '↓'} ${a.targetPrice.toFixed(2)}</span>
                            <button onClick={() => onRemoveAlert?.(a.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textFaint, fontSize: 16, padding: 0, lineHeight: 1 }}>×</button>
                          </div>
                        ))}
                      </div>
                    )}

                    {tickerAlerts.length === 0 && triggeredAlerts.length === 0 && (
                      <div style={{ fontSize: 12, color: T.textFaint, textAlign: 'center', padding: '6px 0' }}>
                        No alerts set for {ticker}
                      </div>
                    )}
                  </div>,
                  document.body
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
