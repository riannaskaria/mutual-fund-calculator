import { forwardRef } from 'react';

const Input = forwardRef(function Input(
  { label, type = 'text', value, onChange, placeholder, error, disabled, id, min, max, step, required: showRequired, prefix, inputMode, ...rest },
  ref
) {
  const inputClassName = `
    w-full rounded-lg border px-4 py-3 text-slate-900
    bg-white shadow-sm transition-colors
    focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500
    disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed
    placeholder:text-slate-400
    ${error ? 'border-red-400' : 'border-slate-300'}
    ${prefix ? 'rounded-none border-0 focus:ring-0' : ''}
  `;

  const input = (
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
      inputMode={inputMode}
      className={inputClassName}
      {...rest}
    />
  );

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
          {label}
          {showRequired && <span className="font-normal text-slate-400"> (required)</span>}
        </label>
      )}
      {prefix ? (
        <div className={`flex rounded-lg border bg-white shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 ${error ? 'border-red-400' : 'border-slate-300'}`}>
          <span className="flex items-center px-4 py-3 bg-slate-50 text-slate-600 border-r border-slate-200 text-sm">
            {prefix}
          </span>
          {input}
        </div>
      ) : (
        input
      )}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
});

export default Input;
