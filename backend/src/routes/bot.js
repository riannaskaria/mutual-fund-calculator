// Goldman Bot — Agentic chat endpoint using OpenAI function calling
// POST /api/bot/chat  { messages: [...], context: { ticker, funds, articles } }

require('dotenv').config({ quiet: true });
const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const axios = require('axios');
const { calculate, validateTicker } = require('../services/mutualFundService');

// Lazy init so dotenv is loaded first
let client;
function getClient() {
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

const SYSTEM_PROMPT = `You are GS Bot, a sharp, knowledgeable financial assistant for a mutual fund dashboard built for Goldman Sachs.
You have access to live market data and calculation tools. When a user asks about a fund, price, performance, or CAPM projection, use your tools — don't guess numbers.
Be concise, professional, and direct. Use dollar signs and percentages where appropriate. Format numbers clearly (e.g. $12,345.67, 7.2%).

CRITICAL RULE — Tool results are authoritative. When you call a tool:
- Report the exact numbers returned by the tool. Do NOT recompute, round differently, or verify with your own math.
- For run_capm: quote the futureValue field exactly as returned. Never recalculate FV yourself.
- For get_fund_quote: quote the price field exactly as returned. Never estimate or adjust it.
- If the tool returns a number, that number is correct. Your job is to present it, not check it.`;

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
      description: 'Run a CAPM-based future value projection for a mutual fund. Returns beta, expected return rate, CAPM rate, and projected future value.',
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
      name: 'search_news',
      description: 'Search the latest financial news articles for a topic. Returns matching headlines and sources.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Topic to search for, e.g. "Vanguard", "interest rates", "S&P 500"' },
        },
        required: ['query'],
      },
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
      const price  = meta.regularMarketPrice ?? null;
      const prev   = meta.chartPreviousClose ?? null;
      const change = price != null && prev != null ? price - prev : null;
      const changePct = change != null && prev ? (change / prev) * 100 : null;
      return JSON.stringify({
        ticker: meta.symbol,
        name: meta.longName || meta.shortName || meta.symbol,
        price,
        previousClose: prev,
        change: change != null ? +change.toFixed(4) : null,
        changePct: changePct != null ? +changePct.toFixed(4) : null,
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
        riskFreeRate: +(result.riskFreeRate * 100).toFixed(2),
        capmRate: +(result.capmRate * 100).toFixed(6),
        futureValue: fv,
        futureValueFormatted: `$${fv.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        note: 'futureValue is the authoritative result — do not recalculate it',
      });
    } catch (e) {
      return JSON.stringify({ error: e.message });
    }
  }

  if (name === 'search_news') {
    const { query } = args;
    const articles = context?.articles || [];
    const q = query.toLowerCase();
    const matches = articles
      .filter(a => a.title.toLowerCase().includes(q) || (a.source || '').toLowerCase().includes(q))
      .slice(0, 8)
      .map(a => ({ title: a.title, source: a.source, tag: a.tag, time: new Date(a.time).toLocaleDateString() }));
    if (matches.length === 0) return JSON.stringify({ message: 'No recent articles found for: ' + query });
    return JSON.stringify({ count: matches.length, articles: matches });
  }

  return JSON.stringify({ error: 'Unknown tool: ' + name });
}

// POST /api/bot/chat
router.post('/chat', async (req, res) => {
  const { messages, context } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  try {
    let currentMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages,
    ];

    // Agentic loop
    while (true) {
      const response = await getClient().chat.completions.create({
        model: 'gpt-4o-mini',
        tools: TOOLS,
        tool_choice: 'auto',
        messages: currentMessages,
      });

      const msg = response.choices[0].message;
      currentMessages.push(msg);

      if (!msg.tool_calls || msg.tool_calls.length === 0) {
        return res.json({ reply: msg.content || 'No response.' });
      }

      // Execute all tool calls in parallel
      const toolResults = await Promise.all(
        msg.tool_calls.map(async (tc) => {
          const args = JSON.parse(tc.function.arguments);
          const result = await executeTool(tc.function.name, args, context);
          return {
            role: 'tool',
            tool_call_id: tc.id,
            content: result,
          };
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
