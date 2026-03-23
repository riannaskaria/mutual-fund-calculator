require('dotenv').config({ quiet: true });
const express = require('express');
const cors = require('cors');
const fundsRouter = require('./routes/funds');
const botRouter = require('./routes/bot');
const discoveryRouter = require('./routes/discovery');
const { initializeFundDiscoveryRefresh } = require('./services/fundDiscoveryService');

const app = express();
const PORT = 8080;

// Allow Vite dev server at localhost:3000
app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:3001'] }));

app.use(express.json({ limit: '2mb' }));
app.use('/api', fundsRouter);
app.use('/api/bot', botRouter);
app.use('/api/discovery', discoveryRouter);

app.listen(PORT, () => {
  console.log(`Mutual Fund Backend running on http://localhost:${PORT}`);
  initializeFundDiscoveryRefresh().catch((err) => {
    console.warn(`Fund discovery init failed: ${err.message}`);
  });
});
