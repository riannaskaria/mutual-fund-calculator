// Base URL for all backend API and proxy calls.
// In development (Vite), this is empty so relative paths go through the Vite proxy.
// In production (separate frontend deployment), set VITE_API_BASE to the backend URL,
// e.g. https://your-app.onrender.com
const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');
export default API_BASE;
