import { createContext, useContext } from 'react';

/** Public-site palette derived from goldmansachs.com / GS UI kit (approximate). */
export const GS_BRAND = {
  navy: '#092C61',
  blue: '#186ade',
  blueSoft: '#7399C6',
  ink: '#121212',
  slate: '#5b7282',
  canvas: '#F7F7FA',
  rule: '#dce3e8',
  positive: '#398025',
  negative: '#C2170A',
};

/** GS Sans / GS Serif are loaded in index.css from cdn.gs.com (same as the corporate site). */
export const FONT_UI = "'GS Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif";
export const FONT_DISPLAY = "'GS Serif', Georgia, 'Times New Roman', serif";

export const THEMES = {
  dark: {
    pageBg: '#0f1117',
    panelBg: '#161b24',
    cardBg: '#1c2230',
    inputBg: '#232b38',
    border: 'rgba(255,255,255,0.08)',
    border2: 'rgba(255,255,255,0.05)',
    borderSub: 'rgba(255,255,255,0.12)',
    text: '#e8edf2',
    textSub: '#99a8b8',
    textMute: '#6e8090',
    textFaint: '#4a5a68',
    hover: 'rgba(115, 153, 198, 0.10)',
    newsItemBg: '#13181f',
    brand: '#7399C6',
    accent: '#3b82f6',
    accentSoft: '#7399C6',
    positive: '#4ade80',
    negative: '#f87171',
    focusRing: '#3b82f6',
    spinnerTrack: '#232b38',
    spinnerAccent: '#7399C6',
    // glass tokens
    glassPanel: 'rgba(15,17,23,0.88)',
    glassBorder: 'rgba(255,255,255,0.10)',
    glassShadow: '0 8px 32px rgba(0,0,0,0.55)',
  },
  light: {
    pageBg: '#EEF2F8',
    panelBg: 'rgba(255,255,255,0.88)',
    cardBg: 'rgba(255,255,255,0.92)',
    inputBg: 'rgba(240,244,248,0.90)',
    border: 'rgba(180,195,215,0.55)',
    border2: 'rgba(200,215,230,0.45)',
    borderSub: 'rgba(160,180,205,0.65)',
    text: '#0d1520',
    textSub: '#4a6070',
    textMute: '#6d7880',
    textFaint: '#8b95a0',
    hover: 'rgba(9, 44, 97, 0.055)',
    newsItemBg: 'rgba(255,255,255,0.90)',
    brand: '#092C61',
    accent: '#186ade',
    accentSoft: '#7399C6',
    positive: '#2d7d1a',
    negative: '#b81208',
    focusRing: '#186ade',
    spinnerTrack: '#e0e8f0',
    spinnerAccent: '#092C61',
    // glass tokens
    glassPanel: 'rgba(255,255,255,0.78)',
    glassBorder: 'rgba(255,255,255,0.65)',
    glassShadow: '0 8px 32px rgba(9,44,97,0.10)',
  },
  black: {
    pageBg: '#000000',
    panelBg: 'rgba(14,14,14,0.96)',
    cardBg: 'rgba(22,22,22,0.98)',
    inputBg: '#1c1c1e',
    border: 'rgba(255,255,255,0.09)',
    border2: 'rgba(255,255,255,0.05)',
    borderSub: 'rgba(255,255,255,0.14)',
    text: '#f2f2f7',
    textSub: '#aeaeb2',
    textMute: '#636366',
    textFaint: '#48484a',
    hover: 'rgba(115, 153, 198, 0.07)',
    newsItemBg: 'rgba(8,8,8,0.98)',
    brand: '#7399C6',
    accent: '#0a84ff',
    accentSoft: '#5e9cff',
    positive: '#30d158',
    negative: '#ff453a',
    focusRing: '#0a84ff',
    spinnerTrack: '#1c1c1e',
    spinnerAccent: '#0a84ff',
    // glass tokens
    glassPanel: 'rgba(0,0,0,0.72)',
    glassBorder: 'rgba(255,255,255,0.10)',
    glassShadow: '0 8px 40px rgba(0,0,0,0.70)',
  },
};

export const ThemeCtx = createContext(THEMES.dark);
export const useT = () => useContext(ThemeCtx);

export const TAG_COLORS = {
  Macro: '#E67E22', Market: '#10B981', Funds: '#3B82F6',
  Bonds: '#8B5CF6', Crypto: '#EC4899', Forex: '#14B8A6', 'M&A': '#F97316',
};

