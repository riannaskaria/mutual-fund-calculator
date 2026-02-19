/**
 * API service for Mutual Fund Calculator backend.
 * Update baseURL to match your Java backend (default: /api when using Vite proxy).
 * Set VITE_USE_MOCK=true to use mock data when backend is not available.
 */
import { mockMutualFunds, mockFutureValue } from './mockData';

const baseURL = import.meta.env.VITE_API_URL || '/api';
const useMock = import.meta.env.VITE_USE_MOCK === 'true';

async function handleResponse(response) {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }
  return response.json();
}

/**
 * GET list of mutual funds
 * Expected backend: GET /api/mutual-funds
 */
export async function fetchMutualFunds() {
  if (useMock) return mockMutualFunds;
  const response = await fetch(`${baseURL}/mutual-funds`);
  return handleResponse(response);
}

/**
 * GET future value of investment
 * Expected backend: GET /api/future-value?fundId=...&amount=...&years=...
 * @param {string} fundId - Mutual fund identifier
 * @param {number} amount - Initial investment amount
 * @param {number} years - Investment time horizon in years
 */
export async function fetchFutureValue(fundId, amount, years) {
  if (useMock) {
    const result = mockFutureValue(amount, years);
    return new Promise((r) => setTimeout(() => r(result), 500));
  }
  const params = new URLSearchParams({ fundId, amount: String(amount), years: String(years) });
  const response = await fetch(`${baseURL}/future-value?${params}`);
  return handleResponse(response);
}
