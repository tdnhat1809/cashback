import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Mail, Sparkles, UserRound } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ToastContainer } from '../components/Toast';
import { defaultToastState, triggerToast } from '../components/toast-state';
import type { ToastState } from '../components/toast-state';
import { ApiError, authApi, type UserRole } from '../services/apiClient';
import { useAuth } from '../state/auth-context';

const AUTH_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  INVALID_EMAIL: 'Địa chỉ email không hợp lệ.',
  INVALID_NAME: 'Vui lòng nhập họ và tên hợp lệ.',
  WEAK_PASSWORD: 'Mật khẩu cần từ 10 ký tự, gồm ít nhất một chữ cái và một chữ số.',
  EMAIL_ALREADY_REGISTERED: 'Email này đã có tài khoản. Hãy đăng nhập để tiếp tục.',
  INVALID_CREDENTIALS: 'Email hoặc mật khẩu không chính xác.',
  AUTH_RATE_LIMITED: 'Bạn đã đăng nhập sai quá nhiều lần. Vui lòng thử lại sau.',
  ACCOUNT_SUSPENDED: 'Tài khoản đang bị tạm khóa. Vui lòng liên hệ hỗ trợ.',
  GOOGLE_NOT_CONFIGURED: 'Đăng nhập Google đang được thiết lập. Vui lòng dùng email và mật khẩu.',
  GOOGLE_LOGIN_FAILED: 'Không thể đăng nhập với Google. Vui lòng thử lại.',
  GOOGLE_STATE_INVALID: 'Phiên đăng nhập Google đã hết hạn. Vui lòng thử lại.',
  NETWORK_ERROR: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối và thử lại.',
};

const getAuthErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError) return AUTH_ERROR_MESSAGES[error.code] ?? error.message;
  return 'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.';
};

const getSafeDestination = (rawRedirect: string | null, role?: UserRole): string => {
  if (rawRedirect?.startsWith('/') && !rawRedirect.startsWith('//')) return rawRedirect;
  return role === 'admin' ? '/admin' : '/dashboard';
};

const GoogleMark = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
    <path fill="#4285F4" d="M21.8 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.5a4.7 4.7 0 0 1-2 3.1v2.5h3.2c1.9-1.8 3.1-4.3 3.1-7.4Z" />
    <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.4l-3.2-2.5c-.9.6-2 .9-3.5.9-2.7 0-5-1.8-5.8-4.3H2.9v2.6A10 10 0 0 0 12 22Z" />
    <path fill="#FBBC05" d="M6.2 13.7A6 6 0 0 1 5.9 12c0-.6.1-1.2.3-1.7V7.7H2.9A10 10 0 0 0 2 12c0 1.6.4 3.1.9 4.3l3.3-2.6Z" />
    <path fill="#EA4335" d="M12 6c1.5 0 2.9.5 3.9 1.5l2.9-2.9C17 3 14.7 2 12 2a10 10 0 0 0-9.1 5.7l3.3 2.6C7 7.8 9.3 6 12 6Z" />
  </svg>
);

export const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, status, register, login } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleAvailable, setGoogleAvailable] = useState<boolean | null>(null);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState<ToastState>(defaultToastState);

  const destination = useMemo(
    () => getSafeDestination(searchParams.get('redirect'), user?.role),
    [searchParams, user?.role],
  );

  useEffect(() => {
    void authApi.providers()
      .then((providers) => setGoogleAvailable(providers.google))
      .catch(() => setGoogleAvailable(false));
  }, []);

  useEffect(() => {
    const authError = searchParams.get('auth_error');
    if (!authError) return;
    const message = AUTH_ERROR_MESSAGES[authError] ?? 'Không thể hoàn tất đăng nhập Google.';
    setFormError(message);
  }, [searchParams]);

  useEffect(() => {
    if (status === 'authenticated' && user) navigate(destination, { replace: true });
  }, [destination, navigate, status, user]);

  const changeMode = (nextMode: 'login' | 'register') => {
    setMode(nextMode);
    setFormError('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (mode === 'register' && password !== confirmPassword) {
      const message = 'Mật khẩu xác nhận chưa khớp.';
      setFormError(message);
      triggerToast(setToast, message, 'error');
      return;
    }
    if (mode === 'register' && name.trim().length < 2) {
      const message = 'Vui lòng nhập họ và tên.';
      setFormError(message);
      triggerToast(setToast, message, 'error');
      return;
    }

    setLoading(true);
    setFormError('');
    try {
      const session = mode === 'register'
        ? await register({ name: name.trim(), email: email.trim(), password })
        : await login({ email: email.trim(), password });
      triggerToast(setToast, mode === 'register' ? 'Tạo tài khoản thành công.' : 'Đăng nhập thành công.', 'success');
      navigate(getSafeDestination(searchParams.get('redirect'), session.user.role), { replace: true });
    } catch (error) {
      const message = getAuthErrorMessage(error);
      setFormError(message);
      triggerToast(setToast, message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    if (!googleAvailable) return;
    window.location.assign(authApi.googleStartUrl(destination));
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-5 py-12">
      <div className="bg-white p-7 md:p-10 rounded-3xl border border-outline-variant/30 shadow-soft w-full max-w-md relative overflow-hidden">
        <div className="absolute -top-12 -right-12 text-primary/5 pointer-events-none" aria-hidden="true">
          <Sparkles size={160} />
        </div>

        <div className="text-center mb-7 relative z-10">
          <img src="/logo.png" alt="HOANTIENVIP" className="h-10 mx-auto object-contain" />
          <h1 className="mt-5 font-headline-md text-xl text-on-surface">
            {mode === 'login' ? 'Chào mừng bạn quay lại' : 'Tạo tài khoản mới'}
          </h1>
          <p className="text-xs text-on-surface-variant font-medium mt-2">
            {mode === 'login'
              ? 'Đăng nhập bằng email hoặc tài khoản Google'
              : 'Đăng ký nhanh, không cần số điện thoại'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-container-low p-1 mb-6 relative z-10" role="tablist" aria-label="Chọn hình thức xác thực">
          <button type="button" role="tab" aria-selected={mode === 'login'} onClick={() => changeMode('login')}
            className={`rounded-lg px-3 py-2.5 text-xs font-bold transition-colors ${mode === 'login' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>
            Đăng nhập
          </button>
          <button type="button" role="tab" aria-selected={mode === 'register'} onClick={() => changeMode('register')}
            className={`rounded-lg px-3 py-2.5 text-xs font-bold transition-colors ${mode === 'register' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>
            Đăng ký
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10" aria-busy={loading}>
          {mode === 'register' && (
            <Input
              id="register-name" name="name" label="Họ và tên" placeholder="Nguyễn Văn A"
              autoComplete="name" value={name} onChange={(event) => { setName(event.target.value); setFormError(''); }}
              startIcon={<UserRound size={18} aria-hidden="true" />} disabled={loading} required
            />
          )}
          <Input
            id="auth-email" name="email" label="Email" placeholder="ban@email.com" type="email"
            autoComplete="email" value={email} onChange={(event) => { setEmail(event.target.value); setFormError(''); }}
            startIcon={<Mail size={18} aria-hidden="true" />} disabled={loading} error={formError || undefined} required
          />
          <Input
            id="auth-password" name="password" label="Mật khẩu" placeholder="Từ 10 ký tự, gồm chữ và số" type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password}
            onChange={(event) => { setPassword(event.target.value); setFormError(''); }}
            startIcon={<Lock size={18} aria-hidden="true" />} disabled={loading}
            helperText={mode === 'register' ? 'Dùng ít nhất 10 ký tự, có cả chữ cái và chữ số.' : undefined} required
          />
          {mode === 'register' && (
            <Input
              id="register-confirm-password" name="confirmPassword" label="Xác nhận mật khẩu" placeholder="Nhập lại mật khẩu" type="password"
              autoComplete="new-password" value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); setFormError(''); }}
              startIcon={<Lock size={18} aria-hidden="true" />} disabled={loading} required
            />
          )}

          <Button type="submit" variant="primary" className="w-full py-4 text-base font-bold shadow-md" loading={loading}>
            {mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
          </Button>
        </form>

        <div className="relative z-10 flex items-center gap-3 my-6" aria-hidden="true">
          <span className="h-px flex-1 bg-outline-variant/40" />
          <span className="text-[11px] font-semibold text-on-surface-variant">hoặc</span>
          <span className="h-px flex-1 bg-outline-variant/40" />
        </div>
        <button
          type="button" onClick={handleGoogleLogin} disabled={loading || googleAvailable !== true}
          className="relative z-10 inline-flex w-full items-center justify-center gap-3 rounded-xl border border-outline-variant/50 bg-white px-5 py-3.5 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
          title={googleAvailable === false ? 'Google OAuth chưa được cấu hình trên máy chủ.' : undefined}
        >
          <GoogleMark />
          {googleAvailable === null ? 'Đang kiểm tra Google…' : mode === 'login' ? 'Tiếp tục với Google' : 'Đăng ký với Google'}
        </button>
        {googleAvailable === false && (
          <p className="relative z-10 mt-2 text-center text-[11px] text-on-surface-variant">Đăng nhập Google sẽ khả dụng sau khi quản trị viên cấu hình OAuth.</p>
        )}

        <p className="relative z-10 mt-6 text-center text-[11px] leading-relaxed text-on-surface-variant">
          Bằng việc tiếp tục, bạn đồng ý với điều khoản sử dụng và chính sách bảo mật của HOANTIENVIP.
        </p>
      </div>
      <ToastContainer toast={toast} setToast={setToast} />
    </div>
  );
};
