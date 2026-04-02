// Base URL for all backend API and proxy calls.
// In development (Vite), this is empty so relative paths go through the Vite proxy.
// In production (separate frontend deployment), set VITE_API_BASE to the backend URL,
// e.g. https://your-app.onrender.com
const explicitBase = (import.meta.env.VITE_API_BASE || '').trim();
const isBrowser = typeof window !== 'undefined';
const isLocalHost = isBrowser && ['localhost', '127.0.0.1'].includes(window.location.hostname);

// Vite proxy only works in `npm run dev`; preview/static serving needs a real backend URL.
const fallbackBase = import.meta.env.DEV ? '' : (isLocalHost ? 'http://localhost:8080' : '');
const API_BASE = (explicitBase || fallbackBase).replace(/\/$/, '');
export default API_BASE;
