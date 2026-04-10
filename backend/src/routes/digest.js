// GS Intelligence — AI-powered portfolio digest
// POST /api/digest/brief   { favorites: [tickers], articles?: [...], name?: string }
//   → { brief: string, funds: [...], generatedAt: ISO }
// POST /api/digest/email   { to, name?, favorites: [tickers], articles?: [...] }
//   → { ok: true, brief: string }
// POST /api/digest/alert-context  { ticker, direction, targetPrice, currentPrice, quote? }
//   → { context: string }  (1-2 sentence AI insight to enrich an alert email)

require('dotenv').config({ quiet: true });
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const GS_LOGO = 'https://companieslogo.com/img/orig/GS.D-55ee2e2e.png?t=1740321324';

let genAI;
function getClient() {
  if (!genAI) genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI;
}

// ─── data fetching ────────────────────────────────────────────────────────────

async function fetchQuote(ticker) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
    const resp = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000 });
    const meta = resp.data?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    const price = meta.regularMarketPrice ?? null;
    const prev = meta.chartPreviousClose ?? null;
    const change = price != null && prev != null ? price - prev : null;
    const changePct = change != null && prev ? (change / prev) * 100 : null;
    return {
      ticker: meta.symbol,
      name: meta.longName || meta.shortName || meta.symbol,
      price,
      previousClose: prev,
      change: change != null ? +change.toFixed(4) : null,
      changePct: changePct != null ? +changePct.toFixed(4) : null,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? null,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? null,
    };
  } catch {
    return null;
  }
}

// ─── AI generation ────────────────────────────────────────────────────────────

function getGreetingTimePart(timeZone) {
  try {
    const d = new Date();
    const options = { hour: 'numeric', hour12: false };
    if (timeZone) options.timeZone = timeZone;
    const hour = parseInt(Intl.DateTimeFormat('en-US', options).format(d), 10);
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  } catch (e) {
    return 'portfolio'; // fallback
  }
}

async function generateBrief({ funds, articles, name, timeZone }) {
  const model = getClient().getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    tools: [{ googleSearch: {} }],
    systemInstruction: 'You are a Goldman Sachs senior portfolio manager. Be confident, direct, and leverage your live search capabilities to deeply understand market moves. No filler, no robotic phrasing.',
    generationConfig: {
      temperature: 0.2, // lower temp for more deterministic, focused, and faster insights
      maxOutputTokens: 250, // Forces the model to stop generating rapidly (prevents runaway long responses)
      topK: 1 // Forces greedy decoding (fastest generation path, skips complex probability calculations)
    }
  });

  let dateStr;
  try {
    const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
    if (timeZone) options.timeZone = timeZone;
    dateStr = new Date().toLocaleDateString('en-US', options);
  } catch (e) {
    dateStr = new Date().toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });
  }

  const timePart = getGreetingTimePart(timeZone);

  const fundsText = funds.map(f => {
    const pct = f.changePct != null ? `${f.changePct >= 0 ? '+' : ''}${f.changePct.toFixed(2)}%` : 'N/A';
    const price = f.price != null ? `$${f.price.toFixed(2)}` : 'N/A';
    const vsHigh = f.fiftyTwoWeekHigh && f.price
      ? ` | ${(((f.price - f.fiftyTwoWeekHigh) / f.fiftyTwoWeekHigh) * 100).toFixed(1)}% from 52w high`
      : '';
    const vsLow = f.fiftyTwoWeekLow && f.price
      ? ` | ${(((f.price - f.fiftyTwoWeekLow) / f.fiftyTwoWeekLow) * 100).toFixed(1)}% above 52w low`
      : '';
    const range = f.fiftyTwoWeekHigh != null && f.fiftyTwoWeekLow != null
      ? ` | 52w range: $${f.fiftyTwoWeekLow.toFixed(2)}–$${f.fiftyTwoWeekHigh.toFixed(2)}`
      : '';
    return `- **${f.ticker}** (${f.name}): ${price} ${pct} today${vsHigh}${vsLow}${range}`;
  }).join('\n');

  const newsText = Array.isArray(articles) && articles.length > 0
    ? articles.slice(0, 10).map((a, i) => `${i + 1}. [${a.tag || 'Market'}] ${a.title} — ${a.source || ''}`).join('\n')
    : 'No recent news provided.';

  const prompt = `Write a personalized ${timePart === 'portfolio' ? 'portfolio' : timePart} briefing for ${name ? `a client named ${name}` : 'a client'} on ${dateStr}. Use your search tool to pinpoint exactly why the standout movers shifted today.

PORTFOLIO HOLDINGS (live data):
${fundsText}

MARKET NEWS (from dashboard feed):
${newsText}

Write a sharp, intelligent portfolio briefing in exactly 3–4 tight paragraphs. Cover in order:
1. Today's portfolio pulse — net direction, which positions are leading or dragging, the broad macro theme behind it
2. Standout mover — the biggest winner or loser with exact price and % change; give a likely cause (rate move, sector news, index rebalance)
3. News that matters — connect the most relevant headlines directly to specific holdings; skip news irrelevant to this portfolio
4. One forward-looking call — a specific, actionable thing to watch or consider in the next 1–2 weeks (rebalancing opportunity, upcoming Fed decision, 52-week level to watch, etc.)

RULES:
- Use exact figures from the data — never round or approximate
- Sound like a confident, senior advisor — direct, no filler, no robotic phrasing
- 52-week proximity matters: flag any fund near its 52w high or low as a signal
- If all funds are N/A (market closed or no data), briefly note this and give a forward-looking take instead
- Prose only, no bullet points or headers
- Under 220 words total
- Start immediately with the analysis — no greeting, no "here is your briefing"`;

  let result;
  try {
    result = await model.generateContent(prompt);
  } catch (error) {
    console.warn('[Gemini 2.5] Primary generation failed:', error.message);
    const fallbackModel = getClient().getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: 'You are a Goldman Sachs senior portfolio manager. Be confident, direct, and leverage your live search capabilities to deeply understand market moves. No filler, no robotic phrasing.',
      generationConfig: { temperature: 0.2 }
    });
    result = await fallbackModel.generateContent(prompt);
  }
  return result.response.text().trim();
}

