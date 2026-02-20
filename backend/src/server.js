const express = require('express');
const cors = require('cors');
const fundsRouter = require('./routes/funds');

const app = express();
const PORT = 8080;

// Allow Vite dev server at localhost:3000
app.use(cors({ origin: 'http://localhost:3000' }));

app.use(express.json());
app.use('/api', fundsRouter);

app.listen(PORT, () => {
  console.log(`Mutual Fund Backend running on http://localhost:${PORT}`);
});
