import React from 'react';

interface BadgeProps {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'shopee' | 'tiktok';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'info',
  children,
  className = ''
}) => {
  const baseStyles = 'inline-flex items-center px-3 py-1 rounded-full text-xs font-bold shadow-sm select-none w-fit';

  const variants = {
    primary: 'bg-primary-container text-white',
    secondary: 'bg-surface-container-high text-on-surface-variant',
    success: 'bg-tertiary-container/20 text-tertiary border border-tertiary/20',
    warning: 'bg-orange-500/10 text-orange-600 border border-orange-500/20',
    danger: 'bg-error-container/20 text-error border border-error/20',
    info: 'bg-blue-500/10 text-blue-600 border border-blue-500/20',
    shopee: 'bg-[#FF5722]/10 text-[#FF5722] border border-[#FF5722]/20',
    tiktok: 'bg-black text-white',
  };

  return (
    <span className={`${baseStyles} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};
