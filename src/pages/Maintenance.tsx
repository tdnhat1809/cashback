import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Wrench, WifiOff, BellRing, Info, RefreshCw, 
  HelpCircle, ShieldCheck, Zap 
} from 'lucide-react';
import { Button } from '../components/Button';
import { ToastContainer } from '../components/Toast';
import { defaultToastState, triggerToast } from '../components/toast-state';
import type { ToastState } from '../components/toast-state';

export const Maintenance: React.FC = () => {
  const [activeState, setActiveState] = useState<'maintenance' | 'connection_error'>('maintenance');
  const [isRetrying, setIsRetrying] = useState(false);
  const [toast, setToast] = useState<ToastState>(defaultToastState);

  const handleRetry = () => {
    setIsRetrying(true);
    triggerToast(setToast, 'Đang thiết lập lại kết nối tới máy chủ...', 'info');
    setTimeout(() => {
      setIsRetrying(false);
      triggerToast(setToast, 'Kết nối không thành công. Mã lỗi: API_TIMEOUT_ERR.', 'error');
    }, 1500);
  };

  const handleNotifyMe = () => {
    triggerToast(setToast, 'Cảm ơn! Chúng tôi sẽ gửi thông báo SMS/Email ngay khi hệ thống hoàn tất bảo trì.', 'success');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface">
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-6 h-20 bg-surface/80 backdrop-blur-md border-b border-outline-variant/10">
        <Link to="/" className="font-display-lg text-2xl font-black text-primary tracking-tight">
          HOANTIENVIP
        </Link>
        <Link to="/faq" className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:bg-surface-container rounded-full transition-colors">
          <HelpCircle size={22} />
        </Link>
      </header>

      {/* Main Container */}
      <main className="flex-1 pt-24 pb-12 px-4 md:px-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-5xl">
          {/* Switcher tabs */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex p-1 bg-surface-container-low rounded-full shadow-inner border border-outline-variant/20">
              <button 
                onClick={() => setActiveState('maintenance')}
                className={`px-6 py-2.5 rounded-full text-xs font-bold transition-all duration-300 ${
                  activeState === 'maintenance' 
                    ? 'bg-primary-container text-white shadow-md' 
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                Hệ thống bảo trì
              </button>
              <button 
                onClick={() => setActiveState('connection_error')}
                className={`px-6 py-2.5 rounded-full text-xs font-bold transition-all duration-300 ${
                  activeState === 'connection_error' 
                    ? 'bg-primary-container text-white shadow-md' 
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                Lỗi kết nối
              </button>
            </div>
          </div>

          {/* Page Content Panel */}
          <div className="min-h-[500px]">
            {activeState === 'maintenance' ? (
              <section className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch text-left">
                {/* Left side text info */}
                <div className="md:col-span-7 flex flex-col justify-center space-y-6">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-tertiary/10 text-tertiary w-fit">
                    <Wrench size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Lịch bảo trì định kỳ</span>
                  </div>
                  
                  <h1 className="font-headline-md text-3xl md:text-4xl font-extrabold text-on-surface leading-tight">
                    Chúng tôi đang nâng cấp <br/>
                    <span className="text-primary">trải nghiệm tốt hơn</span> cho bạn.
                  </h1>
                  
                  <p className="font-body-md text-xs text-on-surface-variant max-w-lg leading-relaxed font-semibold">
                    Hệ thống đang được nâng cấp định kỳ nhằm tối ưu hóa tốc độ đối soát đơn hàng hoàn tiền tự động và cải tiến các lớp bảo mật. Rất mong bạn thông cảm cho sự gián đoạn tạm thời này.
                  </p>

                  <div className="grid grid-cols-2 gap-4 max-w-md">
                    <div className="p-4 rounded-xl bg-white/50 border border-outline-variant/20 shadow-soft">
                      <p className="text-[10px] font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Dự kiến hoàn tất</p>
                      <p className="text-base text-primary font-black">14:00 (Hôm nay)</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/50 border border-outline-variant/20 shadow-soft">
                      <p className="text-[10px] font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Trạng thái dịch vụ</p>
                      <p className="text-base text-tertiary font-black">Đang cập nhật</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Button 
                      variant="primary" 
                      onClick={handleNotifyMe}
                      className="py-4 px-6 shadow-lg shadow-primary/10"
                      icon={<BellRing size={16} />}
                    >
                      Thông báo khi hoàn tất
                    </Button>
                    
                    <Link 
                      to="/" 
                      className="border border-outline hover:bg-surface-container-high text-on-surface text-xs font-bold px-6 py-3.5 rounded-xl transition-all flex items-center justify-center"
                    >
                      Về trang chủ
                    </Link>
                  </div>
                </div>

                {/* Right side bento box */}
                <div className="md:col-span-5 hidden md:grid grid-cols-2 grid-rows-2 gap-4">
                  <div className="row-span-2 rounded-[32px] overflow-hidden relative group border border-outline-variant/20 shadow-soft">
                    <div className="absolute inset-0 bg-primary/5 transition-colors group-hover:bg-primary/0 z-10" />
                    <img 
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500" 
                      alt="Isometric 3D workspace graphic for maintenance mode" 
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDQ2BndO3OA0xEk3o4AGqkOsjXuJ9iuQquTVFA4msqqwXfQsaXTPd6K6r-VT3hq9mAX8dqG7XxhbY_eiXfXIx9mclgQDhzcY1zLe1Q4DcSMYMk17gUlD_l3te7iHgrkvhBvUWdvyqdMrSyQvK9v3NJic_VEPkQA0GjN9xj1LfkfZ67_ds3-gt2JPnQmkZTLR-DCh48avERXJ82qMYZUwX-KMemb7qrO5LixbUooksCxLcbUS2lUgsIzww"
                    />
                  </div>
                  <div className="bg-surface-container-high rounded-[32px] p-6 flex flex-col justify-between border border-outline-variant/10 shadow-soft">
                    <Zap className="text-primary" size={32} />
                    <p className="text-xs font-bold text-on-surface-variant leading-normal">Tăng tốc độ xử lý giao dịch thêm 40%</p>
                  </div>
                  <div className="bg-tertiary-container rounded-[32px] p-6 flex flex-col justify-between text-white shadow-soft shadow-tertiary/10">
                    <ShieldCheck className="text-white" size={32} />
                    <p className="text-xs font-bold opacity-95 leading-normal">Bảo mật đa lớp tiêu chuẩn quốc tế</p>
                  </div>
                </div>
              </section>
            ) : (
              <section className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center text-left">
                {/* Left: network error illustration */}
                <div className="md:col-span-5 order-2 md:order-1">
                  <div className="relative w-full aspect-square max-w-sm mx-auto">
                    <div className="absolute inset-0 bg-primary/5 rounded-full animate-pulse"></div>
                    <img 
                      className="w-full h-full object-contain relative z-10 scale-95" 
                      alt="Minimalist 3D character disconnected network cable representation" 
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuAbMTAFCw0tedJXX3JIKcim0MKjHFY4Zspd6qZ-Vj-GL8W6PumDEw8RCryMhq5YmdH0EhDCuKX6bEmu2Usb18cEBJ0UyYXxRPDcC9NoSZqwcTrohil_UowhMQrjrWyRnwh-YITLNj2rvMneu7mbn8c4vHaZ_n4cpS-QlvrTGgHheomtTDWprLsFe01ahnBnHmiU6UGHN15pRZiWqz5YFOQjHp3TeRihLiFSF97pNUVaVxJDoajCCVwPUw"
                    />
                    <div className="absolute top-4 right-2 bg-white p-3 rounded-xl shadow-md flex items-center gap-2 border border-outline-variant/30 text-xs font-bold text-on-surface">
                      <span className="w-2.5 h-2.5 rounded-full bg-error animate-ping"></span>
                      <span>No Connection</span>
                    </div>
                  </div>
                </div>

                {/* Right: details and action */}
                <div className="md:col-span-7 order-1 md:order-2 space-y-6">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-error/10 text-error w-fit">
                    <WifiOff size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Lỗi kết nối</span>
                  </div>

                  <h1 className="font-headline-md text-3xl md:text-4xl font-extrabold text-on-surface leading-tight">
                    Không thể kết nối <br/>
                    tới máy chủ <span className="text-error">HOANTIENVIP</span>.
                  </h1>

                  <p className="font-body-md text-xs text-on-surface-variant max-w-lg leading-relaxed font-semibold">
                    Có vẻ như đường truyền internet của thiết bị không ổn định hoặc dịch vụ máy chủ trung tâm đang gặp sự cố nghẽn mạng tạm thời.
                  </p>

                  <div className="bg-surface-container rounded-2xl p-5 border-l-4 border-error shadow-soft">
                    <div className="flex gap-4 items-start">
                      <Info className="text-error shrink-0 mt-0.5" size={20} />
                      <div>
                        <p className="font-title-lg text-sm font-bold text-on-surface">Mã lỗi: <span className="font-mono text-error">API_TIMEOUT_ERR</span></p>
                        <p className="text-[11px] text-on-surface-variant mt-1 leading-normal font-semibold">
                          Hệ thống không nhận được phản hồi từ mạng sau 30 giây. Vui lòng kiểm tra lại modem nhà mạng hoặc chuyển sang mạng di động 4G/5G.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <Button 
                      variant="primary" 
                      onClick={handleRetry}
                      className="py-4 px-6 shadow-md shadow-primary/10"
                      loading={isRetrying}
                      icon={<RefreshCw size={16} />}
                    >
                      Thử lại ngay
                    </Button>
                    
                    <Link 
                      to="/" 
                      className="bg-white border border-outline hover:bg-surface-container-high text-on-surface text-xs font-bold px-6 py-3.5 rounded-xl transition-all"
                    >
                      Về trang chủ
                    </Link>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 px-6 bg-surface-container-low text-center border-t border-outline-variant/10">
        <p className="text-xs text-on-surface-variant/70 font-semibold">© 2026 HOANTIENVIP. Bảo trì &amp; Quản trị hệ thống.</p>
      </footer>

      <ToastContainer toast={toast} setToast={setToast} />
    </div>
  );
};
