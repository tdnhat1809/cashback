import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Lock, ArrowLeft, Home, Headset, ShieldAlert } from 'lucide-react';

export const Forbidden: React.FC = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    // Go back, if no history defaults to home
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md shadow-sm w-full border-b border-outline-variant/10">
        <div className="flex justify-between items-center px-6 h-20 w-full max-w-[1280px] mx-auto">
          <Link to="/" className="font-display-lg text-2xl font-black text-primary tracking-tight">
            HOANTIENVIP
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/faq" className="text-on-surface-variant hover:text-primary transition-colors font-label-md text-xs font-bold">
              Trợ giúp
            </Link>
            <Link to="/login" className="bg-primary text-white px-5 py-2.5 rounded-full font-label-md text-xs font-bold hover:brightness-105 active:scale-[0.97] transition-all shadow-md shadow-primary/10">
              Đăng nhập
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
        {/* Decorative background glows */}
        <div className="absolute top-1/4 -left-12 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 -right-12 w-80 h-80 bg-primary-container/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-4xl w-full flex flex-col lg:flex-row items-center gap-12 lg:gap-16 relative z-10">
          {/* Left: Illustration */}
          <div className="flex-1 w-full max-w-[360px] lg:max-w-none flex justify-center items-center">
            <div className="relative w-full aspect-square max-w-[400px]">
              <div className="w-full h-full rounded-[40px] bg-gradient-to-br from-surface-container-high to-surface-container shadow-2xl overflow-hidden relative group border border-outline-variant/20">
                <img 
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-700 opacity-90" 
                  alt="Minimalist 403 forbidden screen illustration" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBQOidKPp1HFkm-MM8qzteBjh-iWlwdKj64Idwm2cLtiHpMA8x3MgMUGM03SrmYC4VcyKj4_7FLAW5gAsBGrxTN4bFrmStnqqrBUT4-6oZx6d2K2L4DugXMjY1RbmJGJWae1QjvjYitbeQdb3417fCBpPvsrtUrZlTSqXNewNVlxTpDHQO7evWnPzwbok57kxunjV_vcb8sgWEvrS8L_mI86irKN7ffBg15lb8bozVaxXn8G4c0utgPpA"
                />
                
                {/* Floating Accents */}
                <div className="absolute top-8 right-8 animate-bounce" style={{ animationDuration: '4s' }}>
                  <div className="w-14 h-14 rounded-2xl bg-primary-container/20 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-lg">
                    <Lock className="text-primary" size={24} />
                  </div>
                </div>
                
                <div className="absolute bottom-12 left-10 animate-bounce" style={{ animationDuration: '5s', animationDelay: '1s' }}>
                  <div className="w-12 h-12 rounded-full bg-tertiary-container/20 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-lg">
                    <Shield className="text-tertiary" size={20} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Text and Actions */}
          <div className="flex-1 text-center lg:text-left space-y-6">
            <div className="space-y-3">
              <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-bold tracking-widest uppercase">
                Mã lỗi: 403 Forbidden
              </span>
              <h1 className="font-headline-md text-2xl md:text-3xl font-extrabold text-on-surface leading-tight">
                Bạn không có quyền <br className="hidden md:block"/>truy cập trang này
              </h1>
              <p className="font-body-md text-xs text-on-surface-variant max-w-md mx-auto lg:mx-0 leading-relaxed font-semibold">
                Rất tiếc! Có vẻ như bạn đang cố gắng truy cập vào khu vực bị giới hạn hoặc tài khoản hiện tại không có vai trò quản trị viên. Đừng lo lắng, hãy sử dụng các tùy chọn dưới đây để tiếp tục hành trình tiết kiệm của mình.
              </p>
            </div>

            {/* Bento Actions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto lg:mx-0">
              <button 
                onClick={handleBack} 
                className="flex items-center justify-center gap-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface px-5 py-3.5 rounded-xl text-xs font-bold border border-outline-variant/30 transition-all active:scale-[0.98] cursor-pointer"
              >
                <ArrowLeft size={16} /> Quay lại trang trước
              </button>
              
              <Link 
                to="/" 
                className="flex items-center justify-center gap-2 bg-primary text-white px-5 py-3.5 rounded-xl text-xs font-bold hover:opacity-95 transition-all active:scale-[0.98] shadow-md shadow-primary/15"
              >
                <Home size={16} /> Về trang chủ
              </Link>
              
              <Link 
                to="/faq" 
                className="sm:col-span-2 flex items-center justify-center gap-2 bg-white text-primary border border-primary/20 hover:bg-primary/5 px-5 py-3.5 rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
              >
                <Headset size={16} /> Liên hệ hỗ trợ 24/7
              </Link>
            </div>

            {/* Bottom info badges */}
            <div className="pt-6 flex flex-wrap justify-center lg:justify-start gap-6 text-on-surface-variant/70 text-xs font-bold">
              <span className="flex items-center gap-1.5"><Shield size={16} className="text-primary" /> Bảo mật tối ưu</span>
              <span className="flex items-center gap-1.5"><ShieldAlert size={16} className="text-primary" /> Phân quyền chi tiết</span>
            </div>
          </div>
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="w-full py-6 px-6 bg-surface-container-low border-t border-outline-variant/10">
        <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-on-surface-variant/80 font-semibold">
          <span className="font-bold">HOANTIENVIP</span>
          <div className="flex gap-4">
            <Link to="/legal" className="hover:text-primary transition-colors">Chính sách bảo mật</Link>
            <Link to="/legal" className="hover:text-primary transition-colors">Điều khoản dịch vụ</Link>
          </div>
          <span className="text-on-surface-variant/50">© 2026 HOANTIENVIP. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
};
