import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound, Phone, Sparkles } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ToastContainer } from '../components/Toast';
import { defaultToastState, triggerToast } from '../components/toast-state';
import type { ToastState } from '../components/toast-state';
import { ApiError, type OtpChallenge, type UserRole } from '../services/apiClient';
import { useAuth } from '../state/auth-context';

const VIETNAM_MOBILE_PATTERN = /^(?:0|84)[35789]\d{8}$/;

const AUTH_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  INVALID_PHONE: 'Số điện thoại di động Việt Nam không hợp lệ.',
  OTP_RATE_LIMITED: 'Bạn thao tác quá nhanh. Vui lòng chờ trước khi yêu cầu mã mới.',
  OTP_INCORRECT: 'Mã OTP không chính xác.',
  INVALID_OTP: 'Mã OTP phải gồm đúng 6 chữ số.',
  OTP_EXPIRED: 'Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.',
  OTP_CHALLENGE_INVALID: 'Yêu cầu OTP không còn hợp lệ. Vui lòng lấy mã mới.',
  OTP_ATTEMPTS_EXCEEDED: 'Bạn đã nhập sai quá số lần cho phép. Vui lòng lấy mã mới.',
  OTP_DELIVERY_UNAVAILABLE: 'Dịch vụ gửi OTP chưa được cấu hình. Vui lòng thử lại sau.',
  ACCOUNT_SUSPENDED: 'Tài khoản đang bị tạm khóa. Vui lòng liên hệ hỗ trợ.',
  NETWORK_ERROR: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối và thử lại.',
};

const getAuthErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    return AUTH_ERROR_MESSAGES[error.code] ?? error.message;
  }
  return 'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.';
};

const getSafeDestination = (rawRedirect: string | null, role?: UserRole): string => {
  if (rawRedirect?.startsWith('/') && !rawRedirect.startsWith('//')) return rawRedirect;
  return role === 'admin' ? '/admin' : '/dashboard';
};

