// Email alert delivery
// POST /api/email/send-alert  { to, ticker, targetPrice, direction, currentPrice }
// POST /api/email/test        { to }
// GET  /api/email/unsubscribe?email=...
//
// Required .env variables:
//   SMTP_HOST     (default: smtp.gmail.com)
//   SMTP_PORT     (default: 587)
//   SMTP_USER     your sending address
//   SMTP_PASS     Gmail app password or SMTP password
//   SMTP_FROM     (optional, falls back to SMTP_USER)
//   BACKEND_URL   (default: http://localhost:8080)

const express = require('express');
const router  = express.Router();
const nodemailer = require('nodemailer');
const fs   = require('fs');
const path = require('path');

const GS_LOGO    = 'https://companieslogo.com/img/orig/GS.D-55ee2e2e.png?t=1740321324';
const UNSUB_FILE = path.join(__dirname, '../../unsubscribed.json');

// ─── unsubscribe list helpers ─────────────────────────────────────────────────
function loadUnsubscribed() {
  try { return new Set(JSON.parse(fs.readFileSync(UNSUB_FILE, 'utf8'))); }
  catch { return new Set(); }
}

function saveUnsubscribed(set) {
  try { fs.writeFileSync(UNSUB_FILE, JSON.stringify([...set])); } catch {}
}

function isUnsubscribed(email) {
  return loadUnsubscribed().has(email.toLowerCase());
}

function unsubscribe(email) {
  const set = loadUnsubscribed();
  set.add(email.toLowerCase());
  saveUnsubscribed(set);
}

// ─── transport + config ───────────────────────────────────────────────────────
function createTransporter() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST || 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