async function generateAlertContext({ ticker, direction, targetPrice, currentPrice, name52wHigh, name52wLow }) {
  const model = getClient().getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    tools: [{ googleSearch: {} }],
    systemInstruction: 'You are a Goldman Sachs senior advisor. Provide exactly 1-2 sentence insights on market movements using live search data.',
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 60, // Alerts only need 1-2 sentences. Hard stop at 60 tokens for instant generation.
      topK: 1
    }
  });

  const isAbove = direction === 'above';
  const priceLine = currentPrice != null ? `Current price: $${Number(currentPrice).toFixed(2)}` : '';
  const rangeLine = name52wHigh && name52wLow
    ? `52-week range: $${Number(name52wLow).toFixed(2)}–$${Number(name52wHigh).toFixed(2)}`
    : '';

  const pctFromTarget = currentPrice
    ? ` (${(((Number(currentPrice) - Number(targetPrice)) / Number(targetPrice)) * 100).toFixed(1)}% ${isAbove ? 'above' : 'below'} target)`
    : '';

  const prompt = `Goldman Sachs price alert context. ${ticker} has just ${isAbove ? 'risen above' : 'fallen below'} the client's target of $${Number(targetPrice).toFixed(2)}${pctFromTarget}.
${priceLine}
${rangeLine}

In 1–2 sentences: what likely explains this move, and what should the investor consider doing right now? Be specific, use the numbers, no disclaimers, no intro — just the insight.`;

  let result;
  try {
    result = await model.generateContent(prompt);
  } catch (error) {
    console.warn('[Gemini 2.5] Alert generation failed:', error.message);
    const fallbackModel = getClient().getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: 'You are a Goldman Sachs senior advisor. Provide exactly 1-2 sentence insights on market movements using live search data.',
      generationConfig: { temperature: 0.2 }
    });
    result = await fallbackModel.generateContent(prompt);
  }
  return result.response.text().trim();
}

// ─── email templates ──────────────────────────────────────────────────────────

function backendUrl() {
  return (process.env.BACKEND_URL || 'http://localhost:8080').replace(/\/$/, '');
}

