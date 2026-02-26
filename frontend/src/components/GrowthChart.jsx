import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
  } from 'recharts';

  function buildChartData(principal, capmRate, years) {
    const data = [];
    for (let y = 0; y <= years; y++) {
      data.push({
        year: y,
        value: parseFloat((principal * Math.exp(capmRate * y)).toFixed(2)),
      });
    }
    return data;
  }

  function formatCurrency(value) {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-sm">
          <p className="font-semibold text-slate-700 mb-1">Year {label}</p>
          <p className="text-emerald-700 font-bold text-base">
            ${payload[0].value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      );
    }
    return null;
  };

  export default function GrowthChart({ principal, capmRate, years }) {
    const data = buildChartData(principal, capmRate, years);

    return (
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <p className="text-sm font-semibold text-slate-700 mb-4">Projected Growth</p>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickFormatter={(v) => `Yr ${v}`}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickFormatter={formatCurrency}
              axisLine={false}
              tickLine={false}
              width={56}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={principal}
              stroke="#94a3b8"
              strokeDasharray="4 4"
              label={{ value: 'Principal', position: 'insideTopLeft', fontSize: 11, fill: '#94a3b8' }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#059669"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: '#059669', strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }