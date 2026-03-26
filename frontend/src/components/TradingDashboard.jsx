import { useState, useEffect, useCallback } from 'react';
import { THEMES, ThemeCtx, CAPM_SUPPORTED, getFundTicker, getFundBaseName, FONT_UI, GS_BRAND } from '../theme';
import { fetchFutureValue, fetchYahooQuote } from '../api/mutualFundApi';

import TickerBar from './TickerBar';
import PositionsPanel from './PositionsPanel';
import FundHeader from './FundHeader';
import ChartPanel from './ChartPanel';
import NewsPanel from './NewsPanel';
import GoldmanBot from './GoldmanBot';
import SettingsPanel from './SettingsPanel';
import AccountPanel from './AccountPanel';

const GS_LOGO_SRC = 'https://cdn.gs.com/images/goldman-sachs/v1/gs-favicon.svg';

function TopBar({ onSettings, onAccount }) {
  const iconStroke = 'rgba(255,255,255,0.88)';
  return (
    <header style={{
      background: GS_BRAND.blueSoft,
      borderBottom: '1px solid rgba(0,0,0,0.18)',
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
  const T = THEMES[theme];

  // Load all CAPM-supported funds from Yahoo Finance
  useEffect(() => {
    const tickers = [...CAPM_SUPPORTED];
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
            return { id: meta.symbol, name: meta.longName || meta.shortName || meta.symbol, ticker: meta.symbol, price, change, changePct };
          })
          .catch(() => null)
      )
    ).then(results => {
      setFunds(results.filter(Boolean));
      setLoading(false);
    });
  }, []);

  // Fetch quote whenever selected fund changes
  useEffect(() => {
    const fund = funds[selectedIdx];
    if (!fund) return;
    setQuote(null);
    setQuoteLoading(true);
    fetchYahooQuote(fund.id)
      .then(setQuote)
      .catch(err => console.warn('Quote fetch failed:', err))
      .finally(() => setQuoteLoading(false));
  }, [funds, selectedIdx]);

  const handleCalculate = useCallback(async () => {
    const fund = funds[selectedIdx];
    if (!fund) return;
    const amount = parseFloat(investmentAmount);
    const yearsNum = parseFloat(years);
    if (!amount || !yearsNum || amount <= 0 || yearsNum <= 0) return;
    setCalculating(true);
    try {
      const result = await fetchFutureValue(fund.id, amount, yearsNum);
      setFutureValue(result);
    } catch (err) {
      console.error(err);
    } finally {
      setCalculating(false);
    }
  }, [funds, selectedIdx, investmentAmount, years]);

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
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
          <PositionsPanel
            funds={funds}
            selectedIdx={selectedIdx}
            onSelect={idx => { setSelectedIdx(idx); setFutureValue(null); }}
          />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <FundHeader
              ticker={ticker}
              fundName={selectedFund ? getFundBaseName(selectedFund) : ''}
              quote={quote}
              quoteLoading={quoteLoading}
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
            />
          </div>
          <NewsPanel onArticlesUpdate={setNewsArticles} />
        </div>
        <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} theme={theme} setTheme={setTheme} />
        <GoldmanBot funds={funds} quote={quote} articles={newsArticles} selectedFund={selectedFund} />
        <AccountPanel open={accountOpen} onClose={() => setAccountOpen(false)} funds={funds} quote={quote} selectedFund={selectedFund} />
      </div>
    </ThemeCtx.Provider>
  );
}