function sharedLayout({ innerHtml, unsubscribeUrl, timeZone }) {
  let now;
  try {
    const options = {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
    };
    if (timeZone) options.timeZone = timeZone;
    now = new Date().toLocaleString('en-US', options);
  } catch (e) {
    now = new Date().toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
    });
  }
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>GS Fund Dashboard</title>
</head>
<body style="margin:0;padding:0;background:#E8EDF5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#E8EDF5;padding:40px 16px;">
  <tr><td align="center">
    <table role="presentation" width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;border-radius:20px;overflow:hidden;box-shadow:0 12px 48px rgba(9,44,97,0.13);">
      <tr><td style="background:linear-gradient(90deg,#092C61 0%,#3b7dd8 50%,#7399C6 100%);height:4px;font-size:0;line-height:0;">&nbsp;</td></tr>
      <tr><td style="background:#0a1628;padding:0 28px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:14px 0;" valign="middle">
              <img src="${GS_LOGO}" width="20" height="20" alt="GS" style="display:inline-block;vertical-align:middle;margin-right:8px;border-radius:3px;">
              <span style="font-size:11px;font-weight:600;color:rgba(255,255,255,0.6);letter-spacing:0.07em;vertical-align:middle;text-transform:uppercase;">Fund Dashboard &nbsp;·&nbsp; Intelligence</span>
            </td>
            <td align="right" style="padding:14px 0;" valign="middle">
              <span style="font-size:10px;color:rgba(255,255,255,0.3);letter-spacing:0.04em;">${now}</span>
            </td>
          </tr>
        </table>
      </td></tr>
      <tr><td style="background:#ffffff;">${innerHtml}</td></tr>
      <tr><td style="background:#F4F6FA;border-top:1px solid #E2E8F0;padding:18px 28px;">
        <p style="margin:0 0 5px;font-size:11px;color:#94a3b8;text-align:center;line-height:1.6;">
          <strong style="color:#7399C6;">GS Fund Dashboard</strong> &nbsp;·&nbsp; AI-generated summaries are for informational purposes only.
        </p>
        <p style="margin:0;font-size:10px;color:#b0bec5;text-align:center;">
          <a href="${unsubscribeUrl}" style="color:#b0bec5;text-decoration:underline;">Unsubscribe</a>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function digestEmailHtml({ brief, funds, name, to, timeZone }) {
  const unsubUrl = `${backendUrl()}/api/email/unsubscribe?email=${encodeURIComponent(to)}`;
  let dateStr;
  try {
    const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
    if (timeZone) options.timeZone = timeZone;
    dateStr = new Date().toLocaleDateString('en-US', options);
  } catch (e) {
    dateStr = new Date().toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });
  }

  const timePart = getGreetingTimePart(timeZone);

  // Brief → HTML paragraphs, bolding **text**
  const briefHtml = brief
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `<p style="margin:0 0 14px;font-size:14px;color:#1e293b;line-height:1.75;">${p.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      }</p>`)
    .join('');

  // Fund performance table rows
  const fundRowsHtml = funds.map(f => {
    const isUp = f.changePct != null && f.changePct >= 0;
    const clr = isUp ? '#059669' : '#DC2626';
    const pct = f.changePct != null ? `${f.changePct >= 0 ? '+' : ''}${f.changePct.toFixed(2)}%` : '—';
    const price = f.price != null ? `$${f.price.toFixed(2)}` : '—';
    return `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #F1F5F9;vertical-align:middle;">
          <div style="font-size:13px;font-weight:700;color:#0d1f38;">${f.ticker}</div>
          <div style="font-size:11px;color:#94a3b8;margin-top:1px;">${(f.name || '').slice(0, 40)}</div>
        </td>
        <td style="padding:10px 0 10px 16px;border-bottom:1px solid #F1F5F9;text-align:right;vertical-align:middle;">
          <div style="font-size:14px;font-weight:600;color:#0d1f38;">${price}</div>
          <div style="font-size:11px;font-weight:600;color:${clr};margin-top:2px;">${pct}</div>
        </td>
      </tr>`;
  }).join('');

  const inner = `
    <!-- Hero -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="background:#0d1f38;padding:36px 28px 30px;">
        <div style="display:inline-block;background:rgba(115,153,198,0.18);border:1px solid rgba(115,153,198,0.35);border-radius:20px;padding:4px 13px;font-size:10px;font-weight:700;color:#7399C6;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:14px;">AI Portfolio Brief</div>
        <h1 style="margin:0 0 6px;font-size:26px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;line-height:1.2;">
          ${name ? `Good ${timePart}, ${name.split(' ')[0]}` : `Your ${timePart} briefing`}
        </h1>
        <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.45);">${dateStr}</p>
      </td></tr>
    </table>

    <!-- AI analysis -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:28px 28px 8px;">
        <p style="margin:0 0 16px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.10em;">Portfolio Analysis</p>
        ${briefHtml}
      </td></tr>
    </table>

    <!-- Fund table -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:0 28px 28px;">
        <p style="margin:0 0 12px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.10em;">Your Favorites — Live Prices</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${fundRowsHtml}
        </table>
      </td></tr>
    </table>

    <!-- CTA -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:0 28px 32px;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" style="display:inline-block;background:linear-gradient(135deg,#092C61,#3b7dd8);color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:0.02em;padding:12px 28px;border-radius:10px;box-shadow:0 4px 14px rgba(9,44,97,0.25);">Open Dashboard &rarr;</a>
      </td></tr>
    </table>
  `;

  return sharedLayout({ innerHtml: inner, unsubscribeUrl: unsubUrl, timeZone });
}

