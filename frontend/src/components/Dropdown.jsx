import { forwardRef } from 'react';

const Dropdown = forwardRef(function Dropdown(
  { label, options = [], value, onChange, placeholder = 'Select...', error, disabled, id },
  ref
) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={id}
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        className={`
          w-full rounded-lg border px-4 py-3 text-slate-900
          bg-white shadow-sm transition-colors
          focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500
          disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed
          ${error ? 'border-red-400' : 'border-slate-300'}
        `}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt.id ?? opt.value ?? opt} value={opt.id ?? opt.value ?? opt}>
            {opt.name ?? opt.label ?? opt}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
});

export default Dropdown;
