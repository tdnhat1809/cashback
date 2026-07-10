import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footerActions?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footerActions,
  size = 'md'
}) => {
  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-5xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className={`relative w-full bg-white rounded-3xl shadow-2xl border border-primary-fixed overflow-hidden flex flex-col pwa-entry ${sizes[size]} z-10 max-h-[90vh]`}>
        {/* Header */}
        <div className="px-6 py-5 border-b border-outline-variant/30 flex items-center justify-between bg-surface-container-low/50">
          <h3 className="font-title-lg text-lg font-bold text-on-surface">{title}</h3>
          <button 
            onClick={onClose}
            className="text-outline hover:text-on-surface p-1 rounded-full hover:bg-surface-container-high/50 transition-all cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 overflow-y-auto flex-1 text-left text-body-md text-on-surface-variant leading-relaxed">
          {children}
        </div>

        {/* Footer */}
        {footerActions && (
          <div className="px-6 py-4 border-t border-outline-variant/30 bg-surface-container-low/30 flex justify-end gap-3">
            {footerActions}
          </div>
        )}
      </div>
    </div>
  );
};
