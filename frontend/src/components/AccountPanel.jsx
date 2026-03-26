import { useState, useEffect, useCallback, useRef } from 'react';
import { useT } from '../theme';

// ─── persistence helpers ──────────────────────────────────────────────────────
const STORAGE_KEY = 'mf_account_v1';
const PROFILE_KEY = 'mf_profile_v1';

function loadAccount() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { favorites: [], positions: {}, history: [] };
        return JSON.parse(raw);
    } catch {
        return { favorites: [], positions: {}, history: [] };
    }
}

function saveAccount(data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { }
}

export function loadProfile() {
    try {
        const raw = localStorage.getItem(PROFILE_KEY);
        if (!raw) return { name: '', email: '' };
        return JSON.parse(raw);
    } catch { return { name: '', email: '' }; }
}

function saveProfile(data) {
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(data)); } catch { }
}

function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── tiny helpers ─────────────────────────────────────────────────────────────
function fmt$(n) {
    if (n == null || isNaN(n)) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);
}

function fmtDate(iso) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function StarButton({ active, onClick }) {
    const T = useT();
    return (
        <button
            onClick={onClick}
            style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 16,
                color: active ? '#facc15' : T.textMute
            }}
        >
            {active ? '★' : '☆'}
        </button>
    );
}

// ─── sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }) {
    const T = useT();
    return (
        <div style={{
            background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 10,
            padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 4,
        }}>
            <span style={{ fontSize: 10, color: T.textMute, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>{label}</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: accent || T.text }}>{value}</span>
            {sub && <span style={{ fontSize: 11, color: T.textSub }}>{sub}</span>}
        </div>
    );
}

function SectionHeading({ children }) {
    const T = useT();
    return (
        <div style={{ fontSize: 11, fontWeight: 700, color: T.textMute, textTransform: 'uppercase', letterSpacing: '0.08em', paddingBottom: 6, borderBottom: `1px solid ${T.border}`, marginBottom: 10 }}>
            {children}
        </div>
    );
}

function EmptyState({ text }) {
    const T = useT();
    return (
        <div style={{ textAlign: 'center', padding: '28px 0', color: T.textMute, fontSize: 12 }}>
            {text}
        </div>
    );
}

