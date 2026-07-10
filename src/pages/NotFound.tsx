import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, Home, HelpCircle, CreditCard, 
  Smartphone, Shirt, Sparkles, Utensils, Plane, HomeIcon
} from 'lucide-react';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  const categories = [
    { label: 'Điện tử', icon: <Smartphone size={24} />, query: 'Điện tử' },
    { label: 'Thời trang', icon: <Shirt size={24} />, query: 'Thời trang' },
    { label: 'Làm đẹp', icon: <Sparkles size={24} />, query: 'Làm đẹp' },
    { label: 'Ẩm thực', icon: <Utensils size={24} />, query: 'Ẩm thực' },
    { label: 'Du lịch', icon: <Plane size={24} />, query: 'Du lịch' },
    { label: 'Gia dụng', icon: <HomeIcon size={24} />, query: 'Gia dụng' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md shadow-soft border-b border-outline-variant/30">
        <div className="flex justify-between items-center h-16 px-6 max-w-[1280px] mx-auto w-full">
          <Link to="/" className="flex items-center gap-2">
            <span className="font-display-lg text-2xl font-black tracking-tighter text-primary">
              HOANTIENVIP
            </span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/" className="font-label-md text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors">
              Trang chủ
            </Link>
            <Link to="/deals" className="font-label-md text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors">
              Deal hot
            </Link>
            <Link to="/link-generator" className="font-label-md text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors">
              Công cụ tạo link
            </Link>
            <Link to="/faq" className="font-label-md text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors">
              Hỗ trợ FAQ
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/login')}
              className="px-4 py-2 text-sm font-label-md font-semibold text-primary hover:bg-surface-container-high/50 rounded-lg transition-all cursor-pointer"
            >
              Đăng nhập
            </button>
            <button 
              onClick={() => navigate('/login')}
              className="px-5 py-2 text-sm font-label-md font-bold bg-primary text-white rounded-lg shadow-soft hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              Đăng ký
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center pt-24 pb-16 px-6 relative overflow-hidden">
        <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center z-10">
          
          {/* Illustration Column */}
          <div className="flex flex-col items-center justify-center text-center md:text-left order-2 md:order-1">
            <div className="animate-bounce-slow mb-6">
              <img 
                className="w-64 h-64 md:w-80 md:h-80 object-contain mx-auto" 
                alt="Confused orange 3D character"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCvrePhzAUBXYm8NtLqrzTwMkpR9_b53OGEIFlR0T8SEOhAhdm0AmMUHu0R2MueOP2ekJS0aK-IS3JtiYKbDwdTK8NkRlRW5G_l_XuEnKTv6s864jW1zlXkYCS1zYS_KVbIG_yJ08fPHC87AfnX7dp8oi_HZG1zC6R3Ih4a3GQHCgPgSfyYkI540heYY-X__l_lqdYwsXGeGm9UwFqVYPmvvJK8UgWepeHGJCnuqG0Pvbr9sUysB_38nQ"
              />
            </div>
          </div>

          {/* Content Column */}
          <div className="flex flex-col text-center md:text-left order-1 md:order-2">
            <span className="text-primary font-black tracking-widest text-xs uppercase mb-2">
              LỖI 404 - KHÔNG TÌM THẤY TRANG
            </span>
            <h1 className="font-headline-lg text-3xl md:text-4xl text-on-surface font-extrabold mb-4 leading-tight">
              Ồ! Có vẻ deal này đã "bay màu".
            </h1>
            <p className="font-body-lg text-sm text-on-surface-variant mb-8 max-w-md mx-auto md:mx-0 leading-relaxed">
              Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển sang một vũ trụ khác. Đừng lo, chúng tôi vẫn còn hàng ngàn deal hoàn tiền cực khủng khác đang chờ bạn!
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <Link 
                to="/deals" 
                className="bg-primary text-white px-6 py-3.5 rounded-xl font-bold shadow-md hover:brightness-115 active:scale-95 transition-all text-center flex items-center justify-center gap-2"
              >
                <ShoppingBag size={18} />
                Khám phá deal hot
              </Link>
              <Link 
                to="/" 
                className="border-2 border-outline-variant/60 text-on-surface-variant px-6 py-3.5 rounded-xl font-bold hover:bg-surface-container-high/40 transition-all text-center flex items-center justify-center gap-2"
              >
                <Home size={18} />
                Quay lại trang chủ
              </Link>
            </div>

            {/* Bento Grid Links (Subtle Help) */}
            <div className="mt-10 grid grid-cols-2 gap-4">
              <Link 
                to="/faq"
                className="p-4 bg-white hover:bg-surface-container-low rounded-2xl border border-outline-variant/30 flex flex-col gap-1 transition-all hover:-translate-y-1 shadow-soft"
              >
                <HelpCircle className="text-primary" size={20} />
                <h4 className="text-xs font-bold text-on-surface">Trung tâm hỗ trợ</h4>
                <p className="text-[10px] text-on-surface-variant">Giải đáp thắc mắc</p>
              </Link>
              <Link 
                to="/dashboard/withdrawal"
                className="p-4 bg-white hover:bg-surface-container-low rounded-2xl border border-outline-variant/30 flex flex-col gap-1 transition-all hover:-translate-y-1 shadow-soft"
              >
                <CreditCard className="text-tertiary" size={20} />
                <h4 className="text-xs font-bold text-on-surface">Rút tiền ngay</h4>
                <p className="text-[10px] text-on-surface-variant">Thanh khoản nhanh chóng</p>
              </Link>
            </div>
          </div>

        </div>
      </main>

      {/* Popular Categories */}
      <section className="py-12 bg-white border-t border-outline-variant/20 z-10">
        <div className="max-w-[1280px] mx-auto px-6 text-center">
          <h3 className="font-headline-md text-lg font-bold text-on-surface mb-8">
            Có thể bạn đang quan tâm
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((cat, idx) => (
              <button
                key={idx}
                onClick={() => navigate(`/deals?category=${cat.query}`)}
                className="flex flex-col items-center p-4 bg-background hover:bg-surface-container rounded-2xl hover:shadow-soft transition-all cursor-pointer border border-outline-variant/10 hover:border-primary/20"
              >
                <div className="w-12 h-12 bg-primary/5 text-primary rounded-full flex items-center justify-center mb-2">
                  {cat.icon}
                </div>
                <span className="font-label-md text-xs font-bold">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full pt-12 pb-8 bg-white border-t border-outline-variant/30">
        <div className="max-w-[1280px] mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          <div>
            <span className="font-headline-md text-lg font-black text-primary">HOANTIENVIP</span>
            <p className="text-xs text-on-surface-variant leading-relaxed mt-2">
              © 2026 HOANTIENVIP. Hoàn tiền tối đa, mua sắm thả ga. Nền tảng tiết kiệm hàng đầu cho người tiêu dùng thông thái.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <h5 className="font-label-md text-xs font-bold text-on-surface uppercase mb-1">Về chúng tôi</h5>
              <Link to="/faq" className="text-xs text-on-surface-variant hover:text-primary">Liên hệ</Link>
              <a href="#" className="text-xs text-on-surface-variant hover:text-primary">Chính sách bảo mật</a>
              <a href="#" className="text-xs text-on-surface-variant hover:text-primary">Điều khoản sử dụng</a>
            </div>
            <div className="flex flex-col gap-2">
              <h5 className="font-label-md text-xs font-bold text-on-surface uppercase mb-1">Kết nối</h5>
              <a href="#" className="text-xs text-on-surface-variant hover:text-primary">Facebook</a>
              <a href="#" className="text-xs text-on-surface-variant hover:text-primary">YouTube</a>
              <a href="#" className="text-xs text-on-surface-variant hover:text-primary">TikTok</a>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <h5 className="font-label-md text-xs font-bold text-on-surface uppercase mb-1">Nhận tin khuyến mãi</h5>
            <div className="flex gap-2 mt-1">
              <input 
                className="bg-background border border-outline-variant/30 rounded-lg px-3 py-2 flex-grow focus:outline-none focus:ring-1 focus:ring-primary text-xs" 
                placeholder="Email của bạn" 
                type="email"
              />
              <button 
                onClick={() => alert('Đăng ký email nhận tin thành công!')}
                className="bg-primary text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity text-xs font-bold cursor-pointer"
              >
                Gửi
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
