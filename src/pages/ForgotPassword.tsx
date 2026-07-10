import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, User, HelpCircle, LogIn, PiggyBank } from 'lucide-react';
import { Button } from '../components/Button';
import { ToastContainer } from '../components/Toast';
import { defaultToastState, triggerToast } from '../components/toast-state';
import type { ToastState } from '../components/toast-state';

export const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(defaultToastState);
  const [errorBorder, setErrorBorder] = useState(false);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setErrorBorder(true);
      triggerToast(setToast, 'Vui lòng nhập Email hoặc Số điện thoại.', 'error');
      return;
    }

    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      triggerToast(
        setToast, 
        `Mã xác thực OTP đã được gửi thành công đến: ${identifier.trim()}`, 
        'success'
      );
      
      // Navigate to reset password page after 2 seconds
      setTimeout(() => {
        navigate('/reset-password');
      }, 2000);
    }, 2000);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIdentifier(e.target.value);
    if (errorBorder) {
      setErrorBorder(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-8 relative overflow-hidden text-on-surface">
      {/* Decorative Blur Circles */}
      <div className="fixed -bottom-16 -right-16 w-64 h-64 bg-primary-container/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -top-16 -left-16 w-48 h-48 bg-tertiary-container/5 rounded-full blur-3xl pointer-events-none" />

      {/* Screen Wrapper */}
      <div className="w-full max-w-[400px] bg-white rounded-3xl border border-outline-variant/30 shadow-soft p-6 flex flex-col relative z-10">
        
        {/* Header */}
        <header className="flex items-center mb-8">
          <button 
            onClick={() => navigate(-1)} 
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors"
            aria-label="Quay lại"
          >
            <ArrowLeft className="text-on-surface-variant" size={20} />
          </button>
          <div className="flex-grow text-center pr-10">
            <h1 className="text-sm font-black uppercase text-primary tracking-wider">Hoàn Tiền VIP</h1>
          </div>
        </header>

        {/* Hero Section */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-20 h-20 mb-5 rounded-[24px] bg-primary-container flex items-center justify-center shadow-md transform rotate-3 text-white">
            <PiggyBank size={40} />
          </div>
          <h2 className="font-headline-md text-xl font-bold text-on-surface mb-2">Quên mật khẩu?</h2>
          <p className="font-body-md text-xs text-on-surface-variant max-w-[280px]">
            Nhập số điện thoại hoặc email đã đăng ký của bạn để nhận mã xác minh đặt lại mật khẩu.
          </p>
        </div>

        {/* Form Input Section */}
        <form onSubmit={handleVerify} className="space-y-6 flex-grow">
          <div className="space-y-1 text-left">
            <label className="font-label-md text-xs font-bold text-on-surface-variant ml-1" htmlFor="identifier">
              Email hoặc Số điện thoại
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User size={18} className="text-on-surface-variant group-focus-within:text-primary transition-colors" />
              </div>
              <input 
                id="identifier"
                name="identifier"
                type="text"
                placeholder="example@email.com"
                value={identifier}
                onChange={handleInputChange}
                disabled={loading}
                className={`block w-full pl-11 pr-4 py-3.5 bg-surface-container-low/40 rounded-xl font-body-md text-sm outline-none border-2 focus:ring-0 focus:border-primary transition-all placeholder:text-on-surface-variant/40
                  ${errorBorder ? 'border-error' : 'border-outline-variant/50'}
                `}
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full py-4 font-bold shadow-md h-[52px]"
            loading={loading}
            icon={<ArrowRight size={16} />}
          >
            Gửi mã xác thực
          </Button>

          <div className="text-center pt-2">
            <p className="font-body-md text-xs text-on-surface-variant flex items-center justify-center gap-1">
              Bạn cần hỗ trợ? 
              <Link to="/faq" className="text-primary font-bold hover:underline flex items-center gap-0.5">
                <HelpCircle size={14} /> Liên hệ CSKH
              </Link>
            </p>
          </div>
        </form>

        {/* Bottom Link */}
        <footer className="mt-8 pt-4 border-t border-outline-variant/20 text-center">
          <Link 
            to="/login"
            className="inline-flex items-center gap-1.5 font-label-md text-xs font-bold text-on-surface-variant hover:text-primary transition-colors py-2 px-4 rounded-full hover:bg-surface-container"
          >
            <LogIn size={16} />
            <span>Quay lại đăng nhập</span>
          </Link>
        </footer>

      </div>

      <ToastContainer toast={toast} setToast={setToast} />
    </div>
  );
};