export const SOURCE_BRANDS = {
  'Bloomberg':               { color: '#472090', domain: 'bloomberg.com',    fontWeight: 800 },
  'Reuters':                 { color: '#FF8000', domain: 'reuters.com',       fontWeight: 800 },
  'The Wall Street Journal': { color: '#0274B6', domain: 'wsj.com',           fontWeight: 700 },
  'Financial Times':         { color: '#FFF1E5', domain: 'ft.com',            fontWeight: 700 },
  'CNBC':                    { color: '#005594', domain: 'cnbc.com',          fontWeight: 900 },
  'MarketWatch':             { color: '#00AC4E', domain: 'marketwatch.com',   fontWeight: 800 },
  'Yahoo Finance':           { color: '#6001D2', domain: 'finance.yahoo.com', fontWeight: 800 },
  'Benzinga':                { color: '#0D9488', domain: 'benzinga.com',      fontWeight: 800 },
  'Morningstar':             { color: '#C62828', domain: 'morningstar.com',   fontWeight: 800 },
};

export const MARKET_INDICES = [
  { sym: 'DJIA',      yahoo: '%5EDJI'  },
  { sym: 'NASDAQ',    yahoo: '%5EIXIC' },
  { sym: 'S&P 500',   yahoo: '%5EGSPC' },
  { sym: 'CBOE VIX',  yahoo: '%5EVIX'  },
  { sym: '10Y Yield', yahoo: '%5ETNX'  },
  { sym: '30Y Yield', yahoo: '%5ETYX'  },
];

// All funds supported by the backend for CAPM beta calculation
export const CAPM_SUPPORTED = new Set([
  'VSMPX','FXAIX','VFIAX','VTSAX','VGTSX','FCTDX','VIIIX','VTBNX','AGTHX','VTBIX','FCNTX','PIMIX',
  'VWENX','VBIAX','VIGAX','VVIAX','VIMAX','VSMAX','VEXAX','VTMGX','VEMAX','VPMAX','VGHAX',
  'FDGRX','FBGRX','FLPSX','FMAGX','FPURX',
  'TRBCX','PRGFX','RPMGX','PRWCX',
  'DODGX','DODFX',
  'AEPGX','CAIBX','AWSHX',
  'SWPPX','SWTSX',
  'OAKMX',
]);

export function getFundTicker(fund) {
  if (!fund) return 'FUND';
  if (fund.id) return fund.id;
  if (fund.ticker) return fund.ticker;
  return fund.name?.match(/\(([^)]+)\)/)?.[1] || fund.name?.slice(0, 5) || 'FUND';
}

export function getFundBaseName(fund) {
  if (!fund) return 'Select a Fund';
  if (fund.id && fund.name) return fund.name;
  return fund.name?.replace(/\s*\([^)]+\)/, '') || 'Select a Fund';
}

export function getFundLogoDomain(ticker) {
  if (!ticker) return null;
  const t = ticker.toUpperCase();
  if (t.startsWith('V')) return 'vanguard.com';
  if (t.startsWith('F')) return 'fidelity.com';
  if (t.startsWith('SW') || t.startsWith('SN') || t.startsWith('SO') || t.startsWith('SF') || t.startsWith('SG')) return 'schwab.com';
  if (t.startsWith('PI') || t.startsWith('PD')) return 'pimco.com';
  if (t.startsWith('AG') || t.startsWith('AM') || t.startsWith('AI')) return 'capitalgroup.com';
  if (t.startsWith('TR') || t.startsWith('PR')) return 'troweprice.com';
  if (t.startsWith('OA')) return 'oakmark.com';
  if (t.startsWith('DO') || t.startsWith('DL') || t.startsWith('DF')) return 'dodgeandcox.com';
  return null;
}

export function getFundBadgeColor(ticker) {
  if (!ticker) return '#1e3a5f';
  const u = ticker.toUpperCase();
  if (u.startsWith('V')) return '#c6112b';
  if (u.startsWith('F')) return '#1b5e20';
  if (u.startsWith('SW') || u.startsWith('SN')) return '#007db8';
  if (u.startsWith('PI') || u.startsWith('PD')) return '#004b87';
  if (u.startsWith('AG') || u.startsWith('AM')) return '#0047ab';
  if (u.startsWith('TR') || u.startsWith('PR')) return '#00529b';
  if (u.startsWith('OA')) return '#6b3fa0';
  if (u.startsWith('DO') || u.startsWith('DF') || u.startsWith('DL')) return '#8b6914';
  return '#1e3a5f';
}
