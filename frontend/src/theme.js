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
    pageBg: '#121212',
    panelBg: '#161616',
    cardBg: '#1e1e1e',
    inputBg: '#2a2a2a',
    border: '#2d2d2d',
    border2: '#252525',
    borderSub: '#333333',
    text: '#f0f2f4',
    textSub: '#a8b0b8',
    textMute: '#8a939c',
    textFaint: '#6d7580',
    hover: 'rgba(115, 153, 198, 0.08)',
    newsItemBg: '#141414',
    brand: '#7399C6',
    accent: '#186ade',
    accentSoft: '#7399C6',
    positive: '#6bbf4a',
    negative: '#e07060',
    focusRing: '#186ade',
    spinnerTrack: '#2a2a2a',
    spinnerAccent: '#7399C6',
  },
  light: {
    pageBg: '#F7F7FA',
    panelBg: '#FFFFFF',
    cardBg: '#FFFFFF',
    inputBg: '#f2f5f7',
    border: '#dce3e8',
    border2: '#e8ecf0',
    borderSub: '#cdd6de',
    text: '#121212',
    textSub: '#5b7282',
    textMute: '#6d7880',
    textFaint: '#8b95a0',
    hover: 'rgba(9, 44, 97, 0.06)',
    newsItemBg: '#FFFFFF',
    brand: '#092C61',
    accent: '#186ade',
    accentSoft: '#7399C6',
    positive: '#398025',
    negative: '#C2170A',
    focusRing: '#186ade',
    spinnerTrack: '#e8ecf0',
    spinnerAccent: '#092C61',
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
