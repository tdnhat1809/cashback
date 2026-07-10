import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ToastContainer } from '../components/Toast';
import { defaultToastState, triggerToast } from '../components/toast-state';
import type { ToastState } from '../components/toast-state';
import { KeyRound, Phone, Sparkles } from 'lucide-react';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<1 | 2>(1); // 1: input phone, 2: input OTP
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const [toast, setToast] = useState<ToastState>(defaultToastState);

  // Timer countdown for OTP resend
  useEffect(() => {
    let interval: any;
    if (step === 2 && timer > 0) {
      interval = setInterval(() => {
        setTimer((t) => t - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      triggerToast(setToast, 'Vui lòng nhập số điện thoại hợp lệ.', 'error');
      return;
    }

    if (phone.length < 9 || phone.length > 11) {
      triggerToast(setToast, 'Số điện thoại phải từ 9 đến 11 chữ số.', 'error');
      return;
    }

    setLoading(true);
    // Simulate sending OTP SMS
    setTimeout(() => {
      setLoading(false);
      setStep(2);
      setTimer(60);
      triggerToast(setToast, 'Mã OTP giả lập (123456) đã gửi đến số điện thoại của bạn!', 'success');
    }, 1500);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      triggerToast(setToast, 'Vui lòng nhập mã OTP.', 'error');
      return;
    }

    if (otp !== '123456' && otp !== '000000') {
      triggerToast(setToast, 'Mã OTP không chính xác. Thử lại với 123456.', 'error');
      return;
    }

    setLoading(true);
    // Simulate verification
    setTimeout(() => {
      setLoading(false);
      triggerToast(setToast, 'Xác thực OTP thành công! Đang chuyển hướng...', 'success');
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    }, 1500);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-12">
      <div className="bg-white p-8 md:p-12 rounded-3xl border border-outline-variant/30 shadow-soft w-full max-w-md relative overflow-hidden">
        <div className="absolute -top-12 -right-12 text-primary/5 pointer-events-none">
          <Sparkles size={160} />
        </div>

        <div className="text-center mb-8 relative z-10">
          <h2 className="font-display-lg text-2xl font-black tracking-tight text-primary">
            HOANTIENVIP
          </h2>
          <p className="text-xs text-on-surface-variant font-medium mt-1">
            {step === 1 ? 'Đăng nhập hoặc đăng ký nhanh bằng số điện thoại' : 'Nhập mã xác thực OTP'}
          </p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleSendOtp} className="space-y-6 relative z-10">
            <Input
              label="Số điện thoại"
              placeholder="Nhập số điện thoại (ví dụ: 0912345678)"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              startIcon={<Phone size={18} />}
              disabled={loading}
              helperText="Chúng tôi sẽ gửi một tin nhắn SMS chứa mã xác thực OTP đến số này."
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
          <form onSubmit={handleVerifyOtp} className="space-y-6 relative z-10">
            <Input
              label="Mã xác thực OTP"
              placeholder="Nhập 6 chữ số (Mã test: 123456)"
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              startIcon={<KeyRound size={18} />}
              disabled={loading}
              helperText={`Mã OTP có hiệu lực trong 5 phút. SĐT: ${phone}`}
            />

            <Button
              type="submit"
              variant="success"
              className="w-full py-4 text-base font-bold shadow-md"
              loading={loading}
            >
              Xác nhận và Đăng nhập
            </Button>

            <div className="text-center text-xs text-on-surface-variant/80 font-medium">
              {timer > 0 ? (
                <span>Gửi lại mã sau {timer} giây</span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setTimer(60);
                    triggerToast(setToast, 'Đã gửi lại mã OTP test (123456)!', 'success');
                  }}
                  className="text-primary font-bold hover:underline cursor-pointer"
                >
                  Gửi lại mã OTP
                </button>
              )}
            </div>
            
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full text-center text-xs text-outline hover:text-on-surface hover:underline cursor-pointer py-1"
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