export const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, status, requestOtp, verifyOtp } = useAuth();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [phoneError, setPhoneError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [toast, setToast] = useState<ToastState>(defaultToastState);

  const destination = useMemo(
    () => getSafeDestination(searchParams.get('redirect'), user?.role),
    [searchParams, user?.role],
  );

  useEffect(() => {
    if (status === 'authenticated' && user) navigate(destination, { replace: true });
  }, [destination, navigate, status, user]);

  useEffect(() => {
    if (step !== 2 || timer <= 0) return;
    const timeout = window.setTimeout(() => setTimer((current) => Math.max(0, current - 1)), 1_000);
    return () => window.clearTimeout(timeout);
  }, [step, timer]);

  const sendOtp = async () => {
    const compactPhone = phone.replace(/\D/g, '');
    if (!VIETNAM_MOBILE_PATTERN.test(compactPhone)) {
      const message = 'Nhập số di động Việt Nam hợp lệ, ví dụ 0912345678.';
      setPhoneError(message);
      triggerToast(setToast, message, 'error');
      return;
    }

    setLoading(true);
    setPhoneError('');
    try {
      const nextChallenge = await requestOtp(compactPhone);
      setChallenge(nextChallenge);
      setOtp('');
      setOtpError('');
      setStep(2);
      setTimer(nextChallenge.retryAfterSeconds);
      const message = nextChallenge.devCode
        ? `Mã OTP phát triển: ${nextChallenge.devCode}`
        : 'Mã OTP đã được gửi đến số điện thoại của bạn.';
      triggerToast(setToast, message, 'success');
    } catch (error) {
      const message = getAuthErrorMessage(error);
      setPhoneError(message);
      if (error instanceof ApiError && error.retryAfterSeconds) {
        setTimer(error.retryAfterSeconds);
      }
      triggerToast(setToast, message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = (event: FormEvent) => {
    event.preventDefault();
    void sendOtp();
  };

  const handleVerifyOtp = async (event: FormEvent) => {
    event.preventDefault();
    if (!challenge) {
      const message = 'Yêu cầu OTP không còn hợp lệ. Vui lòng lấy mã mới.';
      setOtpError(message);
      triggerToast(setToast, message, 'error');
      setStep(1);
      return;
    }
    if (!/^\d{6}$/.test(otp)) {
      const message = 'Mã OTP phải gồm đúng 6 chữ số.';
      setOtpError(message);
      triggerToast(setToast, message, 'error');
      return;
    }

    setLoading(true);
    setOtpError('');
    try {
      const session = await verifyOtp({
        challengeId: challenge.challengeId,
        phone: challenge.phone,
        code: otp,
      });
      triggerToast(setToast, 'Đăng nhập thành công.', 'success');
      navigate(getSafeDestination(searchParams.get('redirect'), session.user.role), { replace: true });
    } catch (error) {
      const message = getAuthErrorMessage(error);
      setOtpError(message);
      triggerToast(setToast, message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePhone = () => {
    setStep(1);
    setChallenge(null);
    setOtp('');
    setOtpError('');
    setPhoneError('');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-12">
      <div className="bg-white p-8 md:p-12 rounded-3xl border border-outline-variant/30 shadow-soft w-full max-w-md relative overflow-hidden">
        <div className="absolute -top-12 -right-12 text-primary/5 pointer-events-none" aria-hidden="true">
          <Sparkles size={160} />
        </div>

        <div className="text-center mb-8 relative z-10">
          <img src="/logo.png" alt="HOANTIENVIP" className="h-10 mx-auto object-contain" />
          <p className="text-xs text-on-surface-variant font-medium mt-1">
            {step === 1
              ? 'Đăng nhập hoặc đăng ký nhanh bằng số điện thoại'
              : 'Nhập mã xác thực OTP'}
          </p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleSendOtp} className="space-y-6 relative z-10" aria-busy={loading}>
            <Input
              id="login-phone"
              name="phone"
              label="Số điện thoại"
              placeholder="Ví dụ: 0912345678"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value.replace(/\D/g, '').slice(0, 11));
                setPhoneError('');
              }}
              startIcon={<Phone size={18} aria-hidden="true" />}
              disabled={loading}
              error={phoneError || undefined}
              helperText="Chúng tôi sẽ gửi mã xác thực dùng một lần đến số này."
              required
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full py-4 text-base font-bold shadow-md"
              loading={loading}
            >
              Nhận mã xác thực OTP
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-6 relative z-10" aria-busy={loading}>
            <Input
              id="login-otp"
              name="otp"
              label="Mã xác thực OTP"
              placeholder="Nhập 6 chữ số"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(event) => {
                setOtp(event.target.value.replace(/\D/g, ''));
                setOtpError('');
              }}
              startIcon={<KeyRound size={18} aria-hidden="true" />}
              disabled={loading}
              error={otpError || undefined}
              helperText={challenge?.devCode
                ? `Môi trường phát triển · Mã OTP: ${challenge.devCode}`
                : `Mã có hiệu lực trong 5 phút · SĐT: ${challenge?.phone ?? phone}`}
              required
            />

            <Button
              type="submit"
              variant="success"
              className="w-full py-4 text-base font-bold shadow-md"
              loading={loading}
              disabled={otp.length !== 6}
            >
              Xác nhận và đăng nhập
            </Button>

            <div className="text-center text-xs text-on-surface-variant/80 font-medium" aria-live="polite">
              {timer > 0 ? (
                <span>Gửi lại mã sau {timer} giây</span>
              ) : (
                <button
                  type="button"
                  onClick={() => void sendOtp()}
                  disabled={loading}
                  className="text-primary font-bold hover:underline disabled:opacity-50 cursor-pointer"
                >
                  Gửi lại mã OTP
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleChangePhone}
              disabled={loading}
              className="w-full text-center text-xs text-outline hover:text-on-surface hover:underline disabled:opacity-50 cursor-pointer py-1"
            >
              Thay đổi số điện thoại
            </button>
          </form>
        )}
      </div>

      <ToastContainer toast={toast} setToast={setToast} />
    </div>
  );
};
