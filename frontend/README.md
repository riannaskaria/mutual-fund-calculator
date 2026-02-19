# Mutual Fund Calculator – Frontend

React + Vite + Tailwind CSS frontend for the Mutual Fund Calculator.

## Prerequisites

- Node.js 18+
- npm or yarn

## Setup

```bash
cd frontend
npm install
```

## Development

```bash
npm run dev
```

Runs at [http://localhost:3000](http://localhost:3000). The Vite dev server proxies `/api` requests to `http://localhost:8080` (adjust in `vite.config.js` if your Java backend uses a different port).

### Mock mode (no backend)

Create a `.env` file with:

```
VITE_USE_MOCK=true
```

This loads sample mutual funds and simulates the future value calculation so you can develop and test the UI without the Java backend.

## Build

```bash
npm run build
```

Output is in `dist/`. Serve with any static host or your Java app.

## Backend API contract

The frontend expects these endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/mutual-funds` | Returns `[{ id, name }, ...]` |
| GET | `/api/future-value?fundId=&amount=&years=` | Returns `{ futureValue }` or `{ value }` |

## Project structure

```
frontend/
├── src/
│   ├── api/
│   │   ├── mutualFundApi.js   # API client
│   │   └── mockData.js        # Dev mock data
│   ├── components/
│   │   ├── Calculator.jsx     # Main form & result
│   │   ├── Dropdown.jsx       # Mutual fund selector
│   │   └── Input.jsx          # Text/number inputs
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```
