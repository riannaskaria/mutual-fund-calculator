import { useState, useEffect, useRef } from 'react';
import { useT } from '../theme';

const SUGGESTIONS = [
  'What is the current NAV of VFIAX?',
  'Run a CAPM projection for FXAIX with $10,000 over 10 years',
  "What's the latest news on interest rates?",
  'Compare beta of VTSAX vs FCNTX',
];

export default function GoldmanBot({ funds, quote, articles, selectedFund }) {
  const T = useT();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, thinking]);

  const sendMessage = async (text) => {
    const userText = text.trim();
    if (!userText || thinking) return;
    setInput('');

    const newUserMsg = { role: 'user', content: userText };
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
            funds: funds.map(f => ({ ticker: f.ticker || f.id, name: f.name, price: f.price, changePct: f.changePct })),
            articles: articles || [],
            quote: quote ? {
              symbol: quote.symbol,
              regularMarketPrice: quote.regularMarketPrice,
              fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
              fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
            } : null,
          },
        }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply || data.error || 'No response.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Is the backend running?' }]);
    }
    setThinking(false);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        title="GS Bot"
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
          width: 48, height: 48, borderRadius: '50%',
          background: 'linear-gradient(135deg, #003A70, #1d4ed8)',
          border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,58,112,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 84, right: 24, zIndex: 999,
          width: 380, height: 540,
          background: T.panelBg, border: `1px solid ${T.border}`,
          borderRadius: 14, boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '12px 16px', borderBottom: `1px solid ${T.border}`,
            display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, #003A70 0%, #1d4ed8 100%)',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, color: '#fff', fontWeight: 800, letterSpacing: '-0.5px',
            }}>GS</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>GS Bot</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>Goldman Fund Assistant</div>
            </div>
            {messages.length > 0 && (
              <button onClick={() => setMessages([])} style={{
                marginLeft: 'auto', background: 'rgba(255,255,255,0.1)', border: 'none',
                borderRadius: 6, padding: '3px 8px', fontSize: 10, color: 'rgba(255,255,255,0.7)',
                cursor: 'pointer',
              }}>Clear</button>
            )}
          </div>

          {/* Messages */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 12, color: T.textMute, textAlign: 'center', marginTop: 16 }}>
                  Ask me about fund prices, CAPM projections, or market news.
                </div>
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} onClick={() => sendMessage(s)} style={{
                    background: T.cardBg, border: `1px solid ${T.border}`,
                    borderRadius: 8, padding: '8px 12px', fontSize: 11,
                    color: T.textSub, cursor: 'pointer', textAlign: 'left',
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#1d4ed8'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
                  >{s}</button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '82%', padding: '9px 13px',
                  borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  background: m.role === 'user' ? '#1d4ed8' : T.cardBg,
                  border: m.role === 'user' ? 'none' : `1px solid ${T.border}`,
                  fontSize: 12.5, lineHeight: 1.55,
                  color: m.role === 'user' ? '#fff' : T.text,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {m.content}
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
                      width: 6, height: 6, borderRadius: '50%', background: '#1d4ed8',
                      animation: 'botPulse 1.1s ease-in-out infinite',
                      animationDelay: `${d}s`,
                    }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{ padding: '10px 12px', borderTop: `1px solid ${T.border}`, flexShrink: 0, display: 'flex', gap: 8 }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about funds, CAPM, news…"
              rows={1}
              style={{
                flex: 1, background: T.inputBg, border: `1px solid ${T.border}`,
                borderRadius: 8, padding: '8px 12px', fontSize: 12.5, color: T.text,
                outline: 'none', resize: 'none', fontFamily: 'inherit',
                lineHeight: 1.4, transition: 'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = '#1d4ed8'}
              onBlur={e => e.target.style.borderColor = T.border}
            />
            <button onClick={() => sendMessage(input)} disabled={!input.trim() || thinking} style={{
              background: input.trim() && !thinking ? '#1d4ed8' : T.inputBg,
              border: 'none', borderRadius: 8, padding: '0 14px',
              cursor: input.trim() && !thinking ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={input.trim() && !thinking ? '#fff' : T.textMute} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes botPulse {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.85); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  );
}
