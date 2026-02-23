# Mutual Fund Calculator – Backend

Node.js/Express REST API that calculates the estimated future value of a mutual fund investment using the Capital Asset Pricing Model (CAPM) with continuous compounding.

## How it works

When a calculation is requested, the backend makes two external API calls in sequence, then applies the CAPM formula.

```
  User Request
  (ticker, principal, years)
          │
          ▼
┌─────────────────────────┐
│  Step 1: Fetch Beta      │  betaService.js
│  Newton Analytics API    │  → beta (e.g. 0.2794)
│  12-month rolling β      │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  Step 2: Fetch Expected  │  historicalReturnService.js
│  Return — Yahoo Finance  │  → expectedReturnRate (e.g. 0.0555 = 5.55%)
│  Last year Jan 1–Dec 31  │    (lastClose - firstClose) / firstClose
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  Step 3: CAPM Rate       │  mutualFundService.js
│  r = rf + β(Rm - rf)     │  → capmRate (e.g. 0.0491)
│  rf = 4.25% (10yr T-bond)│
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  Step 4: Future Value    │  mutualFundService.js
│  FV = P * e^(r * t)      │  → futureValue (e.g. $16,288.04)
│  Continuous compounding  │
└────────────┬────────────┘
             │
             ▼
       JSON Response
```

### Step 1 — Fetch beta (Newton Analytics API)

Handled by: [`backend/src/services/betaService.js`](src/services/betaService.js)

Beta measures how much a fund moves relative to the S&P 500. A beta of 1.0 means the fund moves exactly with the market; below 1.0 means less volatile; above 1.0 means more volatile.

URL format:
```
GET https://api.newtonanalytics.com/stock-beta/?ticker={ticker}&index=^GSPC&interval=1mo&observations=12
```

Example (VFIAX):
```
GET https://api.newtonanalytics.com/stock-beta/?ticker=VFIAX&index=^GSPC&interval=1mo&observations=12
```

Parameters:
- `{ticker}` — fund ticker symbol, e.g. `VFIAX`
- `index=^GSPC` — S&P 500 as the benchmark (fixed per spec)
- `interval=1mo` — monthly price intervals (fixed per spec)
- `observations=12` — 12 months of data, 1 year rolling window (fixed per spec)

Paste the example URL directly into a browser to see the raw response.

Example response:
```json
{ "status": "200", "data": 0.2794 }
```

If the API returns a non-numeric value or is unreachable, the request fails with HTTP 502 or 503.

### Step 2 — Fetch expected return rate (Yahoo Finance API)

Handled by: [`backend/src/services/historicalReturnService.js`](src/services/historicalReturnService.js)

The expected return is the fund's actual annual return from last year, calculated from daily closing prices.

URL format:
```
GET https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?period1={Jan1LastYear}&period2={Jan1ThisYear}&interval=1d
```

Example (VFIAX, full year 2025):
```
GET https://query1.finance.yahoo.com/v8/finance/chart/VFIAX?period1=1735689600&period2=1767225600&interval=1d
```

Parameters:
- `{ticker}` — fund ticker symbol, e.g. `VFIAX`
- `period1=1735689600` — Jan 1 2025 00:00:00 UTC (Unix timestamp, inclusive lower bound)
- `period2=1767225600` — Jan 1 2026 00:00:00 UTC (Unix timestamp, exclusive upper bound — captures all of 2025)
- `interval=1d` — daily price data

Paste either URL directly into a browser to see the raw JSON response.

Null entries in the closing prices array (non-trading days like weekends and public holidays) are filtered out before computing the return.

Formula:
```
expectedReturnRate = (lastClose - firstClose) / firstClose
```

Example response snippet:
```json
{
  "chart": {
    "result": [{
      "indicators": {
        "quote": [{
          "close": [428.12, 429.50, null, 431.00, ..., 451.89]
        }]
      }
    }]
  }
}
```

The array contains every calendar day in the range — trading days have a price, non-trading days (weekends, public holidays) are `null`. After filtering nulls:

```
[428.12, 429.50, 431.00, ..., 451.89]
   ↑                              ↑
firstClose                    lastClose
(first trading day ~Jan 2)   (last trading day ~Dec 31)
```

Only the first and last values are used — everything in the middle is ignored:

```
returnRate = (451.89 - 428.12) / 428.12
           = 23.77 / 428.12
           = 0.0555  →  5.55% annual return
```

That 5.55% (`0.0555`) then feeds into the CAPM formula as the `expectedReturnRate`.

### Step 3 — CAPM rate

Handled by: [`backend/src/services/mutualFundService.js`](src/services/mutualFundService.js)

```
capmRate = riskFreeRate + beta * (expectedReturnRate - riskFreeRate)
```

