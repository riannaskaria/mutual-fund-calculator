import { useState, useEffect, useRef, useCallback } from 'react';
import { useT } from '../theme';

const CHAT_KEY = 'mf_bot_chat_v1';

// ── markdown renderer ──────────────────────────────────────────────────────────
function inlineMd(text, T, keyPrefix = '') {
  const parts = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`/g;
  let last = 0, idx = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1] !== undefined)
      parts.push(<strong key={`${keyPrefix}b${idx++}`} style={{ fontWeight: 700 }}>{m[1]}</strong>);
    else if (m[2] !== undefined)
      parts.push(<em key={`${keyPrefix}i${idx++}`}>{m[2]}</em>);
    else
      parts.push(
        <code key={`${keyPrefix}c${idx++}`} style={{
          background: T.inputBg, border: `1px solid ${T.border}`,
          padding: '1px 5px', borderRadius: 3, fontSize: '0.87em',
          fontFamily: 'monospace', letterSpacing: 0,
        }}>{m[3]}</code>
      );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : [text];
}

function renderMd(text, T) {
  if (!text) return null;
  const lines = text.split('\n');
  const out = [];
  let listBuf = [];
  let k = 0;

  const flush = () => {
    if (!listBuf.length) return;
    out.push(
      <ul key={k++} style={{ margin: '4px 0 4px 18px', padding: 0 }}>
        {listBuf.map((item, j) => (
          <li key={j} style={{ marginBottom: 2 }}>{inlineMd(item, T, `li${k}-${j}`)}</li>
        ))}
      </ul>
    );
    listBuf = [];
  };

  lines.forEach(line => {
    if (/^[-•*]\s+/.test(line)) {
      listBuf.push(line.replace(/^[-•*]\s+/, ''));
    } else {
      flush();
      if (line.trim() === '') {
        out.push(<div key={k++} style={{ height: 5 }} />);
      } else {
        out.push(
          <div key={k++} style={{ lineHeight: 1.55 }}>
            {inlineMd(line, T, `l${k}`)}
          </div>
        );
      }
    }
  });
  flush();
  return out;
}

// ── dynamic suggestions ────────────────────────────────────────────────────────
function getSuggestions(selectedFund) {
  const ticker = selectedFund?.ticker || selectedFund?.id;
  if (ticker) return [
    `What is the current NAV of ${ticker}?`,
    `Run a CAPM projection for ${ticker} with $10,000 over 10 years`,
    `Compare ${ticker} vs VFIAX over 10 years with $10,000`,
    "What's the latest market news?",
  ];
  return [
    'What is the current NAV of VFIAX?',
    'Run a CAPM projection for FXAIX with $10,000 over 10 years',
    'Compare VTSAX vs VFIAX with $50,000 over 20 years',
    'List all supported funds',
  ];
}

// ── component ──────────────────────────────────────────────────────────────────
export default function GoldmanBot({ funds, quote, articles, selectedFund }) {
  const T = useT();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CHAT_KEY) || '[]'); }
    catch { return []; }
  });
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [unread, setUnread] = useState(0);
  const [copied, setCopied] = useState(null);
  const scrollRef   = useRef(null);
  const textareaRef = useRef(null);

  // Persist last 60 messages
  useEffect(() => {
    try { localStorage.setItem(CHAT_KEY, JSON.stringify(messages.slice(-60))); } catch {}
  }, [messages]);

  // Auto-scroll on new message / thinking
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, thinking]);

  // Clear unread when panel opens
  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 90) + 'px';
  }, []);

  const copyMessage = useCallback((text, idx) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(idx);
      setTimeout(() => setCopied(null), 1500);
    });
  }, []);

  const sendMessage = async (text) => {
    const userText = text.trim();
    if (!userText || thinking) return;
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const newUserMsg  = { role: 'user', content: userText };
    const updatedMsgs = [...messages, newUserMsg];
    setMessages(updatedMsgs);
    setThinking(true);

    try {
      const res = await fetch('/api/bot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMsgs.map(m => ({ role: m.role, content: m.content })),
          context: {
            ticker: selectedFund ? (selectedFund.ticker || selectedFund.id) : null,
            funds:  funds.map(f => ({ ticker: f.ticker || f.id, name: f.name, price: f.price, changePct: f.changePct })),
            articles: articles || [],
            quote: quote ? {
              symbol:               quote.symbol,
              regularMarketPrice:   quote.regularMarketPrice,
              fiftyTwoWeekHigh:     quote.fiftyTwoWeekHigh,
              fiftyTwoWeekLow:      quote.fiftyTwoWeekLow,
            } : null,
          },
        }),
      });

      if (res.status === 503) {
        setConfigured(false);
        setThinking(false);
        return;
      }

      const data  = await res.json();
      const reply = data.reply || data.error || 'No response.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      if (!open) setUnread(n => n + 1);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Is the backend running?' }]);
    }
    setThinking(false);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const suggestions = getSuggestions(selectedFund);
  const canSend     = !!input.trim() && !thinking && configured;

  return (
    <>
      {/* ── floating button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        title="GS Bot"
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
          width: 48, height: 48, borderRadius: '50%',
          background: configured
            ? `linear-gradient(135deg, ${T.brand}, ${T.accent})`
            : '#6b7280',
          border: 'none', cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(9,44,97,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        )}
        {!open && unread > 0 && (
          <div style={{
            position: 'absolute', top: 0, right: 0,
            width: 18, height: 18, borderRadius: '50%',
            background: '#ef4444', border: '2px solid white',
            fontSize: 9, color: '#fff', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{unread > 9 ? '9+' : unread}</div>
        )}
      </button>

      {/* ── chat panel ── */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 84, right: 24, zIndex: 999,
          width: 390, maxHeight: 580,
          background: T.solidPanel || T.panelBg, border: `1px solid ${T.border}`,
          borderRadius: 14, boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>

          {/* header */}
          <div style={{
            padding: '12px 16px', borderBottom: `1px solid ${T.border}`,
            display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
            background: `linear-gradient(135deg, ${T.brand} 0%, ${T.accent} 100%)`,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, color: '#fff', fontWeight: 800, letterSpacing: '-0.5px',
            }}>GS</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>GS Bot</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedFund
                  ? `Discussing: ${selectedFund.ticker || selectedFund.id}`
                  : 'Goldman Fund Assistant'}
              </div>
            </div>
            {messages.length > 0 && (
              <button
                onClick={() => { setMessages([]); setConfigured(true); }}
                style={{
                  background: 'rgba(255,255,255,0.1)', border: 'none',
                  borderRadius: 6, padding: '3px 8px', fontSize: 10,
                  color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
                }}
              >Clear</button>
            )}
          </div>

          {/* not-configured banner */}
          {!configured && (
            <div style={{
              padding: '12px 16px', flexShrink: 0,
              background: '#fef3c7', borderBottom: `1px solid #fde68a`,
              display: 'flex', gap: 10, alignItems: 'flex-start',
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}>
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#92400e', marginBottom: 2 }}>API key not configured</div>
                <div style={{ fontSize: 11, color: '#78350f', lineHeight: 1.5 }}>
                  Add{' '}
                  <code style={{ background: '#fde68a', padding: '1px 4px', borderRadius: 3, fontSize: 10 }}>OPENAI_API_KEY=sk-...</code>
                  {' '}to{' '}
                  <code style={{ background: '#fde68a', padding: '1px 4px', borderRadius: 3, fontSize: 10 }}>backend/.env</code>
                  {' '}and restart the server.
                </div>
              </div>
            </div>
          )}

          {/* messages */}
          <div
            ref={scrollRef}
            style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            {messages.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 12, color: T.textMute, textAlign: 'center', marginTop: 12, lineHeight: 1.6 }}>
                  {configured
                    ? 'Ask me about fund prices, CAPM projections, or market news.'
                    : 'GS Bot is ready — configure your API key to start chatting.'}
                </div>
                {configured && suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(s)}
                    style={{
                      background: T.cardBg, border: `1px solid ${T.border}`,
                      borderRadius: 8, padding: '8px 12px', fontSize: 11,
                      color: T.textSub, cursor: 'pointer', textAlign: 'left',
                      transition: 'border-color 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = T.accent}
                    onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
                  >{s}</button>
                ))}
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div
                  style={{
                    maxWidth: '84%', padding: '9px 13px', position: 'relative',
                    borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    background: m.role === 'user' ? T.accent : T.cardBg,
                    border:     m.role === 'user' ? 'none' : `1px solid ${T.border}`,
                    fontSize: 12.5,
                    color: m.role === 'user' ? '#fff' : T.text,
                    wordBreak: 'break-word',
                  }}
                  onMouseEnter={e => { const b = e.currentTarget.querySelector('.cp-btn'); if (b) b.style.opacity = '1'; }}
                  onMouseLeave={e => { const b = e.currentTarget.querySelector('.cp-btn'); if (b) b.style.opacity = '0'; }}
                >
                  {m.role === 'assistant' ? renderMd(m.content, T) : m.content}
                  {m.role === 'assistant' && (
                    <button
                      className="cp-btn"
                      onClick={() => copyMessage(m.content, i)}
                      title="Copy"
                      style={{
                        position: 'absolute', top: 5, right: 5,
                        background: T.inputBg, border: `1px solid ${T.border}`,
                        borderRadius: 4, padding: '2px 6px',
                        fontSize: 9, color: T.textMute, cursor: 'pointer',
                        opacity: 0, transition: 'opacity 0.12s',
                      }}
                    >{copied === i ? 'Copied!' : 'Copy'}</button>
                  )}
                </div>
              </div>
            ))}

            {thinking && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  padding: '9px 14px', borderRadius: '12px 12px 12px 2px',
                  background: T.cardBg, border: `1px solid ${T.border}`,
                  display: 'flex', gap: 5, alignItems: 'center',
                }}>
                  {[0, 0.15, 0.3].map((d, i) => (
                    <div key={i} style={{
                      width: 6, height: 6, borderRadius: '50%', background: T.accent,
                      animation: 'botPulse 1.1s ease-in-out infinite',
                      animationDelay: `${d}s`,
                    }}/>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* input */}
          <div style={{
            padding: '10px 12px', borderTop: `1px solid ${T.border}`,
            flexShrink: 0, display: 'flex', gap: 8, alignItems: 'flex-end',
          }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => { setInput(e.target.value); autoResize(); }}
              onKeyDown={handleKey}
              placeholder={configured ? 'Ask about funds, CAPM, news…' : 'Configure API key to chat…'}
              disabled={!configured}
              rows={1}
              style={{
                flex: 1, background: T.inputBg, border: `1px solid ${T.border}`,
                borderRadius: 8, padding: '8px 12px', fontSize: 12.5, color: T.text,
                outline: 'none', resize: 'none', fontFamily: 'inherit',
                lineHeight: 1.4, transition: 'border-color 0.15s',
                overflowY: 'auto', opacity: configured ? 1 : 0.5,
              }}
              onFocus={e => e.target.style.borderColor = T.accent}
              onBlur={e => e.target.style.borderColor = T.border}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!canSend}
              style={{
                background: canSend ? T.accent : T.inputBg,
                border: 'none', borderRadius: 8,
                padding: '0 14px', height: 36, flexShrink: 0,
                cursor: canSend ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke={canSend ? '#fff' : T.textMute}
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes botPulse {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.85); }
          40%            { opacity: 1;    transform: scale(1);    }
        }
      `}</style>
    </>
  );
}
