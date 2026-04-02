import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useT, getFundTicker, getFundBaseName } from '../theme';
import { logSearchEvent } from '../api/mutualFundApi';

const PAGE_SIZE = 20;

function useTickerSearch(query) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const lastLoggedQueryRef = useRef('');

  useEffect(() => {
    const q = query.trim();
    if (!q) { setResults([]); return; }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/yahoo-api/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0&listsCount=0`,
          { headers: { 'Accept': 'application/json' } }
        );
        const data = await res.json();
        setResults(data?.quotes?.filter(q => q.symbol) ?? []);

        // Log each unique lookup query once per input change cycle.
        if (q.length >= 2 && lastLoggedQueryRef.current !== q.toUpperCase()) {
          lastLoggedQueryRef.current = q.toUpperCase();
          logSearchEvent({ ticker: q.toUpperCase(), timestamp: new Date().toISOString() }).catch(() => {});
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  return { results, loading };
}

export default function PositionsPanel({ funds, selectedIdx, onSelect, lastRefresh, customTickers = [], favorites = new Set(), onToggleFav, onAddFund, onRemoveFund }) {
  const T = useT();
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [addOpen, setAddOpen] = useState(false);
  const [addInput, setAddInput] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const scrollRef = useRef(null);
  const addInputRef = useRef(null);
  const dropdownRef = useRef(null);

  const { results: suggestions, loading: suggestLoading } = useTickerSearch(addInput);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e) => {
      if (!dropdownRef.current?.contains(e.target) && !addInputRef.current?.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  // Open dropdown when suggestions arrive
  useEffect(() => {
    if (suggestions.length > 0 && addInput.trim()) {
      setDropdownOpen(true);
      setHighlightIdx(-1);
    } else {
      setDropdownOpen(false);
    }
  }, [suggestions, addInput]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return funds;
    return funds.filter(f => {
      const ticker = getFundTicker(f).toLowerCase();
      const name = getFundBaseName(f).toLowerCase();
      return ticker.includes(q) || name.includes(q);
    });
  }, [funds, search]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
      setVisibleCount(c => c < filtered.length ? c + PAGE_SIZE : c);
    }
  }, [filtered.length]);

  const visible = filtered.slice(0, visibleCount);

  const handleAdd = async (sym) => {
    const ticker = (sym || addInput).trim().toUpperCase();
    if (!ticker) return;
    setDropdownOpen(false);
    setAddLoading(true);
    setAddError('');
    try {
      await onAddFund(ticker);
      setAddInput('');
      setAddOpen(false);
    } catch (err) {
      setAddError(err?.message || `"${ticker}" not found`);
    } finally {
      setAddLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (!dropdownOpen || suggestions.length === 0) {
      if (e.key === 'Enter') handleAdd();
      if (e.key === 'Escape') setAddOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIdx >= 0) {
        handleAdd(suggestions[highlightIdx].symbol);
      } else {
        handleAdd();
      }
    } else if (e.key === 'Escape') {
      setDropdownOpen(false);
    }
  };

  const typeLabel = (type) => {
    if (!type) return null;
    const map = { EQUITY: 'Stock', ETF: 'ETF', MUTUALFUND: 'Fund', INDEX: 'Index', CURRENCY: 'FX', FUTURE: 'Futures', CRYPTOCURRENCY: 'Crypto' };
    return map[type] ?? type;
  };

  const refreshStr = lastRefresh
    ? lastRefresh.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  return (
    <div style={{
      width: 260, background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: 14,
      backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Watchlist</span>
        <button
          onClick={() => { setAddOpen(v => !v); setAddError(''); setAddInput(''); setDropdownOpen(false); setTimeout(() => addInputRef.current?.focus(), 50); }}
          title="Add fund"
          style={{
            width: 26, height: 26, borderRadius: '50%',
            background: addOpen ? T.accent : T.inputBg,
            border: `1px solid ${addOpen ? T.accent : T.border}`,
            color: addOpen ? '#fff' : T.textMute,
            fontSize: 18, lineHeight: 1, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.18s', flexShrink: 0,
          }}
        >+</button>
      </div>

      {/* Add fund input */}
      {addOpen && (
        <div style={{ padding: '8px 10px', borderBottom: `1px solid ${T.border}`, background: T.inputBg, position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              ref={addInputRef}
              value={addInput}
              onChange={e => { setAddInput(e.target.value.toUpperCase()); setAddError(''); }}
              onKeyDown={handleKeyDown}
              placeholder="Ticker (e.g. AAPL, VWELX)"
              style={{
                flex: 1, background: T.solidPanel, border: `1px solid ${addError ? T.negative : T.border}`,
                borderRadius: 8, padding: '6px 10px', fontSize: 12, color: T.text,
                outline: 'none', fontFamily: 'inherit', letterSpacing: '0.02em',
              }}
              onFocus={e => { if (!addError) e.target.style.borderColor = T.focusRing; }}
              onBlur={e => { e.target.style.borderColor = addError ? T.negative : T.border; }}
            />
            <button
              onClick={() => handleAdd()}
              disabled={addLoading || !addInput.trim()}
              style={{
                background: !addInput.trim() ? T.border : T.accent,
                color: !addInput.trim() ? T.textMute : '#fff',
                border: 'none', borderRadius: 8, padding: '6px 12px',
                fontSize: 11, fontWeight: 600, cursor: !addInput.trim() ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
                transition: 'all 0.15s',
              }}
            >
              {addLoading
                ? <div style={{ width: 10, height: 10, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                : 'Add'}
            </button>
          </div>

          {/* Autocomplete dropdown */}
          {dropdownOpen && (
            <div
              ref={dropdownRef}
              style={{
                position: 'absolute', top: '100%', left: 10, right: 10,
                background: T.solidPanel, border: `1px solid ${T.border}`,
                borderRadius: 10, marginTop: 4, maxHeight: 250,
                overflowY: 'auto',
                boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                zIndex: 100,
              }}
            >
              {suggestLoading && suggestions.length === 0 && (
                <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, border: `2px solid ${T.border}`, borderTopColor: T.accent, borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: T.textMute }}>Searching…</span>
                </div>
              )}
              {suggestions.map((s, i) => {
                const label = typeLabel(s.quoteType);
                const isHighlighted = i === highlightIdx;
                return (
                  <div
                    key={s.symbol}
                    onMouseDown={e => { e.preventDefault(); handleAdd(s.symbol); }}
                    onMouseEnter={() => setHighlightIdx(i)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '7px 12px', cursor: 'pointer', gap: 8,
                      background: isHighlighted ? `${T.accent}18` : 'transparent',
                      borderBottom: i < suggestions.length - 1 ? `1px solid ${T.border}` : 'none',
                      transition: 'background 0.1s',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: isHighlighted ? T.accent : T.text }}>{s.symbol}</span>
                        {label && (
                          <span style={{
                            fontSize: 8, fontWeight: 600, letterSpacing: '0.04em',
                            color: T.accentSoft, background: `${T.accent}18`,
                            border: `1px solid ${T.accent}30`, borderRadius: 4,
                            padding: '1px 4px',
                          }}>{label.toUpperCase()}</span>
                        )}
                      </div>
                      {s.longname || s.shortname ? (
                        <div style={{ fontSize: 10, color: T.textMute, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                          {s.longname || s.shortname}
                        </div>
                      ) : null}
                    </div>
                    {s.exchange && (
                      <span style={{ fontSize: 9, color: T.textFaint, flexShrink: 0 }}>{s.exchDisp || s.exchange}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {addError && <div style={{ fontSize: 10, color: T.negative, marginTop: 5, paddingLeft: 2 }}>{addError}</div>}
          <div style={{ fontSize: 9, color: T.textFaint, marginTop: 4, paddingLeft: 2 }}>
            Any Yahoo Finance ticker — stocks, bonds, ETFs, mutual funds
          </div>
        </div>
      )}

      {/* Search */}
      <div style={{ padding: '8px 10px', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: 9999, display: 'flex', alignItems: 'center', padding: '5px 10px', gap: 6 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={T.textMute} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setVisibleCount(PAGE_SIZE); }}
            placeholder="Search symbol or name…"
            style={{ background: 'none', border: 'none', outline: 'none', fontSize: 11, color: T.text, flex: 1, width: 0 }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textMute, padding: 0, fontSize: 14, lineHeight: 1 }}>×</button>
          )}
        </div>
      </div>

      <div style={{ padding: '5px 14px', display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${T.border}` }}>
        <span style={{ fontSize: 10, color: T.textMute, fontWeight: 600 }}>Symbol</span>
        <span style={{ fontSize: 10, color: T.textMute }}>Last / Chg</span>
      </div>

      <div ref={scrollRef} onScroll={handleScroll} className="panel-scroll" style={{ overflowY: 'auto', flex: 1 }}>
        {visible.length === 0 && (
          <div style={{ padding: '24px 14px', textAlign: 'center', fontSize: 11, color: T.textFaint }}>No funds found</div>
        )}
        {visible.map((fund) => {
          const globalIdx = funds.indexOf(fund);
          const isSelected = globalIdx === selectedIdx;
          const ticker = getFundTicker(fund);
          const name = getFundBaseName(fund);
          const price = fund.price;
          const changePct = fund.changePct;
          const up = changePct != null ? changePct >= 0 : null;
          const isCustom = fund.custom || customTickers.includes(ticker);
          return (
            <div key={fund.id ?? ticker}
              style={{
                display: 'flex', alignItems: 'stretch',
                borderBottom: `1px solid ${T.border}`,
                background: isSelected ? `${T.accent}14` : 'transparent',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = T.hover; }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ width: 3, flexShrink: 0, background: isSelected ? T.accent : 'transparent', transition: 'background 0.12s' }} />
              <div
                onClick={() => onSelect(globalIdx)}
                style={{ flex: 1, padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: 0, cursor: 'pointer' }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: isSelected ? T.accent : T.text }}>{ticker}</span>
                    {isCustom && (
                      <span style={{ fontSize: 8, color: T.accentSoft, background: `${T.accent}18`, border: `1px solid ${T.accent}30`, borderRadius: 4, padding: '1px 4px', fontWeight: 600, letterSpacing: '0.03em' }}>CUSTOM</span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: T.textMute, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 112 }}>{name}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 11, color: T.text, fontWeight: 600 }}>
                    {price != null ? price.toFixed(2) : '—'}
                  </div>
                  {changePct != null ? (
                    <div style={{ fontSize: 10, color: up ? T.positive : T.negative }}>
                      {up ? '+' : ''}{changePct.toFixed(2)}%
                    </div>
                  ) : (
                    <div style={{ fontSize: 10, color: T.textFaint }}>—</div>
                  )}
                </div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); onToggleFav?.(ticker); }}
                title={favorites.has(ticker) ? 'Remove from favorites' : 'Add to favorites'}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: favorites.has(ticker) ? '#facc15' : T.textFaint,
                  fontSize: 13, padding: '0 2px', flexShrink: 0, display: 'flex', alignItems: 'center',
                  transition: 'color 0.12s',
                }}
                onMouseEnter={e => { if (!favorites.has(ticker)) e.currentTarget.style.color = '#facc15'; }}
                onMouseLeave={e => { if (!favorites.has(ticker)) e.currentTarget.style.color = T.textFaint; }}
              >{favorites.has(ticker) ? '★' : '☆'}</button>
              <button
                onClick={e => { e.stopPropagation(); onRemoveFund(ticker); }}
                title="Remove from watchlist"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: T.textFaint, fontSize: 14, padding: '0 8px', flexShrink: 0, display: 'flex', alignItems: 'center',
                  transition: 'color 0.12s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = T.negative}
                onMouseLeave={e => e.currentTarget.style.color = T.textFaint}
              >×</button>
            </div>
          );
        })}
        {visibleCount < filtered.length && (
          <div style={{ padding: '10px 14px', textAlign: 'center' }}>
            <div style={{ width: 14, height: 14, border: `2px solid ${T.spinnerTrack}`, borderTopColor: T.spinnerAccent, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
          </div>
        )}
      </div>

      {refreshStr && (
        <div style={{ padding: '6px 14px', borderTop: `1px solid ${T.border}`, fontSize: 9, color: T.textFaint, textAlign: 'right' }}>
          Updated {refreshStr}
        </div>
      )}
    </div>
  );
}