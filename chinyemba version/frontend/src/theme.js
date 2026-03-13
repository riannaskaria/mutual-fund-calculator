import { createContext, useContext } from 'react';

export const THEMES = {
  dark: {
    pageBg: '#0a0f1a', panelBg: '#0d1520', cardBg: '#111926', inputBg: '#1a2535',
    border: '#1e2d40', border2: '#131d2a', borderSub: '#1a2535',
    text: '#e2e8f0', textSub: '#7799bb', textMute: '#556677', textFaint: '#334455',
    hover: 'rgba(255,255,255,0.025)', newsItemBg: '#080d16',
  },
  light: {
    pageBg: '#f0f4f8', panelBg: '#ffffff', cardBg: '#f8fafc', inputBg: '#eef2f7',
    border: '#dde3ec', border2: '#e8edf4', borderSub: '#dde3ec',
    text: '#1e2d40', textSub: '#4a6070', textMute: '#7a8899', textFaint: '#a0b0bc',
    hover: 'rgba(0,0,0,0.03)', newsItemBg: '#f8fafc',
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
