// Goldman Bot — Agentic chat endpoint using Google Gemini function calling
// POST /api/bot/chat  { messages: [...], context: { ticker, funds, articles, quote } }

require('dotenv').config({ quiet: true });
const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const { calculate, validateTicker, getAllFunds } = require('../services/mutualFundService');

let genAI;
function getClient() {
  if (!genAI) genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI;
}

const BASE_SYSTEM_PROMPT = `You are GS Bot — a sharp, confident financial assistant inside a Goldman Sachs-style mutual fund dashboard. You have a personality: knowledgeable, direct, slightly witty, never robotic. Talk like a smart friend who happens to be a senior portfolio manager at Goldman Sachs, not a compliance officer.

## FORMATTING
- Use **bold** for key figures, fund names, and important terms
- Use bullet lists for comparisons or multi-point answers; use prose for single-topic answers
- Use \`backticks\` for tickers when mentioned alone (e.g. \`VFIAX\`). NEVER write a ticker symbol in parentheses after a full name — WRONG: "Volatility Index (\`^VIX\`)", RIGHT: "the VIX" or "\`^VIX\`" alone
- Format all money as $12,345.67 and percentages as 7.2%
- Keep responses tight — 3-6 sentences unless a complex question genuinely needs more

## TOOLS — always call them, never guess live data
- \`get_fund_quote\` → live NAV/price, daily change, 52-week range for ANY ticker (funds, ETFs, stocks, indices)
- \`run_capm\` → CAPM projection: beta, risk premium, expected return, and projected future value for a supported mutual fund
- \`compare_funds\` → side-by-side CAPM comparison of two mutual funds with a clear winner
- \`search_news\` → search the dashboard's live news feed for any topic
- \`list_funds\` → list all tickers available for CAPM analysis

**Chain tools when it adds value** — e.g. get a quote, then run CAPM, then summarize in one response.

## WATCHLIST DATA
The system prompt includes the user's live watchlist (prices + today's % change, sorted best→worst). Use this directly for "what's up today?", "how is X doing?", "which is my best fund?" questions. For 52-week context or deeper data, call \`get_fund_quote\`.

**Always use tool results verbatim — never recompute or round differently.**

## FINANCIAL MATH — do it yourself when tools aren't needed
- **Reverse projection** ("how much to invest to reach $X in Y years?"): get rate from run_capm, then principal = target ÷ e^(rate × years)
- **Rule of 72**: years to double ≈ 72 ÷ annual_rate%
- **Exact doubling**: t = ln(2) ÷ r
- **CAGR**: (end/start)^(1/years) − 1
- **Compound interest**: FV = PV × (1 + r/n)^(n×t)
- **Weighted portfolio return**: Σ(weight × return) for each position
- **Sharpe ratio**: (return − risk_free) ÷ std_dev — estimate std_dev from beta if needed
Show the formula and the numbers. Never just give an answer without the math.

## PORTFOLIO ANALYSIS
When the user asks about their portfolio or watchlist:
- Identify concentration risk (too much in one sector/family)
- Note correlation risk (funds that move together)
- Suggest rebalancing if allocation is skewed
- Compute portfolio-level weighted beta if watchlist data is available
- Flag negative-beta or defensive funds (\`VTBNX\`, bond funds) as ballast positions

## BROADER FINANCIAL INTELLIGENCE
You are a full financial advisor, not just a calculator. Cover:
- Market structure: how Fed policy, yield curve, and credit spreads affect fund performance
- Macro context: what rising/falling rates mean for bond vs equity funds, why VIX matters
- Fund mechanics: expense ratios, tracking error, index methodology, share classes (Admiral vs Investor vs Institutional)
- Tax efficiency: LTCG rates, tax-loss harvesting, wash-sale rules, fund distributions
- Risk frameworks: standard deviation, beta, alpha, Sharpe/Sortino, max drawdown
- Behavioral finance: recency bias, loss aversion, dollar-cost averaging as an antidote
Use your full training knowledge freely on any finance topic.

## PERSONALITY RULES
- Never say "I cannot" — always do the closest useful thing instead
- One short caveat maximum per response. No compliance boilerplate.
- If a question is vague, make a smart assumption and state it briefly, rather than asking for clarification
- Be proactive: after answering, add one unrequested insight the user would actually find valuable
- When you see a portfolio, think like a PM — notice what's missing, what's overlapping, what the real risk is`;

