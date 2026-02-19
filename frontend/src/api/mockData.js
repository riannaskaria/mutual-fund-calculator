/**
 * Mock data for frontend development when backend is not running.
 * Set VITE_USE_MOCK=true in .env to use this.
 */
export const mockMutualFunds = [
  { id: '1', name: 'Vanguard 500 Index Fund (VFIAX)' },
  { id: '2', name: 'Fidelity Contrafund (FCNTX)' },
  { id: '3', name: 'American Funds Growth Fund (AGTHX)' },
  { id: '4', name: 'T. Rowe Price Blue Chip Growth (TRBCX)' },
  { id: '5', name: 'Dodge & Cox Stock Fund (DODGX)' },
];

export function mockFutureValue(amount, years) {
  const rate = 0.07;
  const futureValue = amount * Math.pow(1 + rate, years);
  return { futureValue, rate };
}
