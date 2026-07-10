import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { Button } from '../components/Button';
import { ToastContainer } from '../components/Toast';
import { defaultToastState, triggerToast } from '../components/toast-state';
import type { ToastState } from '../components/toast-state';

export const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [logoutEverywhere, setLogoutEverywhere] = useState(true);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [toast, setToast] = useState<ToastState>(defaultToastState);
  const [shakeError, setShakeError] = useState(false);

  const getStrengthLevel = (val: string) => {
    if (val.length === 0) return { label: 'Độ mạnh mật khẩu', width: 'w-0', color: 'bg-outline-variant', textClass: 'text-on-surface-variant' };
    if (val.length < 6) return { label: 'Yếu', width: 'w-1/3', color: 'bg-error', textClass: 'text-error font-bold' };
    if (val.length < 10) return { label: 'Trung bình', width: 'w-2/3', color: 'bg-amber-500', textClass: 'text-amber-600 font-bold' };
    return { label: 'Mạnh', width: 'w-full', color: 'bg-tertiary', textClass: 'text-tertiary font-bold' };
  };

  const strength = getStrengthLevel(newPassword);

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setShakeError(true);
      setTimeout(() => setShakeError(false), 500);
      triggerToast(setToast, 'Vui lòng điền đầy đủ thông tin mật khẩu.', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      setShakeError(true);
      setTimeout(() => setShakeError(false), 500);
      triggerToast(setToast, 'Mật khẩu xác nhận không khớp.', 'error');
      return;
    }

    setLoading(true);
    // Simulate API update
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
    }, 1500);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-8 relative overflow-hidden text-on-surface">
      {/* Decorative Blur Circles */}
      <div className="fixed -bottom-16 -right-16 w-64 h-64 bg-primary-container/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -top-16 -left-16 w-48 h-48 bg-tertiary-container/5 rounded-full blur-3xl pointer-events-none" />

      {/* Screen Wrapper */}
      <div className="w-full max-w-[400px] bg-white rounded-3xl border border-outline-variant/30 shadow-soft p-6 flex flex-col relative z-10">
        
        {/* Header */}
        <header className="flex items-center gap-3 mb-6">
          <button 
            onClick={() => navigate(-1)} 
            className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container hover:bg-surface-container-high transition-colors"
            aria-label="Quay lại"
          >
            <ArrowLeft className="text-primary" size={20} />
          </button>
          <h1 className="font-headline-md text-lg font-bold text-on-surface">Đặt lại mật khẩu</h1>
        </header>

        {/* Hero Section */}
        <div className="mb-6 relative overflow-hidden">
          <div className="h-28 w-full rounded-2xl bg-gradient-to-br from-primary-container/10 to-secondary-container/20 flex items-center justify-center relative overflow-hidden">
            <span className="text-primary text-4xl transform"><Lock size={36} /></span>
          </div>
        </div>

        {/* Content Description */}
        <p className="font-body-md text-xs text-on-surface-variant mb-6 text-left leading-relaxed">
          Vui lòng nhập mật khẩu mới và xác nhận để tiếp tục bảo mật tài khoản của bạn.
        </p>

        {/* Form */}
        <form 
          onSubmit={handleUpdate} 
          className={`space-y-5 flex-grow text-left
            ${shakeError ? 'animate-shake' : ''}
          `}
        >
          {/* New Password */}
          <div className="space-y-1">
            <label className="font-label-md text-xs font-bold text-on-surface-variant ml-1" htmlFor="newPassword">
              Mật khẩu mới
            </label>
            <div className="relative group">
              <input 
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                placeholder="Nhập mật khẩu mới"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                className="block w-full px-4 pr-12 py-3.5 bg-surface-container-low/40 border border-outline-variant/50 rounded-xl font-body-md text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
              <button 
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-4 top-3.5 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                aria-label={showNewPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            
            {/* Strength Indicator */}
            <div className="pt-2 px-1">
              <div className="w-full bg-surface-container rounded-full h-1 overflow-hidden mb-1">
                <div className={`h-full transition-all duration-300 ${strength.color} ${strength.width}`} />
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-on-surface-variant font-semibold">Độ mạnh mật khẩu</span>
                <span className={strength.textClass}>{strength.label}</span>
              </div>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1">
            <label className="font-label-md text-xs font-bold text-on-surface-variant ml-1" htmlFor="confirmPassword">
              Xác nhận mật khẩu
            </label>
            <div className="relative">
              <input 
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Nhập lại mật khẩu mới"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                className="block w-full px-4 pr-12 py-3.5 bg-surface-container-low/40 border border-outline-variant/50 rounded-xl font-body-md text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
              <button 
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-3.5 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Logout Everywhere */}
          <label className="flex items-start gap-3 p-4 rounded-2xl bg-surface-container-low cursor-pointer hover:bg-surface-container transition-colors select-none">
            <div className="pt-0.5">
              <input 
                type="checkbox"
                checked={logoutEverywhere}
                onChange={(e) => setLogoutEverywhere(e.target.checked)}
                className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer"
              />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-on-surface">Đăng xuất khỏi mọi thiết bị</span>
              <span className="text-[10px] text-on-surface-variant leading-normal mt-0.5">
                Đảm bảo an toàn tuyệt đối bằng cách đăng xuất khỏi các phiên đăng nhập khác.
              </span>
            </div>
          </label>

          <Button
            type="submit"
            variant="primary"
            className="w-full py-4 font-bold shadow-lg shadow-primary/10 h-[52px] !mt-8"
            loading={loading}
          >
            Cập nhật mật khẩu
          </Button>
        </form>

      </div>

      {/* Success Modal Overlay */}
      {success && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-[340px] bg-white rounded-3xl p-6 flex flex-col items-center text-center shadow-2xl animate-scale-up">
            <div className="w-16 h-16 bg-tertiary/10 rounded-full flex items-center justify-center mb-5 text-tertiary">
              <ShieldCheck size={36} />
            </div>
            <h3 className="font-headline-md text-lg font-bold text-on-surface mb-2">Thành công!</h3>
            <p className="font-body-md text-xs text-on-surface-variant mb-6 leading-relaxed">
              Mật khẩu đã được thay đổi thành công. Bạn có thể sử dụng mật khẩu mới để đăng nhập.
            </p>
            <button 
              onClick={() => navigate('/login')}
              className="w-full h-12 bg-primary text-white font-bold rounded-xl hover:brightness-105 active:scale-95 transition-all text-xs cursor-pointer shadow-soft"
            >
              Đăng nhập ngay
            </button>
          </div>
        </div>
      )}

      <ToastContainer toast={toast} setToast={setToast} />
    </div>
  );
};
