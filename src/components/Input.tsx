import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  helperText,
  error,
  startIcon,
  endIcon,
  className = '',
  id,
  type = 'text',
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`w-full flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={inputId} className="font-label-md text-on-surface font-semibold text-left">
          {label}
        </label>
      )}
      
      <div className="relative w-full">
        {startIcon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center text-outline pointer-events-none">
            {startIcon}
          </div>
        )}
        
        <input
          id={inputId}
          type={type}
          className={`
            w-full py-4 px-4 rounded-xl text-body-md font-body-md bg-surface-container-low border border-transparent
            transition-all duration-200 outline-none
            focus:bg-white focus:border-primary/30 focus:ring-2 focus:ring-primary/20
            disabled:opacity-50 disabled:bg-surface-container-low disabled:cursor-not-allowed
            ${startIcon ? 'pl-12' : ''}
            ${endIcon ? 'pr-12' : ''}
            ${error ? 'border-error/50 focus:border-error focus:ring-error/20 bg-error-container/20' : ''}
          `}
          {...props}
        />
        
        {endIcon && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center text-outline">
            {endIcon}
          </div>
        )}
      </div>

      {error ? (
        <p className="text-xs text-error font-medium text-left flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">error</span>
          {error}
        </p>
      ) : helperText ? (
        <p className="text-xs text-on-surface-variant/80 text-left">
          {helperText}
        </p>
      ) : null}
    </div>
  );
};
