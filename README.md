# Mutual Fund Calculator

Full-stack web app to estimate potential returns on mutual fund investments using the Capital Asset Pricing Model (CAPM) with continuous compounding.

Built with Node.js/Express (backend) and React + Vite + Tailwind CSS (frontend).

## Project structure

```
mutual-fund-calculator/
├── backend/    – Node.js/Express REST API (port 8080)
├── frontend/   – React + Vite + Tailwind CSS UI (port 3000)
```

- **backend/** – See [backend/README.md](backend/README.md) for setup, API reference, and how the CAPM calculation works
- **frontend/** – See [frontend/README.md](frontend/README.md) for setup and development

## Quick start

**1. Start the backend:**
```bash
cd backend
npm install
npm start
```

**2. Start the frontend** (in a separate terminal):
```bash
cd frontend
npm install
npm run dev
```

Frontend runs at [http://localhost:3000](http://localhost:3000) and connects to the backend at [http://localhost:8080](http://localhost:8080).
