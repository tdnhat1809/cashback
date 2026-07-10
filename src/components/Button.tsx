import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-label-md rounded-xl transition-all duration-200 active:scale-98 select-none focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:pointer-events-none cursor-pointer';
  
  const variants = {
    primary: 'bg-primary-container text-white hover:brightness-105 shadow-soft',
    secondary: 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest',
    outline: 'border border-outline/30 bg-transparent text-on-surface hover:bg-surface-container-low',
    ghost: 'bg-transparent text-primary hover:bg-surface-container-low',
    danger: 'bg-error text-white hover:brightness-110 shadow-soft',
    success: 'bg-tertiary text-white hover:brightness-110 shadow-soft',
    accent: 'bg-accent text-white hover:brightness-110 shadow-soft',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-lg',
    md: 'px-5 py-3 text-sm',
    lg: 'px-7 py-4 text-base rounded-2xl',
  };

  return (
    <button
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : icon && iconPosition === 'left' ? (
        <span className="mr-2 inline-flex">{icon}</span>
      ) : null}
      
      {children}
      
      {!loading && icon && iconPosition === 'right' ? (
        <span className="ml-2 inline-flex">{icon}</span>
      ) : null}
    </button>
  );
};