Risk-free rate used: **4.25%** (US 10-year Treasury yield as of 2026-02-17, source: [FRED](https://fred.stlouisfed.org/series/DGS10))

### Step 4 — Future value (continuous compounding)

Handled by: [`backend/src/services/mutualFundService.js`](src/services/mutualFundService.js)

```
FV = principal * e^(capmRate * years)
```

---

## Prerequisites

- Node.js 18+
- npm

## Setup

```bash
cd backend
npm install
```

## Running

```bash
npm start
```

Runs at [http://localhost:8080](http://localhost:8080).

---

## API endpoints

### `GET /api/funds`
Returns the full list of supported mutual funds.

```bash
curl http://localhost:8080/api/funds
```

**Response:**
```json
[
  { "name": "Vanguard 500 Index Fund;Admiral", "ticker": "VFIAX" },
  ...
]
```

---

### `GET /api/mutual-funds`
Frontend-friendly alias. Returns funds as `[{ id, name }]` for dropdown selectors.

```bash
curl http://localhost:8080/api/mutual-funds
```

**Response:**
```json
[
  { "id": "VFIAX", "name": "Vanguard 500 Index Fund;Admiral (VFIAX)" },
  ...
]
```

---

### `GET /api/calculate`
Full CAPM calculation result.

**Query params:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `ticker` | string | yes | Fund ticker symbol |
| `principal` | number | yes | Initial investment amount (> 0) |
| `years` | integer | yes | Investment horizon in years (≥ 1) |

```bash
curl "http://localhost:8080/api/calculate?ticker=VFIAX&principal=10000&years=5"
```

**Response:**
```json
{
  "ticker": "VFIAX",
  "principal": 10000,
  "years": 5,
  "beta": 0.2794,
  "expectedReturnRate": 0.1667,
  "riskFreeRate": 0.0425,
  "capmRate": 0.0772,
  "futureValue": 14710.47
}
```

---

### `GET /api/future-value`
Frontend-compatible alias. Returns a smaller response subset.

**Query params:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `fundId` | string | yes | Fund ticker symbol |
| `amount` | number | yes | Initial investment amount (> 0) |
| `years` | integer | yes | Investment horizon in years (≥ 1) |

```bash
curl "http://localhost:8080/api/future-value?fundId=FCNTX&amount=5000&years=10"
```

**Response:**
```json
{
  "futureValue": 8126.08,
  "capmRate": 0.0486,
  "beta": 0.0570,
  "expectedReturnRate": 0.1489
}
```

---

## Testing — validation errors

The following requests should each return a `400` or `404` error:

```bash
# Missing ticker → 400 "ticker is required"
curl "http://localhost:8080/api/calculate?principal=10000&years=5"

# Unknown ticker → 404 "Ticker not found in supported fund list: FAKE"
curl "http://localhost:8080/api/calculate?ticker=FAKE&principal=10000&years=5"

# Negative principal → 400 "principal must be greater than 0"
curl "http://localhost:8080/api/calculate?ticker=VFIAX&principal=-500&years=5"

# Decimal years → 400 "years must be an integer of at least 1"
curl "http://localhost:8080/api/calculate?ticker=VFIAX&principal=10000&years=2.5"

# Missing fundId on /future-value → 400 "fundId is required"
curl "http://localhost:8080/api/future-value?amount=5000&years=10"
```

---

## Error responses

All endpoints return errors as `{ "error": "message" }` with the appropriate HTTP status code:

| Code | Meaning |
|------|---------|
| 400 | Missing or invalid query parameter |
| 404 | Ticker not in supported fund list |
| 500 | Unexpected server error (e.g. division by zero in price data) |
| 502 | Upstream API (Newton Analytics / Yahoo Finance) returned an unexpected response |
| 503 | Upstream API unreachable or timed out |

---

## Project structure

```
backend/
├── src/
│   ├── server.js                        # Express app entry point (port 8080)
│   ├── routes/
│   │   └── funds.js                     # All /api/* route handlers + input validation
│   └── services/
│       ├── mutualFundService.js          # Fund list, ticker validation, CAPM orchestration
│       ├── betaService.js               # Fetches beta from Newton Analytics API
│       └── historicalReturnService.js   # Fetches last year's return from Yahoo Finance
├── package.json
└── README.md
```

---

## Supported funds

12 equity and bond mutual funds sourced from [MarketWatch Top 25 Mutual Funds](https://www.marketwatch.com/tools/top-25-mutual-funds). Money market funds are excluded — CAPM is not applicable to them as their returns are largely risk-free and their beta is effectively zero.

| Ticker | Name |
|--------|------|
| VSMPX | Vanguard Total Stock Market Index Fund;Institutional Plus |
| FXAIX | Fidelity 500 Index Fund |
| VFIAX | Vanguard 500 Index Fund;Admiral |
| VTSAX | Vanguard Total Stock Market Index Fund;Admiral |
| VGTSX | Vanguard Total International Stock Index Fund;Investor |
| FCTDX | Fidelity Strategic Advisers Fidelity US Total Stk |
| VIIIX | Vanguard Institutional Index Fund;Inst Plus |
| VTBNX | Vanguard Total Bond Market II Index Fund;Institutional |
| AGTHX | American Funds Growth Fund of America;A |
| VTBIX | Vanguard Total Bond Market II Index Fund;Investor |
| FCNTX | Fidelity Contrafund |
| PIMIX | PIMCO Income Fund;Institutional |
