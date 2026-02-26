import { useState, useEffect } from 'react';
import Dropdown from './Dropdown';
import Input from './Input';
import { fetchMutualFunds, fetchFutureValue } from '../api/mutualFundApi';

function formatCurrency(num) {
  if (num === '' || num == null || isNaN(num)) return '';
  const n = Number(num);
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0, minimumFractionDigits: 0 });
}

function parseCurrency(str) {
  if (str == null || str === '') return '';
  const parsed = parseInt(String(str).replace(/\D/g, ''), 10);
  return isNaN(parsed) ? '' : parsed;
}

export default function Calculator() {
  const [funds, setFunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedFund, setSelectedFund] = useState('');
  const [investmentAmount, setInvestmentAmount] = useState(1000);
  const [futureContributions, setFutureContributions] = useState(5000);
  const [years, setYears] = useState(30);
  const [rateOfReturn, setRateOfReturn] = useState(6);
  const [expenseRatio, setExpenseRatio] = useState(0.25);

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

    const amount = Number(investmentAmount);
    const yearsNum = Number(years);
    const rate = Number(rateOfReturn);
    const ratio = Number(expenseRatio);

    if (
      !selectedFund ||
      !amount || amount <= 0 ||
      yearsNum <= 0 ||
      (futureContributions !== '' && Number(futureContributions) < 0) ||
      (rate != null && !isNaN(rate) && rate < 0) ||
      (ratio != null && !isNaN(ratio) && ratio < 0)
    ) {
      setCalcError('Please fill in all required fields with valid values.');
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
    <div className="w-full max-w-2xl mx-auto">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Input
            id="investment-amount"
            label="Initial investment amount"
            required
            prefix="$"
            type="text"
            inputMode="decimal"
            value={formatCurrency(investmentAmount)}
            onChange={(v) => setInvestmentAmount(parseCurrency(v) ?? 0)}
            placeholder="0"
          />

          <Input
            id="future-contributions"
            label="Future planned contributions (per year)"
            required
            prefix="$"
            type="text"
            inputMode="decimal"
            value={formatCurrency(futureContributions)}
            onChange={(v) => setFutureContributions(parseCurrency(v) ?? 0)}
            placeholder="0"
          />

          <Input
            id="years"
            label="Time horizon (years)"
            required
            type="number"
            value={years}
            onChange={setYears}
            placeholder="e.g. 30"
            min={1}
            max={50}
            step={1}
          />

          <Input
            id="rate-of-return"
            label="Rate of return (%)"
            required
            type="number"
            value={rateOfReturn}
            onChange={setRateOfReturn}
            placeholder="e.g. 6"
            min={0}
            step={0.01}
          />
        </div>

        <Input
          id="expense-ratio"
          label="Fund expense ratio (%)"
          required
          type="number"
          value={expenseRatio}
          onChange={setExpenseRatio}
          placeholder="e.g. 0.25"
          min={0}
          step={0.01}
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
          <div className="p-6 rounded-xl bg-emerald-50 border border-emerald-200">
            <p className="text-sm font-medium text-emerald-800 mb-1">Estimated Future Value</p>
            <p className="text-2xl font-bold text-emerald-900">
              $
              {(futureValue.futureValue ?? futureValue.value ?? futureValue).toLocaleString(
                'en-US',
                { minimumFractionDigits: 2, maximumFractionDigits: 2 }
              )}
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
