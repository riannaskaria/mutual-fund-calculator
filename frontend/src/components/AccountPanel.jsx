import { useState, useEffect, useCallback, useRef } from 'react';
import { useT } from '../theme';
import API_BASE from '../apiBase';
import { logTradeEvent, fetchMorningBrief, sendDigestEmail } from '../api/mutualFundApi';

// ─── fund family colors ───────────────────────────────────────────────────────
// Real brand-adjacent colors per fund family — flat, no gradient
function getFundColor(ticker) {
    const t = (ticker || '').toUpperCase();
    if (t.startsWith('V'))                                      return '#8b0000'; // Vanguard — deep crimson
    if (t.startsWith('F'))                                      return '#005c3b'; // Fidelity — dark green
    if (['AGTHX','AEPGX','AMCPX','ANCFX','CWGIX'].includes(t)) return '#1a3a6e'; // American Funds — navy
    if (t.startsWith('SW') || t.startsWith('SN') || t.startsWith('SF') || t.startsWith('SH') || t.startsWith('SM')) return '#00407a'; // Schwab — cobalt
    if (t.startsWith('TR') || t.startsWith('PR') || t.startsWith('PG') || t.startsWith('PB') || t.startsWith('RP')) return '#005f86'; // T. Rowe Price — teal-blue
    if (t.startsWith('DO') || t.startsWith('DL') || t.startsWith('DF')) return '#2c3e50'; // Dodge & Cox — charcoal
    if (t === 'PIMIX' || t === 'PTTRX')                        return '#1a1f5e'; // PIMCO — deep indigo
    if (t.startsWith('OAK'))                                    return '#4a3728'; // Oakmark — warm brown
    if (t.startsWith('LM') || t.startsWith('BA'))               return '#374151'; // Legg Mason / balanced — slate
    // Hash-based fallback for anything else — deterministic, muted
    let h = 0;
    for (const c of t) h = Math.imul(h * 31 + c.charCodeAt(0), 1) | 0;
    const hue = ((Math.abs(h) % 18) * 20 + 200) % 360; // stay in cool tones, vary by 20°
    return `hsl(${hue}, 38%, 28%)`;
}

// ─── persistence helpers ──────────────────────────────────────────────────────
const STORAGE_KEY = 'mf_account_v1';
const PROFILE_KEY = 'mf_profile_v1';
const PICTURE_KEY = 'mf_profile_picture';
const EMAIL_ALERTS_KEY = 'mf_email_alerts_v1';

function loadEmailAlerts() {
    try { return JSON.parse(localStorage.getItem(EMAIL_ALERTS_KEY) || '{"enabled":false,"email":""}'); }
    catch { return { enabled: false, email: '' }; }
}