function buildSystemPrompt(context) {
  const lines = [BASE_SYSTEM_PROMPT];
  if (context?.ticker) {
    lines.push(`\nCurrently selected fund in the dashboard: \`${context.ticker}\``);
  }
  if (context?.quote?.regularMarketPrice != null) {
    const p = Number(context.quote.regularMarketPrice).toFixed(2);
    lines.push(`Live price for \`${context.quote.symbol}\`: $${p}`);
  }
  if (Array.isArray(context?.funds) && context.funds.length > 0) {
    const sorted = [...context.funds].sort((a, b) => (b.changePct ?? -Infinity) - (a.changePct ?? -Infinity));
    const rows = sorted.map(f => {
      const pct   = f.changePct != null ? `${f.changePct >= 0 ? '+' : ''}${Number(f.changePct).toFixed(2)}%` : 'N/A';
      const price = f.price != null ? `$${Number(f.price).toFixed(2)}` : 'N/A';
      return `  ${f.ticker || f.id} | ${f.name || ''} | ${price} | ${pct}`;
    });
    lines.push(`\n## Watchlist (sorted by today's change, high → low)\nTicker | Name | Price | Change%\n${rows.join('\n')}`);
    if (sorted.length >= 2) {
      const fmtPct = f => f.changePct != null ? `${f.changePct >= 0 ? '+' : ''}${Number(f.changePct).toFixed(2)}%` : 'N/A';
      lines.push(`Top mover today: \`${sorted[0].ticker || sorted[0].id}\` (${fmtPct(sorted[0])})`);
      const worst = sorted[sorted.length - 1];
      lines.push(`Worst performer today: \`${worst.ticker || worst.id}\` (${fmtPct(worst)})`);
    }
    // Portfolio-level stats for PM-style analysis
    const withChange = sorted.filter(f => f.changePct != null);
    if (withChange.length > 0) {
      const avgChange = withChange.reduce((s, f) => s + f.changePct, 0) / withChange.length;
      const green = withChange.filter(f => f.changePct >= 0).length;
      lines.push(`Portfolio breadth: ${green}/${withChange.length} positions positive today | Average change: ${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(2)}%`);
    }
  }
  if (Array.isArray(context?.articles) && context.articles.length > 0) {
    const recent = [...context.articles]
      .sort((a, b) => (b.time || 0) - (a.time || 0))
      .slice(0, 10);
    const rows = recent.map((a, i) => {
      const age = a.time ? Math.floor((Date.now() - a.time) / 60000) : null;
      const when = age != null ? (age < 60 ? `${age}m ago` : `${Math.floor(age / 60)}h ago`) : '';
      return `  ${i + 1}. [${a.tag || 'Market'}] ${a.title} — ${a.source || ''}${when ? ` (${when})` : ''}`;
    });
    lines.push(`\n## Latest News Headlines (from dashboard news feed)\n${rows.join('\n')}\nUse search_news to find more articles on a specific topic.`);
  }
  return lines.join('\n');
}

const TOOLS = [
  {
    name: 'get_fund_quote',
    description: 'Fetch the latest price, 52-week high/low, and price change for ANY ticker from Yahoo Finance — mutual funds, ETFs, and stocks (e.g. AAPL, TSLA, SPY, VFIAX).',
    parameters: {
      type: 'object',
      properties: {
        ticker: { type: 'string', description: 'Any ticker symbol — stock, ETF, or mutual fund. e.g. AAPL, TSLA, SPY, VFIAX, QQQ' },
      },
      required: ['ticker'],
    },
  },
  {
    name: 'run_capm',
    description: 'Run a CAPM-based future value projection for a single mutual fund. Returns beta, expected return rate, CAPM rate, and projected future value.',
    parameters: {
      type: 'object',
      properties: {
        ticker:    { type: 'string',  description: 'Mutual fund ticker, e.g. VFIAX' },
        principal: { type: 'number',  description: 'Initial investment in USD, e.g. 10000' },
        years:     { type: 'integer', description: 'Investment horizon in years, e.g. 10' },
      },
      required: ['ticker', 'principal', 'years'],
    },
  },
  {
    name: 'compare_funds',
    description: 'Compare two mutual funds side-by-side using live CAPM projections. Returns beta, CAPM rate, and projected future value for each fund, plus which one wins and by how much.',
    parameters: {
      type: 'object',
      properties: {
        ticker_a:  { type: 'string',  description: 'First fund ticker, e.g. VFIAX' },
        ticker_b:  { type: 'string',  description: 'Second fund ticker, e.g. FXAIX' },
        principal: { type: 'number',  description: 'Initial investment in USD' },
        years:     { type: 'integer', description: 'Investment horizon in years' },
      },
      required: ['ticker_a', 'ticker_b', 'principal', 'years'],
    },
  },
  {
    name: 'search_news',
    description: 'Search the latest financial news articles loaded in the dashboard for a topic. Returns matching headlines and sources.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Topic to search for, e.g. "Vanguard", "interest rates", "S&P 500"' },
      },
      required: ['query'],
    },
  },
  {
    name: 'list_funds',
    description: 'List all mutual fund tickers supported for CAPM calculations (run_capm and compare_funds).',
    parameters: { type: 'object', properties: {} },
  },
];

