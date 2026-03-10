import { useState, useEffect } from "react";

const GLASS = {
    background: "rgba(255,255,255,0.45)",
    backdropFilter: "blur(40px) saturate(1.6)",
    WebkitBackdropFilter: "blur(40px) saturate(1.6)",
    border: "1px solid rgba(255,255,255,0.6)",
    borderRadius: 18,
    boxShadow: "0 4px 24px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.7)",
};

// Available funds that can be favorited
const AVAILABLE_FUNDS = [
    { ticker: "VFIAX", name: "Vanguard 500 Index", returnPct: 12.89, trend: "up" },
    { ticker: "FXAIX", name: "Fidelity 500 Index", returnPct: 12.91, trend: "up" },
    { ticker: "VWELX", name: "Wellington Fund", returnPct: 8.74, trend: "down" },
    { ticker: "AGTHX", name: "American Funds Growth", returnPct: 13.42, trend: "up" },
    { ticker: "PTTAX", name: "PIMCO Total Return", returnPct: 4.21, trend: "down" },
    { ticker: "FCNTX", name: "Fidelity Contrafund", returnPct: 14.56, trend: "up" },
    { ticker: "VBTLX", name: "Vanguard Bond Market", returnPct: 3.12, trend: "down" },
    { ticker: "DODGX", name: "Dodge & Cox Stock", returnPct: 11.78, trend: "up" },
];

const TAG_COLORS = {
    Macro: "#E67E22",
    Market: "#10B981",
    Funds: "#3B82F6",
    Bonds: "#8B5CF6",
    Crypto: "#EC4899",
    Forex: "#14B8A6",
    "M&A": "#F97316",
};

// — Helpers —
function loadFromStorage(key, fallback) {
    try {
        const v = localStorage.getItem(key);
        return v ? JSON.parse(v) : fallback;
    } catch { return fallback; }
}
function saveToStorage(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch { }
}

// — SVG Icons —
const Icons = {
    star: (c) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>,
    target: (c) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>,
    news: (c) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" /><path d="M18 14h-8" /><path d="M15 18h-5" /><path d="M10 6h8v4h-8V6Z" /></svg>,
    settings: (c) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>,
    x: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
    plus: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
    trash: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>,
    edit: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7B8BA3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>,
    profile: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 0 0-16 0" /></svg>,
    bell: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>,
    palette: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r="0.5" fill="#6B7280" /><circle cx="17.5" cy="10.5" r="0.5" fill="#6B7280" /><circle cx="8.5" cy="7.5" r="0.5" fill="#6B7280" /><circle cx="6.5" cy="12" r="0.5" fill="#6B7280" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" /></svg>,
    lock: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
    download: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>,
};

// Toggle switch component
function Toggle({ checked, onChange }) {
    return (
        <button onClick={() => onChange(!checked)} style={{
            width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer",
            background: checked ? "#003A70" : "rgba(0,0,0,0.12)",
            position: "relative", transition: "background 0.2s", flexShrink: 0, padding: 0,
        }}>
            <div style={{
                width: 16, height: 16, borderRadius: 8, background: "#fff",
                position: "absolute", top: 2,
                left: checked ? 18 : 2, transition: "left 0.2s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
            }} />
        </button>
    );
}

