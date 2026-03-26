/**
 * Editorial content for the chart panel Information tab.
 *
 * To add or edit a fund: add or update an object keyed by Yahoo ticker (uppercase),
 * e.g. FUND_INFORMATION.FXAIX = { objective: '...', ... }. Empty fields show a hint until you add copy.
 */

/** @typedef {Record<string, string | undefined>} FundInfoCopy */

/** Field order and labels used in the UI. Keys must match properties on each fund entry. */
export const FUND_INFO_FIELD_ORDER = [
  { key: 'objective', label: 'Investment objective' },
  { key: 'strategy', label: 'Strategy & approach' },
  { key: 'benchmark', label: 'Benchmark' },
  { key: 'category', label: 'Category / style box' },
  { key: 'expenseRatio', label: 'Expense ratio' },
  { key: 'inception', label: 'Inception' },
  { key: 'riskConsiderations', label: 'Risk considerations' },
  { key: 'notes', label: 'Notes' },
];

/** Example entry - use the same shape for other tickers in FUND_INFORMATION. */
const TEMPLATE_EXAMPLE = {
  objective: 'What the fund is trying to achieve for shareholders.',
  strategy: 'Index vs active, geography, market cap, sector tilts, sampling vs full replication, etc.',
  benchmark: 'Primary index or comparison benchmark.',
  category: 'e.g. Large blend, world stock, intermediate core bond.',
  expenseRatio: 'Gross/net expense ratio or "see prospectus".',
  inception: 'Fund or share class inception year.',
  riskConsiderations: 'Market, credit, currency, concentration, liquidity, etc.',
  notes: 'Anything else useful (minimums, fund family, share classes).',
};

/**
 * Per-ticker copy. Start from TEMPLATE_EXAMPLE keys; omit keys until you have text.
 * @type {Record<string, FundInfoCopy>}
 */
export const FUND_INFORMATION = {
  // Sample so the tab shows real content out of the box; copy can be refined anytime.
  FXAIX: {
    objective:
      'Seeks investment results that correspond generally to the performance of the S&P 500 Index.',
    strategy:
      'Invests at least 80% of assets in equity securities included in the S&P 500; normally employs full replication.',
    benchmark: 'S&P 500',
    category: 'Large blend; passive U.S. large-cap',
    expenseRatio: 'Very low; confirm current net ratio in the latest prospectus.',
    inception: '1988 (share class - verify for your brokerage listing)',
    riskConsiderations: 'Full equity market risk; heavily weighted to large-cap U.S. names.',
    notes: "Fidelity's flagship S&P 500 index option for many retirement plans.",
  },
};

export { TEMPLATE_EXAMPLE };

/**
 * @param {string | undefined | null} ticker
 * @returns {{ label: string, value: string, isPlaceholder: boolean }[]}
 */
export function getFundInformationRows(ticker) {
  const sym = (ticker || '').toUpperCase();
  const row = FUND_INFORMATION[sym] || {};
  return FUND_INFO_FIELD_ORDER.map(({ key, label }) => {
    const value = row[key];
    const trimmed = typeof value === 'string' ? value.trim() : '';
    const has = Boolean(trimmed);
    return {
      label,
      value: has
        ? trimmed
        : `No ${label.toLowerCase()} yet - add "${key}" for ${sym || 'this ticker'} in src/data/fundInformation.js.`,
      isPlaceholder: !has,
    };
  });
}