// Default avatar — minimalist fund chart icon rendered inline as SVG
function FundAvatarIcon({ size = 40, color = 'rgba(255,255,255,0.92)' }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3,18 7,13 11,15 17,7 21,4" />
            <circle cx="21" cy="4" r="1.8" fill={color} stroke="none" />
        </svg>
    );
}

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
    try {
        // Preserve favorites managed externally (by TradingDashboard)
        const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, favorites: existing.favorites || data.favorites || [] }));
    } catch { }
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
            background: T.solidPanel, border: `1px solid ${T.borderSub}`, borderRadius: 12,
            padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 4,
            boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
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
export default function AccountPanel({ open, onClose, funds = [], quote, selectedFund, favorites: favProp, onToggleFav, alerts = [], onRemoveAlert, onResetAlert }) {
    const T = useT();
    const [account, setAccount] = useState(loadAccount);
    const [profile, setProfile] = useState(loadProfile);
    const [savedProjections, setSavedProjections] = useState(() => {
        try { return JSON.parse(localStorage.getItem('mf_calc_history_v1')) || []; }
        catch { return []; }
    });
    const [editingProfile, setEditingProfile] = useState(false);
    const [draftName, setDraftName] = useState('');
    const [draftEmail, setDraftEmail] = useState('');
    const [activeTab, setActiveTab] = useState('Profile');
    const [addTicker, setAddTicker] = useState('');
    const [addAmount, setAddAmount] = useState('');
    const [addNote, setAddNote] = useState('');
    const [customPicture, setCustomPicture] = useState(() => {
        try { return localStorage.getItem(PICTURE_KEY) || null; } catch { return null; }
    });
    const [emailAlerts, setEmailAlerts] = useState(loadEmailAlerts);
    const [testStatus, setTestStatus] = useState(null); // null | 'sending' | 'ok' | 'error' | 'unconfigured'
    const [testError, setTestError] = useState('');
    // Intelligence tab state
    const [briefStatus, setBriefStatus] = useState(null); // null | 'loading' | 'done' | 'error'
    const [briefText, setBriefText] = useState('');
    const [briefFunds, setBriefFunds] = useState([]);
    const [briefGeneratedAt, setBriefGeneratedAt] = useState(null);
    const [briefError, setBriefError] = useState('');
    const [briefEmailStatus, setBriefEmailStatus] = useState(null); // null | 'sending' | 'ok' | 'error'
    const overlayRef = useRef();
    const pictureInputRef = useRef(null);

    useEffect(() => { saveAccount(account); }, [account]);

    // Sync savedProjections when ChartPanel saves/deletes entries
    useEffect(() => {
        function onStorage(e) {
            if (e.key === 'mf_calc_history_v1') {
                try { setSavedProjections(JSON.parse(e.newValue) || []); }
                catch { setSavedProjections([]); }
            }
        }
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);
    useEffect(() => { saveProfile(profile); }, [profile]);
    useEffect(() => {
        try { localStorage.setItem(EMAIL_ALERTS_KEY, JSON.stringify(emailAlerts)); } catch { }
    }, [emailAlerts]);

    useEffect(() => {
        if (selectedFund) setAddTicker(selectedFund.ticker || selectedFund.id || '');
    }, [selectedFund]);

    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const sendTestEmail = useCallback(async () => {
        const to = emailAlerts.email || profile.email;
        if (!to) return;
        setTestStatus('sending');
        setTestError('');
        try {
            const r = await fetch(`${API_BASE}/api/email/test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to }),
            });
            const data = await r.json();
            if (data.ok) {
                setTestStatus('ok');
                setTimeout(() => setTestStatus(null), 5000);
            } else if (data.unconfigured) {
                setTestStatus('unconfigured');
                setTestError(data.error || 'SMTP not configured');
            } else {
                setTestStatus('error');
                setTestError(data.error || 'Unknown error');
                setTimeout(() => setTestStatus(null), 6000);
            }
        } catch (err) {
            setTestStatus('error');
            setTestError('Could not reach the backend. Is it running?');
            setTimeout(() => setTestStatus(null), 6000);
        }
    }, [emailAlerts.email, profile.email]);

    const generateBrief = useCallback(async (articlesArg) => {
        const favTickers = [...(favProp instanceof Set ? favProp : new Set(account.favorites))];
        if (favTickers.length === 0) {
            setBriefError('Add some favorites first — star a fund in the watchlist to track it here.');
            setBriefStatus('error');
            return;
        }
        setBriefStatus('loading');
        setBriefError('');
        setBriefText('');
        setBriefFunds([]);
        try {
            const result = await fetchMorningBrief({
                favorites: favTickers,
                articles: articlesArg || [],
                name: profile.name,
            });
            setBriefText(result.brief || '');
            setBriefFunds(result.funds || []);
            setBriefGeneratedAt(result.generatedAt || new Date().toISOString());
            setBriefStatus('done');
            // Auto-send to registered alerts email (non-blocking)
            try {
                const alertsEmail = JSON.parse(localStorage.getItem('mf_email_alerts_v1') || '{}').email;
                const sendTo = alertsEmail || profile.email;
                if (sendTo) sendDigestEmail({ to: sendTo, name: profile.name, favorites: favTickers, articles: articlesArg || [] }).catch(() => {});
            } catch { /* ignore */ }
        } catch (e) {
            setBriefError(e.message || 'Failed to generate brief.');
            setBriefStatus('error');
        }
    }, [favProp, account.favorites, profile.name, profile.email]);

    const emailBrief = useCallback(async () => {
        const to = emailAlerts.email || profile.email;
        if (!to || !briefText) return;
        setBriefEmailStatus('sending');
        try {
            const favTickers = [...(favProp instanceof Set ? favProp : new Set(account.favorites))];
            await sendDigestEmail({ to, name: profile.name, favorites: favTickers });
            setBriefEmailStatus('ok');
            setTimeout(() => setBriefEmailStatus(null), 5000);
        } catch (e) {
            setBriefEmailStatus('error');
            setTimeout(() => setBriefEmailStatus(null), 5000);
        }
    }, [emailAlerts.email, profile.email, profile.name, briefText, favProp, account.favorites]);

    const handlePictureUpload = useCallback((e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const b64 = ev.target.result;
            setCustomPicture(b64);
            try { localStorage.setItem(PICTURE_KEY, b64); } catch { }
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    }, []);

    const removePicture = useCallback(() => {
        setCustomPicture(null);
        try { localStorage.removeItem(PICTURE_KEY); } catch { }
    }, []);

    const startEditProfile = () => {
        setDraftName(profile.name);
        setDraftEmail(profile.email);
        setEditingProfile(true);
    };

    const saveProfileEdit = () => {
        setProfile({ name: draftName.trim(), email: draftEmail.trim() });
        setEditingProfile(false);
    };

    // ── derived data ──────────────────────────────────────────────────────────
    const favSet = favProp instanceof Set ? favProp : new Set(account.favorites);
    const doToggleFav = (ticker) => {
        if (onToggleFav) onToggleFav(ticker);
        else setAccount(prev => {
            const favs = prev.favorites.includes(ticker)
                ? prev.favorites.filter(t => t !== ticker)
                : [...prev.favorites, ticker];
            return { ...prev, favorites: favs };
        });
    };

    const positionTotals = Object.entries(account.positions).map(([ticker, entries]) => {
        const total = entries.reduce((s, e) => s + e.amount, 0);
        const fund = funds.find(f => (f.ticker || f.id) === ticker);
        return { ticker, total, fundName: fund?.name || ticker, entries };
    });

    const grandTotal = positionTotals.reduce((s, p) => s + p.total, 0);
    const favFunds = funds.filter(f => favSet.has(f.ticker || f.id));

    // ── actions ───────────────────────────────────────────────────────────────

    const addInvestment = useCallback(() => {
        const ticker = addTicker.trim().toUpperCase();
        const amount = parseFloat(addAmount);
        if (!ticker || !amount || amount <= 0) return;
        const fund = funds.find(f => (f.ticker || f.id) === ticker);
        const entry = { amount, note: addNote.trim() || null, date: new Date().toISOString() };
        setAccount(prev => {
            const existing = prev.positions[ticker] || [];
            return {
                ...prev,
                positions: { ...prev.positions, [ticker]: [...existing, entry] },
                history: [{ ticker, amount, note: entry.note, date: entry.date }, ...prev.history].slice(0, 100),
            };
        });
        logTradeEvent({ ticker, name: fund?.name, amount, timestamp: entry.date }).catch(() => { });
        setAddAmount('');
        setAddNote('');
    }, [addTicker, addAmount, addNote, funds]);

    const removePosition = useCallback((ticker) => {
        const removedEntries = account.positions[ticker] || [];
        const removedAmount = removedEntries.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        const fund = funds.find(f => (f.ticker || f.id) === ticker);
        setAccount(prev => {
            const next = { ...prev.positions };
            delete next[ticker];
            return { ...prev, positions: next };
        });
        logTradeEvent({ ticker, name: fund?.name, amount: removedAmount, timestamp: new Date().toISOString() }).catch(() => { });
    }, [account.positions, funds]);

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
        background: activeTab === name ? T.accent : T.solidPanel,
        border: `1px solid ${activeTab === name ? T.accent : T.borderSub}`,
        borderRadius: 9,
        padding: '5px 11px', fontSize: 11,
        fontWeight: activeTab === name ? 600 : 400,
        color: activeTab === name ? '#fff' : T.textMute,
        cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
        boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
        flexShrink: 0,
    });

    if (!open) return null;

    const initials = getInitials(profile.name);
    const effectivePicture = customPicture || null;

    return (
        <>
            <div
                ref={overlayRef}
                onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', justifyContent: 'flex-end' }}
            >
                <div style={{
                    width: 480, maxWidth: '100vw', height: '100%',
                    background: T.glassPanel || T.panelBg,
                    borderLeft: `1px solid ${T.glassBorder || T.border}`,
                    backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
                    boxShadow: T.glassShadow,
                    display: 'flex', flexDirection: 'column',
                    animation: 'slideInRight 0.22s ease',
                    overflowY: 'auto',
                }}>
                    {/* header */}
                    <div style={{
                        padding: '14px 20px', borderBottom: `1px solid ${T.border}`,
                        display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
                    }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>My Account</div>
                        <button onClick={onClose} style={{
                            marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer',
                            color: T.textMute, fontSize: 20, lineHeight: 1, padding: 4, borderRadius: 4,
                        }}>×</button>
                    </div>

                    {/* compact avatar header */}
                    <div style={{ padding: '12px 20px 8px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
                        {effectivePicture ? (
                            <img src={effectivePicture} alt="" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `2px solid ${T.border}` }} onError={e => { e.target.style.display = 'none'; }} />
                        ) : profile.name ? (
                            <div style={{ width: 38, height: 38, borderRadius: '50%', background: T.inputBg, border: `1.5px solid ${T.borderSub}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: T.accent, flexShrink: 0 }}>{initials}</div>
                        ) : (
                            <div style={{ width: 38, height: 38, borderRadius: '50%', background: T.inputBg, border: `1.5px solid ${T.borderSub}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <FundAvatarIcon size={22} color={T.accent} />
                            </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {profile.name || <span style={{ color: T.textMute, fontStyle: 'italic', fontWeight: 400 }}>Set your name</span>}
                            </div>
                            <div style={{ fontSize: 11, color: T.textMute, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {profile.email || <span style={{ fontStyle: 'italic' }}>No email set</span>}
                            </div>
                        </div>
                    </div>

                    {/* tabs */}
                    <div style={{ display: 'flex', flexShrink: 0, padding: '10px 12px 10px', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
                        {['Profile', 'Portfolio', 'Favorites', 'Alerts', 'History', 'Projections', 'Intelligence'].map(t => (
                            <button key={t} onClick={() => setActiveTab(t)} style={tabBtn(t)}>{t}</button>
                        ))}
                    </div>

                    {/* tab content */}
                    <div style={{ flex: 1, padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

                        {/* ── PROFILE TAB ── */}
                        {activeTab === 'Profile' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                {/* Avatar + name display */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '10px 0 4px' }}>
                                    <div style={{ position: 'relative' }}>
                                        <div onClick={() => pictureInputRef.current?.click()} title="Change photo" style={{ cursor: 'pointer', position: 'relative', width: 80, height: 80, borderRadius: '50%', overflow: 'hidden' }}>
                                            {effectivePicture ? (
                                                <img src={effectivePicture} alt="" style={{ width: 80, height: 80, objectFit: 'cover', display: 'block' }} />
                                            ) : profile.name ? (
                                                <div style={{ width: 80, height: 80, background: T.inputBg, border: `2px solid ${T.borderSub}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: T.accent }}>{initials}</div>
                                            ) : (
                                                <div style={{ width: 80, height: 80, background: T.inputBg, border: `2px solid ${T.borderSub}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <FundAvatarIcon size={44} color={T.accent} />
                                                </div>
                                            )}
                                            {/* camera hover overlay */}
                                            <div className="avatar-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.38)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.15s' }}
                                                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                                onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 10, color: T.textFaint, cursor: 'pointer' }} onClick={() => pictureInputRef.current?.click()}>Change photo</div>
                                    {customPicture && <div style={{ fontSize: 10, color: T.negative, cursor: 'pointer' }} onClick={removePicture}>Remove</div>}
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>
                                            {profile.name || <span style={{ color: T.textMute, fontStyle: 'italic', fontWeight: 400 }}>No name set</span>}
                                        </div>
                                        {profile.email && <div style={{ fontSize: 12, color: T.textMute, marginTop: 2 }}>{profile.email}</div>}
                                    </div>
                                </div>

                                {/* Edit form */}
                                <div>
                                    <SectionHeading>Personal Information</SectionHeading>
                                    {!editingProfile ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            {[
                                                { label: 'Full Name', value: profile.name || '—' },
                                                { label: 'Email Address', value: profile.email || '—' },
                                            ].map(({ label, value }) => (
                                                <div key={label} style={{ background: T.solidPanel, border: `1px solid ${T.borderSub}`, borderRadius: 9, padding: '10px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                                                    <div style={{ fontSize: 9, color: T.textMute, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700, marginBottom: 4 }}>{label}</div>
                                                    <div style={{ fontSize: 13, color: value === '—' ? T.textFaint : T.text, fontStyle: value === '—' ? 'italic' : 'normal' }}>{value}</div>
                                                </div>
                                            ))}
                                            <button onClick={startEditProfile} style={{
                                                alignSelf: 'flex-start', background: T.accent, color: '#fff',
                                                border: 'none', borderRadius: 7, padding: '8px 20px',
                                                fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 4,
                                            }}>Edit Profile</button>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            <div>
                                                <label style={{ fontSize: 10, color: T.textMute, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Full Name</label>
                                                <input type="text" placeholder="e.g. Jane Smith" value={draftName} onChange={e => setDraftName(e.target.value)} style={inputStyle} autoFocus />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: 10, color: T.textMute, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Email Address</label>
                                                <input type="email" placeholder="e.g. jane@example.com" value={draftEmail} onChange={e => setDraftEmail(e.target.value)} style={inputStyle} />
                                            </div>
                                            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                                <button onClick={saveProfileEdit} style={{
                                                    background: T.accent, color: '#fff', border: 'none', borderRadius: 7,
                                                    padding: '8px 20px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                                }}>Save Changes</button>
                                                <button onClick={() => setEditingProfile(false)} style={{
                                                    background: 'none', border: `1px solid ${T.border}`, borderRadius: 7,
                                                    padding: '8px 14px', fontSize: 12, color: T.textMute, cursor: 'pointer',
                                                }}>Cancel</button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Email Alerts */}
                                <div>
                                    <SectionHeading>Email Alerts</SectionHeading>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {/* Email address input */}
                                        <div>
                                            <label style={{ fontSize: 10, color: T.textMute, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Alert Email Address</label>
                                            <input
                                                type="email"
                                                placeholder={profile.email || 'e.g. you@example.com'}
                                                value={emailAlerts.email}
                                                onChange={e => setEmailAlerts(prev => ({ ...prev, email: e.target.value }))}
                                                style={inputStyle}
                                            />
                                            {!emailAlerts.email && profile.email && (
                                                <div style={{ fontSize: 10, color: T.textFaint, marginTop: 4 }}>Leave blank to use profile email: {profile.email}</div>
                                            )}
                                        </div>

                                        {/* Enable toggle */}
                                        <div style={{ background: T.solidPanel, border: `1px solid ${T.borderSub}`, borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Price alert emails</div>
                                                <div style={{ fontSize: 11, color: T.textMute, marginTop: 2 }}>
                                                    {emailAlerts.enabled ? 'Emails will be sent when alerts trigger' : 'Alerts trigger silently — no emails sent'}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setEmailAlerts(prev => ({ ...prev, enabled: !prev.enabled }))}
                                                style={{
                                                    width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', flexShrink: 0,
                                                    background: emailAlerts.enabled ? T.accent : T.border,
                                                    position: 'relative', transition: 'background 0.2s',
                                                }}
                                            >
                                                <div style={{
                                                    position: 'absolute', top: 3, left: emailAlerts.enabled ? 23 : 3,
                                                    width: 18, height: 18, borderRadius: '50%', background: '#fff',
                                                    transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                                                }} />
                                            </button>
                                        </div>

                                        {/* Test email button */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <button
                                                onClick={sendTestEmail}
                                                disabled={testStatus === 'sending' || (!emailAlerts.email && !profile.email)}
                                                style={{
                                                    background: testStatus === 'ok' ? T.positive : (testStatus === 'error' || testStatus === 'unconfigured') ? T.negative : T.accent,
                                                    color: '#fff', border: 'none', borderRadius: 7,
                                                    padding: '8px 18px', fontSize: 12, fontWeight: 600,
                                                    cursor: (testStatus === 'sending' || (!emailAlerts.email && !profile.email)) ? 'not-allowed' : 'pointer',
                                                    opacity: (testStatus === 'sending' || (!emailAlerts.email && !profile.email)) ? 0.6 : 1,
                                                    display: 'flex', alignItems: 'center', gap: 7,
                                                    transition: 'background 0.2s',
                                                }}
                                            >
                                                {testStatus === 'sending' && (
                                                    <div style={{ width: 10, height: 10, border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                                                )}
                                                {testStatus === 'sending' ? 'Sending…'
                                                    : testStatus === 'ok' ? '✓ Sent!'
                                                    : (testStatus === 'error' || testStatus === 'unconfigured') ? 'Failed'
                                                    : 'Send test email'}
                                            </button>
                                            {!emailAlerts.email && !profile.email && (
                                                <span style={{ fontSize: 11, color: T.textFaint, fontStyle: 'italic' }}>Set an email above first</span>
                                            )}
                                        </div>

                                        {/* Status feedback */}
                                        {testStatus === 'ok' && (
                                            <div style={{ background: `${T.positive}14`, border: `1px solid ${T.positive}40`, borderRadius: 8, padding: '10px 14px', fontSize: 12, color: T.positive, lineHeight: 1.5 }}>
                                                <strong>Email sent!</strong> Check your inbox at <em>{emailAlerts.email || profile.email}</em>.
                                            </div>
                                        )}
                                        {testStatus === 'unconfigured' && (
                                            <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>
                                                <strong style={{ display: 'block', marginBottom: 4 }}>Email not configured</strong>
                                                The email service is not set up on the server. Contact the administrator.
                                            </div>
                                        )}
                                        {testStatus === 'error' && testError && (
                                            <div style={{ background: `${T.negative}12`, border: `1px solid ${T.negative}40`, borderRadius: 8, padding: '10px 14px', fontSize: 12, color: T.negative, lineHeight: 1.5 }}>
                                                <strong>Send failed:</strong> {testError}
                                            </div>
                                        )}

                                    </div>
                                </div>

                            </div>
                        )}

                        {/* ── PORTFOLIO TAB ── */}
                        {activeTab === 'Portfolio' && (
                            <>
                                <div>
                                    <SectionHeading>Portfolio Summary</SectionHeading>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                        <StatCard label="Invested" value={fmt$(grandTotal)} accent={T.positive} />
                                        <StatCard label="Positions" value={positionTotals.length} sub="funds" />
                                        <StatCard label="Favorites" value={favSet.size} sub="saved" />
                                        <StatCard label="Alerts" value={alerts.filter(a => !a.triggered).length} sub="active" />
                                    </div>
                                    <div style={{ marginBottom: 10 }}></div>

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
                                                background: T.solidPanel, border: `1px solid ${T.borderSub}`, borderRadius: 9,
                                                padding: '12px 14px', marginBottom: 8,
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div style={{
                                                        width: 30, height: 30, borderRadius: 6,
                                                        background: getFundColor(ticker),
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: 9, color: 'rgba(255,255,255,0.92)', fontWeight: 700, flexShrink: 0,
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
                                                    background: T.solidPanel, border: `1px solid ${T.borderSub}`, borderRadius: 9,
                                                    padding: '11px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10,
                                                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                                                }}>
                                                    <div style={{
                                                        width: 32, height: 32, borderRadius: 7,
                                                        background: getFundColor(ticker),
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: 11, color: 'rgba(255,255,255,0.92)', fontWeight: 700,
                                                        flexShrink: 0, letterSpacing: '-0.3px',
                                                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
                                                    }}>{ticker.slice(0, 2)}</div>
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
                                                    <button onClick={() => doToggleFav(ticker)} style={{
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
                                                    <StarButton active={isFav} onClick={() => doToggleFav(ticker)} />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ── ALERTS TAB ── */}
                        {activeTab === 'Alerts' && (() => {
                            const activeAlerts = alerts.filter(a => !a.triggered);
                            const triggered = alerts.filter(a => a.triggered);
                            const notifPermission = typeof Notification !== 'undefined' ? Notification.permission : 'denied';
                            return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    {notifPermission !== 'granted' && notifPermission !== 'denied' && (
                                        <div style={{ background: 'rgba(99,130,210,0.1)', border: '1px solid rgba(99,130,210,0.3)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                                            <div style={{ fontSize: 11, color: T.textMute }}>Enable browser notifications to get alerted even when the tab is in the background.</div>
                                            <button onClick={() => Notification.requestPermission()} style={{ background: T.accent, color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>Enable</button>
                                        </div>
                                    )}
                                    {notifPermission === 'granted' && (
                                        <div style={{ fontSize: 10, color: T.positive, display: 'flex', alignItems: 'center', gap: 5 }}>
                                            <span>✓</span> Browser notifications enabled
                                        </div>
                                    )}
                                    <div>
                                        <SectionHeading>Active Alerts</SectionHeading>
                                        {activeAlerts.length === 0
                                            ? <EmptyState text="No active alerts. Set one using the 🔔 bell icon in any fund header." />
                                            : activeAlerts.map(a => (
                                                <div key={a.id} style={{
                                                    background: T.solidPanel, border: `1px solid ${T.borderSub}`,
                                                    borderRadius: 9, padding: '11px 14px', marginBottom: 8,
                                                    display: 'flex', alignItems: 'center', gap: 10,
                                                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                                                }}>
                                                    <div style={{
                                                        width: 30, height: 30, borderRadius: 6,
                                                        background: getFundColor(a.ticker),
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: 9, color: 'rgba(255,255,255,0.92)', fontWeight: 700, flexShrink: 0,
                                                    }}>{a.ticker.slice(0, 3)}</div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{a.ticker}</div>
                                                        <div style={{ fontSize: 11, color: T.textMute }}>
                                                            {a.direction === 'above' ? '↑ Notify when above' : '↓ Notify when below'}{' '}
                                                            <strong style={{ color: T.accent }}>${a.targetPrice.toFixed(2)}</strong>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => onRemoveAlert?.(a.id)} style={{
                                                        background: 'none', border: `1px solid ${T.border}`, borderRadius: 5,
                                                        cursor: 'pointer', color: T.textMute, fontSize: 11, padding: '3px 8px',
                                                    }}>Remove</button>
                                                </div>
                                            ))
                                        }
                                    </div>
                                    {triggered.length > 0 && (
                                        <div>
                                            <SectionHeading>Triggered</SectionHeading>
                                            {triggered.map(a => (
                                                <div key={a.id} style={{
                                                    background: T.solidPanel, border: `1px solid ${T.borderSub}`,
                                                    borderRadius: 9, marginBottom: 8,
                                                    display: 'flex', overflow: 'hidden',
                                                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                                                }}>
                                                    <div style={{ width: 4, flexShrink: 0, background: T.positive, borderRadius: '9px 0 0 9px' }} />
                                                    <div style={{ flex: 1, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{a.ticker}</div>
                                                            <div style={{ fontSize: 11, color: T.textMute }}>
                                                                {a.direction === 'above' ? '↑' : '↓'} ${a.targetPrice.toFixed(2)} · Hit
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: 6 }}>
                                                            <button onClick={() => onResetAlert?.(a.id)} style={{
                                                                background: 'none', border: `1px solid ${T.accent}`, borderRadius: 5,
                                                                cursor: 'pointer', color: T.accent, fontSize: 11, padding: '3px 8px',
                                                            }}>Reset</button>
                                                            <button onClick={() => onRemoveAlert?.(a.id)} style={{
                                                                background: 'none', border: `1px solid ${T.border}`, borderRadius: 5,
                                                                cursor: 'pointer', color: T.textMute, fontSize: 11, padding: '3px 8px',
                                                            }}>Dismiss</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

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
                                            background: T.solidPanel, border: `1px solid ${T.borderSub}`,
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                                        }}>
                                            <div style={{
                                                width: 28, height: 28, borderRadius: 5,
                                                background: getFundColor(h.ticker),
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 8, color: 'rgba(255,255,255,0.92)', fontWeight: 700, flexShrink: 0,
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
                        {/* ── INTELLIGENCE TAB ── */}
                        {activeTab === 'Intelligence' && (() => {
                            const favTickers = [...(favProp instanceof Set ? favProp : new Set(account.favorites))];
                            const emailAddr  = emailAlerts.email || profile.email;
                            return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                                    {/* Header card */}
                                    <div style={{
                                        background: `linear-gradient(135deg, ${T.brand}18, ${T.accent}12)`,
                                        border: `1px solid ${T.accent}30`,
                                        borderRadius: 12, padding: '16px 18px',
                                        display: 'flex', alignItems: 'flex-start', gap: 14,
                                    }}>
                                        <div style={{
                                            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                                            background: `linear-gradient(135deg, ${T.brand}, ${T.accent})`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M12 2 L14.5 9.5 L22 12 L14.5 14.5 L12 22 L9.5 14.5 L2 12 L9.5 9.5 Z"/>
                                            </svg>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 4 }}>GS Intelligence</div>
                                            <div style={{ fontSize: 12, color: T.textSub, lineHeight: 1.55 }}>
                                                AI-synthesizes your {favTickers.length > 0 ? `${favTickers.length} favorite fund${favTickers.length > 1 ? 's' : ''}` : 'favorites'} into a personalized morning briefing — live prices, news relevance, and portfolio outlook.
                                            </div>
                                        </div>
                                    </div>

                                    {/* No favorites warning */}
                                    {favTickers.length === 0 && (
                                        <div style={{ background: `${T.textMute}12`, border: `1px solid ${T.border}`, borderRadius: 10, padding: '14px 16px', fontSize: 12, color: T.textSub, lineHeight: 1.6 }}>
                                            Star some funds in the watchlist to unlock your Intelligence brief.
                                        </div>
                                    )}

                                    {/* Generate button */}
                                    {favTickers.length > 0 && briefStatus !== 'loading' && (
                                        <button
                                            onClick={() => generateBrief([])}
                                            style={{
                                                background: `linear-gradient(135deg, ${T.brand}, ${T.accent})`,
                                                color: '#fff', border: 'none', borderRadius: 10,
                                                padding: '11px 22px', fontSize: 13, fontWeight: 600,
                                                cursor: 'pointer', alignSelf: 'flex-start',
                                                boxShadow: `0 4px 14px ${T.brand}40`,
                                                display: 'flex', alignItems: 'center', gap: 8,
                                            }}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                                                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                                            </svg>
                                            {briefStatus === 'done' ? 'Regenerate Brief' : 'Generate Morning Brief'}
                                        </button>
                                    )}

                                    {/* Loading state */}
                                    {briefStatus === 'loading' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '28px 0' }}>
                                            <div style={{
                                                width: 44, height: 44, borderRadius: '50%',
                                                border: `3px solid ${T.border}`,
                                                borderTopColor: T.accent,
                                                animation: 'spin 0.8s linear infinite',
                                            }} />
                                            <div style={{ fontSize: 13, color: T.textSub, textAlign: 'center' }}>
                                                Analyzing {favTickers.length} fund{favTickers.length > 1 ? 's' : ''} + market context…
                                            </div>
                                        </div>
                                    )}

                                    {/* Error state */}
                                    {briefStatus === 'error' && briefError && (
                                        <div style={{ background: `${T.negative}12`, border: `1px solid ${T.negative}30`, borderRadius: 10, padding: '12px 16px', fontSize: 12, color: T.negative, lineHeight: 1.6 }}>
                                            {briefError}
                                        </div>
                                    )}

                                    {/* Brief result */}
                                    {briefStatus === 'done' && briefText && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                                            {/* Timestamp + label */}
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <div style={{ fontSize: 10, fontWeight: 700, color: T.textMute, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Portfolio Analysis</div>
                                                {briefGeneratedAt && (
                                                    <div style={{ fontSize: 10, color: T.textFaint }}>
                                                        {new Date(briefGeneratedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                )}
                                            </div>

                                            {/* AI prose — rendered as paragraphs */}
                                            <div style={{
                                                background: T.cardBg, border: `1px solid ${T.border}`,
                                                borderRadius: 12, padding: '18px 18px',
                                                position: 'relative', overflow: 'hidden',
                                            }}>
                                                {/* Subtle accent bar */}
                                                <div style={{
                                                    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                                                    background: `linear-gradient(90deg, ${T.brand}, ${T.accent})`,
                                                }} />
                                                <div style={{ paddingTop: 4 }}>
                                                    {briefText.split(/\n{2,}/).map((para, i) => (
                                                        <p key={i} style={{
                                                            margin: i === 0 ? '0 0 12px' : '0 0 12px',
                                                            fontSize: 13, color: T.text, lineHeight: 1.75,
                                                        }}>
                                                            {para.trim().split(/\*\*(.*?)\*\*/).map((seg, j) =>
                                                                j % 2 === 1
                                                                    ? <strong key={j} style={{ color: T.accent }}>{seg}</strong>
                                                                    : seg
                                                            )}
                                                        </p>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Live fund performance table */}
                                            {briefFunds.length > 0 && (
                                                <div>
                                                    <div style={{ fontSize: 10, fontWeight: 700, color: T.textMute, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Live Prices</div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                        {briefFunds.map(f => {
                                                            const isUp  = f.changePct != null && f.changePct >= 0;
                                                            const clr   = isUp ? T.positive : T.negative;
                                                            const pct   = f.changePct != null ? `${f.changePct >= 0 ? '+' : ''}${f.changePct.toFixed(2)}%` : '—';
                                                            const price = f.price != null ? `$${f.price.toFixed(2)}` : '—';
                                                            const barW  = f.changePct != null ? Math.min(Math.abs(f.changePct) * 12, 100) : 0;
                                                            return (
                                                                <div key={f.ticker} style={{
                                                                    background: T.cardBg, border: `1px solid ${T.border}`,
                                                                    borderRadius: 8, padding: '10px 14px',
                                                                    display: 'flex', alignItems: 'center', gap: 10,
                                                                    position: 'relative', overflow: 'hidden',
                                                                }}>
                                                                    {/* momentum bar */}
                                                                    <div style={{
                                                                        position: 'absolute', bottom: 0, left: 0,
                                                                        width: `${barW}%`, height: 2,
                                                                        background: clr, opacity: 0.5,
                                                                        transition: 'width 0.4s ease',
                                                                    }} />
                                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                                        <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{f.ticker}</div>
                                                                        <div style={{ fontSize: 10, color: T.textMute, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</div>
                                                                    </div>
                                                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                                        <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{price}</div>
                                                                        <div style={{ fontSize: 11, fontWeight: 600, color: clr }}>{pct}</div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Email brief button */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                                <button
                                                    onClick={emailBrief}
                                                    disabled={!emailAddr || briefEmailStatus === 'sending'}
                                                    style={{
                                                        background: briefEmailStatus === 'ok' ? T.positive : briefEmailStatus === 'error' ? T.negative : T.cardBg,
                                                        color: briefEmailStatus === 'ok' || briefEmailStatus === 'error' ? '#fff' : T.text,
                                                        border: `1px solid ${briefEmailStatus === 'ok' ? T.positive : briefEmailStatus === 'error' ? T.negative : T.border}`,
                                                        borderRadius: 8, padding: '8px 16px',
                                                        fontSize: 12, fontWeight: 600, cursor: emailAddr ? 'pointer' : 'not-allowed',
                                                        opacity: (!emailAddr || briefEmailStatus === 'sending') ? 0.6 : 1,
                                                        display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s',
                                                    }}
                                                >
                                                    {briefEmailStatus === 'sending' && (
                                                        <div style={{ width: 10, height: 10, border: `2px solid ${T.border}`, borderTopColor: T.accent, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                                                    )}
                                                    {briefEmailStatus === 'sending' ? 'Sending…'
                                                        : briefEmailStatus === 'ok' ? '✓ Sent to ' + emailAddr
                                                        : briefEmailStatus === 'error' ? 'Send failed'
                                                        : (
                                                            <>
                                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                                                                </svg>
                                                                Email this brief
                                                            </>
                                                        )
                                                    }
                                                </button>
                                                {!emailAddr && (
                                                    <span style={{ fontSize: 11, color: T.textFaint, fontStyle: 'italic' }}>Set an email in Profile first</span>
                                                )}
                                            </div>

                                        </div>
                                    )}

                                </div>
                            );
                        })()}

                        {activeTab === 'Projections' && (
                            <div>
                                {savedProjections.length === 0
                                    ? <EmptyState text="No saved projections yet. Use the CAPM Calculator to save a projection." />
                                    : (
                                        <>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                                <SectionHeading>Saved Projections</SectionHeading>
                                                <button onClick={() => {
                                                    localStorage.removeItem('mf_calc_history_v1');
                                                    window.dispatchEvent(new StorageEvent('storage', { key: 'mf_calc_history_v1', newValue: '[]' }));
                                                    setSavedProjections([]);
                                                }} style={{
                                                    background: 'none', border: `1px solid ${T.border}`, borderRadius: 6,
                                                    padding: '3px 10px', fontSize: 10, color: T.textMute, cursor: 'pointer',
                                                }}>Clear All</button>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                {savedProjections.map(p => {
                                                    const fv = p.totalFV;
                                                    const gain = p.totalGain;
                                                    const gainPct = p.totalGainPct;
                                                    return (
                                                        <div key={p.id} style={{
                                                            background: T.solidPanel, border: `1px solid ${T.borderSub}`,
                                                            borderRadius: 10, overflow: 'hidden',
                                                            display: 'flex', flexDirection: 'row',
                                                            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                                                        }}>
                                                            <div style={{ width: 4, flexShrink: 0, background: T.accent, borderRadius: '10px 0 0 10px' }} />
                                                            <div style={{ flex: 1, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                    <div>
                                                                        <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{p.ticker}</div>
                                                                        <div style={{ fontSize: 10, color: T.textMute }}>{fmtDate(p.savedAt)}</div>
                                                                    </div>
                                                                </div>
                                                                <button onClick={() => {
                                                                    const next = savedProjections.filter(x => x.id !== p.id);
                                                                    localStorage.setItem('mf_calc_history_v1', JSON.stringify(next));
                                                                    window.dispatchEvent(new StorageEvent('storage', { key: 'mf_calc_history_v1', newValue: JSON.stringify(next) }));
                                                                    setSavedProjections(next);
                                                                }} style={{
                                                                    background: 'none', border: 'none', cursor: 'pointer',
                                                                    color: T.textFaint, fontSize: 14, padding: '0 2px',
                                                                }}>✕</button>
                                                            </div>
                                                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                                <div style={{ background: T.inputBg, borderRadius: 6, padding: '5px 10px' }}>
                                                                    <div style={{ fontSize: 9, color: T.textMute, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Principal</div>
                                                                    <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{fmt$(p.principal)}</div>
                                                                </div>
                                                                <div style={{ background: T.inputBg, borderRadius: 6, padding: '5px 10px' }}>
                                                                    <div style={{ fontSize: 9, color: T.textMute, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Years</div>
                                                                    <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{p.years}yr</div>
                                                                </div>
                                                                <div style={{ background: T.inputBg, borderRadius: 6, padding: '5px 10px' }}>
                                                                    <div style={{ fontSize: 9, color: T.textMute, textTransform: 'uppercase', letterSpacing: '0.05em' }}>CAPM Rate</div>
                                                                    <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{p.rate?.toFixed(2)}%</div>
                                                                </div>
                                                                {p.pmt > 0 && (
                                                                    <div style={{ background: T.inputBg, borderRadius: 6, padding: '5px 10px' }}>
                                                                        <div style={{ fontSize: 9, color: T.textMute, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recurring</div>
                                                                        <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{fmt$(p.pmt)}/{p.freqId?.replace('ly', '')}</div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: `1px solid ${T.border}`, paddingTop: 8 }}>
                                                                <div>
                                                                    <div style={{ fontSize: 9, color: T.textMute, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Projected Value</div>
                                                                    <div style={{ fontSize: 18, fontWeight: 700, color: T.positive }}>{fmt$(fv)}</div>
                                                                </div>
                                                                {gain != null && (
                                                                    <div style={{ textAlign: 'right' }}>
                                                                        <div style={{ fontSize: 9, color: T.textMute, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Total Gain</div>
                                                                        <div style={{ fontSize: 13, fontWeight: 700, color: T.positive }}>+{fmt$(gain)}</div>
                                                                        <div style={{ fontSize: 10, color: T.textMute }}>{gainPct?.toFixed(1)}%</div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    )
                                }
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <input ref={pictureInputRef} type="file" accept="image/*" onChange={handlePictureUpload} style={{ display: 'none' }} />

            <style>{`
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to   { transform: translateX(0);    opacity: 1; }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to   { transform: rotate(360deg); }
                }
            `}</style>
        </>
    );
}