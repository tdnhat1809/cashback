import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Lock } from 'lucide-react';
import { Button } from '../components/Button';
import { ToastContainer } from '../components/Toast';
import { defaultToastState, triggerToast } from '../components/toast-state';
import type { ToastState } from '../components/toast-state';
import { ApiError, authApi } from '../services/apiClient';

interface ResetProgress {
  email: string;
  challengeId: string;
  expiresAt: string;
  retryAfterSeconds: number;
}

const getStoredProgress = (): ResetProgress | null => {
  try {
    const value = sessionStorage.getItem('password-reset-progress');
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<ResetProgress>;
    if (typeof parsed.email !== 'string' || typeof parsed.challengeId !== 'string' || typeof parsed.expiresAt !== 'string') return null;
    return { email: parsed.email, challengeId: parsed.challengeId, expiresAt: parsed.expiresAt, retryAfterSeconds: Number(parsed.retryAfterSeconds) || 0 };
  } catch {
    return null;
  }
};

export const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const progress = useMemo(() => (location.state as ResetProgress | null) ?? getStoredProgress(), [location.state]);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [retryAfter, setRetryAfter] = useState(progress?.retryAfterSeconds ?? 0);
  const [toast, setToast] = useState<ToastState>(defaultToastState);

  useEffect(() => {
    if (retryAfter <= 0) return undefined;
    const timer = window.setInterval(() => setRetryAfter((seconds) => Math.max(0, seconds - 1)), 1_000);
    return () => window.clearInterval(timer);
  }, [retryAfter]);

  const passwordLabel = newPassword.length === 0 ? 'Độ mạnh mật khẩu' : newPassword.length < 10 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword) ? 'Chưa đạt yêu cầu' : 'Đạt yêu cầu';
  const passwordColor = passwordLabel === 'Đạt yêu cầu' ? 'text-tertiary' : passwordLabel === 'Độ mạnh mật khẩu' ? 'text-on-surface-variant' : 'text-error';

  const handleUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!progress) {
      navigate('/forgot-password', { replace: true });
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      triggerToast(setToast, 'Mã xác thực phải gồm 6 chữ số.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      triggerToast(setToast, 'Mật khẩu xác nhận không khớp.', 'error');
      return;
    }
    setLoading(true);
    try {
      await authApi.confirmPasswordReset({ email: progress.email, challengeId: progress.challengeId, code, password: newPassword });
      sessionStorage.removeItem('password-reset-progress');
      navigate('/login?password_reset=success', { replace: true });
    } catch (error) {
      const apiError = error instanceof ApiError ? error : null;
      if (apiError?.code === 'PASSWORD_RESET_EXPIRED' || apiError?.code === 'PASSWORD_RESET_INVALID') {
        sessionStorage.removeItem('password-reset-progress');
        triggerToast(setToast, 'Mã đã hết hạn hoặc không hợp lệ. Vui lòng yêu cầu mã mới.', 'error');
      } else {
        triggerToast(setToast, apiError?.message ?? 'Không thể cập nhật mật khẩu. Vui lòng thử lại.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!progress || retryAfter > 0) return;
    setResending(true);
    try {
      const reset = await authApi.requestPasswordReset({ email: progress.email });
      const next = { email: progress.email, ...reset };
      sessionStorage.setItem('password-reset-progress', JSON.stringify(next));
      navigate('/reset-password', { replace: true, state: next });
      setRetryAfter(reset.retryAfterSeconds);
      setCode('');
      triggerToast(setToast, 'Nếu email có tài khoản dùng mật khẩu, mã mới đã được gửi.', 'success');
    } catch (error) {
      const apiError = error instanceof ApiError ? error : null;
      if (apiError?.retryAfterSeconds) setRetryAfter(apiError.retryAfterSeconds);
      triggerToast(setToast, apiError?.message ?? 'Không thể gửi lại mã. Vui lòng thử lại.', 'error');
    } finally {
      setResending(false);
    }
  };

  if (!progress) {
    return (
      <main className="min-h-[70vh] grid place-items-center px-4 text-center">
        <div className="max-w-md rounded-3xl bg-white p-8 shadow-soft border border-outline-variant/30">
          <Lock className="mx-auto text-primary" size={36} />
          <h1 className="mt-4 text-xl font-bold">Yêu cầu mã xác thực trước</h1>
          <p className="mt-2 text-sm text-on-surface-variant">Để bảo vệ tài khoản, hãy yêu cầu mã đặt lại mật khẩu từ email đã đăng ký.</p>
          <Button className="mt-6" onClick={() => navigate('/forgot-password')}>Yêu cầu mã</Button>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8 text-on-surface">
      <div className="w-full max-w-[400px] bg-white rounded-3xl border border-outline-variant/30 shadow-soft p-6">
        <header className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/forgot-password')} className="w-10 h-10 grid place-items-center rounded-full bg-surface-container hover:bg-surface-container-high" aria-label="Quay lại"><ArrowLeft className="text-primary" size={20} /></button>
          <h1 className="font-headline-md text-lg font-bold">Đặt lại mật khẩu</h1>
        </header>
        <p className="text-xs text-on-surface-variant leading-relaxed mb-6">Nhập mã gồm 6 chữ số đã gửi đến <strong>{progress.email}</strong>, sau đó tạo mật khẩu mới. Mọi phiên đăng nhập hiện có sẽ được đăng xuất.</p>
        <form onSubmit={handleUpdate} className="space-y-5 text-left">
          <label className="block text-xs font-bold text-on-surface-variant" htmlFor="reset-code">Mã xác thực</label>
          <input id="reset-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} disabled={loading} className="block w-full rounded-xl border border-outline-variant/50 bg-surface-container-low/40 px-4 py-3.5 text-center font-mono text-lg tracking-[0.4em] outline-none focus:border-primary" />
          <div className="space-y-1">
            <label className="block text-xs font-bold text-on-surface-variant" htmlFor="newPassword">Mật khẩu mới</label>
            <div className="relative"><input id="newPassword" type={showNewPassword ? 'text' : 'password'} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} disabled={loading} className="block w-full rounded-xl border border-outline-variant/50 bg-surface-container-low/40 px-4 py-3.5 pr-12 outline-none focus:border-primary" /><button type="button" onClick={() => setShowNewPassword((visible) => !visible)} className="absolute right-4 top-3.5 text-on-surface-variant" aria-label={showNewPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}>{showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
            <p className={`text-[11px] ${passwordColor}`}>{passwordLabel} — 10–128 ký tự, có cả chữ và số.</p>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold text-on-surface-variant" htmlFor="confirmPassword">Xác nhận mật khẩu</label>
            <div className="relative"><input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} disabled={loading} className="block w-full rounded-xl border border-outline-variant/50 bg-surface-container-low/40 px-4 py-3.5 pr-12 outline-none focus:border-primary" /><button type="button" onClick={() => setShowConfirmPassword((visible) => !visible)} className="absolute right-4 top-3.5 text-on-surface-variant" aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}>{showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
          </div>
          <Button type="submit" variant="primary" className="w-full py-4 font-bold" loading={loading}>Cập nhật mật khẩu</Button>
        </form>
        <button type="button" onClick={() => void handleResend()} disabled={resending || retryAfter > 0} className="mt-5 w-full text-xs font-bold text-primary disabled:text-on-surface-variant disabled:cursor-not-allowed">{retryAfter > 0 ? `Gửi lại mã sau ${retryAfter}s` : resending ? 'Đang gửi lại mã…' : 'Gửi lại mã xác thực'}</button>
      </div>
      <ToastContainer toast={toast} setToast={setToast} />
    </div>
  );
};