export default function Sidebar({ isOpen, onToggle }) {
    const [activeTab, setActiveTab] = useState("favorites");

    // ── Favorites (persisted) ──
    const [favorites, setFavorites] = useState(() =>
        loadFromStorage("mtf_favorites", ["VFIAX", "FCNTX", "VWELX"])
    );
    const [showAddFav, setShowAddFav] = useState(false);

    useEffect(() => saveToStorage("mtf_favorites", favorites), [favorites]);

    const addFavorite = (ticker) => {
        if (!favorites.includes(ticker)) setFavorites([...favorites, ticker]);
        setShowAddFav(false);
    };
    const removeFavorite = (ticker) => setFavorites(favorites.filter(t => t !== ticker));

    // ── Plans (persisted) ──
    const [plans, setPlans] = useState(() =>
        loadFromStorage("mtf_plans", [
            { id: 1, label: "Retirement Fund", target: 500000, saved: 160000 },
            { id: 2, label: "Emergency Fund", target: 25000, saved: 19500 },
            { id: 3, label: "College Fund", target: 120000, saved: 16800 },
        ])
    );
    const [showAddPlan, setShowAddPlan] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);
    const [planForm, setPlanForm] = useState({ label: "", target: "", saved: "" });

    useEffect(() => saveToStorage("mtf_plans", plans), [plans]);

    const savePlan = () => {
        const label = planForm.label.trim();
        const target = Number(planForm.target);
        const saved = Number(planForm.saved) || 0;
        if (!label || !target || target <= 0) return;
        if (editingPlan) {
            setPlans(plans.map(p => p.id === editingPlan ? { ...p, label, target, saved } : p));
            setEditingPlan(null);
        } else {
            setPlans([...plans, { id: Date.now(), label, target, saved }]);
        }
        setPlanForm({ label: "", target: "", saved: "" });
        setShowAddPlan(false);
    };
    const deletePlan = (id) => setPlans(plans.filter(p => p.id !== id));
    const startEditPlan = (plan) => {
        setEditingPlan(plan.id);
        setPlanForm({ label: plan.label, target: String(plan.target), saved: String(plan.saved) });
        setShowAddPlan(true);
    };

    // ── Settings (persisted) ──
    const [settings, setSettings] = useState(() =>
        loadFromStorage("mtf_settings", { notifications: true, compactView: false, autoCalc: true, currency: "USD" })
    );
    useEffect(() => saveToStorage("mtf_settings", settings), [settings]);
    const toggleSetting = (key) => setSettings({ ...settings, [key]: !settings[key] });
    const [activeSettingView, setActiveSettingView] = useState(null); // 'profile' | 'security' | null

    const handleExportData = () => {
        const data = {
            favorites,
            plans,
            settings,
            exportDate: new Date().toISOString()
        };
        const csvContent =
            "Type,Name,Value,Status\n" +
            favorites.map(f => `Favorite,${f},-,Active`).join("\n") + "\n" +
            plans.map(p => `Plan,${p.label},${p.saved}/${p.target},${(p.saved / p.target * 100).toFixed(1)}%`).join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `mutual-fund-data-${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // ── News (live + auto-refresh) ──
    const [liveNews, setLiveNews] = useState(null);
    const [newsLoading, setNewsLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);

    const fetchNews = async () => {
        setNewsLoading(true);
        try {
            const res = await fetch("https://finnhub.io/api/v1/news?category=general&token=demo");
            if (!res.ok) throw new Error();
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                setLiveNews(data.slice(0, 15).map(item => ({
                    title: item.headline,
                    summary: item.summary || "",
                    url: item.url,
                    source: item.source || "Unknown",
                    image: item.image || "",
                    time: item.datetime,
                    tag: item.category === "forex" ? "Forex" : item.category === "crypto" ? "Crypto" : item.category === "merger" ? "M&A" : "Market",
                })));
                setLastUpdated(new Date());
            }
        } catch { setLiveNews(null); }
        setNewsLoading(false);
    };

    useEffect(() => {
        fetchNews();
        const interval = setInterval(fetchNews, 120000); // refresh every 2 min
        return () => clearInterval(interval);
    }, []);

    const MOCK_NEWS = [
        { title: "Fed holds rates steady, signals patience on cuts", source: "Bloomberg", time: "2h ago", tag: "Macro", summary: "The Federal Reserve kept interest rates unchanged at 4.25%-4.5% as officials await more clarity on inflation.", url: "https://www.bloomberg.com/markets" },
        { title: "S&P 500 closes at record high on tech rally", source: "Reuters", time: "3h ago", tag: "Market", summary: "Wall Street's main indexes rose sharply, led by gains in mega-cap technology stocks.", url: "https://www.reuters.com/markets/" },
        { title: "Vanguard cuts expense ratios on 3 index funds", source: "The Wall Street Journal", time: "5h ago", tag: "Funds", summary: "Vanguard Group said it would lower fees on three of its largest index mutual funds.", url: "https://www.wsj.com/finance/investing" },
        { title: "Treasury yields fall as investors seek safety", source: "Financial Times", time: "7h ago", tag: "Bonds", summary: "U.S. government bond yields dropped as investors moved into safe-haven assets.", url: "https://www.ft.com/markets" },
        { title: "BlackRock CEO predicts private credit boom", source: "CNBC", time: "8h ago", tag: "Market", summary: "Larry Fink sees private credit as a $30 trillion opportunity over the next decade.", url: "https://www.cnbc.com/investing/" },
        { title: "Fidelity launches zero-fee international fund", source: "Barron's", time: "1d ago", tag: "Funds", summary: "Fidelity Investments expands its zero-fee lineup with a new international equity fund.", url: "https://www.barrons.com/funds" },
        { title: "Oil prices surge on OPEC+ production cuts", source: "Bloomberg", time: "1d ago", tag: "Macro", summary: "Crude oil jumped 3% after OPEC+ announced deeper-than-expected production cuts.", url: "https://www.bloomberg.com/energy" },
        { title: "Emerging market funds see record inflows", source: "Financial Times", time: "2d ago", tag: "Funds", summary: "Investors poured $12B into EM equity funds, the largest weekly inflow on record.", url: "https://www.ft.com/emerging-markets" },
    ];

    // Source brand config: color, favicon domain, font style
    const SOURCE_BRANDS = {
        "Bloomberg": { color: "#472090", domain: "bloomberg.com", fontFamily: "'Inter', sans-serif", fontWeight: 800, letterSpacing: "-0.02em", textTransform: "none", fontSize: 11 },
        "Reuters": { color: "#FF8000", domain: "reuters.com", fontFamily: "'Inter', sans-serif", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 9 },
        "The Wall Street Journal": { color: "#0274B6", domain: "wsj.com", fontFamily: "'Georgia', 'Times New Roman', serif", fontWeight: 700, letterSpacing: "0em", textTransform: "none", fontSize: 11 },
        "Financial Times": { color: "#FFF1E5", textColor: "#33302E", domain: "ft.com", fontFamily: "'Georgia', serif", fontWeight: 700, letterSpacing: "0em", textTransform: "none", fontStyle: "italic", fontSize: 11 },
        "CNBC": { color: "#005594", domain: "cnbc.com", fontFamily: "'Inter', sans-serif", fontWeight: 900, letterSpacing: "0.06em", textTransform: "uppercase", fontSize: 10 },
        "Barron's": { color: "#222", domain: "barrons.com", fontFamily: "'Georgia', serif", fontWeight: 700, letterSpacing: "0.01em", textTransform: "none", fontSize: 11 },
        "MarketWatch": { color: "#00AC4E", domain: "marketwatch.com", fontFamily: "'Inter', sans-serif", fontWeight: 800, letterSpacing: "0em", textTransform: "none", fontSize: 10 },
        "Yahoo Finance": { color: "#6001D2", domain: "finance.yahoo.com", fontFamily: "'Inter', sans-serif", fontWeight: 800, letterSpacing: "-0.01em", textTransform: "none", fontSize: 10 },
        "Investopedia": { color: "#1D4ED8", domain: "investopedia.com", fontFamily: "'Inter', sans-serif", fontWeight: 700, letterSpacing: "0em", textTransform: "none", fontSize: 10 },
        "Morningstar": { color: "#C62828", domain: "morningstar.com", fontFamily: "'Inter', sans-serif", fontWeight: 800, letterSpacing: "0em", textTransform: "none", fontSize: 10 },
        "Seeking Alpha": { color: "#F97316", domain: "seekingalpha.com", fontFamily: "'Inter', sans-serif", fontWeight: 700, letterSpacing: "0em", textTransform: "none", fontSize: 10 },
        "Benzinga": { color: "#0D9488", domain: "benzinga.com", fontFamily: "'Inter', sans-serif", fontWeight: 800, letterSpacing: "0em", textTransform: "none", fontSize: 10 },
    };

    // Helper to get domain for favicon
    const getDomain = (source) => {
        const brand = SOURCE_BRANDS[source];
        if (brand?.domain) return brand.domain;
        // Try to guess from source name
        return source?.toLowerCase().replace(/[^a-z]/g, '') + ".com";
    };

    // Portfolio summary from favorites
    const favoriteFunds = AVAILABLE_FUNDS.filter(f => favorites.includes(f.ticker));
    const avgReturn = favoriteFunds.length > 0 ? favoriteFunds.reduce((s, f) => s + f.returnPct, 0) / favoriteFunds.length : 0;
    const totalSaved = plans.reduce((s, p) => s + p.saved, 0);

    const navItems = [
        { id: "favorites", icon: Icons.star, label: "Favorites" },
        { id: "plans", icon: Icons.target, label: "Plans" },
        { id: "news", icon: Icons.news, label: "News" },
        { id: "settings", icon: Icons.settings, label: "Settings" },
    ];

    const planColors = ["#003A70", "#10B981", "#3B82F6", "#8B5CF6", "#E67E22", "#EC4899"];

    const inputStyle = {
        width: "100%", padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.08)",
        background: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "'Inter', sans-serif",
        outline: "none", color: "#0A1628", boxSizing: "border-box",
    };

    return (
        <div style={{ position: "relative", flexShrink: 0 }}>
            <button onClick={onToggle} style={{
                position: isOpen ? "absolute" : "relative", top: 0, right: isOpen ? -16 : 0, zIndex: 20,
                width: 32, height: 32, borderRadius: 10, background: "rgba(255,255,255,0.6)",
                backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
                border: "1px solid rgba(255,255,255,0.7)", boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.2s", color: "#9CA3AF", fontSize: 14,
            }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.8)"; e.currentTarget.style.color = "#6B7280"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.6)"; e.currentTarget.style.color = "#9CA3AF"; }}
            >
                {isOpen ? "‹" : "›"}
            </button>

            <aside style={{
                width: isOpen ? 272 : 0, opacity: isOpen ? 1 : 0, overflow: "hidden",
                transition: "width 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease",
                display: "flex", flexDirection: "column", gap: 10,
                position: "sticky", top: 24, alignSelf: "flex-start", height: "calc(100vh - 48px)",
            }}>
                <div style={{ width: 272, display: "flex", flexDirection: "column", gap: 10, height: "100%" }}>

                    {/* Nav Tabs */}
                    <div style={{ ...GLASS, padding: "5px", display: "flex", gap: 2 }}>
                        {navItems.map(item => (
                            <button key={item.id} onClick={() => setActiveTab(item.id)} style={{
                                flex: 1, background: activeTab === item.id ? "rgba(0,58,112,0.08)" : "transparent",
                                border: "none", borderRadius: 12, padding: "10px 4px", cursor: "pointer",
                                transition: "all 0.2s", outline: "none",
                                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                            }}
                                onMouseEnter={e => { if (activeTab !== item.id) e.currentTarget.style.background = "rgba(0,0,0,0.03)"; }}
                                onMouseLeave={e => { if (activeTab !== item.id) e.currentTarget.style.background = "transparent"; }}
                            >
                                {item.icon(activeTab === item.id ? "#003A70" : "#9CA3AF")}
                                <span style={{ fontSize: 9, letterSpacing: "0.04em", color: activeTab === item.id ? "#003A70" : "#9CA3AF", fontWeight: activeTab === item.id ? 600 : 400 }}>{item.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div style={{ ...GLASS, padding: "16px 18px", flex: 1, overflow: "auto", minHeight: 0 }}>

                        {/* ═══ FAVORITES ═══ */}
                        {activeTab === "favorites" && (
                            <div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                                    <div style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "#7B8BA3", fontWeight: 600 }}>Favorites ({favorites.length})</div>
                                </div>
                                <div style={{ display: "grid", gap: 8 }}>
                                    {favoriteFunds.map(f => (
                                        <div key={f.ticker} style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(0,0,0,0.05)", borderRadius: 14, padding: "14px 16px", transition: "all 0.2s", position: "relative" }}
                                            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.7)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.5)"; e.currentTarget.style.transform = ""; }}
                                        >
                                            <button onClick={() => removeFavorite(f.ticker)} style={{
                                                position: "absolute", top: 8, right: 8, background: "none", border: "none",
                                                cursor: "pointer", padding: 2, opacity: 0.4, transition: "opacity 0.15s",
                                            }}
                                                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                                onMouseLeave={e => e.currentTarget.style.opacity = 0.4}
                                            >{Icons.x}</button>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingRight: 16 }}>
                                                <div>
                                                    <span style={{ fontSize: 12, fontWeight: 700, color: "#003A70" }}>{f.ticker}</span>
                                                    <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>{f.name}</div>
                                                </div>
                                                <div style={{ fontSize: 14, fontWeight: 600, color: f.trend === "up" ? "#10B981" : "#EF4444" }}>
                                                    {f.trend === "up" ? "↑" : "↓"} {f.returnPct}%
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {favorites.length === 0 && (
                                        <div style={{ textAlign: "center", padding: "20px 0", color: "#9CA3AF", fontSize: 12 }}>No favorites yet</div>
                                    )}
                                </div>

                                {/* Add favorite dropdown */}
                                {showAddFav ? (
                                    <div style={{ marginTop: 10, background: "rgba(255,255,255,0.6)", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 12, padding: 8, maxHeight: 180, overflow: "auto" }}>
                                        <div style={{ fontSize: 10, color: "#7B8BA3", marginBottom: 6, fontWeight: 500 }}>Select fund to add:</div>
                                        {AVAILABLE_FUNDS.filter(f => !favorites.includes(f.ticker)).map(f => (
                                            <button key={f.ticker} onClick={() => addFavorite(f.ticker)} style={{
                                                width: "100%", background: "none", border: "none", borderRadius: 8, padding: "8px 10px",
                                                cursor: "pointer", textAlign: "left", transition: "background 0.15s", display: "flex",
                                                justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "#0A1628",
                                            }}
                                                onMouseEnter={e => e.currentTarget.style.background = "rgba(0,58,112,0.04)"}
                                                onMouseLeave={e => e.currentTarget.style.background = "none"}
                                            >
                                                <span><strong style={{ color: "#003A70" }}>{f.ticker}</strong> {f.name}</span>
                                                <span style={{ color: "#10B981", fontSize: 11 }}>{f.returnPct}%</span>
                                            </button>
                                        ))}
                                        {AVAILABLE_FUNDS.filter(f => !favorites.includes(f.ticker)).length === 0 && (
                                            <div style={{ fontSize: 11, color: "#9CA3AF", padding: 8, textAlign: "center" }}>All funds added</div>
                                        )}
                                        <button onClick={() => setShowAddFav(false)} style={{
                                            width: "100%", marginTop: 4, background: "none", border: "none", fontSize: 11,
                                            color: "#9CA3AF", cursor: "pointer", padding: 4,
                                        }}>Cancel</button>
                                    </div>
                                ) : (
                                    <button onClick={() => setShowAddFav(true)} style={{
                                        width: "100%", marginTop: 10, background: "none", border: "1px dashed rgba(0,58,112,0.25)",
                                        borderRadius: 12, padding: "10px", cursor: "pointer", color: "#003A70", fontSize: 12,
                                        fontWeight: 500, transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                                    }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(0,58,112,0.5)"; e.currentTarget.style.background = "rgba(0,58,112,0.03)"; }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(0,58,112,0.25)"; e.currentTarget.style.background = "none"; }}
                                    >{Icons.plus} Add favorite</button>
                                )}
                            </div>
                        )}

                        {/* ═══ PLANS ═══ */}
                        {activeTab === "plans" && (
                            <div>
                                <div style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "#7B8BA3", marginBottom: 14, fontWeight: 600 }}>
                                    Savings Goals ({plans.length})
                                </div>
                                <div style={{ display: "grid", gap: 10 }}>
                                    {plans.map((p, idx) => {
                                        const progress = p.target > 0 ? Math.min(100, (p.saved / p.target) * 100) : 0;
                                        const color = planColors[idx % planColors.length];
                                        return (
                                            <div key={p.id} style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(0,0,0,0.05)", borderRadius: 14, padding: "14px 16px", position: "relative" }}>
                                                <div style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: 4 }}>
                                                    <button onClick={() => startEditPlan(p)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, opacity: 0.5, transition: "opacity 0.15s" }}
                                                        onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0.5}
                                                    >{Icons.edit}</button>
                                                    <button onClick={() => deletePlan(p.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, opacity: 0.5, transition: "opacity 0.15s" }}
                                                        onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0.5}
                                                    >{Icons.trash}</button>
                                                </div>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, paddingRight: 50 }}>
                                                    <span style={{ fontSize: 13, fontWeight: 600, color: "#0A1628" }}>{p.label}</span>
                                                </div>
                                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#7B8BA3", marginBottom: 8 }}>
                                                    <span>${p.saved.toLocaleString()} saved</span>
                                                    <span>of ${p.target.toLocaleString()}</span>
                                                </div>
                                                <div style={{ width: "100%", height: 6, background: "rgba(0,0,0,0.06)", borderRadius: 3, overflow: "hidden" }}>
                                                    <div style={{ width: `${progress}%`, height: "100%", background: `linear-gradient(90deg, ${color}88, ${color})`, borderRadius: 3, transition: "width 0.6s ease" }} />
                                                </div>
                                                <div style={{ marginTop: 6, fontSize: 11, color, fontWeight: 600 }}>{progress.toFixed(1)}% complete</div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Add/Edit plan form */}
                                {showAddPlan ? (
                                    <div style={{ marginTop: 10, background: "rgba(255,255,255,0.6)", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 12, padding: 12 }}>
                                        <div style={{ fontSize: 10, color: "#7B8BA3", marginBottom: 8, fontWeight: 600 }}>{editingPlan ? "Edit Goal" : "New Goal"}</div>
                                        <div style={{ display: "grid", gap: 8 }}>
                                            <input style={inputStyle} placeholder="Goal name" value={planForm.label} onChange={e => setPlanForm({ ...planForm, label: e.target.value })} />
                                            <input style={inputStyle} placeholder="Target amount ($)" type="number" value={planForm.target} onChange={e => setPlanForm({ ...planForm, target: e.target.value })} />
                                            <input style={inputStyle} placeholder="Amount saved ($)" type="number" value={planForm.saved} onChange={e => setPlanForm({ ...planForm, saved: e.target.value })} />
                                            <div style={{ display: "flex", gap: 6 }}>
                                                <button onClick={savePlan} style={{
                                                    flex: 1, background: "#003A70", border: "none", borderRadius: 8, padding: "8px",
                                                    color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer",
                                                }}>Save</button>
                                                <button onClick={() => { setShowAddPlan(false); setEditingPlan(null); setPlanForm({ label: "", target: "", saved: "" }); }} style={{
                                                    flex: 1, background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 8,
                                                    padding: "8px", color: "#7B8BA3", fontSize: 11, fontWeight: 500, cursor: "pointer",
                                                }}>Cancel</button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <button onClick={() => { setShowAddPlan(true); setEditingPlan(null); setPlanForm({ label: "", target: "", saved: "" }); }} style={{
                                        width: "100%", marginTop: 10, background: "none", border: "1px dashed rgba(0,58,112,0.25)",
                                        borderRadius: 12, padding: "10px", cursor: "pointer", color: "#003A70", fontSize: 12,
                                        fontWeight: 500, transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                                    }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(0,58,112,0.5)"; e.currentTarget.style.background = "rgba(0,58,112,0.03)"; }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(0,58,112,0.25)"; e.currentTarget.style.background = "none"; }}
                                    >{Icons.plus} New savings goal</button>
                                )}
                            </div>
                        )}

                        {/* ═══ NEWS — Apple News Style ═══ */}
                        {activeTab === "news" && (
                            <div>
                                {/* Header */}
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                                    <div>
                                        <div style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "#7B8BA3", fontWeight: 600 }}>Markets & Funds</div>
                                        {lastUpdated && <div style={{ fontSize: 9, color: "#B0B0B0", marginTop: 3 }}>Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>}
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        {liveNews && <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 6, height: 6, borderRadius: 3, background: "#10B981", animation: "pulse 2s infinite" }} /><span style={{ fontSize: 9, color: "#10B981", fontWeight: 500 }}>Live</span></div>}
                                        <button onClick={fetchNews} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, opacity: 0.5, transition: "opacity 0.15s" }}
                                            onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0.5}
                                        >
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7B8BA3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
                                        </button>
                                    </div>
                                </div>

                                {newsLoading && !liveNews ? (
                                    <div style={{ textAlign: "center", padding: "32px 0" }}>
                                        <div style={{ width: 20, height: 20, border: "2px solid rgba(0,58,112,0.15)", borderTopColor: "#003A70", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 8px" }} />
                                        <div style={{ color: "#9CA3AF", fontSize: 11 }}>Loading latest news...</div>
                                    </div>
                                ) : (
                                    <div style={{ display: "grid", gap: 10 }}>
                                        {(liveNews || MOCK_NEWS).map((n, i) => {
                                            const timeStr = n.time && typeof n.time === "number"
                                                ? (() => { const m = Math.floor((Date.now() / 1000 - n.time) / 60); return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.floor(m / 60)}h ago` : `${Math.floor(m / 1440)}d ago`; })()
                                                : n.time;
                                            const tag = n.tag || "Market";
                                            const brand = SOURCE_BRANDS[n.source] || { color: "#003A70", fontFamily: "'Inter', sans-serif", fontWeight: 700, letterSpacing: "0em", textTransform: "none", fontSize: 10 };
                                            const srcColor = brand.color;
                                            const isHero = i === 0;
                                            const faviconUrl = `https://www.google.com/s2/favicons?domain=${getDomain(n.source)}&sz=32`;

                                            return (
                                                <a key={i}
                                                    href={n.url || "#"}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        textDecoration: "none",
                                                        background: isHero ? "linear-gradient(135deg, rgba(0,58,112,0.04), rgba(255,255,255,0.7))" : "rgba(255,255,255,0.5)",
                                                        border: isHero ? "1px solid rgba(0,58,112,0.1)" : "1px solid rgba(0,0,0,0.04)",
                                                        borderRadius: 14,
                                                        padding: isHero ? "18px 16px" : "12px 14px",
                                                        cursor: "pointer", transition: "all 0.2s",
                                                        display: "block",
                                                    }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = isHero ? "linear-gradient(135deg, rgba(0,58,112,0.06), rgba(255,255,255,0.85))" : "rgba(255,255,255,0.75)"; e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.05)"; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = isHero ? "linear-gradient(135deg, rgba(0,58,112,0.04), rgba(255,255,255,0.7))" : "rgba(255,255,255,0.5)"; e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
                                                >
                                                    {/* Source branding with favicon */}
                                                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: isHero ? 10 : 7 }}>
                                                        <img
                                                            src={faviconUrl}
                                                            alt=""
                                                            style={{
                                                                width: isHero ? 18 : 14, height: isHero ? 18 : 14,
                                                                borderRadius: 3, flexShrink: 0,
                                                            }}
                                                            onError={e => { e.currentTarget.style.display = "none"; }}
                                                        />
                                                        <span style={{
                                                            fontSize: isHero ? (brand.fontSize + 1) : brand.fontSize,
                                                            fontWeight: brand.fontWeight,
                                                            fontFamily: brand.fontFamily,
                                                            letterSpacing: brand.letterSpacing,
                                                            textTransform: brand.textTransform,
                                                            fontStyle: brand.fontStyle || "normal",
                                                            color: brand.textColor || (srcColor === "#FFF1E5" ? "#33302E" : srcColor),
                                                        }}>
                                                            {n.source || "Unknown"}
                                                        </span>
                                                        <span style={{ fontSize: 9, color: TAG_COLORS[tag] || "#6B7280", fontWeight: 600, marginLeft: "auto", background: `${TAG_COLORS[tag] || "#6B7280"}12`, padding: "2px 6px", borderRadius: 4, letterSpacing: "0.03em" }}>{tag}</span>
                                                    </div>

                                                    {/* Headline */}
                                                    <div style={{
                                                        fontSize: isHero ? 15 : 12,
                                                        fontWeight: isHero ? 700 : 600,
                                                        color: "#0A1628",
                                                        lineHeight: 1.35,
                                                        letterSpacing: isHero ? "-0.01em" : "0",
                                                    }}>
                                                        {n.title}
                                                    </div>

                                                    {/* Summary for hero */}
                                                    {isHero && n.summary && (
                                                        <div style={{ fontSize: 11, color: "#5A6A80", lineHeight: 1.5, marginTop: 6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                                            {n.summary}
                                                        </div>
                                                    )}

                                                    {/* Footer */}
                                                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: isHero ? 10 : 7 }}>
                                                        <span style={{ fontSize: 10, color: "#9CA3AF" }}>{timeStr}</span>
                                                    </div>
                                                </a>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ═══ SETTINGS ═══ */}
                        {activeTab === "settings" && (
                            <div>
                                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14 }}>
                                    {activeSettingView && (
                                        <button onClick={() => setActiveSettingView(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#7B8BA3", display: "flex", alignItems: "center", padding: 0 }}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                                        </button>
                                    )}
                                    <div style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "#7B8BA3", fontWeight: 600 }}>
                                        {activeSettingView ? activeSettingView : "Settings"}
                                    </div>
                                </div>

                                {activeSettingView === "profile" ? (
                                    <div style={{ display: "grid", gap: 10 }}>
                                        <div style={{ display: "flex", justifyContent: "center", margin: "10px 0" }}>
                                            <div style={{ width: 64, height: 64, borderRadius: 32, background: "linear-gradient(135deg, #003A70, #7BAFD4)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 24, fontWeight: 600 }}>
                                                JL
                                            </div>
                                        </div>
                                        <input style={inputStyle} defaultValue="Joao Lucas" placeholder="Full Name" />
                                        <input style={inputStyle} defaultValue="joao@example.com" placeholder="Email Address" type="email" />
                                        <button onClick={() => { setActiveSettingView(null); alert("Profile saved!"); }} style={{ width: "100%", background: "#003A70", color: "#fff", border: "none", borderRadius: 10, padding: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 8 }}>Save Profile</button>
                                    </div>
                                ) : activeSettingView === "security" ? (
                                    <div style={{ display: "grid", gap: 10 }}>
                                        <div style={{ fontSize: 13, fontWeight: 500, color: "#0A1628", marginBottom: 4 }}>Change Password</div>
                                        <input style={inputStyle} placeholder="Current Password" type="password" />
                                        <input style={inputStyle} placeholder="New Password" type="password" />
                                        <input style={inputStyle} placeholder="Confirm New Password" type="password" />
                                        <button onClick={() => { setActiveSettingView(null); alert("Password updated successfully!"); }} style={{ width: "100%", background: "#003A70", color: "#fff", border: "none", borderRadius: 10, padding: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 8 }}>Update Password</button>

                                        <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 10, padding: 12, marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                            <div style={{ fontSize: 12, color: "#0A1628", fontWeight: 500 }}>Two-Factor Auth (2FA)</div>
                                            <span style={{ fontSize: 11, color: "#10B981", fontWeight: 600, background: "#fff", padding: "2px 6px", borderRadius: 4 }}>Enabled</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ display: "grid", gap: 6 }}>
                                        {[
                                            { icon: Icons.bell, label: "Notifications", desc: "Price alerts & reports", key: "notifications" },
                                            { icon: Icons.palette, label: "Compact View", desc: "Reduce spacing", key: "compactView" },
                                        ].map(s => (
                                            <div key={s.key} style={{
                                                background: "rgba(255,255,255,0.5)", border: "1px solid rgba(0,0,0,0.05)",
                                                borderRadius: 14, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12,
                                            }}>
                                                {s.icon}
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: 13, fontWeight: 500, color: "#0A1628" }}>{s.label}</div>
                                                    <div style={{ fontSize: 11, color: "#9CA3AF" }}>{s.desc}</div>
                                                </div>
                                                <Toggle checked={settings[s.key]} onChange={() => toggleSetting(s.key)} />
                                            </div>
                                        ))}

                                        {/* Non-toggle settings */}
                                        {[
                                            { icon: Icons.profile, label: "Profile", desc: "Name, email, avatar", action: () => setActiveSettingView("profile") },
                                            { icon: Icons.lock, label: "Security", desc: "Password & 2FA", action: () => setActiveSettingView("security") },
                                            { icon: Icons.download, label: "Export Data", desc: "Download CSV", action: handleExportData },
                                        ].map(s => (
                                            <div key={s.label} onClick={s.action} style={{
                                                background: "rgba(255,255,255,0.5)", border: "1px solid rgba(0,0,0,0.05)",
                                                borderRadius: 14, padding: "12px 16px", cursor: "pointer", transition: "all 0.2s",
                                                display: "flex", alignItems: "center", gap: 12,
                                            }}
                                                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.7)"; e.currentTarget.style.transform = "translateX(2px)"; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.5)"; e.currentTarget.style.transform = ""; }}
                                            >
                                                {s.icon}
                                                <div>
                                                    <div style={{ fontSize: 13, fontWeight: 500, color: "#0A1628" }}>{s.label}</div>
                                                    <div style={{ fontSize: 11, color: "#9CA3AF" }}>{s.desc}</div>
                                                </div>
                                                <span style={{ marginLeft: "auto", color: "#D1D5DB", fontSize: 12 }}>›</span>
                                            </div>
                                        ))}

                                        {/* Reset */}
                                        <button onClick={() => {
                                            if (confirm("Reset all data? Favorites, plans, and settings will be cleared.")) {
                                                localStorage.removeItem("mtf_favorites");
                                                localStorage.removeItem("mtf_plans");
                                                localStorage.removeItem("mtf_settings");
                                                window.location.reload();
                                            }
                                        }} style={{
                                            width: "100%", marginTop: 8, background: "rgba(239,68,68,0.05)",
                                            border: "1px solid rgba(239,68,68,0.15)", borderRadius: 12, padding: "10px",
                                            cursor: "pointer", color: "#EF4444", fontSize: 12, fontWeight: 500, transition: "all 0.2s",
                                        }}
                                            onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)"; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,0.05)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.15)"; }}
                                        >Reset All Data</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Bottom Stats — now dynamic */}
                    <div style={{ ...GLASS, padding: "14px 18px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <div style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "#7B8BA3" }}>Total Saved</div>
                                <div style={{ fontSize: 18, fontWeight: 700, color: "#003A70", marginTop: 2 }}>${totalSaved.toLocaleString()}</div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "#7B8BA3" }}>Avg Return</div>
                                <div style={{ fontSize: 18, fontWeight: 700, color: "#10B981", marginTop: 2 }}>+{avgReturn.toFixed(1)}%</div>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>
        </div>
    );
}
