// Goldman Bot — Agentic chat endpoint using OpenAI function calling
// POST /api/bot/chat  { messages: [...], context: { ticker, funds, articles, quote } }

require('dotenv').config({ quiet: true });
const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const axios = require('axios');
const { calculate, validateTicker, getAllFunds } = require('../services/mutualFundService');

// Lazy init so dotenv is loaded first
let client;
function getClient() {
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

const BASE_SYSTEM_PROMPT = `You are GS Bot, a sharp, knowledgeable financial assistant for a mutual fund dashboard built for Goldman Sachs.
You have access to live market data and calculation tools. When a user asks about a fund, price, performance, or CAPM projection, use your tools — don't guess numbers.
Be concise, professional, and direct. Use dollar signs and percentages where appropriate. Format numbers clearly (e.g. $12,345.67, 7.2%).
Use markdown in your responses: **bold** for key figures and fund names, bullet lists for comparisons, \`backticks\` for tickers.

CRITICAL RULE — Tool results are authoritative. When you call a tool:
- Report the exact numbers returned by the tool. Do NOT recompute, round differently, or verify with your own math.
- For run_capm / compare_funds: quote the futureValue fields exactly as returned. Never recalculate FV yourself.
- For get_fund_quote: quote the price field exactly as returned. Never estimate or adjust it.
- If the tool returns a number, that number is correct. Your job is to present it clearly.

Available tools:
- get_fund_quote — live NAV price and 52-week range for any ticker
- run_capm — CAPM projection (beta, rate, future value) for a supported ticker
- compare_funds — side-by-side CAPM comparison of two supported tickers
- search_news — search recent financial news headlines from the dashboard
- list_funds — list all tickers supported for CAPM calculations`;

function buildSystemPrompt(context) {
  const lines = [BASE_SYSTEM_PROMPT];
  if (context?.ticker) {
    lines.push(`\nCurrently selected fund in the dashboard: \`${context.ticker}\``);
  }
  if (context?.quote?.regularMarketPrice != null) {
    const p = Number(context.quote.regularMarketPrice).toFixed(2);
    lines.push(`Live price for \`${context.quote.symbol}\`: $${p}`);
  }
  return lines.join('\n');
}

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_fund_quote',
      description: 'Fetch the latest NAV price, 52-week high/low, and price change for a mutual fund ticker from Yahoo Finance.',
      parameters: {
        type: 'object',
        properties: {
          ticker: { type: 'string', description: 'Mutual fund ticker symbol, e.g. VFIAX' },
        },
        required: ['ticker'],
      },
    },
  },
  {
    type: 'function',
    function: {
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
  },
  {
    type: 'function',
    function: {
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
  },
  {
    type: 'function',
    function: {
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
  },
  {
    type: 'function',
    function: {
      name: 'list_funds',
      description: 'List all mutual fund tickers supported for CAPM calculations (run_capm and compare_funds).',
      parameters: { type: 'object', properties: {} },
    },
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
      if (!meta) return JSON.stringify({ error: 'No data returned for ticker: ' + ticker });
      const price     = meta.regularMarketPrice ?? null;
      const prev      = meta.chartPreviousClose ?? null;
      const change    = price != null && prev != null ? price - prev : null;
      const changePct = change != null && prev ? (change / prev) * 100 : null;
      return JSON.stringify({
        ticker: meta.symbol,
        name: meta.longName || meta.shortName || meta.symbol,
        price,
        previousClose: prev,
        change:        change    != null ? +change.toFixed(4)    : null,
        changePct:     changePct != null ? +changePct.toFixed(4) : null,
        fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? null,
        fiftyTwoWeekLow:  meta.fiftyTwoWeekLow  ?? null,
        currency: meta.currency ?? 'USD',
      });
    } catch (e) {
      return JSON.stringify({ error: 'Failed to fetch quote: ' + e.message });
    }
  }

  if (name === 'run_capm') {
    const { ticker, principal, years } = args;
    try {
      validateTicker(ticker);
      const result = await calculate(ticker, principal, years);
      const fv = +result.futureValue.toFixed(2);
      return JSON.stringify({
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
      });
    } catch (e) {
      return JSON.stringify({ error: e.message });
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
      return JSON.stringify({
        principal,
        years,
        [ticker_a]: snap(a),
        [ticker_b]: snap(b),
        winner:     a.futureValue >= b.futureValue ? ticker_a : ticker_b,
        difference: +(Math.abs(a.futureValue - b.futureValue)).toFixed(2),
        note: 'Use the futureValue fields exactly as returned — do not recalculate',
      });
    } catch (e) {
      return JSON.stringify({ error: e.message });
    }
  }

  if (name === 'search_news') {
    const { query } = args;
    const articles = context?.articles || [];
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);

    // Score each article by how many query words it contains, then sort by score
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

    if (scored.length === 0) return JSON.stringify({ message: 'No recent articles found for: ' + query });
    return JSON.stringify({ count: scored.length, articles: scored });
  }

  if (name === 'list_funds') {
    const funds = getAllFunds();
    return JSON.stringify({
      count: funds.length,
      funds: funds.map(f => ({ ticker: f.ticker, name: f.name })),
      note: 'These tickers are supported for run_capm and compare_funds.',
    });
  }

  return JSON.stringify({ error: 'Unknown tool: ' + name });
}

// POST /api/bot/chat
router.post('/chat', async (req, res) => {
  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ error: 'GS Bot is not configured. Add OPENAI_API_KEY to backend/.env' });
  }
  const { messages, context } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  try {
    let currentMessages = [
      { role: 'system', content: buildSystemPrompt(context) },
      ...messages,
    ];

    // Agentic loop — capped at MAX_ITER to prevent runaway tool chains
    const MAX_ITER = 8;
    let iter = 0;
    while (iter < MAX_ITER) {
      iter++;
      const response = await getClient().chat.completions.create({
        model:       process.env.OPENAI_MODEL || 'gpt-4o-mini',
        tools:       TOOLS,
        tool_choice: 'auto',
        messages:    currentMessages,
      });

      const choice = response.choices?.[0];
      if (!choice?.message) return res.json({ reply: 'No response from model.' });
      const msg = choice.message;
      currentMessages.push(msg);

      if (!msg.tool_calls || msg.tool_calls.length === 0) {
        return res.json({ reply: msg.content || 'No response.' });
      }

      if (iter === MAX_ITER) {
        return res.json({ reply: msg.content || 'Request required too many tool calls to complete.' });
      }

      // Execute all tool calls in parallel
      const toolResults = await Promise.all(
        msg.tool_calls.map(async (tc) => {
          let result;
          try {
            const args = JSON.parse(tc.function.arguments);
            result = await executeTool(tc.function.name, args, context);
          } catch (e) {
            result = JSON.stringify({ error: 'Tool execution failed: ' + e.message });
          }
          return { role: 'tool', tool_call_id: tc.id, content: result };
        })
      );

      currentMessages.push(...toolResults);
    }
  } catch (e) {
    console.error('Bot error:', e);
    return res.status(500).json({ error: 'Bot request failed: ' + e.message });
  }
});

module.exports = router;
