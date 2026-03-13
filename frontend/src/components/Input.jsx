import { forwardRef } from 'react';

const Input = forwardRef(function Input(
  { label, type = 'text', value, onChange, placeholder, error, disabled, id, min, max, step },
  ref
) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        className={`
          w-full rounded-lg border px-4 py-3 text-slate-900
          bg-white shadow-sm transition-colors
          focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500
          disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed
          placeholder:text-slate-400
          ${error ? 'border-red-400' : 'border-slate-300'}
        `}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
});

export default Input;
