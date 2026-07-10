import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, LayoutDashboard, History, Heart, Share2, 
  CreditCard, Award, Truck, Settings, LogOut, ShieldAlert, 
  X, Bell, User, Menu, Flame, Link2, Gift, FileText, WalletCards, HelpCircle, RefreshCw
} from 'lucide-react';
import { useAuth } from '../state/auth-context';

// Public Layout
export const PublicLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, status, logout } = useAuth();
  const isAuthenticated = status === 'authenticated' && user !== null;

  const openAccount = () => navigate(user?.role === 'admin' ? '/admin' : '/dashboard');
  const handleLogout = async () => {
    await logout().catch(() => undefined);
    navigate('/', { replace: true });
  };

  const navLinks = [
    { label: 'Trang chủ', path: '/' },
    { label: 'Deal hot', path: '/deals' },
    { label: 'Shopee', path: '/deals?platform=Shopee' },
    { label: 'TikTok Shop', path: '/deals?platform=TikTok%20Shop' },
    { label: 'Kiếm tiền', path: '/dashboard/referral' },
    { label: 'Rút tiền', path: '/dashboard/withdrawal' },
  ];

  const isPublicLinkActive = (target: string) => {
    const [pathname, query = ''] = target.split('?');
    if (location.pathname !== pathname) return false;
    const targetPlatform = new URLSearchParams(query).get('platform');
    const currentPlatform = new URLSearchParams(location.search).get('platform');
    if (targetPlatform) return targetPlatform === currentPlatform;
    return pathname !== '/deals' || !currentPlatform;
  };

  const publicTabs = [
    { label: 'Trang chủ', path: '/', icon: <Home size={20} /> },
    { label: 'Deal hot', path: '/deals', icon: <Flame size={20} /> },
    { label: 'Tạo link', path: '/link-generator', icon: <Link2 size={20} /> },
    { label: 'Cá nhân', path: '/dashboard', icon: <User size={20} /> },
  ];
  const showPublicTabs = !location.pathname.startsWith('/product/') && location.pathname !== '/login';

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-outline-variant/30">
        <div className="flex justify-between items-center h-[68px] px-5 md:px-6 max-w-[1280px] mx-auto w-full">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="HOANTIENVIP" className="h-10 md:h-12 w-auto object-contain" />
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-5 xl:gap-7">
            {navLinks.map((link) => {
              const isActive = isPublicLinkActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`font-label-md text-sm font-semibold transition-colors
                    ${isActive 
                      ? 'text-primary border-b-2 border-primary pb-1' 
                      : 'text-on-surface-variant hover:text-primary'
                    }
                  `}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Action buttons */}
          <div className="hidden lg:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <button
                  type="button"
                  onClick={openAccount}
                  className="max-w-48 truncate px-4 py-2 text-sm font-label-md font-semibold text-primary border border-primary/30 hover:bg-surface-container-low rounded-xl transition-all cursor-pointer"
                >
                  {user.name}
                </button>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="px-5 py-2 text-sm font-label-md font-bold bg-primary-container text-white rounded-xl shadow-soft hover:brightness-105 active:scale-95 transition-all cursor-pointer"
                >
                  Đăng xuất
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="px-4 py-2 text-sm font-label-md font-semibold text-primary border border-primary/30 hover:bg-surface-container-low rounded-xl transition-all cursor-pointer"
                >
                  Đăng nhập
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="px-5 py-2 text-sm font-label-md font-bold bg-primary-container text-white rounded-xl shadow-soft hover:brightness-105 active:scale-95 transition-all cursor-pointer"
                >
                  Đăng ký
                </button>
              </>
            )}
          </div>

          {/* Mobile menu trigger */}
          <button 
            className="lg:hidden text-on-surface p-2 cursor-pointer"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-[68px] z-40 bg-white lg:hidden animate-fade-in flex flex-col p-6 gap-6">
          <nav className="flex flex-col gap-4 text-left">
            {navLinks.map((link) => {
              const isActive = isPublicLinkActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`text-lg font-bold py-2 border-b border-outline-variant/10
                    ${isActive ? 'text-primary' : 'text-on-surface-variant'}
                  `}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          
          <div className="flex flex-col gap-3 mt-auto mb-16">
            {isAuthenticated ? (
              <>
                <button
                  type="button"
                  onClick={() => { setMobileMenuOpen(false); openAccount(); }}
                  className="w-full py-4 text-center font-bold text-primary bg-surface-container rounded-xl cursor-pointer"
                >
                  Tài khoản của tôi
                </button>
                <button
                  type="button"
                  onClick={() => { setMobileMenuOpen(false); void handleLogout(); }}
                  className="w-full py-4 text-center font-bold text-white bg-primary rounded-xl cursor-pointer shadow-soft"
                >
                  Đăng xuất
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => { setMobileMenuOpen(false); navigate('/login'); }}
                  className="w-full py-4 text-center font-bold text-primary bg-surface-container rounded-xl cursor-pointer"
                >
                  Đăng nhập
                </button>
                <button
                  type="button"
                  onClick={() => { setMobileMenuOpen(false); navigate('/login'); }}
                  className="w-full py-4 text-center font-bold text-white bg-primary rounded-xl cursor-pointer shadow-soft"
                >
                  Đăng ký
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className={`flex-1 pt-[68px] ${showPublicTabs ? 'pb-[calc(64px+env(safe-area-inset-bottom))] lg:pb-0' : ''}`}>
        {children}
      </main>

      {/* Footer */}
      <footer className="hidden lg:block w-full pt-16 pb-8 bg-white border-t border-outline-variant/30">
        <div className="max-w-[1280px] mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="flex flex-col gap-4 text-left">
            <img src="/logo.png" alt="HOANTIENVIP" className="h-10 w-auto object-contain" />
            <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
              Nền tảng hoàn tiền mua sắm trực tuyến uy tín hàng đầu Việt Nam, giúp người tiêu dùng tiết kiệm hàng tỷ đồng mỗi tháng trên Shopee & TikTok Shop.
            </p>
          </div>
          <div className="text-left">
            <h4 className="font-title-lg text-base font-bold mb-4">Dịch vụ chính</h4>
            <ul className="flex flex-col gap-2">
              <li><Link to="/deals" className="text-on-surface-variant hover:text-primary text-sm">Hoàn tiền Shopee</Link></li>
              <li><Link to="/deals" className="text-on-surface-variant hover:text-primary text-sm">Hoàn tiền TikTok Shop</Link></li>
              <li><Link to="/link-generator" className="text-on-surface-variant hover:text-primary text-sm">Công cụ liên kết</Link></li>
            </ul>
          </div>
          <div className="text-left">
            <h4 className="font-title-lg text-base font-bold mb-4">Thông tin hỗ trợ</h4>
            <ul className="flex flex-col gap-2">
              <li><Link to="/faq" className="text-on-surface-variant hover:text-primary text-sm">Hướng dẫn hoàn tiền</Link></li>
              <li><Link to="/faq" className="text-on-surface-variant hover:text-primary text-sm">Câu hỏi thường gặp FAQ</Link></li>
              <li><a href="#" className="text-on-surface-variant hover:text-primary text-sm">Chính sách bảo mật</a></li>
            </ul>
          </div>
          <div className="text-left">
            <h4 className="font-title-lg text-base font-bold mb-4">Kết nối</h4>
            <p className="font-label-md text-sm text-on-surface-variant mb-2">Email: hotro@hoantienvip.vn</p>
            <p className="font-label-md text-sm text-on-surface-variant">Hotline: 1900 6789</p>
            <div className="mt-4 text-xs text-on-surface-variant/70">
              Chỉ đối soát thực tế - Cashback minh bạch
            </div>
          </div>
        </div>
        <div className="max-w-[1280px] mx-auto px-6 mt-12 pt-6 border-t border-outline-variant/10 text-center">
          <p className="text-on-surface-variant/80 text-xs font-semibold">
            © 2026 HOANTIENVIP - Hệ thống hoàn tiền uy tín số 1 Việt Nam.
          </p>
        </div>
      </footer>

      {showPublicTabs && (
        <nav aria-label="Điều hướng nhanh" className="fixed inset-x-0 bottom-0 z-30 min-h-16 pb-[env(safe-area-inset-bottom)] bg-white/95 backdrop-blur-xl border-t border-outline-variant/30 grid grid-cols-4 lg:hidden shadow-[0_-10px_28px_rgba(91,64,58,0.08)]">
          {publicTabs.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`min-h-16 flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition-colors ${active ? 'text-primary' : 'text-on-surface-variant'}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
};

// User Dashboard Layout
export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const initials = user?.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'HV';

  const handleLogout = async () => {
    await logout().catch(() => undefined);
    navigate('/login', { replace: true });
  };

  const menuItems = [
    { label: 'Tổng quan ví', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
    { label: 'Lịch sử hoàn tiền', path: '/dashboard/cashback', icon: <History size={20} /> },
    { label: 'Rút tiền', path: '/dashboard/withdrawal', icon: <CreditCard size={20} /> },
    { label: 'Theo dõi vận đơn', path: '/dashboard/shipment', icon: <Truck size={20} /> },
    { label: 'Sản phẩm đã lưu', path: '/dashboard/saved', icon: <Heart size={20} /> },
    { label: 'Mời bạn bè (Ref)', path: '/dashboard/referral', icon: <Share2 size={20} /> },
    { label: 'Xu thưởng & Nhiệm vụ', path: '/dashboard/rewards', icon: <Award size={20} /> },
    { label: 'Nhập Giftcode', path: '/dashboard/giftcode', icon: <Gift size={20} /> },
    { label: 'Thông báo', path: '/dashboard/notifications', icon: <Bell size={20} /> },
    { label: 'Biến động số dư', path: '/dashboard/ledger', icon: <WalletCards size={20} /> },
    { label: 'Nhật ký hoạt động', path: '/dashboard/logs', icon: <FileText size={20} /> },
    { label: 'Yêu cầu hỗ trợ', path: '/dashboard/support', icon: <HelpCircle size={20} /> },
    { label: 'Cài đặt tài khoản', path: '/dashboard/settings', icon: <Settings size={20} /> },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col sidebar-desktop-layout bg-white border-r border-outline-variant/30 fixed top-0 bottom-0 z-20">
        <div className="h-16 flex items-center px-6 border-b border-outline-variant/30">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="HOANTIENVIP" className="h-9 w-auto object-contain" />
          </Link>
        </div>
        
        {/* User Card */}
        <div className="p-4 border-b border-outline-variant/20 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-container text-white flex items-center justify-center font-bold">
            {initials}
          </div>
          <div className="text-left min-w-0">
            <p className="text-sm font-bold text-on-surface truncate">{user?.name ?? 'Thành viên'}</p>
            <p className="text-xs text-on-surface-variant truncate">{user?.email ?? 'Tài khoản thành viên'}</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4 flex flex-col gap-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl font-label-md text-sm font-semibold transition-all duration-200
                  ${isActive 
                    ? 'bg-primary-container text-white font-bold shadow-sm' 
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-primary'
                  }
                `}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}

          {user?.role === 'admin' && (
            <Link
              to="/admin"
              className="flex items-center gap-3 px-4 py-3 rounded-xl font-label-md text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors mt-4"
            >
              <ShieldAlert size={20} />
              <span>Trang quản trị (Admin)</span>
            </Link>
          )}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-outline-variant/20">
          <button 
            type="button"
            onClick={() => void handleLogout()}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-label-md text-sm font-semibold text-on-surface-variant hover:bg-error-container/20 hover:text-error transition-colors cursor-pointer"
          >
            <LogOut size={20} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 content-desktop-layout pb-16 lg:pb-0 flex flex-col min-w-0">
        {/* Top Header Navbar */}
        <header className="h-16 bg-white border-b border-outline-variant/30 flex items-center justify-between px-4 md:px-6 sticky top-0 z-10 shadow-sm md:shadow-none">
          <div className="flex items-center gap-3 lg:hidden">
            <Link to="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="HOANTIENVIP" className="h-8 w-auto object-contain" />
            </Link>
          </div>
          <div className="hidden lg:flex items-center gap-2 text-sm font-semibold text-on-surface-variant">
            <span>Chào mừng trở lại,</span>
            <span className="text-on-surface font-bold">{user?.name ?? 'Thành viên'}</span>
          </div>

          <div className="flex items-center gap-4 ml-auto">
            {/* Quick Balance */}
            <div className="bg-tertiary/10 border border-tertiary/20 rounded-xl px-3 py-1.5 hidden sm:flex items-center gap-1.5 text-xs font-bold text-tertiary">
              <CreditCard size={14} />
              <span>Khả dụng: 425.000đ</span>
            </div>
            
            <button aria-label="Mở trung tâm thông báo" onClick={() => navigate('/dashboard/notifications')} className="p-2 text-outline hover:text-on-surface hover:bg-surface-container rounded-full transition-colors relative cursor-pointer">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
            </button>
          </div>
        </header>

        {/* Dynamic page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto w-full text-left">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Tab Bar Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 min-h-16 pb-[env(safe-area-inset-bottom)] bg-white border-t border-outline-variant/30 flex justify-around items-center lg:hidden z-30 shadow-2xl">
        {menuItems.slice(0, 4).map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex flex-col items-center justify-center flex-1 h-full gap-1 text-[10px] font-bold transition-all
                ${isActive ? 'text-primary' : 'text-on-surface-variant/80'}
              `}
            >
              {React.cloneElement(item.icon, { size: 18 })}
              <span className="truncate max-w-[70px]">{item.label}</span>
            </Link>
          );
        })}
        <Link
          to="/dashboard/settings"
          className={`
            flex flex-col items-center justify-center flex-1 h-full gap-1 text-[10px] font-bold transition-all
            ${location.pathname === '/dashboard/settings' ? 'text-primary' : 'text-on-surface-variant/80'}
          `}
        >
          <User size={18} />
          <span>Tài khoản</span>
        </Link>
      </nav>
    </div>
  );
};

// Admin Layout
export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout().catch(() => undefined);
    navigate('/login', { replace: true });
  };

  const menuItems = [
    { label: 'Thống kê chỉ số', path: '/admin', icon: <LayoutDashboard size={20} /> },
    { label: 'Đơn hàng & Đối soát', path: '/admin/management', icon: <History size={20} /> },
    { label: 'Cấu hình hoa hồng', path: '/admin/cashback-rules', icon: <CreditCard size={20} /> },
    { label: 'Khuyến mãi & Rewards', path: '/admin/promotions', icon: <Award size={20} /> },
    { label: 'Đồng bộ Provider', path: '/admin/provider-sync', icon: <RefreshCw size={20} /> },
    { label: 'Cấu hình thanh toán', path: '/admin/payment-settings', icon: <WalletCards size={20} /> },
    { label: 'Quản trị nhân sự', path: '/admin/staff-security', icon: <ShieldAlert size={20} /> },
    { label: 'Thông báo & Banner', path: '/admin/content-notifications', icon: <Bell size={20} /> },
    { label: 'Quay lại User Dashboard', path: '/dashboard', icon: <User size={20} /> },
    { label: 'Trang chủ công khai', path: '/', icon: <Home size={20} /> },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col sidebar-desktop-layout bg-white text-on-surface fixed top-0 bottom-0 z-20 border-r border-outline-variant/40">
        <div className="h-16 flex items-center justify-between px-5 border-b border-outline-variant/30">
          <img src="/logo.png" alt="HOANTIENVIP" className="h-8 w-auto object-contain" />
          <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">Admin</span>
        </div>
        
        {/* User Card */}
        <div className="p-4 border-b border-outline-variant/20 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-container text-white flex items-center justify-center font-bold">
            AD
          </div>
          <div className="text-left min-w-0">
            <p className="text-sm font-bold text-on-surface truncate">{user?.name ?? 'Quản trị viên'}</p>
            <p className="text-xs text-on-surface-variant truncate">{user?.publicId ?? 'ADMIN'}</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4 flex flex-col gap-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl font-label-md text-sm font-semibold transition-all duration-200
                  ${isActive 
                    ? 'bg-primary-container text-white font-bold shadow-sm' 
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-primary'
                  }
                `}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-outline-variant/20">
          <button 
            type="button"
            onClick={() => void handleLogout()}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-label-md text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors cursor-pointer"
          >
            <LogOut size={20} />
            <span>Thoát hệ thống</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 content-desktop-layout pb-16 lg:pb-0 flex flex-col min-w-0">
        {/* Top Header Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 sticky top-0 z-10">
          <div className="flex items-center gap-2 lg:hidden">
            <img src="/logo.png" alt="HOANTIENVIP" className="h-8 w-auto object-contain" />
            <span className="text-xs bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">Admin</span>
          </div>
          <div className="hidden lg:flex items-center gap-2 text-sm font-semibold text-on-surface-variant">
            <span>Bảng điều khiển quản trị viên</span>
          </div>
        </header>

        {/* Dynamic page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto w-full text-left">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Tab Bar Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 min-h-16 pb-[env(safe-area-inset-bottom)] bg-white border-t border-outline-variant/30 flex justify-around items-center lg:hidden z-30 shadow-2xl">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex flex-col items-center justify-center flex-1 h-full gap-1 text-[10px] font-bold transition-all
                ${isActive ? 'text-primary' : 'text-on-surface-variant'}
              `}
            >
              {React.cloneElement(item.icon, { size: 18 })}
              <span className="truncate max-w-[80px]">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
