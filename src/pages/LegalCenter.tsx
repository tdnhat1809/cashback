import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Home, ChevronRight, FileText, Shield, CreditCard, 
  AlertTriangle, Cookie, Download, Calendar, Info, Headset, X 
} from 'lucide-react';
import { Button } from '../components/Button';
import { ToastContainer } from '../components/Toast';
import { defaultToastState, triggerToast } from '../components/toast-state';
import type { ToastState } from '../components/toast-state';

type LegalTab = 'terms' | 'privacy' | 'cashback' | 'fraud' | 'cookies';

export const LegalCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<LegalTab>('terms');
  const [showCookieBanner, setShowCookieBanner] = useState(true);
  const [showCookieModal, setShowCookieModal] = useState(false);
  const [toast, setToast] = useState<ToastState>(defaultToastState);

  // Read preferences on load
  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (consent) {
      setShowCookieBanner(false);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem('cookieConsent', 'all');
    setShowCookieBanner(false);
    triggerToast(setToast, 'Đã chấp nhận tất cả cookie để tối ưu hóa trải nghiệm.', 'success');
  };

  const handleAcceptNecessary = () => {
    localStorage.setItem('cookieConsent', 'necessary');
    setShowCookieBanner(false);
    triggerToast(setToast, 'Chỉ chấp nhận các cookie kỹ thuật cần thiết.', 'info');
  };

  const handleSavePreferences = () => {
    localStorage.setItem('cookieConsent', 'custom');
    setShowCookieBanner(false);
    setShowCookieModal(false);
    triggerToast(setToast, 'Đã lưu thiết lập cookie tùy chọn.', 'success');
  };

  const handleDownloadPDF = () => {
    triggerToast(setToast, 'Đang chuẩn bị tải tài liệu PDF điều khoản...', 'info');
    setTimeout(() => {
      triggerToast(setToast, 'Tải xuống thành công!', 'success');
    }, 1500);
  };

  // Verbatim content for tabs
  const tabTitles = {
    terms: 'Điều khoản sử dụng',
    privacy: 'Chính sách bảo mật',
    cashback: 'Chính sách cashback',
    fraud: 'Chính sách chống gian lận',
    cookies: 'Chính sách cookie'
  };

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-8 text-left sm:px-6 sm:py-10">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 mb-6 text-on-surface-variant font-label-sm text-xs font-semibold">
        <Link to="/" className="hover:text-primary flex items-center gap-1">
          <Home size={15} /> Trang chủ
        </Link>
        <ChevronRight size={14} className="text-outline-variant" />
        <span className="text-primary font-black">Trung tâm pháp lý</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Sidebar Navigation */}
        <aside className="md:col-span-4 lg:col-span-3 md:sticky md:top-24">
          <div className="bg-surface-container-low rounded-[24px] p-5 border border-outline-variant/30 shadow-soft">
            <h2 className="font-title-lg text-base font-bold mb-4 text-on-surface px-2">Pháp lý &amp; Bảo mật</h2>
            
            {/* Desktop Navigation */}
            <nav className="space-y-1.5 hidden md:block">
              <button 
                onClick={() => setActiveTab('terms')}
                className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold transition-all ${
                  activeTab === 'terms' 
                    ? 'bg-primary-container text-white shadow-sm' 
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <FileText size={18} />
                <span>Điều khoản sử dụng</span>
              </button>

              <button 
                onClick={() => setActiveTab('privacy')}
                className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold transition-all ${
                  activeTab === 'privacy' 
                    ? 'bg-primary-container text-white shadow-sm' 
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <Shield size={18} />
                <span>Chính sách bảo mật</span>
              </button>

              <button 
                onClick={() => setActiveTab('cashback')}
                className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold transition-all ${
                  activeTab === 'cashback' 
                    ? 'bg-primary-container text-white shadow-sm' 
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <CreditCard size={18} />
                <span>Chính sách cashback</span>
              </button>

              <button 
                onClick={() => setActiveTab('fraud')}
                className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold transition-all ${
                  activeTab === 'fraud' 
                    ? 'bg-primary-container text-white shadow-sm' 
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <AlertTriangle size={18} />
                <span>Chính sách chống gian lận</span>
              </button>

              <button 
                onClick={() => setActiveTab('cookies')}
                className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold transition-all ${
                  activeTab === 'cookies' 
                    ? 'bg-primary-container text-white shadow-sm' 
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <Cookie size={18} />
                <span>Chính sách cookie</span>
              </button>
            </nav>

            {/* Mobile Navigation Dropdown/Selector */}
            <div className="md:hidden mb-4">
              <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Chọn tài liệu pháp lý</label>
              <select 
                value={activeTab} 
                onChange={(e) => setActiveTab(e.target.value as LegalTab)}
                className="w-full px-3 py-2.5 bg-white border border-outline-variant/50 rounded-xl text-xs outline-none font-bold text-primary"
              >
                <option value="terms">Điều khoản sử dụng</option>
                <option value="privacy">Chính sách bảo mật</option>
                <option value="cashback">Chính sách cashback</option>
                <option value="fraud">Chính sách chống gian lận</option>
                <option value="cookies">Chính sách cookie</option>
              </select>
            </div>

            <div className="mt-6 pt-5 border-t border-outline-variant/30">
              <Button 
                variant="primary" 
                onClick={handleDownloadPDF}
                className="w-full flex items-center justify-center gap-2 py-3 shadow-soft"
                icon={<Download size={16} />}
              >
                Tải PDF ({tabTitles[activeTab]})
              </Button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="md:col-span-8 lg:col-span-9 space-y-6">
          <article className="bg-white rounded-[24px] p-6 sm:p-10 border border-outline-variant/20 shadow-soft relative overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                <h1 className="font-headline-md text-2xl font-bold text-on-surface">{tabTitles[activeTab]}</h1>
                <p className="font-label-sm text-xs text-on-surface-variant/80 mt-1.5 flex items-center gap-1.5 font-semibold">
                  <Calendar size={14} className="text-primary" /> Ngày cập nhật: 15 tháng 10, 2024
                </p>
              </div>
            </div>

            {/* Important Alert Block */}
            <div className="bg-primary/5 text-on-primary-container p-5 rounded-xl mb-8 flex gap-4 items-start border border-primary/10">
              <Info className="text-primary shrink-0 mt-0.5" size={24} />
              <div>
                <p className="font-title-lg text-sm font-bold text-primary mb-1">Lưu ý quan trọng</p>
                <p className="font-body-md text-xs leading-relaxed text-on-surface-variant">
                  Bằng việc sử dụng dịch vụ của HOANTIENVIP, bạn xác nhận đã đọc và đồng ý với tất cả các điều khoản nêu dưới đây. Chúng tôi khuyến nghị bạn nên lưu lại một bản sao cho hồ sơ của mình.
                </p>
              </div>
            </div>

            {/* Tab Specific Content */}
            {activeTab === 'terms' && (
              <div className="space-y-6 text-on-surface-variant">
                <section>
                  <h3 className="font-title-lg text-sm font-bold text-on-surface mb-2 border-l-4 border-primary pl-3">1. Định nghĩa và Diễn giải</h3>
                  <p className="font-body-md text-xs leading-relaxed pl-4">
                    "HOANTIENVIP" đề cập đến nền tảng và dịch vụ được vận hành bởi Công ty TNHH Công nghệ Tài chính VIP. "Người dùng" là cá nhân hoặc tổ chức đăng ký tài khoản thành công trên hệ thống của chúng tôi để hưởng các ưu đãi cashback khi mua sắm trực tuyến.
                  </p>
                </section>
                <section>
                  <h3 className="font-title-lg text-sm font-bold text-on-surface mb-2 border-l-4 border-primary pl-3">2. Điều kiện tham gia</h3>
                  <p className="font-body-md text-xs leading-relaxed pl-4">
                    Bạn phải đủ 18 tuổi trở lên để tham gia hệ thống. Mỗi cá nhân chỉ được phép sở hữu một (01) tài khoản duy nhất. Việc tạo nhiều tài khoản ảo sẽ bị coi là vi phạm nghiêm trọng chính sách của chúng tôi.
                  </p>
                </section>
                <section>
                  <h3 className="font-title-lg text-sm font-bold text-on-surface mb-2 border-l-4 border-primary pl-3">3. Quy trình tính Hoàn tiền</h3>
                  <p className="font-body-md text-xs leading-relaxed pl-4 mb-4">
                    Hoàn tiền được tính dựa trên giá trị đơn hàng thuần (sau khi trừ các mã giảm giá, phí vận chuyển và thuế) từ các đối tác thương mại. Quy trình phê duyệt thường mất từ 30 đến 90 ngày tùy thuộc vào chính sách đổi trả của nhà cung cấp.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-surface-container p-4 rounded-xl text-center">
                      <p className="text-lg font-black text-primary mb-0.5">90%</p>
                      <p className="text-[10px] font-bold text-on-surface-variant">Tỷ lệ duyệt thành công</p>
                    </div>
                    <div className="bg-surface-container p-4 rounded-xl text-center">
                      <p className="text-lg font-black text-primary mb-0.5">48h</p>
                      <p className="text-[10px] font-bold text-on-surface-variant">Thời gian ghi nhận đơn</p>
                    </div>
                    <div className="bg-surface-container p-4 rounded-xl text-center">
                      <p className="text-lg font-black text-primary mb-0.5">50k</p>
                      <p className="text-[10px] font-bold text-on-surface-variant">Số dư tối thiểu rút</p>
                    </div>
                  </div>
                </section>
                <section>
                  <h3 className="font-title-lg text-sm font-bold text-on-surface mb-2 border-l-4 border-primary pl-3">4. Rút tiền và Hạn mức</h3>
                  <p className="font-body-md text-xs leading-relaxed pl-4">
                    Người dùng có thể yêu cầu rút tiền khi số dư khả dụng đạt tối thiểu 50,000 VNĐ. Tiền sẽ được chuyển vào tài khoản ngân hàng hoặc ví điện tử đã liên kết trong vòng 3-5 ngày làm việc.
                  </p>
                </section>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="space-y-6 text-on-surface-variant">
                <section>
                  <h3 className="font-title-lg text-sm font-bold text-on-surface mb-2 border-l-4 border-primary pl-3">1. Thu thập thông tin</h3>
                  <p className="font-body-md text-xs leading-relaxed pl-4">
                    Chúng tôi thu thập các thông tin cần thiết gồm email, họ tên và thông tin tài khoản ngân hàng khi bạn thực hiện yêu cầu rút tiền.
                  </p>
                </section>
                <section>
                  <h3 className="font-title-lg text-sm font-bold text-on-surface mb-2 border-l-4 border-primary pl-3">2. Sử dụng thông tin</h3>
                  <p className="font-body-md text-xs leading-relaxed pl-4">
                    Thông tin thu thập chỉ được sử dụng cho việc đối soát trạng thái đơn hàng hoàn tiền từ Shopee/TikTok Shop, ghi nhận hoa hồng và thanh toán lệnh rút tiền của bạn.
                  </p>
                </section>
                <section>
                  <h3 className="font-title-lg text-sm font-bold text-on-surface mb-2 border-l-4 border-primary pl-3">3. Bảo mật dữ liệu</h3>
                  <p className="font-body-md text-xs leading-relaxed pl-4">
                    Dữ liệu người dùng được mã hóa qua chuẩn SSL/TLS khi truyền tải và lưu trữ trên cụm máy chủ đám mây bảo mật có tường lửa nghiêm ngặt.
                  </p>
                </section>
              </div>
            )}

            {activeTab === 'cashback' && (
              <div className="space-y-6 text-on-surface-variant">
                <section>
                  <h3 className="font-title-lg text-sm font-bold text-on-surface mb-2 border-l-4 border-primary pl-3">1. Cơ chế hoạt động của Affiliate</h3>
                  <p className="font-body-md text-xs leading-relaxed pl-4">
                    HOANTIENVIP nhận tiền hoa hồng quảng cáo từ các sàn TMĐT khi bạn mua hàng qua link của chúng tôi. Chúng tôi chia sẻ lại tới 90% phần hoa hồng này cho bạn dưới dạng Tiền Hoàn (Cashback).
                  </p>
                </section>
                <section>
                  <h3 className="font-title-lg text-sm font-bold text-on-surface mb-2 border-l-4 border-primary pl-3">2. Lý do đơn hàng bị hủy/không tính hoàn tiền</h3>
                  <p className="font-body-md text-xs leading-relaxed pl-4">
                    Đơn hàng sẽ không được ghi nhận hoàn tiền nếu bạn hủy đơn, trả hàng/hoàn tiền, sử dụng các công cụ chặn quảng cáo (Adblock) làm mất cookie affiliate, hoặc mua hàng tự phát không thông qua link đã tạo.
                  </p>
                </section>
              </div>
            )}

            {activeTab === 'fraud' && (
              <div className="space-y-6 text-on-surface-variant">
                <section>
                  <h3 className="font-title-lg text-sm font-bold text-on-surface mb-2 border-l-4 border-primary pl-3">1. Định nghĩa gian lận</h3>
                  <p className="font-body-md text-xs leading-relaxed pl-4">
                    Các hành vi cố tình tạo nhiều tài khoản để lạm dụng giftcode chào mừng, tự mua đơn ảo chéo để ăn chênh lệch hoa hồng xiên sàn, hoặc hack can thiệp số dư hệ thống sẽ bị coi là gian lận.
                  </p>
                </section>
                <section>
                  <h3 className="font-title-lg text-sm font-bold text-on-surface mb-2 border-l-4 border-primary pl-3">2. Biện pháp xử lý</h3>
                  <p className="font-body-md text-xs leading-relaxed pl-4">
                    Tài khoản vi phạm sẽ bị khóa vĩnh viễn, toàn bộ số dư hoàn tiền đang chờ duyệt hoặc khả dụng sẽ bị đóng băng tịch thu và hệ thống sẽ từ chối cung cấp dịch vụ trọn đời.
                  </p>
                </section>
              </div>
            )}

            {activeTab === 'cookies' && (
              <div className="space-y-6 text-on-surface-variant">
                <section>
                  <h3 className="font-title-lg text-sm font-bold text-on-surface mb-2 border-l-4 border-primary pl-3">1. Tại sao cần cookie?</h3>
                  <p className="font-body-md text-xs leading-relaxed pl-4">
                    Cookie là tệp tin văn bản nhỏ lưu trên trình duyệt của bạn giúp HOANTIENVIP theo vết phiên mua sắm của bạn sang Shopee/TikTok Shop để đối soát chính xác đơn hàng nào thuộc về bạn để cộng tiền.
                  </p>
                </section>
                <section>
                  <h3 className="font-title-lg text-sm font-bold text-on-surface mb-2 border-l-4 border-primary pl-3">2. Quản lý tùy chọn</h3>
                  <p className="font-body-md text-xs leading-relaxed pl-4">
                    Bạn có thể tắt cookie quảng cáo/phân tích tại cài đặt dưới đây hoặc chặn trực tiếp trên trình duyệt, tuy nhiên việc này có thể làm lỗi tính năng tự động ghi nhận đơn hàng hoàn tiền.
                  </p>
                </section>
              </div>
            )}
          </article>

          {/* Helpful Card */}
          <div className="bg-tertiary-container/10 border border-tertiary-container/30 p-6 rounded-[24px] flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-tertiary-container rounded-full flex items-center justify-center text-white shrink-0">
                <Headset size={24} />
              </div>
              <div className="text-left">
                <p className="font-title-lg text-sm font-bold text-on-surface">Cần giải đáp thêm?</p>
                <p className="font-body-md text-xs text-on-surface-variant">Đội ngũ pháp lý của chúng tôi luôn sẵn sàng hỗ trợ bạn.</p>
              </div>
            </div>
            <Link 
              to="/dashboard/support/TK123"
              className="bg-white text-tertiary border-2 border-tertiary px-6 py-2.5 rounded-full font-bold text-xs hover:bg-tertiary-container hover:text-white transition-all whitespace-nowrap active:scale-[0.97]"
            >
              Liên hệ ngay
            </Link>
          </div>
        </div>
      </div>

      {/* Cookie Consent Banner */}
      {showCookieBanner && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-[800px] bg-white/95 backdrop-blur-md rounded-[24px] shadow-2xl p-5 border border-primary/10 z-[100] transform transition-all duration-500">
          <div className="flex flex-col md:flex-row items-center gap-5">
            <div className="flex-shrink-0 bg-primary/10 p-3 rounded-full text-primary">
              <Cookie size={32} />
            </div>
            <div className="flex-grow text-center md:text-left">
              <p className="font-title-lg text-sm font-bold text-on-surface mb-0.5">Chúng tôi trân trọng sự riêng tư của bạn</p>
              <p className="font-body-md text-xs text-on-surface-variant leading-normal">
                Chúng tôi sử dụng cookie để cải thiện trải nghiệm mua sắm và hoàn tiền của bạn. Bạn có thể tìm hiểu thêm tại{' '}
                <button onClick={() => { setActiveTab('cookies'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-primary underline font-semibold">Chính sách Cookie</button>.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto shrink-0">
              <button 
                onClick={() => setShowCookieModal(true)} 
                className="px-4 py-2 rounded-full border border-outline text-xs font-bold text-on-surface hover:bg-surface-container-low transition-colors"
              >
                Tùy chỉnh
              </button>
              <button 
                onClick={handleAcceptNecessary} 
                className="px-4 py-2 rounded-full border border-primary text-xs font-bold text-primary hover:bg-primary/5 transition-colors"
              >
                Chỉ cần thiết
              </button>
              <button 
                onClick={handleAcceptAll} 
                className="px-5 py-2 rounded-full bg-primary-container text-white text-xs font-bold shadow-lg hover:opacity-90 transition-all active:scale-[0.97]"
              >
                Chấp nhận tất cả
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cookie Customization Modal */}
      {showCookieModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] w-full max-w-[600px] shadow-2xl overflow-hidden flex flex-col border border-outline-variant/30 text-left">
            <div className="p-6 border-b border-outline-variant/20 flex justify-between items-center bg-surface-container-low/40">
              <h3 className="font-headline-md text-base font-bold text-on-surface">Cài đặt Cookie</h3>
              <button 
                className="w-10 h-10 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant" 
                onClick={() => setShowCookieModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-title-lg text-sm font-bold text-on-surface mb-0.5">Cookie cần thiết</p>
                  <p className="font-body-md text-xs text-on-surface-variant leading-normal">Bắt buộc để trang web hoạt động bình thường, bao gồm đăng nhập và bảo mật.</p>
                </div>
                <div className="mt-1 relative inline-flex items-center cursor-not-allowed">
                  <div className="w-11 h-6 bg-primary rounded-full opacity-40"></div>
                  <div className="absolute left-6 w-4 h-4 bg-white rounded-full"></div>
                </div>
              </div>

              <div className="flex items-start justify-between gap-4 border-t border-outline-variant/20 pt-4">
                <div>
                  <p className="font-title-lg text-sm font-bold text-on-surface mb-0.5">Phân tích &amp; Thống kê</p>
                  <p className="font-body-md text-xs text-on-surface-variant leading-normal">Giúp chúng tôi hiểu cách người dùng tương tác để cải thiện hệ thống cashback.</p>
                </div>
                <label className="mt-1 relative inline-flex items-center cursor-pointer select-none">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div className="flex items-start justify-between gap-4 border-t border-outline-variant/20 pt-4">
                <div>
                  <p className="font-title-lg text-sm font-bold text-on-surface mb-0.5">Quảng cáo cá nhân hóa</p>
                  <p className="font-body-md text-xs text-on-surface-variant leading-normal">Hiển thị các ưu đãi và khuyến mãi phù hợp với sở thích mua sắm của bạn.</p>
                </div>
                <label className="mt-1 relative inline-flex items-center cursor-pointer select-none">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>

            <div className="p-6 bg-surface-container-low border-t border-outline-variant/20 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowCookieModal(false)}>
                Hủy
              </Button>
              <Button variant="primary" onClick={handleSavePreferences}>
                Lưu tùy chọn
              </Button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toast={toast} setToast={setToast} />
    </div>
  );
};