// ─── routes ───────────────────────────────────────────────────────────────────

// POST /api/digest/brief
router.post('/brief', async (req, res) => {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ error: 'GEMINI_API_KEY not configured' });
  }
  const { favorites, articles, name, timeZone } = req.body;
  if (!Array.isArray(favorites) || favorites.length === 0) {
    return res.status(400).json({ error: 'favorites array is required' });
  }

  try {
    const funds = (await Promise.all(favorites.slice(0, 10).map(fetchQuote))).filter(Boolean);
    if (funds.length === 0) {
      return res.status(422).json({ error: 'Could not fetch quotes for any of the provided tickers' });
    }
    const brief = await generateBrief({ funds, articles: articles || [], name, timeZone });
    res.json({ brief, funds, generatedAt: new Date().toISOString() });
  } catch (e) {
    console.error('[digest/brief]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/digest/email
router.post('/email', async (req, res) => {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ error: 'GEMINI_API_KEY not configured' });
  }
  if (!process.env.BREVO_API_KEY) {
    return res.status(503).json({ error: 'Email not configured. Add BREVO_API_KEY to backend/.env', unconfigured: true });
  }

  const { to, name, favorites, articles, timeZone } = req.body;
  if (!to) return res.status(400).json({ error: 'to is required' });
  if (!Array.isArray(favorites) || favorites.length === 0) {
    return res.status(400).json({ error: 'favorites array is required' });
  }

  try {
    const funds = (await Promise.all(favorites.slice(0, 10).map(fetchQuote))).filter(Boolean);
    const brief = await generateBrief({ funds, articles: articles || [], name, timeZone });

    const from = process.env.BREVO_SENDER_EMAIL || 'joaol.olivsilva@gmail.com';
    let dateLabel;
    try {
      const options = { weekday: 'long', month: 'short', day: 'numeric' };
      if (timeZone) options.timeZone = timeZone;
      dateLabel = new Date().toLocaleDateString('en-US', options);
    } catch (e) {
      dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    }

    const emailResp = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'GS Fund Dashboard', email: from },
        to: [{ email: to, name: name || undefined }],
        subject: `Your Portfolio Brief — ${dateLabel}`,
        htmlContent: digestEmailHtml({ brief, funds, name, to, timeZone }),
        textContent: brief,
      }),
    });

    const data = await emailResp.json();
    if (!emailResp.ok) throw new Error(data.message || 'Brevo API error');

    res.json({ ok: true, brief });
  } catch (e) {
    console.error('[digest/email]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/digest/alert-context
// Called internally by email.js when sending a price alert — adds 1-2 sentence AI insight
router.post('/alert-context', async (req, res) => {
  if (!process.env.GEMINI_API_KEY) {
    return res.json({ context: null }); // graceful degradation
  }
  const { ticker, direction, targetPrice, currentPrice } = req.body;
  let { fiftyTwoWeekHigh, fiftyTwoWeekLow } = req.body;
  if (!ticker || !direction || targetPrice == null) {
    return res.status(400).json({ error: 'ticker, direction, targetPrice are required' });
  }
  try {
    // Auto-enrich with 52-week range if caller didn't provide it
    if (!fiftyTwoWeekHigh || !fiftyTwoWeekLow) {
      const q = await fetchQuote(ticker);
      if (q) {
        fiftyTwoWeekHigh = fiftyTwoWeekHigh ?? q.fiftyTwoWeekHigh;
        fiftyTwoWeekLow = fiftyTwoWeekLow ?? q.fiftyTwoWeekLow;
      }
    }
    const context = await generateAlertContext({
      ticker, direction, targetPrice, currentPrice,
      name52wHigh: fiftyTwoWeekHigh, name52wLow: fiftyTwoWeekLow,
    });
    res.json({ context });
  } catch (e) {
    console.error('[digest/alert-context]', e.message);
    res.json({ context: null }); // don't block alert sending if AI fails
  }
});

module.exports = router;