// ─── main component ───────────────────────────────────────────────────────────
export default function AccountPanel({ open, onClose, funds = [], quote, selectedFund }) {
    const T = useT();
    const [account, setAccount] = useState(loadAccount);
    const [profile, setProfile] = useState(loadProfile);
    const [editingProfile, setEditingProfile] = useState(false);
    const [draftName, setDraftName] = useState('');
    const [draftEmail, setDraftEmail] = useState('');
    const [activeTab, setActiveTab] = useState('Portfolio');
    const [addTicker, setAddTicker] = useState('');
    const [addAmount, setAddAmount] = useState('');
    const [addNote, setAddNote] = useState('');
    const overlayRef = useRef();

    useEffect(() => { saveAccount(account); }, [account]);
    useEffect(() => { saveProfile(profile); }, [profile]);

    useEffect(() => {
        if (selectedFund) setAddTicker(selectedFund.ticker || selectedFund.id || '');
    }, [selectedFund]);

    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const startEditProfile = () => {
        setDraftName(profile.name);
        setDraftEmail(profile.email);
        setEditingProfile(true);
    };

    const saveProfileEdit = () => {
        const updated = { name: draftName.trim(), email: draftEmail.trim() };
        setProfile(updated);
        saveProfile(updated);
        setEditingProfile(false);
    };

    // ── derived data ──────────────────────────────────────────────────────────
    const favSet = new Set(account.favorites);

    const positionTotals = Object.entries(account.positions).map(([ticker, entries]) => {
        const total = entries.reduce((s, e) => s + e.amount, 0);
        const fund = funds.find(f => (f.ticker || f.id) === ticker);
        return { ticker, total, fundName: fund?.name || ticker, entries };
    });

    const grandTotal = positionTotals.reduce((s, p) => s + p.total, 0);
    const favFunds = funds.filter(f => favSet.has(f.ticker || f.id));

    // ── actions ───────────────────────────────────────────────────────────────
    const toggleFav = useCallback((ticker) => {
        setAccount(prev => {
            const favs = prev.favorites.includes(ticker)
                ? prev.favorites.filter(t => t !== ticker)
                : [...prev.favorites, ticker];
            return { ...prev, favorites: favs };
        });
    }, []);

    const addInvestment = useCallback(() => {
        const ticker = addTicker.trim().toUpperCase();
        const amount = parseFloat(addAmount);
        if (!ticker || !amount || amount <= 0) return;
        const entry = { amount, note: addNote.trim() || null, date: new Date().toISOString() };
        setAccount(prev => {
            const existing = prev.positions[ticker] || [];
            return {
                ...prev,
                positions: { ...prev.positions, [ticker]: [...existing, entry] },
                history: [{ ticker, amount, note: entry.note, date: entry.date }, ...prev.history].slice(0, 100),
            };
        });
        setAddAmount('');
        setAddNote('');
    }, [addTicker, addAmount, addNote]);

    const removePosition = useCallback((ticker) => {
        setAccount(prev => {
            const next = { ...prev.positions };
            delete next[ticker];
            return { ...prev, positions: next };
        });
    }, []);

    const clearHistory = useCallback(() => {
        setAccount(prev => ({ ...prev, history: [] }));
    }, []);

    // ── styles ────────────────────────────────────────────────────────────────
    const inputStyle = {
        background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: 7,
        padding: '8px 12px', fontSize: 13, color: T.text,
        outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box',
    };

    const tabBtn = (name) => ({
        background: 'none', border: 'none',
        borderBottom: activeTab === name ? `2px solid ${T.accent}` : '2px solid transparent',
        padding: '10px 14px', fontSize: 12,
        fontWeight: activeTab === name ? 600 : 400,
        color: activeTab === name ? T.text : T.textMute,
        cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
    });

    if (!open) return null;

    const initials = getInitials(profile.name);

    return (
        <>
            <div
                ref={overlayRef}
                onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', justifyContent: 'flex-end' }}
            >
                <div style={{
                    width: 480, maxWidth: '100vw', height: '100%',
                    background: T.panelBg, borderLeft: `1px solid ${T.border}`,
                    display: 'flex', flexDirection: 'column',
                    animation: 'slideInRight 0.22s ease',
                    overflowY: 'auto',
                }}>
                    {/* header */}
                    <div style={{
                        padding: '14px 20px', borderBottom: `1px solid ${T.border}`,
                        display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
                    }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}> {'My Account'}</div>
                        <button onClick={onClose} style={{
                            marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer',
                            color: T.textMute, fontSize: 20, lineHeight: 1, padding: 4, borderRadius: 4,
                        }}>×</button>
                    </div>

                    {/* profile card */}
                    <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
                        <div style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 10, padding: '14px 16px' }}>
                            {!editingProfile ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{
                                        width: 42, height: 42, borderRadius: '50%', background: T.brand,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 15, fontWeight: 700, color: '#fff', flexShrink: 0,
                                    }}>{initials}</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
                                            {profile.name || <span style={{ color: T.textMute, fontStyle: 'italic' }}>No name set</span>}
                                        </div>
                                        <div style={{ fontSize: 11, color: T.textMute }}>
                                            {profile.email || <span style={{ fontStyle: 'italic' }}>No email set</span>}
                                        </div>
                                    </div>
                                    <button onClick={startEditProfile} style={{
                                        background: 'none', border: `1px solid ${T.border}`, borderRadius: 6,
                                        padding: '5px 12px', fontSize: 11, color: T.textSub, cursor: 'pointer',
                                    }}>Edit</button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <input type="text" placeholder="Full name" value={draftName} onChange={e => setDraftName(e.target.value)} style={inputStyle} autoFocus />
                                    <input type="email" placeholder="Email address" value={draftEmail} onChange={e => setDraftEmail(e.target.value)} style={inputStyle} />
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button onClick={saveProfileEdit} style={{
                                            background: T.accent, color: '#fff', border: 'none', borderRadius: 7,
                                            padding: '7px 18px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                        }}>Save</button>
                                        <button onClick={() => setEditingProfile(false)} style={{
                                            background: 'none', border: `1px solid ${T.border}`, borderRadius: 7,
                                            padding: '7px 14px', fontSize: 12, color: T.textMute, cursor: 'pointer',
                                        }}>Cancel</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* summary stats */}
                    <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.border}`, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, flexShrink: 0 }}>
                        <StatCard label="Total Invested" value={fmt$(grandTotal)} accent={T.positive} />
                        <StatCard label="Positions" value={positionTotals.length} sub="unique funds" />
                        <StatCard label="Favorites" value={favSet.size} sub="saved funds" />
                    </div>

                    {/* tabs */}
                    <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}`, flexShrink: 0, padding: '0 8px' }}>
                        {['Portfolio', 'Favorites', 'History'].map(t => (
                            <button key={t} onClick={() => setActiveTab(t)} style={tabBtn(t)}>{t}</button>
                        ))}
                    </div>

                    {/* tab content */}
                    <div style={{ flex: 1, padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

                        {/* ── PORTFOLIO TAB ── */}
                        {activeTab === 'Portfolio' && (
                            <>
                                <div>
                                    <SectionHeading>Log an Investment</SectionHeading>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                            <div>
                                                <label style={{ fontSize: 10, color: T.textMute, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Ticker</label>
                                                <select value={addTicker} onChange={e => setAddTicker(e.target.value)} style={{ ...inputStyle }}>
                                                    <option value="">— select fund —</option>
                                                    {funds.map(f => {
                                                        const t = f.ticker || f.id;
                                                        return <option key={t} value={t}>{t} — {(f.name || '').split(';')[0].substring(0, 30)}</option>;
                                                    })}
                                                </select>
                                            </div>
                                            <div>
                                                <label style={{ fontSize: 10, color: T.textMute, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Amount ($)</label>
                                                <input type="number" min={1} step={0.01} placeholder="10,000" value={addAmount} onChange={e => setAddAmount(e.target.value)} style={inputStyle} />
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: 10, color: T.textMute, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Note (optional)</label>
                                            <input type="text" placeholder="e.g. Roth IRA contribution" value={addNote} onChange={e => setAddNote(e.target.value)} style={inputStyle} />
                                        </div>
                                        <button
                                            onClick={addInvestment}
                                            disabled={!addTicker || !addAmount || parseFloat(addAmount) <= 0}
                                            style={{
                                                alignSelf: 'flex-start',
                                                background: (!addTicker || !addAmount || parseFloat(addAmount) <= 0) ? T.inputBg : T.accent,
                                                color: (!addTicker || !addAmount || parseFloat(addAmount) <= 0) ? T.textMute : '#fff',
                                                border: 'none', borderRadius: 7, padding: '9px 22px',
                                                fontSize: 13, fontWeight: 600,
                                                cursor: (!addTicker || !addAmount || parseFloat(addAmount) <= 0) ? 'not-allowed' : 'pointer',
                                                transition: 'all 0.15s',
                                            }}
                                        >+ Log Investment</button>
                                    </div>
                                </div>

                                <div>
                                    <SectionHeading>My Positions</SectionHeading>
                                    {positionTotals.length === 0
                                        ? <EmptyState text="No investments logged yet. Add one above." />
                                        : positionTotals.map(({ ticker, total, fundName, entries }) => (
                                            <div key={ticker} style={{
                                                background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 9,
                                                padding: '12px 14px', marginBottom: 8,
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div style={{
                                                        width: 30, height: 30, borderRadius: 6,
                                                        background: `linear-gradient(135deg, ${T.brand}, ${T.accent})`,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: 9, color: '#fff', fontWeight: 700, flexShrink: 0,
                                                    }}>{ticker.slice(0, 3)}</div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{ticker}</div>
                                                        <div style={{ fontSize: 10, color: T.textMute, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fundName.split(';')[0]}</div>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ fontSize: 14, fontWeight: 700, color: T.positive }}>{fmt$(total)}</div>
                                                        <div style={{ fontSize: 10, color: T.textMute }}>{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</div>
                                                    </div>
                                                    <button onClick={() => removePosition(ticker)} title="Remove position" style={{
                                                        background: 'none', border: `1px solid ${T.border}`, borderRadius: 5,
                                                        cursor: 'pointer', color: T.textMute, fontSize: 11,
                                                        padding: '3px 8px', marginLeft: 4,
                                                    }}>Remove</button>
                                                </div>
                                                {entries.length > 1 && (
                                                    <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                        {entries.map((e, i) => (
                                                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <span style={{ fontSize: 10, color: T.textMute }}>{fmtDate(e.date)}{e.note ? ` · ${e.note}` : ''}</span>
                                                                <span style={{ fontSize: 11, fontWeight: 600, color: T.text }}>{fmt$(e.amount)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    }
                                </div>
                            </>
                        )}

                        {/* ── FAVORITES TAB ── */}
                        {activeTab === 'Favorites' && (
                            <>
                                <div>
                                    <SectionHeading>Saved Funds</SectionHeading>
                                    {favFunds.length === 0
                                        ? <EmptyState text="No favorites yet. Save a fund from the list below." />
                                        : favFunds.map(f => {
                                            const ticker = f.ticker || f.id;
                                            const isUp = (f.change ?? 0) >= 0;
                                            return (
                                                <div key={ticker} style={{
                                                    background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 9,
                                                    padding: '11px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10,
                                                }}>
                                                    <div style={{
                                                        width: 30, height: 30, borderRadius: 6,
                                                        background: `linear-gradient(135deg, ${T.brand}, ${T.positive})`,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: 9, color: '#fff', fontWeight: 700, flexShrink: 0,
                                                    }}>{ticker.slice(0, 3)}</div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{ticker}</div>
                                                        <div style={{ fontSize: 10, color: T.textMute, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(f.name || '').split(';')[0]}</div>
                                                    </div>
                                                    {f.price != null && (
                                                        <div style={{ textAlign: 'right', marginRight: 4 }}>
                                                            <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>${f.price.toFixed(2)}</div>
                                                            <div style={{ fontSize: 10, color: isUp ? T.positive : T.negative }}>
                                                                {isUp ? '+' : ''}{(f.changePct ?? 0).toFixed(2)}%
                                                            </div>
                                                        </div>
                                                    )}
                                                    <button onClick={() => toggleFav(ticker)} style={{
                                                        background: 'none', border: `1px solid ${T.border}`, borderRadius: 5,
                                                        cursor: 'pointer', color: T.textMute, fontSize: 11, padding: '3px 8px',
                                                    }}>Remove</button>
                                                </div>
                                            );
                                        })
                                    }
                                </div>

                                <div>
                                    <SectionHeading>All Funds</SectionHeading>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        {funds.map(f => {
                                            const ticker = f.ticker || f.id;
                                            const isFav = favSet.has(ticker);
                                            const isUp = (f.change ?? 0) >= 0;
                                            return (
                                                <div key={ticker} style={{
                                                    display: 'flex', alignItems: 'center', gap: 10,
                                                    padding: '8px 10px', borderRadius: 7,
                                                    background: isFav ? T.inputBg : 'transparent',
                                                    border: `1px solid ${isFav ? T.borderSub : 'transparent'}`,
                                                    transition: 'all 0.12s',
                                                }}>
                                                    <span style={{ fontSize: 12, fontWeight: 700, color: T.text, width: 60, flexShrink: 0 }}>{ticker}</span>
                                                    <span style={{ fontSize: 11, color: T.textMute, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(f.name || '').split(';')[0].substring(0, 35)}</span>
                                                    {f.price != null && (
                                                        <span style={{ fontSize: 11, fontWeight: 600, color: isUp ? T.positive : T.negative, flexShrink: 0 }}>
                                                            ${f.price.toFixed(2)}
                                                        </span>
                                                    )}
                                                    <StarButton active={isFav} onClick={() => toggleFav(ticker)} />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ── HISTORY TAB ── */}
                        {activeTab === 'History' && (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                    <SectionHeading>Investment Log</SectionHeading>
                                    {account.history.length > 0 && (
                                        <button onClick={clearHistory} style={{
                                            background: 'none', border: `1px solid ${T.border}`, borderRadius: 6,
                                            padding: '3px 10px', fontSize: 10, color: T.textMute, cursor: 'pointer',
                                        }}>Clear All</button>
                                    )}
                                </div>
                                {account.history.length === 0
                                    ? <EmptyState text="No history yet. Log investments in the Portfolio tab." />
                                    : account.history.map((h, i) => (
                                        <div key={i} style={{
                                            display: 'flex', alignItems: 'center', gap: 10,
                                            padding: '10px 12px', borderRadius: 8, marginBottom: 6,
                                            background: T.cardBg, border: `1px solid ${T.border}`,
                                        }}>
                                            <div style={{
                                                width: 28, height: 28, borderRadius: 5,
                                                background: `linear-gradient(135deg, ${T.brand}, ${T.accent})`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 8, color: '#fff', fontWeight: 700, flexShrink: 0,
                                            }}>{h.ticker.slice(0, 3)}</div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{h.ticker}</div>
                                                <div style={{ fontSize: 10, color: T.textMute }}>{fmtDate(h.date)}{h.note ? ` · ${h.note}` : ''}</div>
                                            </div>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: T.positive, flexShrink: 0 }}>{fmt$(h.amount)}</div>
                                        </div>
                                    ))
                                }
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to   { transform: translateX(0);    opacity: 1; }
                }
            `}</style>
        </>
    );
}