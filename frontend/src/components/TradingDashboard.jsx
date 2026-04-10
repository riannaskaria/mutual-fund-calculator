import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { THEMES, ThemeCtx, CAPM_SUPPORTED, getFundTicker, getFundBaseName, FONT_UI } from '../theme';
import { fetchFutureValue, fetchYahooQuote, fetchMorningBrief, sendDigestEmail } from '../api/mutualFundApi';
import API_BASE from '../apiBase';

import TickerBar from './TickerBar';
import PositionsPanel from './PositionsPanel';
import FundHeader from './FundHeader';
import ChartPanel from './ChartPanel';
import TrendingPanel from './TrendingPanel';
import NewsPanel from './NewsPanel';
import GoldmanBot from './GoldmanBot';
import SettingsPanel from './SettingsPanel';
import AccountPanel from './AccountPanel';

const GS_LOGO_SRC = 'https://companieslogo.com/img/orig/GS.D-55ee2e2e.png?t=1740321324';

function TopBar({ onSettings, onAccount, favorites = new Set(), articles = [] }) {
  const iconStroke = 'rgba(255,255,255,0.88)';
  const dropRef     = useRef(null);
  const pillRef     = useRef(null); // ref on the pill button itself for position calc
  const [intelOpen, setIntelOpen]   = useState(false);
  const [intelStatus, setIntelStatus] = useState(null); // null | 'loading' | 'done' | 'error'
  const [intelText, setIntelText]   = useState('');
  const [intelFunds, setIntelFunds] = useState([]);
  const [intelAt, setIntelAt]       = useState(null);
  const [dropPos, setDropPos]       = useState({ top: 0, right: 0 });

  const profileName = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('mf_profile_v1') || '{}').name || ''; }
    catch { return ''; }
  }, []);

  // close dropdown on outside click
  useEffect(() => {
    if (!intelOpen) return;
    const h = (e) => { if (!dropRef.current?.contains(e.target)) setIntelOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [intelOpen]);

  const fetchBrief = useCallback(async () => {
    const tickers = [...favorites];
    if (!tickers.length) return;
    setIntelStatus('loading');
    setIntelText('');
    try {
      const res = await fetchMorningBrief({ favorites: tickers, articles, name: profileName });
      setIntelText(res.brief || '');
      setIntelFunds(res.funds || []);
      setIntelAt(res.generatedAt || new Date().toISOString());
      setIntelStatus('done');
      // Auto-send to registered alerts email (non-blocking)
      try {
        const alertsEmail = JSON.parse(localStorage.getItem('mf_email_alerts_v1') || '{}').email;
        if (alertsEmail) sendDigestEmail({ to: alertsEmail, name: profileName, favorites: tickers, articles }).catch(() => {});
      } catch { /* ignore */ }
    } catch {
      setIntelStatus('error');
    }
  }, [favorites, articles, profileName]);

  const handleToggle = () => {
    const next = !intelOpen;
    if (next) {
      // Calculate fixed viewport position from the pill button
      const rect = pillRef.current?.getBoundingClientRect();
      if (rect) setDropPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
      if (intelStatus === null || intelStatus === 'error') fetchBrief();
    }
    setIntelOpen(next);
  };

  const hasFavs = favorites.size > 0;

  return (
    <header style={{
      background: 'linear-gradient(90deg, #092C61 0%, #7399C6 100%)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.12)',
      padding: '10px 18px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      flexShrink: 0,
      position: 'relative',
      zIndex: 200,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <img src={GS_LOGO_SRC} alt="Goldman Sachs" width={28} height={28} draggable={false} style={{ display: 'block', flexShrink: 0 }} />
        <span style={{ fontSize: 14, fontWeight: 600, color: '#fff', letterSpacing: '0.01em', whiteSpace: 'nowrap' }}>Fund Dashboard</span>
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>

        {/* ── Intelligence pill ── */}
        <div ref={dropRef} style={{ position: 'relative' }}>
          <button
            ref={pillRef}
            type="button"
            onClick={handleToggle}
            title={hasFavs ? 'GS Intelligence — AI portfolio summary' : 'Star funds to unlock Intelligence'}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: intelOpen ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.18)',
              border: '1px solid rgba(255,255,255,0.45)',
              borderRadius: 20, padding: '5px 13px 5px 9px',
              cursor: hasFavs ? 'pointer' : 'default',
              opacity: hasFavs ? 1 : 0.45,
              transition: 'background 0.15s, border-color 0.15s',
              color: '#fff',
              boxShadow: '0 1px 6px rgba(0,0,0,0.18)',
            }}
            onMouseEnter={e => { if (hasFavs) e.currentTarget.style.background = 'rgba(255,255,255,0.30)'; }}
            onMouseLeave={e => { if (!intelOpen) e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; }}
          >
            {/* sparkle icon */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2 L14.5 9.5 L22 12 L14.5 14.5 L12 22 L9.5 14.5 L2 12 L9.5 9.5 Z"/>
            </svg>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>Intelligence</span>
            {/* loading dot */}
            {intelStatus === 'loading' && (
              <div style={{ width: 7, height: 7, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'topbarSpin 0.7s linear infinite' }} />
            )}
          </button>

          {/* ── Dropdown panel — fixed so it escapes the header stacking context ── */}
          {intelOpen && (
            <div style={{
              position: 'fixed', top: dropPos.top, right: dropPos.right,
              width: 360,
              background: 'linear-gradient(160deg, #0d1f38 0%, #0a1628 100%)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 16,
              boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
              overflow: 'hidden',
              zIndex: 500,
            }}>
              {/* panel header */}
              <div style={{ padding: '14px 18px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(115,153,198,0.9)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2 L14.5 9.5 L22 12 L14.5 14.5 L12 22 L9.5 14.5 L2 12 L9.5 9.5 Z"/>
                  </svg>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#e8edf2', letterSpacing: '0.01em' }}>Portfolio Intelligence</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {intelStatus === 'done' && (
                    <button
                      onClick={fetchBrief}
                      title="Refresh"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 2, display: 'flex', alignItems: 'center' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                      </svg>
                    </button>
                  )}
                  {intelAt && intelStatus === 'done' && (
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>
                      {new Date(intelAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>

              {/* content */}
              <div style={{ maxHeight: 360, overflowY: 'auto', padding: '14px 18px' }}>

                {intelStatus === 'loading' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '28px 0' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.08)', borderTopColor: '#7399C6', animation: 'topbarSpin 0.8s linear infinite' }} />
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Analyzing {favorites.size} fund{favorites.size > 1 ? 's' : ''}…</span>
                  </div>
                )}

                {intelStatus === 'error' && (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <p style={{ fontSize: 12, color: 'rgba(220,100,80,0.9)', marginBottom: 10 }}>Could not generate summary.</p>
                    <button onClick={fetchBrief} style={{ fontSize: 11, color: '#7399C6', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Try again</button>
                  </div>
                )}

                {intelStatus === 'done' && intelText && (
                  <div>
                    {/* AI brief paragraphs */}
                    {intelText.split(/\n{2,}/).map((para, i) => (
                      <p key={i} style={{ margin: i === 0 ? '0 0 11px' : '0 0 11px', fontSize: 12.5, color: 'rgba(232,237,242,0.88)', lineHeight: 1.72 }}>
                        {para.trim().split(/\*\*(.*?)\*\*/).map((seg, j) =>
                          j % 2 === 1
                            ? <strong key={j} style={{ color: '#a8c4e8', fontWeight: 700 }}>{seg}</strong>
                            : seg
                        )}
                      </p>
                    ))}

                    {/* Fund chips */}
                    {intelFunds.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                        {intelFunds.map(f => {
                          const up = f.changePct != null && f.changePct >= 0;
                          const clr = up ? '#4ade80' : '#f87171';
                          const pct = f.changePct != null ? `${up ? '+' : ''}${f.changePct.toFixed(2)}%` : '—';
                          return (
                            <div key={f.ticker} style={{
                              background: 'rgba(255,255,255,0.06)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: 8, padding: '5px 10px',
                              display: 'flex', alignItems: 'center', gap: 6,
                            }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#e8edf2' }}>{f.ticker}</span>
                              <span style={{ fontSize: 10, color: clr, fontWeight: 600 }}>{pct}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {intelStatus === null && (
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', textAlign: 'center', padding: '20px 0' }}>Loading your portfolio summary…</p>
                )}
              </div>

              {/* powered-by footer */}
              <div style={{ padding: '10px 18px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(115,153,198,0.6)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2 L14.5 9.5 L22 12 L14.5 14.5 L12 22 L9.5 14.5 L2 12 L9.5 9.5 Z"/>
                </svg>
                <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.02em' }}>
                  Powered by <strong style={{ color: 'rgba(115,153,198,0.7)', fontWeight: 600 }}>GS Bot</strong> &nbsp;·&nbsp; <strong style={{ color: 'rgba(115,153,198,0.7)', fontWeight: 600 }}>Google Gemini</strong>
                </span>
              </div>
            </div>
          )}

          <style>{`
            @keyframes topbarSpin {
              from { transform: rotate(0deg); }
              to   { transform: rotate(360deg); }
            }
          `}</style>
        </div>

        {/* ── Account button ── */}
        <button type="button" onClick={onAccount} title="Account" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, display: 'flex', alignItems: 'center', borderRadius: 6 }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={iconStroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
          </svg>
        </button>

        {/* ── Settings button ── */}
        <button type="button" onClick={onSettings} title="Settings" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, display: 'flex', alignItems: 'center', borderRadius: 6 }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={iconStroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
    </header>
  );
}

export default function TradingDashboard() {
  const [contentIn, setContentIn] = useState(false);
  const [funds, setFunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [investmentAmount, setInvestmentAmount] = useState('10000');
  const [years, setYears] = useState('10');
  const [futureValue, setFutureValue] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [theme, setTheme] = useState('light');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [newsArticles, setNewsArticles] = useState([]);
  const [calcHistory, setCalcHistory] = useState([]);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [newsOpen, setNewsOpen] = useState(true);
  const [favorites, setFavorites] = useState(() => {
    try {
      const acc = JSON.parse(localStorage.getItem('mf_account_v1') || '{}');
      return new Set(acc.favorites || []);
    } catch { return new Set(); }
  });
  const [alerts, setAlerts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mf_alerts_v1') || '[]'); }
    catch { return []; }
  });
  const [alertToast, setAlertToast] = useState(null);
  const [customTickers, setCustomTickers] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mf_custom_tickers') || '[]'); }
    catch { return []; }
  });
  const [hiddenTickers, setHiddenTickers] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('mf_hidden_tickers') || '[]')); }
    catch { return new Set(); }
  });
  const T = THEMES[theme];

  useEffect(() => {
    const t = setTimeout(() => setContentIn(true), 80);
    return () => clearTimeout(t);
  }, []);

  // Fetch all fund prices (called on mount + every 15s)
  const fetchAllPrices = useCallback(() => {
    const custom = (() => { try { return JSON.parse(localStorage.getItem('mf_custom_tickers') || '[]'); } catch { return []; } })();
    const hidden = (() => { try { return new Set(JSON.parse(localStorage.getItem('mf_hidden_tickers') || '[]')); } catch { return new Set(); } })();
    const extra = custom.filter(t => !CAPM_SUPPORTED.has(t));
    const tickers = [...CAPM_SUPPORTED, ...extra].filter(t => !hidden.has(t));
    Promise.all(
      tickers.map(sym =>
        fetch(`${API_BASE}/yahoo-api/v8/finance/chart/${sym}?interval=1d&range=1d`, { signal: AbortSignal.timeout(8000) })
          .then(r => r.json())
          .then(j => {
            const meta = j?.chart?.result?.[0]?.meta;
            if (!meta?.symbol) return null;
            const price = meta.regularMarketPrice ?? null;
            const prev = meta.chartPreviousClose ?? null;
            const change = price != null && prev != null ? price - prev : null;
            const changePct = change != null && prev ? (change / prev) * 100 : null;
            return { id: meta.symbol, name: meta.longName || meta.shortName || meta.symbol, ticker: meta.symbol, price, change, changePct, custom: extra.includes(sym) };
          })
          .catch(() => null)
      )
    ).then(results => {
      setFunds(results.filter(Boolean));
      setLoading(false);
      setLastRefresh(new Date());
      // Check price alerts
      try {
        const currentAlerts = JSON.parse(localStorage.getItem('mf_alerts_v1') || '[]');
        const triggered = [];
        const updatedAlerts = currentAlerts.map(alert => {
          if (alert.triggered) return alert;
          const fund = results.find(f => f?.id === alert.ticker);
          if (!fund?.price) return alert;
          const hit = alert.direction === 'above'
            ? fund.price >= alert.targetPrice
            : fund.price <= alert.targetPrice;
          if (hit) { triggered.push(alert); return { ...alert, triggered: true }; }
          return alert;
        });
        if (triggered.length > 0) {
          localStorage.setItem('mf_alerts_v1', JSON.stringify(updatedAlerts));
          setAlerts(updatedAlerts);
          setAlertToast(triggered[0]);
          // Browser notifications
          triggered.forEach(alert => {
            const fund = results.find(f => f?.id === alert.ticker);
            const price = fund?.price != null ? `$${fund.price.toFixed(2)}` : '';
            const body = `${alert.ticker} is ${alert.direction} $${alert.targetPrice.toFixed(2)}${price ? ` — now at ${price}` : ''}`;
            if (Notification.permission === 'granted') {
              new Notification('Fund Alert Triggered', { body, icon: '/favicon.svg' });
            } else if (Notification.permission !== 'denied') {
              Notification.requestPermission().then(p => {
                if (p === 'granted') new Notification('Fund Alert Triggered', { body, icon: '/favicon.svg' });
              });
            }
          });
          // Send email alerts
          try {
            const emailCfg = JSON.parse(localStorage.getItem('mf_email_alerts_v1') || '{}');
            const profileData = JSON.parse(localStorage.getItem('mf_profile_v1') || '{}');
            const to = emailCfg.email || profileData.email;
            if (emailCfg.enabled && to) {
              triggered.forEach(alert => {
                const fund = results.find(f => f?.id === alert.ticker);
                fetch(`${API_BASE}/api/email/send-alert`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    to,
                    ticker: alert.ticker,
                    targetPrice: alert.targetPrice,
                    direction: alert.direction,
                    currentPrice: fund?.price ?? null,
                  }),
                }).catch(() => { });
              });
            }
          } catch { }
        }
      } catch { }
    });
  }, []);

  const handleAddCustomFund = useCallback(async (sym) => {
    const t = sym.trim().toUpperCase();
    if (!t) return;
    const custom = (() => { try { return JSON.parse(localStorage.getItem('mf_custom_tickers') || '[]'); } catch { return []; } })();
    if (custom.includes(t)) return;
    // Un-hide if previously hidden
    setHiddenTickers(prev => {
      if (!prev.has(t)) return prev;
      const next = new Set(prev); next.delete(t);
      localStorage.setItem('mf_hidden_tickers', JSON.stringify([...next]));
      return next;
    });
    if (!CAPM_SUPPORTED.has(t)) {
      const j = await fetch(`${API_BASE}/yahoo-api/v8/finance/chart/${t}?interval=1d&range=1d`, { signal: AbortSignal.timeout(8000) }).then(r => r.json());
      const meta = j?.chart?.result?.[0]?.meta;
      if (!meta?.symbol) throw new Error(`"${t}" not found on Yahoo Finance`);
      setCustomTickers(prev => {
        const next = [...prev.filter(x => x !== t), t];
        localStorage.setItem('mf_custom_tickers', JSON.stringify(next));
        return next;
      });
    }
    fetchAllPrices();
  }, [fetchAllPrices]);

  // Removes any fund from the visible list (custom → deleted; standard → hidden)
  const handleRemoveFund = useCallback((sym) => {
    if (customTickers.includes(sym)) {
      setCustomTickers(prev => {
        const next = prev.filter(t => t !== sym);
        localStorage.setItem('mf_custom_tickers', JSON.stringify(next));
        return next;
      });
    } else {
      setHiddenTickers(prev => {
        const next = new Set(prev); next.add(sym);
        localStorage.setItem('mf_hidden_tickers', JSON.stringify([...next]));
        return next;
      });
    }
    setFunds(prev => {
      const removedIdx = prev.findIndex(f => f.id === sym);
      if (removedIdx !== -1) {
        setSelectedIdx(cur => {
          if (removedIdx < cur) return cur - 1;
          if (removedIdx === cur) return Math.max(0, Math.min(cur, prev.length - 2));
          return cur;
        });
      }
      return prev.filter(f => f.id !== sym);
    });
  }, [customTickers]);

  useEffect(() => {
    fetchAllPrices();
    const iv = setInterval(fetchAllPrices, 30000);
    // Re-check immediately when user returns to tab
    const onVisible = () => { if (document.visibilityState === 'visible') fetchAllPrices(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(iv); document.removeEventListener('visibilitychange', onVisible); };
  }, [fetchAllPrices]);

  // Fetch quote only when the selected ticker actually changes, not on every 15s price refresh
  const selectedFundId = funds[selectedIdx]?.id ?? null;
  useEffect(() => {
    if (!selectedFundId) return;
    setQuote(null);
    setQuoteLoading(true);
    fetchYahooQuote(selectedFundId)
      .then(setQuote)
      .catch(err => console.warn('Quote fetch failed:', err))
      .finally(() => setQuoteLoading(false));
  }, [selectedFundId]);

  // Auto-dismiss alert toast after 7s
  useEffect(() => {
    if (!alertToast) return;
    const t = setTimeout(() => setAlertToast(null), 7000);
    return () => clearTimeout(t);
  }, [alertToast]);

  const toggleFav = useCallback((ticker) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(ticker)) next.delete(ticker); else next.add(ticker);
      try {
        const acc = JSON.parse(localStorage.getItem('mf_account_v1') || '{}');
        acc.favorites = [...next];
        localStorage.setItem('mf_account_v1', JSON.stringify(acc));
      } catch { }
      return next;
    });
  }, []);

  const addAlert = useCallback((ticker, targetPrice, direction) => {
    const a = { id: Date.now(), ticker, targetPrice: parseFloat(targetPrice), direction, triggered: false };
    setAlerts(prev => {
      const next = [...prev, a];
      try { localStorage.setItem('mf_alerts_v1', JSON.stringify(next)); } catch { }
      return next;
    });
  }, []);

  const resetAlert = useCallback((id) => {
    setAlerts(prev => {
      const next = prev.map(a => a.id === id ? { ...a, triggered: false } : a);
      try { localStorage.setItem('mf_alerts_v1', JSON.stringify(next)); } catch { }
      return next;
    });
  }, []);

  const removeAlert = useCallback((id) => {
    setAlerts(prev => {
      const next = prev.filter(a => a.id !== id);
      try { localStorage.setItem('mf_alerts_v1', JSON.stringify(next)); } catch { }
      return next;
    });
  }, []);

  const saveResult = useCallback((fund, amount, yearsNum, result) => {
    setFutureValue(result);
    setCalcHistory(prev => {
      const filtered = prev.filter(h => h.ticker !== fund.id);
      return [{ ticker: fund.id, name: getFundBaseName(fund), amount, years: yearsNum, result }, ...filtered].slice(0, 10);
    });
  }, []);

  const handleCalculate = useCallback(async () => {
    const fund = funds[selectedIdx];
    if (!fund) return;
    const amount = parseFloat(investmentAmount);
    const yearsNum = parseFloat(years);
    if (!amount || !yearsNum || amount <= 0 || yearsNum <= 0) return;
    setCalculating(true);
    try {
      const result = await fetchFutureValue(fund.id, amount, yearsNum);
      saveResult(fund, amount, yearsNum, result);
    } catch {
      // Client-side CAPM fallback when backend is unavailable
      try {
        const hist = await fetch(`${API_BASE}/yahoo-api/v8/finance/chart/${fund.id}?interval=1mo&range=1y`)
          .then(r => r.json());
        const closes = hist?.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.filter(Boolean) ?? [];
        let expectedReturn = 0.08;
        if (closes.length >= 2 && closes[0] !== 0) {
          expectedReturn = (closes[closes.length - 1] - closes[0]) / closes[0];
        }
        const rf = 0.0425;
        const beta = 1.0;
        const capmRate = rf + beta * (expectedReturn - rf);
        saveResult(fund, amount, yearsNum, {
          futureValue: amount * Math.exp(capmRate * yearsNum),
          beta,
          capmRate,
          riskFreeRate: rf,
          expectedReturnRate: expectedReturn,
        });
      } catch {
        const capmRate = 0.08;
        saveResult(fund, amount, yearsNum, {
          futureValue: amount * Math.exp(capmRate * yearsNum),
          beta: 1.0,
          capmRate,
          riskFreeRate: 0.0425,
          expectedReturnRate: 0.08,
        });
      }
    } finally {
      setCalculating(false);
    }
  }, [funds, selectedIdx, investmentAmount, years, saveResult]);

  if (loading) {
    return (
      <ThemeCtx.Provider value={T}>
        <div style={{ minHeight: '100vh', background: T.pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: T.textMute, fontSize: 14 }}>Loading funds...</div>
        </div>
      </ThemeCtx.Provider>
    );
  }

  const selectedFund = funds[selectedIdx] || null;
  const ticker = selectedFund ? getFundTicker(selectedFund) : '';

  return (
    <ThemeCtx.Provider value={T}>
      <div style={{ height: '100vh', background: T.pageBg, display: 'flex', flexDirection: 'column', fontFamily: FONT_UI, overflow: 'hidden' }}>
        <TopBar onSettings={() => setSettingsOpen(true)} onAccount={() => setAccountOpen(true)} favorites={favorites} articles={newsArticles} />
        <TickerBar />
        <div style={{
          flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0, gap: 8, padding: '6px 8px 8px',
          opacity: contentIn ? 1 : 0,
          transform: contentIn ? 'translateY(0)' : 'translateY(-28px)',
          transition: 'opacity 0.5s ease, transform 0.55s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          <PositionsPanel
            funds={funds}
            selectedIdx={selectedIdx}
            lastRefresh={lastRefresh}
            customTickers={customTickers}
            favorites={favorites}
            onToggleFav={toggleFav}
            onAddFund={handleAddCustomFund}
            onRemoveFund={handleRemoveFund}
            onSelect={idx => {
              setSelectedIdx(idx);
              const fund = funds[idx];
              const prev = fund ? calcHistory.find(h => h.ticker === fund.id) : null;
              if (prev) {
                setFutureValue(prev.result);
                setInvestmentAmount(String(prev.amount));
                setYears(String(prev.years));
              } else {
                setFutureValue(null);
              }
            }}
          />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 14, border: `1px solid ${T.border}` }}>
            <TrendingPanel />
            <FundHeader
              ticker={ticker}
              fundName={selectedFund ? getFundBaseName(selectedFund) : ''}
              quote={quote}
              quoteLoading={quoteLoading}
              alerts={alerts}
              onAddAlert={addAlert}
              onRemoveAlert={removeAlert}
            />
            <ChartPanel
              ticker={ticker}
              quote={quote}
              investmentAmount={investmentAmount}
              years={years}
              futureValue={futureValue}
              calculating={calculating}
              onCalculate={handleCalculate}
              setInvestmentAmount={setInvestmentAmount}
              setYears={setYears}
              calcHistory={calcHistory}
            />
          </div>
          <NewsPanel onArticlesUpdate={setNewsArticles} collapsed={!newsOpen} onToggle={() => setNewsOpen(v => !v)} />
        </div>
        <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} theme={theme} setTheme={setTheme} />
        <GoldmanBot funds={funds} quote={quote} articles={newsArticles} selectedFund={selectedFund} />
        <AccountPanel
          open={accountOpen}
          onClose={() => setAccountOpen(false)}
          funds={funds}
          quote={quote}
          selectedFund={selectedFund}
          favorites={favorites}
          onToggleFav={toggleFav}
          alerts={alerts}
          onRemoveAlert={removeAlert}
          onResetAlert={resetAlert}
        />
        {/* Alert toast */}
        {alertToast && (
          <div style={{
            position: 'fixed', bottom: 80, right: 24, zIndex: 1000,
            background: T.accent, color: '#fff',
            borderRadius: 12, padding: '12px 16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.28)',
            fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 10,
            maxWidth: 340, animation: 'slideInRight 0.22s ease',
          }}>
            <span style={{ fontSize: 18 }}>🔔</span>
            <span style={{ flex: 1 }}>
              <strong>{alertToast.ticker}</strong> reached{' '}
              ${alertToast.targetPrice.toFixed(2)}{' '}
              ({alertToast.direction === 'above' ? '↑ above' : '↓ below'} target)
            </span>
            <button onClick={() => setAlertToast(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', fontSize: 18, lineHeight: 1 }}>×</button>
          </div>
        )}
      </div>
    </ThemeCtx.Provider>
  );
}
