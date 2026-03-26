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

  VGTSX: {
    objective:    'Seeks to track the performance of the FTSE Global All Cap ex US Index, providing low-cost exposure to stocks issued by companies in developed and emerging markets outside the United States.',
    strategy:     'Passive index fund using sampling to replicate the FTSE Global All Cap ex US Index, which covers large-, mid-, and small-cap stocks across roughly 50 non-U.S. countries.',
    benchmark:    'FTSE Global All Cap ex US Index',
    category:     'Foreign Large Blend · International Equity',
    expenseRatio: '0.17% (Investor Shares)',
    inception:    '1996',
    riskConsiderations: 'Currency risk, geopolitical risk, and differences in accounting standards relative to U.S. funds. Emerging market allocation (~25%) adds additional volatility.',
    notes:        "Core international leg of Vanguard's three-fund portfolio. Provides diversification away from U.S.-only exposure. Admiral share class (VTIAX) available at lower cost.",
  },

  FCTDX: {
    objective:    'Seeks total return through a combination of current income and capital growth by investing in investment-grade bonds and other fixed income securities.',
    strategy:     'Actively managed intermediate-term bond fund investing primarily in U.S. investment-grade fixed income securities including Treasuries, agencies, corporate bonds, and mortgage-backed securities.',
    benchmark:    'Bloomberg U.S. Aggregate Bond Index',
    category:     'Intermediate Core Bond · Fixed Income',
    expenseRatio: '~0.45% (verify in latest prospectus)',
    inception:    '2015',
    riskConsiderations: 'Interest rate risk — bond prices fall when rates rise. Credit risk from corporate bond allocation. Lower volatility than equity funds but not risk-free.',
    notes:        "Fidelity Conservative Income Bond Fund. Designed as a relatively stable fixed income option. Suitable as a core bond allocation within a diversified portfolio.",
  },

  VIIIX: {
    objective:    'Seeks to track the performance of the S&P 500 Index, representing large-cap U.S. equity market performance.',
    strategy:     'Institutional Plus share class of the Vanguard Institutional Index Fund; passive full-replication of the S&P 500 Index at the lowest possible cost.',
    benchmark:    'S&P 500 Index',
    category:     'Large Blend · U.S. Domestic Equity · Institutional',
    expenseRatio: '0.02% (Institutional Plus Shares)',
    inception:    '1997 (Institutional Plus Shares)',
    riskConsiderations: 'Full equity market risk concentrated in large-cap U.S. stocks. Institutional share class not available to retail investors directly.',
    notes:        'Available exclusively through large institutional investors and employer-sponsored retirement plans. Among the lowest-cost S&P 500 index funds available anywhere.',
  },

  VTBNX: {
    objective:    'Seeks to track the performance of the Bloomberg U.S. Aggregate Float Adjusted Index, providing broad exposure to the U.S. investment-grade bond market.',
    strategy:     'Passive index fund replicating the Bloomberg U.S. Aggregate Float Adjusted Index — a comprehensive benchmark of investment-grade U.S. bonds including Treasuries, agencies, corporate bonds, and MBS.',
    benchmark:    'Bloomberg U.S. Aggregate Float Adjusted Index',
    category:     'Intermediate Core Bond · Fixed Income · Institutional',
    expenseRatio: '0.05% (Institutional Shares)',
    inception:    '2014',
    riskConsiderations: 'Interest rate duration risk (~6 years); bond prices decline as rates rise. Credit risk is low given investment-grade-only mandate.',
    notes:        'Institutional share class of the Vanguard Total Bond Market Index Fund. Available primarily through large retirement plans. Retail equivalent: VBTLX (Admiral Shares).',
  },

  AGTHX: {
    objective:    'Seeks growth of capital by investing primarily in common stocks of companies that appear to offer superior opportunities for growth of capital.',
    strategy:     'Actively managed large-cap growth fund subadvised by multiple portfolio managers at Capital Group. Uses a multi-manager approach where different portions of assets are managed independently.',
    benchmark:    'S&P 500 Index',
    category:     'Large Growth · U.S. Domestic Equity',
    expenseRatio: '~0.64% (Class A shares; front-load may apply)',
    inception:    '1958',
    riskConsiderations: 'Growth-oriented strategy subject to market and manager risk. Class A shares carry a sales load; consider load-waived institutional shares or equivalent ETF (CGUS).',
    notes:        "American Funds Growth Fund of America — one of the largest actively managed mutual funds by AUM. Long history dating to 1958; multi-manager structure aims to reduce key-person risk.",
  },

  VTBIX: {
    objective:    'Seeks to track the performance of the Bloomberg U.S. Aggregate Float Adjusted Index, providing broad U.S. investment-grade bond market exposure.',
    strategy:     'Passive index fund using sampling to replicate the Bloomberg U.S. Aggregate Float Adjusted Index. Institutional share class of Vanguard Total Bond Market Index Fund.',
    benchmark:    'Bloomberg U.S. Aggregate Float Adjusted Index',
    category:     'Intermediate Core Bond · Fixed Income · Institutional',
    expenseRatio: '0.04% (Institutional Shares)',
    inception:    '2012',
    riskConsiderations: 'Interest rate duration risk (typically ~6 years). Investment-grade quality constraint means minimal credit risk but still subject to rate-driven price movements.',
    notes:        'Another institutional share class of the Vanguard Total Bond Market fund family, distinguished from VTBNX by minimum investment thresholds. Often used within Vanguard target-date funds.',
  },

  VWENX: {
    objective:    'Seeks to provide long-term capital appreciation and reasonable current income by investing in both stocks and bonds.',
    strategy:     'Actively managed balanced fund with a roughly 60/40 equity/fixed income allocation. Managed by Wellington Management. Equity sleeve focuses on large-cap value and dividend-paying stocks; bond sleeve focuses on investment-grade securities.',
    benchmark:    'Composite: 60% FTSE High Dividend Yield Index / 40% Bloomberg U.S. Credit A or Better Index',
    category:     'Allocation — 50% to 70% Equity · Balanced',
    expenseRatio: '0.16% (Admiral Shares)',
    inception:    '2001 (Admiral Shares); fund launched 1929',
    riskConsiderations: 'Equity and interest rate risk. Value-tilted equity sleeve may lag growth markets. Fixed income allocation reduces but does not eliminate volatility.',
    notes:        "Vanguard Wellington Fund — the oldest balanced mutual fund in the U.S. (1929). Admiral Shares (VWENX) require a minimum investment. Strong long-term record across multiple market cycles.",
  },

  VBIAX: {
    objective:    'Seeks to provide long-term capital appreciation and current income consistent with its current asset allocation.',
    strategy:     'Passive balanced index fund maintaining approximately 60% stocks (CRSP US Total Market) and 40% bonds (Bloomberg U.S. Aggregate Float Adjusted). Rebalanced automatically to maintain target allocation.',
    benchmark:    'Composite: 60% CRSP US Total Market Index / 40% Bloomberg U.S. Aggregate Float Adjusted Index',
    category:     'Allocation — 50% to 70% Equity · Balanced Index',
    expenseRatio: '0.07% (Admiral Shares)',
    inception:    '2000 (Admiral Shares)',
    riskConsiderations: 'Equity and bond market risk in proportion to the 60/40 allocation. Passive structure means no active risk management during downturns.',
    notes:        "One of the most cost-effective balanced index funds available. Suitable as a single-fund core portfolio solution. The 60/40 allocation is a classic framework widely recommended for moderate-risk investors.",
  },

  VIGAX: {
    objective:    'Seeks to track the performance of the CRSP US Large Cap Growth Index, providing exposure to large U.S. companies characterized by growth characteristics.',
    strategy:     'Passive index fund using full replication of the CRSP US Large Cap Growth Index. Concentrates in the growth-factor half of the large-cap U.S. equity market.',
    benchmark:    'CRSP US Large Cap Growth Index',
    category:     'Large Growth · U.S. Domestic Equity',
    expenseRatio: '0.05% (Admiral Shares)',
    inception:    '2001 (Admiral Shares)',
    riskConsiderations: 'Higher concentration in technology and consumer discretionary sectors increases volatility versus broad market funds. Growth stocks are sensitive to interest rate expectations.',
    notes:        "Vanguard Growth Index Fund (Admiral). Pairs with VVIAX (Value) to reconstruct the total large-cap market. Low-cost alternative to actively managed growth funds.",
  },

  VVIAX: {
    objective:    'Seeks to track the performance of the CRSP US Large Cap Value Index, providing exposure to large U.S. companies characterized by value characteristics.',
    strategy:     'Passive index fund using full replication of the CRSP US Large Cap Value Index. Invests in the value-factor half of the large-cap U.S. equity market.',
    benchmark:    'CRSP US Large Cap Value Index',
    category:     'Large Value · U.S. Domestic Equity',
    expenseRatio: '0.05% (Admiral Shares)',
    inception:    '2001 (Admiral Shares)',
    riskConsiderations: 'Value stocks can underperform growth for extended periods. Sector concentration in financials and energy introduces sensitivity to economic cycles and commodity prices.',
    notes:        "Vanguard Value Index Fund (Admiral). Historically, value stocks have outperformed over very long horizons; this fund captures that factor exposure at minimal cost.",
  },

  VIMAX: {
    objective:    'Seeks to track the performance of the CRSP US Mid Cap Index, providing exposure to medium-sized U.S. companies.',
    strategy:     'Passive index fund using full replication of the CRSP US Mid Cap Index, which covers companies in the 70th–85th percentile of investable market cap — a segment often overlooked by large-cap and small-cap focused investors.',
    benchmark:    'CRSP US Mid Cap Index',
    category:     'Mid Blend · U.S. Domestic Equity',
    expenseRatio: '0.05% (Admiral Shares)',
    inception:    '2001 (Admiral Shares)',
    riskConsiderations: 'Mid-cap companies are smaller and typically less liquid than large caps, increasing volatility. More exposed to domestic economic conditions than large multinationals.',
    notes:        "Vanguard Mid-Cap Index Fund (Admiral). Mid-cap stocks have historically delivered returns between large-cap and small-cap over long periods, with lower volatility than small-caps.",
  },

  VSMAX: {
    objective:    'Seeks to track the performance of the CRSP US Small Cap Index, providing exposure to small U.S. companies.',
    strategy:     'Passive index fund using sampling to replicate the CRSP US Small Cap Index, covering companies in the 85th–98th percentile of investable market cap (approximately 1,400 stocks).',
    benchmark:    'CRSP US Small Cap Index',
    category:     'Small Blend · U.S. Domestic Equity',
    expenseRatio: '0.05% (Admiral Shares)',
    inception:    '2001 (Admiral Shares)',
    riskConsiderations: 'Small-cap stocks are more volatile and less liquid than larger companies. Greater sensitivity to domestic economic cycles. Higher historical return potential comes with higher historical drawdown.',
    notes:        "Vanguard Small-Cap Index Fund (Admiral). Small-cap exposure is a key factor in long-term wealth building. Pairs with VTSAX for a completion portfolio or standalone small-cap allocation.",
  },

  VEXAX: {
    objective:    'Seeks to track the performance of the S&P Completion Index, covering mid- and small-cap U.S. stocks not included in the S&P 500.',
    strategy:     'Passive index fund using sampling to replicate the S&P Completion Index. Serves as a completion fund for investors who already hold an S&P 500 fund and want exposure to the rest of the U.S. market.',
    benchmark:    'S&P Completion Index',
    category:     'Mid Blend · U.S. Domestic Equity (Extended Market)',
    expenseRatio: '0.06% (Admiral Shares)',
    inception:    '2001 (Admiral Shares)',
    riskConsiderations: 'Small- and mid-cap volatility; less liquidity than large-cap names. Paired with an S&P 500 fund, it completes exposure to the entire U.S. market.',
    notes:        "Vanguard Extended Market Index Fund (Admiral). Combined with VFIAX (S&P 500), it replicates VTSAX (total market) at a similar cost. Useful for investors locked into S&P 500 options in a 401(k).",
  },

  VTMGX: {
    objective:    'Seeks to track the performance of the FTSE Developed All Cap ex US Index, providing exposure to large-, mid-, and small-cap stocks in developed markets outside the United States.',
    strategy:     'Passive index fund using sampling to replicate the FTSE Developed All Cap ex US Index, covering approximately 3,800 stocks in 24 developed non-U.S. countries including Europe, Japan, Australia, and Canada.',
    benchmark:    'FTSE Developed All Cap ex US Index',
    category:     'Foreign Large Blend · International Developed Equity',
    expenseRatio: '0.07% (Admiral Shares)',
    inception:    '2010 (Admiral Shares)',
    riskConsiderations: 'Currency risk, political/regulatory differences, and lower liquidity than U.S. markets. No emerging market exposure (unlike VGTSX); pure developed-market play.',
    notes:        "Vanguard Developed Markets Index Fund (Admiral). Lower-cost alternative to VGTSX for investors wanting only developed-market international exposure.",
  },

  VEMAX: {
    objective:    'Seeks to track the performance of the FTSE Emerging Markets All Cap China A Inclusion Index, providing exposure to large-, mid-, and small-cap companies in emerging market countries.',
    strategy:     'Passive index fund using sampling to track the FTSE Emerging Markets All Cap China A Inclusion Index, covering approximately 5,000 stocks across roughly 25 emerging-market countries.',
    benchmark:    'FTSE Emerging Markets All Cap China A Inclusion Index',
    category:     'Diversified Emerging Markets · International Equity',
    expenseRatio: '0.14% (Admiral Shares)',
    inception:    '2010 (Admiral Shares)',
    riskConsiderations: 'High political, currency, and regulatory risk relative to developed market funds. China A-shares inclusion adds exposure to domestic Chinese market. Periods of sharp underperformance are common.',
    notes:        "Vanguard Emerging Markets Stock Index Fund (Admiral). Provides high-growth-potential exposure with commensurate risk. Often held as a 5–15% satellite allocation alongside core developed-market holdings.",
  },

  VPMAX: {
    objective:    'Seeks capital growth by investing mainly in stocks of large and mid-size companies in the Pacific Basin, including Australia, Japan, Singapore, Hong Kong, and other Asian markets.',
    strategy:     'Actively managed Pacific-region equity fund subadvised by multiple managers at Capital Group. Invests across developed and emerging Pacific markets with emphasis on Japan, Australia, and fast-growing Asian economies.',
    benchmark:    'MSCI Pacific ex Japan Index (primary reference)',
    category:     'Pacific/Asia Ex-Japan · International Equity',
    expenseRatio: '~0.57% (Class A; sales load may apply)',
    inception:    '1986',
    riskConsiderations: 'Concentrated regional exposure amplifies Asia-Pacific-specific risks including currency fluctuations, geopolitical tensions, and commodity-price dependence in resource-heavy markets like Australia.',
    notes:        "American Funds New World Fund class targeted at Pacific Basin. Capital Group uses a multi-manager approach with experienced regional analysts on the ground in Asia.",
  },

  FBGRX: {
    objective:    'Seeks to achieve long-term capital growth by normally investing at least 80% of assets in common stocks.',
    strategy:     'Actively managed large-cap growth fund investing predominantly in growth-oriented companies. Managers use fundamental analysis to identify companies with above-average earnings growth, large addressable markets, and strong competitive positions.',
    benchmark:    'Russell 1000 Growth Index',
    category:     'Large Growth · U.S. Domestic Equity',
    expenseRatio: '~0.48% (verify in latest prospectus)',
    inception:    '1987',
    riskConsiderations: 'High growth-sector concentration (technology, consumer discretionary). Significant drawdown risk during market corrections as high-multiple growth stocks reprice.',
    notes:        "Fidelity Blue Chip Growth Fund. Often held alongside FCNTX in Fidelity-centric portfolios for differentiated growth exposure. Periodically among Fidelity's top-performing actively managed domestic equity funds.",
  },

  FLPSX: {
    objective:    'Seeks long-term growth of capital by investing in companies with low price-earnings (P/E) ratios or other value characteristics.',
    strategy:     'Actively managed fund with flexible mandate — invests across market caps and geographies, focused on low P/E and out-of-favor companies. Has historically held significant international and small/mid-cap positions alongside U.S. large-caps.',
    benchmark:    'Russell 2500 Value Index',
    category:     'Mid-Cap Value · Blended',
    expenseRatio: '~0.52% (verify in latest prospectus)',
    inception:    '1989',
    riskConsiderations: 'Value style can underperform for extended periods. Flexible mandate means sector and geographic allocations can shift significantly. Currency risk from international holdings.',
    notes:        "Fidelity Low-Priced Stock Fund — managed by Joel Tillinghast since inception in 1989. One of the longest-tenured active managers in the fund industry; known for patient, contrarian value investing.",
  },

  FMAGX: {
    objective:    'Seeks capital appreciation by investing in companies that are believed to have above-average growth potential.',
    strategy:     "Actively managed large-cap growth fund — historically Fidelity's flagship. Currently managed by Sammy Simnegar. Focuses on growth companies across sectors with emphasis on technology, consumer, and health care.",
    benchmark:    'S&P 500 Index',
    category:     'Large Growth · U.S. Domestic Equity',
    expenseRatio: '~0.86% (verify in latest prospectus)',
    inception:    '1963',
    riskConsiderations: 'Growth-style concentration; significant technology weighting amplifies sector-specific risk. Performance highly dependent on manager and era — the fund\'s character has evolved through many managers.',
    notes:        "Fidelity Magellan — one of the most famous mutual funds in history, made legendary under Peter Lynch (1977–1990). While no longer the industry behemoth it once was, it retains iconic status in U.S. investing history.",
  },

  FPURX: {
    objective:    'Seeks both income and growth of income by investing at least 65% of assets in income-producing equity securities and at least 25% of assets in fixed-income securities.',
    strategy:     'Actively managed balanced fund maintaining a roughly 60% equity / 40% fixed income allocation. Equity sleeve emphasizes dividend-paying and value-oriented large-cap stocks; bond sleeve focuses on investment-grade and government securities.',
    benchmark:    'Composite: 60% S&P 500 Index / 40% Bloomberg U.S. Aggregate Bond Index',
    category:     'Allocation — 50% to 70% Equity · Balanced',
    expenseRatio: '~0.55% (verify in latest prospectus)',
    inception:    '1947',
    riskConsiderations: 'Equity and interest rate risk. Conservative income orientation may lag pure-equity funds in strong bull markets. Not an equity replacement.',
    notes:        "Fidelity Puritan Fund — one of Fidelity's oldest funds (1947). A classic balanced fund suitable for moderate-risk investors seeking income and growth. Often compared to Vanguard Wellington (VWENX).",
  },

  PRGFX: {
    objective:    'Seeks long-term growth of capital by investing primarily in common stocks of companies with potential for above-average growth in earnings.',
    strategy:     "Actively managed large-cap growth fund using T. Rowe Price's fundamental bottom-up research. Targets companies across sectors with durable competitive advantages, expanding markets, and high returns on equity.",
    benchmark:    'Russell 1000 Growth Index',
    category:     'Large Growth · U.S. Domestic Equity',
    expenseRatio: '~0.64% (verify in latest prospectus)',
    inception:    '1950',
    riskConsiderations: 'Growth-style risk including sensitivity to rate expectations and valuation compression. Technology sector concentration is typically elevated.',
    notes:        "T. Rowe Price Growth Stock Fund — one of the oldest continuously operating growth funds in the U.S. Distinct from TRBCX (Blue Chip Growth) in its longer history and slightly different stock selection criteria.",
  },

  RPMGX: {
    objective:    'Seeks long-term capital growth by investing in common stocks of small and medium-sized growth companies.',
    strategy:     'Actively managed mid-cap growth fund. Invests in companies with market caps typically between $1B and $20B at time of purchase. Uses bottom-up fundamental research to identify companies in early-to-mid growth phases.',
    benchmark:    'Russell Midcap Growth Index',
    category:     'Mid-Cap Growth · U.S. Domestic Equity',
    expenseRatio: '~0.72% (verify in latest prospectus)',
    inception:    '1992',
    riskConsiderations: 'Mid-cap and growth risk; higher volatility than large-cap funds. May hold companies transitioning from small-cap to large-cap (higher failure risk than established large-caps). Periodically closed to new investors.',
    notes:        "T. Rowe Price Mid-Cap Growth Fund. Strong long-term track record in the mid-cap growth segment. Has been closed to new investors for extended periods due to asset capacity constraints.",
  },

  DODGX: {
    objective:    'Seeks long-term growth of principal and income by investing primarily in a diversified portfolio of equity securities.',
    strategy:     "Actively managed large-cap value fund using Dodge & Cox's rigorous team-based fundamental research process. Emphasizes companies trading below estimated intrinsic value with sound business models and long-term earnings potential.",
    benchmark:    'S&P 500 Index',
    category:     'Large Value · U.S. Domestic Equity',
    expenseRatio: '0.52%',
    inception:    '1965',
    riskConsiderations: 'Value investing can underperform during growth-led bull markets for extended periods. Concentrated portfolio (typically 60–75 stocks) increases individual security risk.',
    notes:        "Dodge & Cox Stock Fund — managed by an investment committee rather than a single star manager, reducing key-person risk. No-load, low-turnover value fund with a decades-long competitive record.",
  },

  DODFX: {
    objective:    'Seeks long-term growth of principal and income by investing primarily in a diversified portfolio of foreign equity securities.',
    strategy:     "Actively managed international value fund using Dodge & Cox's team-based research. Invests in developed and emerging market equities trading below estimated intrinsic value, with a long-term investment horizon (3–5 year target).",
    benchmark:    'MSCI World ex USA Index',
    category:     'Foreign Large Value · International Equity',
    expenseRatio: '0.63%',
    inception:    '2001',
    riskConsiderations: 'Currency risk, political and regulatory differences, emerging market volatility. Value style can underperform internationally for extended periods, particularly when U.S. growth leads global markets.',
    notes:        "Dodge & Cox International Stock Fund — the international counterpart to DODGX. Applies the same disciplined value process globally. Often paired with DODGX for a core equity portfolio.",
  },

  AEPGX: {
    objective:    'Seeks long-term growth of capital by investing in equity securities of issuers based outside the United States, primarily in developed markets.',
    strategy:     'Actively managed international equity fund subadvised by multiple portfolio counselors at Capital Group. Uses a multi-manager approach with emphasis on high-quality international growth and value companies in developed and emerging markets.',
    benchmark:    'MSCI All Country World ex USA Index',
    category:     'Foreign Large Blend · International Equity',
    expenseRatio: '~0.81% (Class A; sales load may apply)',
    inception:    '1984',
    riskConsiderations: 'Currency risk, geopolitical risk, regulatory differences. Class A shares carry a front-end sales load; institutional and advisory share classes may be available without load.',
    notes:        "American Funds EuroPacific Growth Fund — one of the largest actively managed international funds by AUM. Capital Group's flagship international offering with a strong multi-decade track record.",
  },

  CAIBX: {
    objective:    'Seeks to provide current income while secondarily providing capital growth by investing in equity and fixed income securities of issuers worldwide.',
    strategy:     'Actively managed global balanced fund. Typically holds a mix of international equities (60%+) and fixed income. Capital Group multi-manager approach; emphasizes dividend-paying stocks and investment-grade bonds globally.',
    benchmark:    'Composite of MSCI World Index and Bloomberg U.S. Aggregate Bond Index',
    category:     'World Allocation · Global Balanced',
    expenseRatio: '~0.58% (Class A; sales load may apply)',
    inception:    '1973',
    riskConsiderations: 'Currency risk from global equity and bond holdings. Interest rate risk from fixed income sleeve. Class A shares carry a front-end sales load.',
    notes:        "Capital Income Builder — American Funds' global income-oriented balanced fund. Focuses on dividend income from global equities. Popular in retirement-income strategies.",
  },

  AWSHX: {
    objective:    'Seeks growth of capital by investing primarily in a diversified portfolio of common stocks of U.S. companies.',
    strategy:     "Actively managed large-cap U.S. equity fund using Capital Group's multi-manager system. Each portfolio counselor independently manages a sleeve of the fund, aiming to reduce concentration risk while preserving active-management potential.",
    benchmark:    'S&P 500 Index',
    category:     'Large Blend · U.S. Domestic Equity',
    expenseRatio: '~0.58% (Class A; sales load may apply)',
    inception:    '1952',
    riskConsiderations: 'Equity market risk. Class A shares carry a front-end sales load; total return net of load may differ significantly. Manager-specific risk is mitigated by the multi-manager structure.',
    notes:        "Washington Mutual Investors Fund (American Funds) — one of the largest U.S. equity mutual funds. Conservative growth orientation with quality screens. Long history dating to 1952.",
  },

  SWPPX: {
    objective:    'Seeks to track the total return of the S&P 500 Index by investing in the 500 stocks that make up the index in proportion to their weighting.',
    strategy:     'Passive index fund using full replication of the S&P 500 Index. Schwab S&P 500 Index Fund; no minimum investment and no transaction fees on the Schwab platform.',
    benchmark:    'S&P 500 Index',
    category:     'Large Blend · U.S. Domestic Equity',
    expenseRatio: '0.02%',
    inception:    '1997',
    riskConsiderations: 'Full equity market risk concentrated in large-cap U.S. stocks. No active management overlay. Losses during broad market downturns are not cushioned.',
    notes:        "Schwab S&P 500 Index Fund — among the lowest-cost S&P 500 funds available (0.02% expense ratio). No investment minimum. Ideal for Schwab account holders as a core equity holding.",
  },

  SWTSX: {
    objective:    'Seeks to track the total return of the Dow Jones U.S. Total Stock Market Index, providing exposure to virtually the entire U.S. equity market.',
    strategy:     'Passive index fund using full replication of the Dow Jones U.S. Total Stock Market Index, covering large-, mid-, and small-cap U.S. stocks (approximately 2,500 companies).',
    benchmark:    'Dow Jones U.S. Total Stock Market Index',
    category:     'Large Blend · U.S. Total Market',
    expenseRatio: '0.03%',
    inception:    '1999',
    riskConsiderations: 'Full U.S. stock market risk including small-cap volatility. Broader than S&P 500 funds, adding additional exposure to smaller, less-established companies.',
    notes:        "Schwab Total Stock Market Index Fund — Schwab's total market offering, comparable to VTSAX and FSKAX. No investment minimum. Near-zero cost with broad U.S. equity coverage.",
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