async function executeTool(name, args, context) {
  if (name === 'get_fund_quote') {
    const { ticker } = args;
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
      const resp = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 8000,
      });
      const meta = resp.data?.chart?.result?.[0]?.meta;
      if (!meta) return { error: 'No data returned for ticker: ' + ticker };
      const price     = meta.regularMarketPrice ?? null;
      const prev      = meta.chartPreviousClose ?? null;
      const change    = price != null && prev != null ? price - prev : null;
      const changePct = change != null && prev ? (change / prev) * 100 : null;
      return {
        ticker: meta.symbol,
        name: meta.longName || meta.shortName || meta.symbol,
        price,
        previousClose: prev,
        change:        change    != null ? +change.toFixed(4)    : null,
        changePct:     changePct != null ? +changePct.toFixed(4) : null,
        fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? null,
        fiftyTwoWeekLow:  meta.fiftyTwoWeekLow  ?? null,
        currency: meta.currency ?? 'USD',
      };
    } catch (e) {
      return { error: 'Failed to fetch quote: ' + e.message };
    }
  }

  if (name === 'run_capm') {
    const { ticker, principal, years } = args;
    try {
      validateTicker(ticker);
      if (typeof principal !== 'number' || principal <= 0) return { error: 'principal must be a positive number' };
      if (typeof years !== 'number' || years <= 0 || !Number.isInteger(years)) return { error: 'years must be a positive integer' };
      const result = await calculate(ticker, principal, years);
      const fv = +result.futureValue.toFixed(2);
      return {
        ticker: result.ticker,
        principal: result.principal,
        years: result.years,
        beta: +result.beta.toFixed(4),
        expectedReturnRate: +(result.expectedReturnRate * 100).toFixed(2),
        riskFreeRate:       +(result.riskFreeRate       * 100).toFixed(2),
        capmRate:           +(result.capmRate           * 100).toFixed(6),
        futureValue: fv,
        futureValueFormatted: `$${fv.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        note: 'futureValue is the authoritative result — do not recalculate it',
      };
    } catch (e) {
      return { error: e.message };
    }
  }

  if (name === 'compare_funds') {
    const { ticker_a, ticker_b, principal, years } = args;
    try {
      validateTicker(ticker_a);
      validateTicker(ticker_b);
      const [a, b] = await Promise.all([
        calculate(ticker_a, principal, years),
        calculate(ticker_b, principal, years),
      ]);
      const snap = r => ({
        beta:               +r.beta.toFixed(4),
        expectedReturnRate: +(r.expectedReturnRate * 100).toFixed(2),
        capmRate:           +(r.capmRate           * 100).toFixed(4),
        futureValue:        +r.futureValue.toFixed(2),
      });
      return {
        principal,
        years,
        [ticker_a]: snap(a),
        [ticker_b]: snap(b),
        winner:     a.futureValue >= b.futureValue ? ticker_a : ticker_b,
        difference: +(Math.abs(a.futureValue - b.futureValue)).toFixed(2),
        note: 'Use the futureValue fields exactly as returned — do not recalculate',
      };
    } catch (e) {
      return { error: e.message };
    }
  }

  if (name === 'search_news') {
    const { query } = args;
    const articles = context?.articles || [];
    const GENERIC = /^(latest|recent|all|news|today|market|top|headlines?|stories?|updates?)[\s,]*$/i;
    const isGeneric = GENERIC.test(query.trim()) || query.trim().length <= 3;

    if (isGeneric) {
      const recent = [...articles]
        .sort((a, b) => (b.time || 0) - (a.time || 0))
        .slice(0, 10)
        .map(a => ({ title: a.title, source: a.source, tag: a.tag, time: new Date(a.time).toLocaleDateString() }));
      if (recent.length === 0) return { message: 'No news articles are currently loaded in the dashboard.' };
      return { count: recent.length, note: 'Showing most recent articles', articles: recent };
    }

    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const scored = articles
      .map(a => {
        const hay = (a.title + ' ' + (a.source || '') + ' ' + (a.tag || '')).toLowerCase();
        const hits = words.filter(w => hay.includes(w)).length;
        return { a, hits };
      })
      .filter(({ hits }) => hits > 0)
      .sort((x, y) => y.hits - x.hits)
      .slice(0, 8)
      .map(({ a }) => ({
        title: a.title,
        source: a.source,
        tag: a.tag,
        time: new Date(a.time).toLocaleDateString(),
      }));

    if (scored.length === 0) {
      // fallback: return the most recent articles so the bot still has something to work with
      const recent = [...articles]
        .sort((a, b) => (b.time || 0) - (a.time || 0))
        .slice(0, 5)
        .map(a => ({ title: a.title, source: a.source, tag: a.tag, time: new Date(a.time).toLocaleDateString() }));
      if (recent.length === 0) return { message: 'No news articles are currently loaded in the dashboard.' };
      return { count: recent.length, note: `No articles matched "${query}" — showing most recent instead`, articles: recent };
    }
    return { count: scored.length, articles: scored };
  }

  if (name === 'list_funds') {
    const funds = getAllFunds();
    return {
      count: funds.length,
      funds: funds.map(f => ({ ticker: f.ticker, name: f.name })),
      note: 'These tickers are supported for run_capm and compare_funds.',
    };
  }

  return { error: 'Unknown tool: ' + name };
}

function toGeminiHistory(messages) {
  return messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content || '' }],
  }));
}

// POST /api/bot/chat
router.post('/chat', async (req, res) => {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ error: 'GS Bot is not configured. Add GEMINI_API_KEY to backend/.env' });
  }
  const { messages, context } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  try {
    const model = getClient().getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-lite',
      systemInstruction: buildSystemPrompt(context),
      tools: [{ functionDeclarations: TOOLS }],
    });

    // Last message is the new user turn; everything before is history
    const history = toGeminiHistory(messages.slice(0, -1));
    const lastMessage = messages[messages.length - 1];

    const chat = model.startChat({ history });

    // Agentic loop — capped at MAX_ITER to prevent runaway tool chains
    const MAX_ITER = 12;
    let iter = 0;
    let currentParts = [{ text: lastMessage.content || '' }];

    while (iter < MAX_ITER) {
      iter++;
      const result = await chat.sendMessage(currentParts);
      const response = result.response;
      const candidate = response.candidates?.[0];
      if (!candidate) return res.json({ reply: 'No response from model.' });

      const parts = candidate.content?.parts || [];
      const functionCalls = parts.filter(p => p.functionCall);
      const textParts = parts.filter(p => p.text).map(p => p.text).join('');

      // No tool calls — final text response
      if (functionCalls.length === 0) {
        return res.json({ reply: textParts || 'No response.' });
      }

      if (iter === MAX_ITER) {
        return res.json({ reply: textParts || 'Request required too many tool calls to complete.' });
      }

      // Execute all tool calls in parallel, then feed results back
      const toolResults = await Promise.all(
        functionCalls.map(async (part) => {
          const { name, args } = part.functionCall;
          let output;
          try {
            output = await executeTool(name, args || {}, context);
          } catch (e) {
            output = { error: 'Tool execution failed: ' + e.message };
          }
          return {
            functionResponse: {
              name,
              response: output,
            },
          };
        })
      );

      currentParts = toolResults;
    }
  } catch (e) {
    console.error('Bot error:', e);
    return res.status(500).json({ error: 'Bot request failed: ' + e.message });
  }
});

module.exports = router;
