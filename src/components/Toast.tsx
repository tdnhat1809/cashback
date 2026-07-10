import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import type { ToastState, ToastType } from './toast-state';

interface ToastProps {
  message: string;
  type?: ToastType;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  onClose,
  duration = 3000
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const icons = {
    success: <CheckCircle2 className="text-tertiary" size={20} />,
    error: <AlertCircle className="text-error" size={20} />,
    warning: <AlertTriangle className="text-orange-500" size={20} />,
    info: <Info className="text-blue-500" size={20} />,
  };

  const bgColors = {
    success: 'bg-white border-tertiary-container/30 shadow-[0_8px_30px_rgb(0,0,0,0.06)]',
    error: 'bg-white border-error-container/30 shadow-[0_8px_30px_rgb(0,0,0,0.06)]',
    warning: 'bg-white border-orange-200/30 shadow-[0_8px_30px_rgb(0,0,0,0.06)]',
    info: 'bg-white border-blue-200/30 shadow-[0_8px_30px_rgb(0,0,0,0.06)]',
  };

  return (
    <div role="status" aria-live="polite" className={`fixed bottom-6 right-6 z-[99] flex items-center gap-3 p-4 rounded-2xl border min-w-80 max-w-md pwa-entry ${bgColors[type]}`}>
      <div className="flex-shrink-0">{icons[type]}</div>
      <div className="flex-1 text-sm font-label-md text-on-surface text-left">
        {message}
      </div>
      <button 
        onClick={onClose}
        aria-label="Đóng thông báo"
        className="text-outline hover:text-on-surface p-1 rounded-full hover:bg-surface-container-low transition-colors cursor-pointer"
      >
        <X size={16} />
      </button>
    </div>
  );
};
export const ToastContainer: React.FC<{ toast: ToastState; setToast: React.Dispatch<React.SetStateAction<ToastState>> }> = ({ toast, setToast }) => {
  if (!toast.show) return null;
  return (
    <Toast 
      message={toast.message} 
      type={toast.type} 
      onClose={() => setToast(prev => ({ ...prev, show: false }))} 
    />
  );
};
