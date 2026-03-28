import { useState, useEffect, useCallback } from 'react';
import { THEMES, ThemeCtx, CAPM_SUPPORTED, getFundTicker, getFundBaseName, FONT_UI } from '../theme';
import { fetchFutureValue, fetchYahooQuote } from '../api/mutualFundApi';

import TickerBar from './TickerBar';
import PositionsPanel from './PositionsPanel';
import FundHeader from './FundHeader';
import ChartPanel from './ChartPanel';
import NewsPanel from './NewsPanel';
import GoldmanBot from './GoldmanBot';
import SettingsPanel from './SettingsPanel';
import AccountPanel from './AccountPanel';

const GS_LOGO_SRC = 'https://companieslogo.com/img/orig/GS.D-55ee2e2e.png?t=1740321324';

function TopBar({ onSettings, onAccount }) {
  const iconStroke = 'rgba(255,255,255,0.88)';
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
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <img
          src={GS_LOGO_SRC}
          alt="Goldman Sachs"
          width={28}
          height={28}
          draggable={false}
          style={{ display: 'block', flexShrink: 0 }}
        />
        <span style={{
          fontSize: 14,
          fontWeight: 600,
          color: '#fff',
          letterSpacing: '0.01em',
          whiteSpace: 'nowrap',
        }}>Fund Dashboard</span>
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          type="button"
          onClick={onAccount}
          title="Account"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 8,
            display: 'flex',
            alignItems: 'center',
            borderRadius: 6,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={iconStroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onSettings}
          title="Settings"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 8,
            display: 'flex',
            alignItems: 'center',
            borderRadius: 6,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
        >
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
        fetch(`/yahoo-api/v8/finance/chart/${sym}?interval=1d&range=1d`, { signal: AbortSignal.timeout(8000) })
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
          // Send email alerts
          try {
            const emailCfg = JSON.parse(localStorage.getItem('mf_email_alerts_v1') || '{}');
            const profileData = JSON.parse(localStorage.getItem('mf_profile_v1') || '{}');
            const to = emailCfg.email || profileData.email;
            if (emailCfg.enabled && to) {
              triggered.forEach(alert => {
                const fund = results.find(f => f?.id === alert.ticker);
                fetch('/api/email/send-alert', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    to,
                    ticker: alert.ticker,
                    targetPrice: alert.targetPrice,
                    direction: alert.direction,
                    currentPrice: fund?.price ?? null,
                  }),
                }).catch(() => {});
              });
            }
          } catch {}
        }
      } catch {}
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
      const j = await fetch(`/yahoo-api/v8/finance/chart/${t}?interval=1d&range=1d`, { signal: AbortSignal.timeout(8000) }).then(r => r.json());
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
    const iv = setInterval(fetchAllPrices, 15000);
    return () => clearInterval(iv);
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
      } catch {}
      return next;
    });
  }, []);

  const addAlert = useCallback((ticker, targetPrice, direction) => {
    const a = { id: Date.now(), ticker, targetPrice: parseFloat(targetPrice), direction, triggered: false };
    setAlerts(prev => {
      const next = [...prev, a];
      try { localStorage.setItem('mf_alerts_v1', JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const removeAlert = useCallback((id) => {
    setAlerts(prev => {
      const next = prev.filter(a => a.id !== id);
      try { localStorage.setItem('mf_alerts_v1', JSON.stringify(next)); } catch {}
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
        const hist = await fetch(`/yahoo-api/v8/finance/chart/${fund.id}?interval=1mo&range=1y`)
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
        <TickerBar />
        <TopBar onSettings={() => setSettingsOpen(true)} onAccount={() => setAccountOpen(true)} />
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
