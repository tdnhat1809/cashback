import React from 'react';

interface Option {
  value: string;
  label: string;
}

interface DropdownProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: Option[];
  error?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  label,
  options,
  error,
  className = '',
  id,
  ...props
}) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`w-full flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={selectId} className="font-label-md text-on-surface font-semibold text-left">
          {label}
        </label>
      )}
      <div className="relative w-full">
        <select
          id={selectId}
          className={`
            w-full py-4 px-4 rounded-xl text-body-md font-body-md bg-surface-container-low border border-transparent
            appearance-none outline-none transition-all duration-200
            focus:bg-white focus:border-primary/30 focus:ring-2 focus:ring-primary/20
            disabled:opacity-50 disabled:bg-surface-container-low disabled:cursor-not-allowed cursor-pointer
            ${error ? 'border-error/50 focus:border-error focus:ring-error/20 bg-error-container/20' : ''}
          `}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        
        {/* Custom Chevron Indicator */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center text-outline pointer-events-none">
          <span className="material-symbols-outlined">expand_more</span>
        </div>
      </div>
      
      {error && (
        <p className="text-xs text-error font-medium text-left flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">error</span>
          {error}
        </p>
      )}
    </div>
  );
};
