import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useT, getFundTicker, getFundBaseName, getFundLogoDomain, getFundBadgeColor } from '../theme';

const PAGE_SIZE = 20;

function FundAvatar({ ticker, size = 24 }) {
  const T = useT();
  const [imgFailed, setImgFailed] = useState(false);
  const domain = getFundLogoDomain(ticker);

  if (domain && !imgFailed) {
    return (
      <div style={{ width: size, height: size, borderRadius: '50%', background: T.inputBg, border: `1px solid ${T.borderSub}`, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img
          src={`https://logo.clearbit.com/${domain}`}
          width={size - 6} height={size - 6}
          alt=""
          style={{ objectFit: 'contain' }}
          onError={() => setImgFailed(true)}
        />
      </div>
    );
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: getFundBadgeColor(ticker), flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: size * 0.35, color: '#fff', fontWeight: 700 }}>{ticker?.slice(0, 1)}</span>
    </div>
  );
}

export default function PositionsPanel({ funds, selectedIdx, onSelect }) {
  const T = useT();
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const scrollRef = useRef(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return funds;
    return funds.filter(f => {
      const ticker = getFundTicker(f).toLowerCase();
      const name = getFundBaseName(f).toLowerCase();
      return ticker.includes(q) || name.includes(q);
    });
  }, [funds, search]);

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [search]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
      setVisibleCount(c => c < filtered.length ? c + PAGE_SIZE : c);
    }
  }, [filtered.length]);

  const visible = filtered.slice(0, visibleCount);

  return (
    <div style={{
      width: 240, background: T.panelBg, borderRight: `1px solid ${T.border}`,
      display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden',
    }}>
      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${T.border}` }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Positions</span>
      </div>

      <div style={{ padding: '8px 10px', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: 6, display: 'flex', alignItems: 'center', padding: '5px 9px', gap: 6 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={T.textMute} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search symbol or name…"
            style={{ background: 'none', border: 'none', outline: 'none', fontSize: 11, color: T.text, flex: 1, width: 0 }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textMute, padding: 0, fontSize: 14, lineHeight: 1 }}>×</button>
          )}
        </div>
      </div>

      <div style={{ padding: '5px 14px', display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${T.border2}` }}>
        <span style={{ fontSize: 10, color: T.textMute, fontWeight: 600 }}>Symbol</span>
        <span style={{ fontSize: 10, color: T.textMute }}>Last</span>
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
          return (
            <div key={fund.id ?? ticker} onClick={() => onSelect(globalIdx)}
              style={{
                padding: '9px 14px', borderBottom: `1px solid ${T.border2}`, cursor: 'pointer',
                background: isSelected ? 'rgba(0,58,112,0.25)' : 'transparent',
                transition: 'background 0.12s', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = T.hover; }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <FundAvatar ticker={ticker} size={24} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.text }}>{ticker}</div>
                  <div style={{ fontSize: 10, color: T.textMute, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 108 }}>{name}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 11, color: T.text, fontWeight: 600 }}>
                  {price != null ? price.toFixed(2) : '—'}
                </div>
                {changePct != null ? (
                  <div style={{ fontSize: 10, color: up ? '#22c55e' : '#ef4444' }}>
                    {up ? '+' : ''}{changePct.toFixed(2)}%
                  </div>
                ) : (
                  <div style={{ fontSize: 10, color: T.textFaint }}>—</div>
                )}
              </div>
            </div>
          );
        })}
        {visibleCount < filtered.length && (
          <div style={{ padding: '10px 14px', textAlign: 'center' }}>
            <div style={{ width: 14, height: 14, border: `2px solid ${T.border}`, borderTopColor: '#22c55e', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
          </div>
        )}
      </div>
    </div>
  );
}
