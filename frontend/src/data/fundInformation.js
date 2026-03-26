/**
 * Editorial content for the chart panel Information tab.
 * Add or update entries keyed by Yahoo ticker (uppercase).
 */

export const FUND_INFO_FIELD_ORDER = [
  { key: 'objective',          label: 'Investment Objective' },
  { key: 'strategy',           label: 'Strategy & Approach' },
  { key: 'benchmark',          label: 'Benchmark' },
  { key: 'category',           label: 'Category' },
  { key: 'expenseRatio',       label: 'Expense Ratio' },
  { key: 'inception',          label: 'Inception' },
  { key: 'riskConsiderations', label: 'Risk Considerations' },
  { key: 'notes',              label: 'Notes' },
];

/** @type {Record<string, Record<string, string>>} */
export const FUND_INFORMATION = {
  FXAIX: {
    objective:    'Seeks investment results that correspond to the total return performance of common stocks publicly traded in the United States, as represented by the S&P 500 Index.',
    strategy:     'Passive index fund employing full replication; invests at least 80% of assets in the 500 equity securities included in the S&P 500 Index, weighted by market capitalization.',
    benchmark:    'S&P 500 Index',
    category:     'Large Blend · U.S. Domestic Equity',
    expenseRatio: '0.015% net (as of most recent prospectus)',
    inception:    '1988 (fund); verify share-class date with your brokerage',
    riskConsiderations: 'Full equity market risk; concentrated in large-cap U.S. companies. Performance tracks the index with minimal tracking error, so losses during broad market downturns are not cushioned.',
    notes:        "Fidelity's flagship zero-load S&P 500 index fund. Among the lowest cost options available; popular choice for retirement accounts.",
  },

  VFIAX: {
    objective:    'Seeks to track the performance of a benchmark index that measures the investment return of large-capitalization stocks in the U.S. equity market.',
    strategy:     'Passive index fund using full replication of the S&P 500 Index. Invests in all 500 constituent stocks in proportion to their weighting in the index.',
    benchmark:    'S&P 500 Index',
    category:     'Large Blend · U.S. Domestic Equity',
    expenseRatio: '0.04% (Admiral Shares)',
    inception:    '2000 (Admiral Shares); fund launched 1976 as Investor Shares',
    riskConsiderations: 'Equity market risk inherent to large-cap U.S. stocks. No active management overlay to limit drawdowns during corrections.',
    notes:        "Vanguard's flagship S&P 500 Admiral index fund. Minimum investment typically $3,000. Investor Shares (VFINX) available with lower minimum.",
  },

  VTSAX: {
    objective:    'Seeks to track the performance of the CRSP US Total Market Index, providing exposure to the entire U.S. equity market including small-, mid-, and large-cap growth and value stocks.',
    strategy:     'Passive index fund using a sampling approach to replicate the CRSP US Total Market Index, which covers nearly 100% of the U.S. investable equity market (≈3,600+ stocks).',
    benchmark:    'CRSP US Total Market Index',
    category:     'Large Blend · U.S. Total Market',
    expenseRatio: '0.04% (Admiral Shares)',
    inception:    '2000 (Admiral Shares)',
    riskConsiderations: 'Broader exposure than S&P 500 funds adds small- and mid-cap risk, which can amplify both gains and losses. Stock market risk applies to the full portfolio.',
    notes:        "Core 'three-fund portfolio' holding. Warren Buffett has publicly endorsed total market index funds as the ideal vehicle for most investors.",
  },

  VSMPX: {
    objective:    'Seeks to track the performance of the CRSP US Total Market Index, covering the entire breadth of U.S. equity market cap.',
    strategy:     'Institutional Plus share class of the Vanguard Total Stock Market Index Fund; same passive total-market strategy as VTSAX but at an institutional expense ratio.',
    benchmark:    'CRSP US Total Market Index',
    category:     'Large Blend · U.S. Total Market · Institutional',
    expenseRatio: '0.02% (Institutional Plus Shares)',
    inception:    '2010 (Institutional Plus Shares)',
    riskConsiderations: 'Same equity market risks as VTSAX. Institutional share class; minimum investment requirements apply.',
    notes:        'Typically available through large employer 401(k) plans. Lowest-cost share class of the Vanguard Total Stock Market fund family.',
  },

  FCNTX: {
    objective:    'Seeks long-term capital appreciation by investing in companies whose value Fidelity believes is not fully recognized by the public.',
    strategy:     'Actively managed large-cap growth fund. Manager Will Danoff looks for companies with above-average earnings growth, strong management, and dominant market positions. Concentrated portfolio with typically 300–400 holdings.',
    benchmark:    'S&P 500 Index',
    category:     'Large Growth · U.S. Domestic Equity',
    expenseRatio: '~0.86% (verify in latest prospectus)',
    inception:    '1967',
    riskConsiderations: 'Active stock selection adds manager risk on top of market risk. Large-cap growth tilt means sensitivity to rate changes and growth stock drawdowns. One of the largest actively managed funds by AUM.',
    notes:        "Managed by Will Danoff since 1990 — one of the longest-tenured and highest-rated active fund managers. Long-term track record has beaten the S&P 500 over multi-decade periods.",
  },

  PRWCX: {
    objective:    'Seeks long-term capital appreciation and, secondarily, dividend income by investing in a broadly diversified portfolio of stocks and bonds.',
    strategy:     'Actively managed balanced/allocation fund. Typically holds 60–70% equities and 20–30% fixed income. Manager David Giroux uses a flexible, opportunistic approach — adjusting allocation based on relative value between asset classes.',
    benchmark:    'S&P 500 Index (equity portion); Bloomberg U.S. Aggregate Bond Index (fixed income)',
    category:     'Allocation — 50% to 70% Equity · Balanced',
    expenseRatio: '~0.71% (verify in latest prospectus)',
    inception:    '1986',
    riskConsiderations: 'Lower equity risk than pure stock funds due to fixed-income allocation, but still subject to both equity and interest rate risk. Manager concentration risk — performance tied to David Giroux.',
    notes:        "Frequently rated as one of the best actively managed allocation funds. Closed to new investors at times due to capacity constraints — check availability.",
  },

  OAKMX: {
    objective:    'Seeks long-term appreciation of capital by investing primarily in a diversified portfolio of equity securities of U.S. companies.',
    strategy:     'Actively managed deep-value fund using a contrarian, bottom-up fundamental approach. Managers seek businesses trading at a significant discount to intrinsic value with strong management teams aligned with shareholders.',
    benchmark:    'S&P 500 Index',
    category:     'Large Blend · U.S. Value',
    expenseRatio: '~0.91% (verify in latest prospectus)',
    inception:    '1991',
    riskConsiderations: 'Value investing can lag growth markets for extended periods. Concentrated holdings (typically 50–60 stocks) increase individual security risk. Long investment horizon required.',
    notes:        "Harris Associates-managed fund with a multi-decade value investing pedigree. Tends to underperform in strong growth bull markets but has delivered competitive long-term returns.",
  },

  PIMIX: {
    objective:    'Seeks to maximize current income; long-term capital appreciation is a secondary objective.',
    strategy:     'Actively managed multi-sector bond fund. PIMCO Income invests across multiple fixed-income sectors globally — investment-grade, high-yield, mortgage-backed, emerging markets — selecting sectors offering the best risk-adjusted income.',
    benchmark:    'Bloomberg U.S. Aggregate Bond Index (primary reference)',
    category:     'Multisector Bond · Fixed Income',
    expenseRatio: '~0.55% (Institutional Shares; verify in latest prospectus)',
    inception:    '2007',
    riskConsiderations: 'Interest rate risk, credit risk, mortgage prepayment risk, and foreign currency risk. High-yield and EM allocations introduce additional volatility versus core bond funds.',
    notes:        "One of the world's largest actively managed bond funds. Lead managers Daniel Ivascyn and Alfred Murata have built a strong long-term track record across rate cycles.",
  },

  VGHAX: {
    objective:    'Seeks long-term capital appreciation by investing in stocks of companies principally engaged in the development, production, or distribution of products and services related to the health care industry.',
    strategy:     'Actively managed sector fund investing across the health care value chain: pharmaceuticals, biotechnology, medical devices, managed care, and health care services. Managed by Wellington Management.',
    benchmark:    'MSCI All Country World Health Care Index',
    category:     'Health · Sector Equity',
    expenseRatio: '~0.30% (Admiral Shares)',
    inception:    '2001 (Admiral Shares)',
    riskConsiderations: 'Concentrated sector exposure amplifies risk of regulatory changes, drug approval failures, and pricing pressure. Non-diversified fund by design — outperforms/underperforms the broad market by large margins.',
    notes:        'One of Vanguard\'s actively managed sector funds (rare for Vanguard). Subadvised by Wellington Management. Long-term performance has been strong relative to MSCI Health Care benchmarks.',
  },

  FDGRX: {
    objective:    'Seeks capital appreciation by investing in companies with above-average growth potential.',
    strategy:     'Actively managed large-cap growth fund. Manager Steve Wymer focuses on companies with strong earnings growth, innovative products or services, and leadership in their industries.',
    benchmark:    'Russell 1000 Growth Index',
    category:     'Large Growth · U.S. Domestic Equity',
    expenseRatio: '~0.83% (verify in latest prospectus)',
    inception:    '1990',
    riskConsiderations: 'High growth-stock concentration; significant exposure to tech and consumer discretionary sectors. Historically volatile with large drawdowns during market corrections.',
    notes:        "Managed by Steve Wymer since 1996. Has delivered exceptional long-term returns but with high volatility. Periodically closed to new investors.",
  },

  TRBCX: {
    objective:    'Seeks long-term growth of capital by investing primarily in common stocks of large and medium-sized U.S. growth companies.',
    strategy:     'Actively managed large-cap growth fund using bottom-up fundamental research. Seeks companies with durable competitive advantages, strong management, and sustainable above-average earnings growth.',
    benchmark:    'Russell 1000 Growth Index',
    category:     'Large Growth · U.S. Domestic Equity',
    expenseRatio: '~0.69% (verify in latest prospectus)',
    inception:    '1993',
    riskConsiderations: 'Growth-style risk; sensitivity to interest rates and changes in market sentiment toward growth companies. May lag in value-favoring market environments.',
    notes:        "T. Rowe Price Blue Chip Growth Fund. One of T. Rowe Price's flagship growth offerings with a consistent long-term track record.",
  },
};

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
    return { label, value: trimmed, isPlaceholder: !has };
  });
}
