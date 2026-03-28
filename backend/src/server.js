require('dotenv').config({ quiet: true });
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const axios   = require('axios');
const fundsRouter = require('./routes/funds');
const botRouter   = require('./routes/bot');
const emailRouter = require('./routes/email');

const app  = express();
const PORT = process.env.PORT || 8080;

// CORS — allow the configured frontend origin (or localhost in dev)
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
app.use(cors({ origin: [FRONTEND_URL, 'http://localhost:3000', 'http://localhost:3001'] }));

app.use(express.json({ limit: '2mb' }));

// ── Yahoo Finance proxy (/yahoo-api → query1, /yahoo-query → query2) ──────────
const YAHOO_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
};

app.use('/yahoo-api', async (req, res) => {
  const url = `https://query1.finance.yahoo.com${req.url}`;
  try {
    const upstream = await axios.get(url, {
      headers: YAHOO_HEADERS,
      responseType: 'arraybuffer',
      timeout: 10000,
    });
    res.status(upstream.status);
    const ct = upstream.headers['content-type'];
    if (ct) res.setHeader('Content-Type', ct);
    res.send(upstream.data);
  } catch (err) {
    const status = err.response?.status || 502;
    res.status(status).json({ error: 'Yahoo Finance proxy error', detail: err.message });
  }
});

app.use('/yahoo-query', async (req, res) => {
  const url = `https://query2.finance.yahoo.com${req.url}`;
  try {
    const upstream = await axios.get(url, {
      headers: YAHOO_HEADERS,
      responseType: 'arraybuffer',
      timeout: 10000,
    });
    res.status(upstream.status);
    const ct = upstream.headers['content-type'];
    if (ct) res.setHeader('Content-Type', ct);
    res.send(upstream.data);
  } catch (err) {
    const status = err.response?.status || 502;
    res.status(status).json({ error: 'Yahoo Finance proxy error', detail: err.message });
  }
});

// ── Google News RSS proxy (/google-news-rss → news.google.com/rss) ────────────
app.use('/google-news-rss', async (req, res) => {
  const url = `https://news.google.com/rss${req.url}`;
  try {
    const upstream = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      responseType: 'arraybuffer',
      timeout: 10000,
    });
    res.status(upstream.status);
    const ct = upstream.headers['content-type'];
    if (ct) res.setHeader('Content-Type', ct);
    res.send(upstream.data);
  } catch (err) {
    const status = err.response?.status || 502;
    res.status(status).json({ error: 'Google News proxy error', detail: err.message });
  }
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api', fundsRouter);
app.use('/api/bot', botRouter);
app.use('/api/email', emailRouter);

// ── Serve built frontend (production) ────────────────────────────────────────
const DIST = path.join(__dirname, '../../frontend/dist');
app.use(express.static(DIST));
app.get('*', (req, res) => {
  res.sendFile(path.join(DIST, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Mutual Fund Backend running on http://localhost:${PORT}`);
});
