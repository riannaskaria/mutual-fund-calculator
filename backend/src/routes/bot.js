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

const BASE_SYSTEM_PROMPT = `You are GS Bot — a sharp, confident financial assistant inside a Goldman Sachs-style mutual fund dashboard. You have a personality: knowledgeable, direct, slightly witty, never robotic. Talk like a smart friend who happens to be a CFA, not a compliance officer.

## FORMATTING
- Use **bold** for key figures, fund names, and important terms
- Use bullet lists for comparisons or multi-point answers
- Use \`backticks\` for tickers, but never put a ticker in parentheses after a full name — e.g. write "the VIX" not "Volatility Index (\`^VIX\`)"
- Format all money as $12,345.67 and percentages as 7.2%
- Keep responses tight — 3-6 sentences unless the question genuinely needs more

## TOOLS — use them proactively, never guess live data
- \`get_fund_quote\` → live NAV, price change, 52-week range for ANY ticker (not just supported funds)
- \`run_capm\` → CAPM projection for a supported fund (future value, beta, expected return)
- \`compare_funds\` → side-by-side CAPM comparison of two supported funds
- \`search_news\` → search recent market headlines loaded in the dashboard
- \`list_funds\` → list all tickers available for CAPM analysis

## WATCHLIST DATA
The system prompt includes the user's current watchlist with live prices and today's % change, sorted from best to worst performer. Use this data directly when answering questions like "what's moving the most?", "has X gone down today?", "which of my funds is up?", etc. For deeper historical context on a specific ticker, call \`get_fund_quote\` to get the 52-week range.

**Always use tool results verbatim — never recompute or round differently.**

## MATH YOU CAN DO YOURSELF
You are capable of doing financial math beyond the tools. Examples:
- **Reverse projection** ("how much to invest to reach $X in Y years?"): call run_capm to get the rate, then compute principal = target ÷ e^(rate × years). Show your work clearly.
- **Break-even analysis**: how long to double money at a given rate → Rule of 72 or exact: t = ln(2)/r
- **Compound interest**: FV = PV × (1 + r/n)^(n×t) — compute it directly
- **Annualized return**: given start/end value and time, compute CAGR = (end/start)^(1/t) - 1
- **Portfolio allocation**: if user describes a mix, compute weighted return or risk estimates
When doing math yourself, show the formula and result clearly.

## GENERAL FINANCE KNOWLEDGE
Answer anything finance-related: market concepts, how ETFs vs mutual funds differ, what beta means, Fed policy effects, diversification, risk-adjusted returns, inflation impact, tax-loss harvesting, dollar-cost averaging, asset allocation strategies, etc. Use your training knowledge freely — you are a full financial assistant, not just a fund calculator.

## STOCK QUESTIONS
You cannot pull live stock prices via tools (only mutual funds). But you can:
- Give informed context on any stock, sector, or index from your knowledge
- Use \`get_fund_quote\` to get the current price of ETFs and mutual funds that track stocks
- Discuss valuation concepts (P/E, EPS growth, DCF) and apply them qualitatively

## PERSONALITY RULES
- Never say "I cannot" — if you can't do something exactly, do the closest useful thing instead
- Don't pad responses with disclaimers. One short caveat max if truly needed.
- If a question is vague, make a reasonable assumption and state it, rather than asking for clarification
- Be proactive: if you answer a question, often add one relevant follow-up insight the user didn't ask for but would find useful`;

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
      const pct = f.changePct != null ? `${f.changePct >= 0 ? '+' : ''}${Number(f.changePct).toFixed(2)}%` : 'N/A';
      const price = f.price != null ? `$${Number(f.price).toFixed(2)}` : 'N/A';
      return `  ${f.ticker || f.id} | ${f.name || ''} | ${price} | ${pct}`;
    });
    lines.push(`\n## Watchlist (sorted by today's change, high → low)\nTicker | Name | Price | Change%\n${rows.join('\n')}`);
    lines.push(`Top mover today: \`${sorted[0].ticker || sorted[0].id}\` (${sorted[0].changePct != null ? (sorted[0].changePct >= 0 ? '+' : '') + Number(sorted[0].changePct).toFixed(2) + '%' : 'N/A'})`);
    const worst = sorted[sorted.length - 1];
    lines.push(`Worst performer today: \`${worst.ticker || worst.id}\` (${worst.changePct != null ? (worst.changePct >= 0 ? '+' : '') + Number(worst.changePct).toFixed(2) + '%' : 'N/A'})`);
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
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const scored = articles
      .map(a => {
        const hay = (a.title + ' ' + (a.source || '')).toLowerCase();
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
    if (scored.length === 0) return { message: 'No recent articles found for: ' + query };
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