function isConfigured() {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

function backendUrl() {
  return (process.env.BACKEND_URL || 'http://localhost:8080').replace(/\/$/, '');
}

// ─── shared layout ────────────────────────────────────────────────────────────
function layout({ innerHtml, unsubscribeUrl }) {
  const now = new Date().toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>GS Fund Dashboard</title>
</head>
<body style="margin:0;padding:0;background:#E8EDF5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#E8EDF5;padding:40px 16px;">
  <tr><td align="center">

    <table role="presentation" width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;border-radius:20px;overflow:hidden;box-shadow:0 12px 48px rgba(9,44,97,0.13);">

      <!-- top accent stripe -->
      <tr><td style="background:linear-gradient(90deg,#092C61 0%,#3b7dd8 50%,#7399C6 100%);height:4px;font-size:0;line-height:0;">&nbsp;</td></tr>

      <!-- nav bar -->
      <tr><td style="background:#0a1628;padding:0 28px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:14px 0;" valign="middle">
              <img src="${GS_LOGO}" width="20" height="20" alt="GS" style="display:inline-block;vertical-align:middle;margin-right:8px;border-radius:3px;">
              <span style="font-size:11px;font-weight:600;color:rgba(255,255,255,0.6);letter-spacing:0.07em;vertical-align:middle;text-transform:uppercase;">Fund Dashboard</span>
            </td>
            <td align="right" style="padding:14px 0;" valign="middle">
              <span style="font-size:10px;color:rgba(255,255,255,0.3);letter-spacing:0.04em;">${now}</span>
            </td>
          </tr>
        </table>
      </td></tr>

      <!-- content -->
      <tr><td style="background:#ffffff;">${innerHtml}</td></tr>

      <!-- footer -->
      <tr><td style="background:#F4F6FA;border-top:1px solid #E2E8F0;padding:18px 28px;">
        <p style="margin:0 0 5px;font-size:11px;color:#94a3b8;text-align:center;line-height:1.6;">
          <strong style="color:#7399C6;">GS Fund Dashboard</strong>
          &nbsp;&middot;&nbsp;
          Price alerts are for informational purposes only and do not constitute financial advice.
        </p>
        <p style="margin:0;font-size:10px;color:#b0bec5;text-align:center;line-height:1.7;">
          You received this because you enabled price alert emails in your account.
          &nbsp;&middot;&nbsp;
          <a href="${unsubscribeUrl}" style="color:#b0bec5;text-decoration:underline;font-size:10px;">Unsubscribe</a>
        </p>
      </td></tr>

    </table>

  </td></tr>
</table>
</body>
</html>`;
}

// ─── alert email ──────────────────────────────────────────────────────────────
function alertHtml({ ticker, targetPrice, direction, currentPrice, to }) {
  const isAbove      = direction === 'above';
  const accentClr    = isAbove ? '#059669' : '#DC2626';
  const accentBg     = isAbove ? '#F0FDF4' : '#FEF2F2';
  const accentBdr    = isAbove ? '#A7F3D0' : '#FECACA';
  const dirLabel     = isAbove ? '&#8593; Above target' : '&#8595; Below target';
  const verbLabel    = isAbove ? 'risen above' : 'fallen below';

  const priceDiff    = currentPrice != null ? Math.abs(currentPrice - targetPrice) : null;
  const priceDiffPct = priceDiff != null && targetPrice
    ? ((priceDiff / targetPrice) * 100).toFixed(2) : null;

  const unsubUrl = `${backendUrl()}/api/email/unsubscribe?email=${encodeURIComponent(to)}`;

  const inner = `
    <!-- hero -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="background:#0d1f38;padding:36px 28px 30px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td valign="middle">
              <div style="display:inline-block;background:${accentBg};border:1px solid ${accentBdr};border-radius:20px;padding:4px 13px;font-size:10px;font-weight:700;color:${accentClr};letter-spacing:0.08em;text-transform:uppercase;margin-bottom:14px;">${dirLabel}</div>
              <h1 style="margin:0 0 8px;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;line-height:1.15;">Price Alert Triggered</h1>
              <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.5);line-height:1.65;">
                <strong style="color:rgba(255,255,255,0.88);">${ticker}</strong>
                has ${verbLabel} your target of
                <strong style="color:rgba(255,255,255,0.88);">$${Number(targetPrice).toFixed(2)}</strong>
              </p>
            </td>
            <td align="right" valign="middle" style="padding-left:20px;" width="66">
              <div style="width:54px;height:54px;border-radius:50%;background:rgba(255,255,255,0.07);border:1.5px solid rgba(255,255,255,0.13);text-align:center;line-height:54px;">
                <img src="${GS_LOGO}" width="30" height="30" alt="GS" style="display:inline-block;vertical-align:middle;border-radius:3px;">
              </div>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>

    <!-- price cards -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:28px 28px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1.5px solid #E2E8F0;border-radius:16px;overflow:hidden;">
          <tr>
            <td width="50%" style="padding:24px;border-right:1.5px solid #E2E8F0;text-align:center;vertical-align:middle;background:#FAFBFD;">
              <div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.10em;margin-bottom:10px;">Current Price</div>
              <div style="font-size:34px;font-weight:700;color:${accentClr};letter-spacing:-0.03em;line-height:1;">${currentPrice != null ? '$' + Number(currentPrice).toFixed(2) : '&mdash;'}</div>
              ${priceDiffPct ? `<div style="display:inline-block;margin-top:8px;background:${accentBg};border:1px solid ${accentBdr};border-radius:20px;padding:3px 10px;font-size:11px;color:${accentClr};font-weight:600;">${isAbove ? '+' : '&minus;'}${priceDiffPct}% vs target</div>` : ''}
            </td>
            <td width="50%" style="padding:24px;text-align:center;vertical-align:middle;">
              <div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.10em;margin-bottom:10px;">Your Target</div>
              <div style="font-size:34px;font-weight:700;color:#0d1f38;letter-spacing:-0.03em;line-height:1;">$${Number(targetPrice).toFixed(2)}</div>
              <div style="margin-top:8px;font-size:11px;color:#94a3b8;">${isAbove ? 'Alert when above' : 'Alert when below'}</div>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>

    <!-- divider + ticker chip -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:20px 28px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background:#0d1f38;border-radius:8px;padding:6px 14px;">
              <span style="font-size:12px;font-weight:700;color:#ffffff;letter-spacing:0.05em;">${ticker}</span>
            </td>
            <td style="padding-left:10px;">
              <span style="font-size:12px;color:#64748b;">alert has been resolved &mdash; this alert will not fire again</span>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>

    <!-- CTA -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:24px 28px 32px;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" style="display:inline-block;background:linear-gradient(135deg,#092C61,#3b7dd8);color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:0.02em;padding:12px 28px;border-radius:10px;box-shadow:0 4px 14px rgba(9,44,97,0.25);">Open Dashboard &rarr;</a>
        <p style="margin:14px 0 0;font-size:12px;color:#94a3b8;line-height:1.6;">
          Set a new alert using the &#128276; bell icon on any fund header.
        </p>
      </td></tr>
    </table>
  `;

  return layout({ innerHtml: inner, unsubscribeUrl: unsubUrl });
}

// ─── test email ───────────────────────────────────────────────────────────────
function testHtml({ to }) {
  const unsubUrl = `${backendUrl()}/api/email/unsubscribe?email=${encodeURIComponent(to)}`;

  const steps = [
    { icon: '&#9675;', title: 'Set an alert',   desc: 'Click the bell icon on any fund header and enter a target price and direction.' },
    { icon: '&#9653;', title: 'Price check',    desc: 'Prices refresh every 15 s. When your target is hit the alert triggers immediately.' },
    { icon: '&#9993;', title: 'Email delivery', desc: 'A branded alert email is sent straight to your registered address.' },
  ];

  const inner = `
    <!-- hero -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="background:#0d1f38;padding:36px 28px 30px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td valign="middle">
              <div style="display:inline-block;background:#F0FDF4;border:1px solid #A7F3D0;border-radius:20px;padding:4px 13px;font-size:10px;font-weight:700;color:#059669;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:14px;">&#10003; Configuration verified</div>
              <h1 style="margin:0 0 8px;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;line-height:1.15;">Email alerts are working</h1>
              <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.5);line-height:1.65;">
                Your SMTP setup is correct. Price alert emails will be delivered here automatically.
              </p>
            </td>
            <td align="right" valign="middle" style="padding-left:20px;" width="66">
              <div style="width:54px;height:54px;border-radius:50%;background:rgba(255,255,255,0.07);border:1.5px solid rgba(255,255,255,0.13);text-align:center;line-height:54px;">
                <img src="${GS_LOGO}" width="30" height="30" alt="GS" style="display:inline-block;vertical-align:middle;border-radius:3px;">
              </div>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>

    <!-- steps -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:28px 28px 8px;">
        <p style="margin:0 0 18px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.10em;">How it works</p>
        ${steps.map(({ icon, title, desc }, i) => `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:4px;">
          <tr>
            <td width="40" valign="top" style="padding-top:13px;">
              <div style="width:30px;height:30px;background:#F1F5F9;border-radius:8px;text-align:center;line-height:30px;font-size:13px;color:#475569;">${icon}</div>
            </td>
            <td style="padding:13px 0 13px 10px;${i < steps.length - 1 ? 'border-bottom:1px solid #F1F5F9;' : ''}vertical-align:top;">
              <div style="font-size:13px;font-weight:600;color:#0d1f38;margin-bottom:3px;">${title}</div>
              <div style="font-size:12px;color:#64748b;line-height:1.55;">${desc}</div>
            </td>
          </tr>
        </table>`).join('')}
      </td></tr>
    </table>

    <!-- CTA -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:8px 28px 32px;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" style="display:inline-block;background:linear-gradient(135deg,#092C61,#3b7dd8);color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:0.02em;padding:12px 28px;border-radius:10px;box-shadow:0 4px 14px rgba(9,44,97,0.25);">Open Dashboard &rarr;</a>
        <p style="margin:14px 0 0;font-size:12px;color:#94a3b8;line-height:1.6;">
          Manage alerts in <strong style="color:#092C61;">Account &rarr; Profile &rarr; Email Alerts</strong>.
        </p>
      </td></tr>
    </table>
  `;

  return layout({ innerHtml: inner, unsubscribeUrl: unsubUrl });
}

// ─── unsubscribe confirmation page ────────────────────────────────────────────
function unsubscribePage(email) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Unsubscribed — GS Fund Dashboard</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #E8EDF5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; }
    .card { background: #fff; border-radius: 20px; box-shadow: 0 12px 48px rgba(9,44,97,0.13); max-width: 440px; width: 100%; overflow: hidden; }
    .bar  { background: linear-gradient(90deg,#092C61,#7399C6); height: 4px; }
    .nav  { background: #0a1628; padding: 14px 28px; display: flex; align-items: center; gap: 8px; }
    .nav img { width: 20px; height: 20px; border-radius: 3px; }
    .nav span { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.6); letter-spacing: 0.07em; text-transform: uppercase; }
    .body { padding: 36px 32px 32px; text-align: center; }
    .icon { width: 56px; height: 56px; border-radius: 50%; background: #F0FDF4; border: 1.5px solid #A7F3D0; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 24px; }
    h1 { font-size: 22px; font-weight: 700; color: #0d1f38; margin-bottom: 10px; letter-spacing: -0.01em; }
    p  { font-size: 13px; color: #64748b; line-height: 1.65; }
    .email-chip { display: inline-block; background: #F1F5F9; border-radius: 8px; padding: 4px 12px; font-size: 12px; font-weight: 600; color: #475569; margin: 12px 0 20px; }
    .note { font-size: 11px; color: #94a3b8; margin-top: 20px; border-top: 1px solid #F1F5F9; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="bar"></div>
    <div class="nav">
      <img src="${GS_LOGO}" alt="GS">
      <span>Fund Dashboard</span>
    </div>
    <div class="body">
      <div class="icon">&#10003;</div>
      <h1>You've been unsubscribed</h1>
      <p>You will no longer receive price alert emails.</p>
      <div class="email-chip">${email}</div>
      <p>You can re-enable alerts at any time in<br><strong style="color:#092C61;">Account &rarr; Profile &rarr; Email Alerts</strong>.</p>
      <p class="note">GS Fund Dashboard &nbsp;&middot;&nbsp; Price alerts are for informational purposes only.</p>
    </div>
  </div>
</body>
</html>`;
}

// ─── routes ───────────────────────────────────────────────────────────────────

// GET /api/email/unsubscribe?email=xxx
router.get('/unsubscribe', (req, res) => {
  const email = (req.query.email || '').trim().toLowerCase();
  if (!email) return res.status(400).send('Missing email parameter.');
  unsubscribe(email);
  res.send(unsubscribePage(email));
});

// POST /api/email/send-alert
router.post('/send-alert', async (req, res) => {
  const { to, ticker, targetPrice, direction, currentPrice } = req.body;

  if (!to)     return res.status(400).json({ error: 'to is required' });
  if (!ticker) return res.status(400).json({ error: 'ticker is required' });
  if (!isConfigured()) return res.status(503).json({ error: 'Email not configured. Add SMTP_USER and SMTP_PASS to backend/.env', unconfigured: true });
  if (isUnsubscribed(to)) return res.json({ ok: true, skipped: 'unsubscribed' });

  try {
    const transporter = createTransporter();
    const from  = process.env.SMTP_FROM || process.env.SMTP_USER;
    const isAbove = direction === 'above';
    const tp    = Number(targetPrice);
    const cp    = currentPrice != null ? Number(currentPrice) : null;

    await transporter.sendMail({
      from,
      to,
      subject: `${isAbove ? '↑' : '↓'} ${ticker} alert triggered — $${cp != null ? cp.toFixed(2) : tp.toFixed(2)}`,
      html: alertHtml({ ticker, targetPrice: tp, direction, currentPrice: cp, to }),
      text: `Price alert triggered for ${ticker}.\nCurrent: $${cp ?? '—'} | Target: $${tp.toFixed(2)} (${direction})\n\nUnsubscribe: ${backendUrl()}/api/email/unsubscribe?email=${encodeURIComponent(to)}`,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('Email send-alert failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/email/test
router.post('/test', async (req, res) => {
  const { to } = req.body;
  if (!to) return res.status(400).json({ error: 'to is required' });
  if (!isConfigured()) return res.status(503).json({ error: 'Email not configured. Add SMTP_USER and SMTP_PASS to backend/.env', unconfigured: true });

  try {
    const transporter = createTransporter();
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;

    await transporter.sendMail({
      from,
      to,
      subject: 'GS Fund Dashboard — email alerts verified ✓',
      html: testHtml({ to }),
      text: `Your GS Fund Dashboard email alerts are configured correctly.\n\nUnsubscribe: ${backendUrl()}/api/email/unsubscribe?email=${encodeURIComponent(to)}`,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('Email test failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
