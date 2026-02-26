import { useState, useEffect } from 'react';
import Dropdown from './Dropdown';
import Input from './Input';
import MetricCard from './MetricCard';
import { fetchMutualFunds, fetchFutureValue } from '../api/mutualFundApi';
import GrowthChart from './GrowthChart';


export default function Calculator() {
  const [funds, setFunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedFund, setSelectedFund] = useState('');
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [years, setYears] = useState('');

  const [futureValue, setFutureValue] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [calcError, setCalcError] = useState(null);

  useEffect(() => {
    fetchMutualFunds()
      .then(setFunds)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleCalculate = async (e) => {
    e.preventDefault();
    setCalcError(null);
    setFutureValue(null);

    const amount = parseFloat(investmentAmount);
    const yearsNum = parseFloat(years);

    if (!selectedFund || !amount || !yearsNum || amount <= 0 || yearsNum <= 0) {
      setCalcError('Please fill in all fields with valid values.');
      return;
    }

    setCalculating(true);
    try {
      const result = await fetchFutureValue(selectedFund, amount, yearsNum);
      setFutureValue(result);
    } catch (err) {
      setCalcError(err.message);
    } finally {
      setCalculating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-pulse text-slate-500">Loading mutual funds...</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <form onSubmit={handleCalculate} className="space-y-6">
        <Dropdown
          id="mutual-fund"
          label="Mutual Fund"
          options={funds}
          value={selectedFund}
          onChange={setSelectedFund}
          placeholder="Choose a mutual fund"
          error={error}
        />

        <Input
          id="investment-amount"
          label="Initial Investment ($)"
          type="number"
          value={investmentAmount}
          onChange={setInvestmentAmount}
          placeholder="e.g. 10000"
          min={1}
          step={0.01}
        />

        <Input
          id="years"
          label="Time Horizon (years)"
          type="number"
          value={years}
          onChange={setYears}
          placeholder="e.g. 5"
          min={1}
          max={50}
          step={1}
        />

        <button
          type="submit"
          disabled={calculating || !funds.length}
          className="
            w-full py-3 px-6 rounded-lg font-semibold
            bg-emerald-600 text-white
            hover:bg-emerald-700 active:bg-emerald-800
            focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2
            disabled:bg-slate-300 disabled:cursor-not-allowed
            transition-colors
          "
        >
          {calculating ? 'Calculating...' : 'Calculate Future Value'}
        </button>

        {calcError && (
          <div className="p-4 rounded-lg bg-red-50 text-red-700 text-sm">
            {calcError}
          </div>
        )}

        {futureValue && (
          <div className="space-y-6">
            {/* Main Result */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-50 to-white border border-emerald-200 shadow-sm">
              <p className="text-sm font-medium text-emerald-700 mb-1">
                Estimated Future Value
              </p>
              <p className="text-3xl font-bold text-emerald-900">
                $
                {futureValue.futureValue.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>

            {/* Historical Growth Chart */}
            <GrowthChart
              principal={parseFloat(investmentAmount)}
              capmRate={futureValue.capmRate}
              years={parseInt(years, 10)}
            />

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
              <MetricCard label="Beta" value={futureValue.beta?.toFixed(4)} />
              <MetricCard
                label="Expected Return"
                value={`${(futureValue.expectedReturnRate * 100).toFixed(2)}%`}
              />
              <MetricCard
                label="Risk-Free Rate"
                value={`${(0.0425 * 100).toFixed(2)}%`}
              />
              <MetricCard
                label="CAPM Rate"
                value={`${(futureValue.capmRate * 100).toFixed(2)}%`}
              />
            </div>

            {/* Formula Section */}
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700">
              <p className="font-semibold mb-2">Model Used</p>
              <p>r = rf + β (Rm − rf)</p>
              <p>FV = P · e^(r · t)</p>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
