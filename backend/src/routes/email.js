// Email alert delivery
// POST /api/email/send-alert  { to, ticker, targetPrice, direction, currentPrice }
// POST /api/email/test        { to }
//
// Required .env variables:
//   SMTP_HOST  (default: smtp.gmail.com)
//   SMTP_PORT  (default: 587)
//   SMTP_USER  your sending address
//   SMTP_PASS  Gmail app password or SMTP password
//   SMTP_FROM  (optional, falls back to SMTP_USER)

const express    = require('express');
const router     = express.Router();
const nodemailer = require('nodemailer');

function createTransporter() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function isConfigured() {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

function alertHtml({ ticker, targetPrice, direction, currentPrice }) {
  const arrow   = direction === 'above' ? '↑' : '↓';
  const label   = direction === 'above' ? 'risen above' : 'fallen below';
  const color   = direction === 'above' ? '#10B981' : '#EF4444';
  const accentBg = '#0a1628';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr><td style="background:${accentBg};padding:28px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <div style="font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px">Fund Dashboard</div>
                <div style="font-size:20px;font-weight:700;color:#fff;letter-spacing:-0.02em">Price Alert Triggered</div>
              </td>
              <td align="right">
                <div style="width:44px;height:44px;background:rgba(255,255,255,0.08);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:22px;">${arrow}</div>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px;">
          <p style="margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.6;">
            Your price alert for <strong style="color:#0a1628">${ticker}</strong> has triggered.
            The price has <strong style="color:${color}">${label} your target of $${targetPrice.toFixed(2)}</strong>.
          </p>

          <!-- Price card -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:28px;">
            <tr>
              <td style="padding:20px 24px;border-right:1px solid #e2e8f0;text-align:center;">
                <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:6px">Current Price</div>
                <div style="font-size:26px;font-weight:700;color:${color}">$${currentPrice != null ? currentPrice.toFixed(2) : '—'}</div>
              </td>
              <td style="padding:20px 24px;text-align:center;">
                <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:6px">Target Price</div>
                <div style="font-size:26px;font-weight:700;color:#0a1628">$${targetPrice.toFixed(2)}</div>
              </td>
            </tr>
          </table>

          <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
            This alert has been marked as triggered and will no longer fire. You can manage your alerts in the Fund Dashboard.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center;">Fund Dashboard &nbsp;·&nbsp; Price alerts are for informational purposes only and do not constitute financial advice.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// POST /api/email/send-alert
router.post('/send-alert', async (req, res) => {
  const { to, ticker, targetPrice, direction, currentPrice } = req.body;

  if (!to)     return res.status(400).json({ error: 'to is required' });
  if (!ticker) return res.status(400).json({ error: 'ticker is required' });
  if (!isConfigured()) return res.status(503).json({ error: 'Email not configured. Add SMTP_USER and SMTP_PASS to backend/.env' });

  try {
    const transporter = createTransporter();
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    const arrow = direction === 'above' ? '↑' : '↓';

    await transporter.sendMail({
      from:    `"Fund Dashboard" <${from}>`,
      to,
      subject: `${arrow} ${ticker} alert — $${currentPrice != null ? Number(currentPrice).toFixed(2) : targetPrice.toFixed(2)}`,
      html:    alertHtml({ ticker, targetPrice: Number(targetPrice), direction, currentPrice: currentPrice != null ? Number(currentPrice) : null }),
      text:    `Price alert triggered for ${ticker}. Current: $${currentPrice ?? '—'} | Target: $${targetPrice} (${direction})`,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('Email send-alert failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/email/test — sends a test email to verify SMTP config
router.post('/test', async (req, res) => {
  const { to } = req.body;
  if (!to) return res.status(400).json({ error: 'to is required' });
  if (!isConfigured()) return res.status(503).json({ error: 'Email not configured. Add SMTP_USER and SMTP_PASS to backend/.env' });

  try {
    const transporter = createTransporter();
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;

    await transporter.sendMail({
      from: `"Fund Dashboard" <${from}>`,
      to,
      subject: 'Fund Dashboard — email alerts are working ✓',
      html: alertHtml({ ticker: 'VFIAX', targetPrice: 500.00, direction: 'above', currentPrice: 502.34 }),
      text: 'Test email from Fund Dashboard. Your email alerts are configured correctly.',
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('Email test failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
