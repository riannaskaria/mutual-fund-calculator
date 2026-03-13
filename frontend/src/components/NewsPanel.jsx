import { useState, useEffect } from 'react';
import { useT, TAG_COLORS, SOURCE_BRANDS } from '../theme';

const NEWS_QUERIES = [
  'mutual funds investing',
  'stock market today',
  'ETF index fund',
  'Federal Reserve interest rates',
  'S&P 500 nasdaq market',
];

function detectTag(title) {
  const t = title.toLowerCase();
  if (/\b(fund|etf|vanguard|fidelity|blackrock|index fund|mutual)\b/.test(t)) return 'Funds';
  if (/\b(bond|treasury|yield|fixed.income|debt)\b/.test(t)) return 'Bonds';
  if (/\b(fed|inflation|gdp|jobs|unemployment|economic|recession|rate cut|rate hike|cpi|ppi)\b/.test(t)) return 'Macro';
  if (/\b(crypto|bitcoin|ethereum|btc|eth)\b/.test(t)) return 'Crypto';
  if (/\b(dollar|forex|currency|yen|euro)\b/.test(t)) return 'Forex';
  if (/\b(merger|acquisition|deal|buyout|takeover)\b/.test(t)) return 'M&A';
  return 'Market';
}

function parseRSS(xml) {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  return Array.from(doc.querySelectorAll('item')).map(item => {
    const title   = item.querySelector('title')?.textContent || '';
    const link    = item.querySelector('link')?.textContent || '';
    const pubDate = item.querySelector('pubDate')?.textContent || '';
    const source  = item.querySelector('source')?.textContent || 'Google News';
    return {
      title: title.replace(/ - [^-]+$/, ''),
      source,
      url: link,
      tag: detectTag(title),
      time: pubDate ? new Date(pubDate).getTime() : Date.now(),
    };
  });
}

function timeAgo(ms) {
  const diff = Math.floor((Date.now() - ms) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function getDomain(source) {
  return SOURCE_BRANDS[source]?.domain || source.toLowerCase().replace(/[^a-z]/g, '') + '.com';
}

export default function NewsPanel({ onArticlesUpdate }) {
  const T = useT();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [query, setQuery] = useState('');
  const [searchTimeout, setSearchTimeout] = useState(null);

  useEffect(() => {
    if (onArticlesUpdate) onArticlesUpdate(articles);
  }, [articles]);

  const fetchNews = async (searchTerm, forceRefresh = false) => {
    if (forceRefresh) setArticles([]);
    setLoading(true);
    try {
      const bust = forceRefresh ? `&_t=${Date.now()}` : '';
      const queries = searchTerm
        ? [encodeURIComponent(searchTerm + ' finance OR market OR investing')]
        : NEWS_QUERIES.map(q => encodeURIComponent(q));

      const allResults = await Promise.all(
        queries.map(q =>
          fetch(`/google-news-rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en${bust}`, {
            signal: AbortSignal.timeout(8000),
          })
            .then(r => r.text())
            .then(parseRSS)
            .catch(() => [])
        )
      );

      const merged = allResults.flat();
      const seen = new Set();
      const unique = merged.filter(a => {
        const key = a.title.slice(0, 60).toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const cutoff = Date.now() - 3 * 24 * 60 * 60 * 1000;
      const fresh = unique.filter(a => a.time >= cutoff).sort((a, b) => b.time - a.time);
      const result = fresh.length > 5 ? fresh : unique.sort((a, b) => b.time - a.time);

      if (result.length > 0) { setArticles(result); setLastUpdated(new Date()); }
    } catch (err) {
      console.warn('News fetch failed:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNews();
    const iv = setInterval(() => fetchNews(query), 600000);
    return () => clearInterval(iv);
  }, []);

  const handleSearch = (val) => {
    setQuery(val);
    if (searchTimeout) clearTimeout(searchTimeout);
    setSearchTimeout(setTimeout(() => fetchNews(val.trim()), 500));
  };

  return (
    <div style={{ width: 288, background: T.newsItemBg, borderLeft: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '11px 14px 10px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: T.text, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Market News</span>
          {lastUpdated && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10, padding: '1px 6px' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              <span style={{ fontSize: 9, color: '#22c55e', fontWeight: 600, letterSpacing: '0.03em' }}>LIVE</span>
            </span>
          )}
        </div>
        <button onClick={() => fetchNews(query, true)}
          style={{ background: 'none', border: '1px solid #141f2e', borderRadius: 5, cursor: 'pointer', padding: '4px 5px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#2a3a50'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#141f2e'}
          title="Refresh">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={loading ? '#22c55e' : '#446688'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        <div style={{ background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: 7, display: 'flex', alignItems: 'center', padding: '6px 10px', gap: 7 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={T.textMute} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={query}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search markets, funds…"
            style={{ background: 'none', border: 'none', outline: 'none', fontSize: 11, color: T.textSub, flex: 1, width: 0 }}
          />
          {query && (
            <button onClick={() => { setQuery(''); fetchNews(''); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textMute, padding: 0, fontSize: 14, lineHeight: 1, display: 'flex' }}>×</button>
          )}
        </div>
      </div>

      {/* Feed */}
      <div className="news-scroll" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {loading && articles.length === 0 && (
          <div style={{ padding: '40px 14px', textAlign: 'center' }}>
            <div style={{ width: 20, height: 20, border: '2px solid #1a2535', borderTopColor: '#22c55e', borderRadius: '50%', margin: '0 auto 10px', animation: 'spin 0.8s linear infinite' }} />
            <div style={{ fontSize: 11, color: '#334455' }}>Fetching latest news…</div>
          </div>
        )}
        {!loading && articles.length === 0 && (
          <div style={{ padding: '40px 14px', textAlign: 'center', color: '#334455', fontSize: 11 }}>No articles found</div>
        )}
        {articles.map((item, i) => {
          const brand = SOURCE_BRANDS[item.source];
          const tagColor = TAG_COLORS[item.tag] || '#10B981';
          return (
            <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', gap: 10, textDecoration: 'none', padding: '10px 14px', borderBottom: `1px solid ${T.border2}`, alignItems: 'flex-start', transition: 'background 0.12s' }}
              onMouseEnter={e => e.currentTarget.style.background = T.hover}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ width: 2, borderRadius: 2, background: tagColor + '55', flexShrink: 0, alignSelf: 'stretch', minHeight: 14 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                  <img src={`https://www.google.com/s2/favicons?domain=${getDomain(item.source)}&sz=16`}
                    width={11} height={11} alt="" style={{ borderRadius: 2, flexShrink: 0 }}
                    onError={e => { e.target.style.display = 'none'; }} />
                  <span style={{ fontSize: 9, color: brand?.color || '#446688', fontWeight: 700, letterSpacing: '0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.source}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 8, color: '#2a3f55', whiteSpace: 'nowrap', flexShrink: 0 }}>{timeAgo(item.time)}</span>
                </div>
                <div style={{ fontSize: 11, color: T.textSub, lineHeight: 1.45, fontWeight: 400 }}>{item.title}</div>
              </div>
            </a>
          );
        })}
        {articles.length > 0 && <div style={{ height: 12 }} />}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
