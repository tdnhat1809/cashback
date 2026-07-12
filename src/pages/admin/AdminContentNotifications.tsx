import React, { useState } from 'react';
import { mockAdminPromoBanners, mockAdminPushNotifications } from '../../mockData';
import type { AdminPromoBanner, AdminPushNotification } from '../../mockData';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { ToastContainer } from '../../components/Toast';
import { defaultToastState, triggerToast } from '../../components/toast-state';
import type { ToastState } from '../../components/toast-state';
import { 
  Bell, Image, Search, Plus, Trash2, Edit, Send, 
  Calendar, Users, HelpCircle, Star, Sparkles
} from 'lucide-react';

export const AdminContentNotifications: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'banners' | 'push' | 'faq' | 'deals'>('banners');
  const banners: AdminPromoBanner[] = mockAdminPromoBanners;
  const notifications: AdminPushNotification[] = mockAdminPushNotifications;
  
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState<ToastState>(defaultToastState);

  // Push Form State
  const [pushTitle, setPushTitle] = useState('Chào mừng Tết Dương Lịch 2026!');
  const [pushBody, setPushBody] = useState('HOANTIENVIP lì xì Tết ngay +50.000đ vào ví khả dụng. Vào nhận quà ngay thôi nào!');
  const [pushTarget, setPushTarget] = useState('All Users');
  const [pushSchedule, setPushSchedule] = useState('');

  // Search filter
  const filteredBanners = banners.filter(b => 
    b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.link.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredNotifications = notifications.filter(n =>
    n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.body.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handlers
  const handleAddBanner = () => {
    triggerToast(setToast, 'Chưa thể thêm banner vì backend quản trị nội dung chưa được triển khai.', 'info');
  };

  const handleDeleteBanner = (_id: string, _title: string) => {
    triggerToast(setToast, 'Chưa thể xóa banner vì backend quản trị nội dung chưa được triển khai.', 'info');
  };

  const handleSendPush = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pushTitle.trim() || !pushBody.trim()) {
      triggerToast(setToast, 'Vui lòng nhập tiêu đề và nội dung thông báo.', 'error');
      return;
    }

    triggerToast(
      setToast,
      'Chưa thể gửi hoặc lên lịch thông báo vì dịch vụ push chưa được triển khai.',
      'info'
    );
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/20 pb-4">
        <div>
          <h1 className="font-headline-md text-xl font-bold text-primary text-wrap-balance">Quản lý nội dung & Thông báo</h1>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-on-surface-variant">Xem trước banner, chiến dịch thông báo, FAQ và deal nổi bật trong cùng một không gian biên tập.</p>
        </div>

        <div className="flex items-center gap-3">
          <label className="relative flex w-full items-center rounded-xl border border-outline-variant/30 bg-white px-3 py-2 focus-within:border-primary sm:w-64">
            <Search className="mr-2 text-on-surface-variant" size={16} aria-hidden="true" />
            <span className="sr-only">Tìm kiếm tài nguyên</span>
            <input
              type="search"
              placeholder="Tìm kiếm tài nguyên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border-none bg-transparent text-xs outline-none placeholder:text-on-surface-variant/40"
            />
          </label>
        </div>
      </header>

      <div className="rounded-2xl border border-amber-500/20 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900" role="status">
        <strong>Chế độ xem trước:</strong> backend xuất bản nội dung và dịch vụ push chưa được kết nối. Các nút thao tác bên dưới không lưu, xóa hoặc gửi dữ liệu thật.
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-outline-variant/30 text-sm font-bold scrollbar-none">
        <button 
          onClick={() => setActiveTab('banners')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 transition-colors cursor-pointer
            ${activeTab === 'banners' ? 'text-primary border-primary' : 'text-on-surface-variant hover:text-primary border-transparent'}
          `}
        >
          <Image size={16} /> Banner trang chủ
        </button>
        <button 
          onClick={() => setActiveTab('push')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 transition-colors cursor-pointer
            ${activeTab === 'push' ? 'text-primary border-primary' : 'text-on-surface-variant hover:text-primary border-transparent'}
          `}
        >
          <Bell size={16} /> Thông báo người dùng
        </button>
        <button 
          onClick={() => setActiveTab('faq')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 transition-colors cursor-pointer
            ${activeTab === 'faq' ? 'text-primary border-primary' : 'text-on-surface-variant hover:text-primary border-transparent'}
          `}
        >
          <HelpCircle size={16} /> Quản lý FAQ
        </button>
        <button 
          onClick={() => setActiveTab('deals')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 transition-colors cursor-pointer
            ${activeTab === 'deals' ? 'text-primary border-primary' : 'text-on-surface-variant hover:text-primary border-transparent'}
          `}
        >
          <Sparkles size={16} /> Deal nổi bật
        </button>
      </div>

      {/* Tab contents */}
      <div className="space-y-6">
        
        {/* Banner Tab */}
        {activeTab === 'banners' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-title-lg text-sm font-bold text-on-surface">Banner mẫu để xem trước</h3>
              <Button
                variant="primary"
                onClick={handleAddBanner}
                icon={<Plus size={16} />}
                className="shadow-soft"
              >
                Thêm Banner mới
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredBanners.map((banner) => (
                <div 
                  key={banner.id} 
                  className="bg-white rounded-3xl overflow-hidden border border-outline-variant/30 shadow-soft group hover:border-primary/20 transition-all flex flex-col"
                >
                  <div className="h-44 bg-surface-container relative overflow-hidden">
                    <img 
                      src={banner.imageUrl} 
                      alt={banner.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                    <div className="absolute top-3 right-3">
                      <Badge variant="success">Mẫu hiển thị</Badge>
                    </div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between text-left">
                    <div className="space-y-2">
                      <h4 className="font-bold text-sm text-on-surface leading-snug">{banner.title}</h4>
                      <p className="text-[10px] text-primary font-mono font-bold truncate">{banner.link}</p>
                    </div>

                    <div className="flex items-center justify-between border-t border-outline-variant/10 pt-4 mt-4">
                      <div>
                        <span className="text-[8px] font-black uppercase text-on-surface-variant tracking-wider block">Thời hạn mẫu</span>
                        <span className="text-[10px] font-bold text-on-surface">{banner.startDate} ~ {banner.endDate}</span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={handleAddBanner}
                          className="p-2 text-on-surface-variant hover:text-primary rounded-lg hover:bg-surface-container-low transition-colors cursor-pointer"
                          aria-label={`Xem trạng thái chỉnh sửa banner ${banner.title}`}
                        >
                          <Edit size={16} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteBanner(banner.id, banner.title)}
                          className="p-2 text-on-surface-variant hover:text-error rounded-lg hover:bg-surface-container-low transition-colors cursor-pointer"
                          aria-label={`Xem trạng thái xóa banner ${banner.title}`}
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddBanner}
                className="bg-surface-container-low/40 border-2 border-dashed border-outline-variant/50 rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-surface-container-low transition-all min-h-[300px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-on-surface-variant/70 border border-outline-variant/30 mb-4 shadow-sm">
                  <Image size={22} aria-hidden="true" />
                </span>
                <span className="text-xs font-bold text-on-surface">Trình tải banner chưa khả dụng</span>
                <span className="text-[10px] text-on-surface-variant max-w-[220px] mt-1 leading-normal">
                  Sau khi kết nối backend, khu vực này sẽ nhận ảnh JPG/PNG tỷ lệ 3:1 và thông tin xuất bản.
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Push Notification Tab */}
        {activeTab === 'push' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Sent logs */}
            <div className="lg:col-span-7 space-y-4">
              <h3 className="font-title-lg text-sm font-bold text-on-surface">Thông báo mẫu để xem trước</h3>
              
              <div className="space-y-3">
                {filteredNotifications.map((notif) => (
                  <div 
                    key={notif.id}
                    className="bg-white p-5 rounded-3xl border border-outline-variant/30 shadow-soft flex items-start justify-between gap-4"
                  >
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center shrink-0">
                        <Bell size={20} />
                      </div>
                      <div className="text-left space-y-1">
                        <h5 className="font-bold text-sm text-on-surface leading-tight">{notif.title}</h5>
                        <p className="text-xs text-on-surface-variant leading-relaxed">{notif.body}</p>
                        <div className="flex items-center gap-3 pt-1 text-[10px] text-on-surface-variant font-bold">
                          <span className="flex items-center gap-0.5"><Users size={12} /> {notif.target} ({notif.sentCount.toLocaleString()})</span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5"><Calendar size={12} /> {notif.sentDate || notif.scheduleTime}</span>
                        </div>
                      </div>
                    </div>

                    <Badge variant={notif.status === 'Delivered' ? 'success' : 'warning'}>
                      {notif.status === 'Delivered' ? 'Mẫu: đã gửi' : 'Mẫu: chờ gửi'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Creator Push Form */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-outline-variant/30 shadow-soft">
                <h3 className="font-title-lg text-sm font-bold text-primary mb-5 flex items-center gap-1.5 border-b border-outline-variant/20 pb-3">
                  <Send size={18} /> Soạn tin Push Notification
                </h3>

                <form onSubmit={handleSendPush} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Tiêu đề thông báo</label>
                    <input 
                      type="text" 
                      value={pushTitle}
                      onChange={(e) => setPushTitle(e.target.value)}
                      placeholder="Nhập tiêu đề..."
                      maxLength={60}
                      className="w-full px-4 py-3 bg-surface-container-low/40 border border-outline-variant/40 rounded-xl text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Nội dung chi tiết</label>
                    <textarea 
                      value={pushBody}
                      onChange={(e) => setPushBody(e.target.value)}
                      placeholder="Nhập nội dung thông báo..."
                      maxLength={150}
                      rows={3}
                      className="w-full px-4 py-3 bg-surface-container-low/40 border border-outline-variant/40 rounded-xl text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Đối tượng nhận</label>
                      <select 
                        value={pushTarget}
                        onChange={(e) => setPushTarget(e.target.value)}
                        className="w-full px-3 py-3 bg-surface-container-low/40 border border-outline-variant/40 rounded-xl text-xs outline-none focus:border-primary font-semibold"
                      >
                        <option value="All Users">Tất cả (All Users)</option>
                        <option value="Gold Tier Only">Thành viên hạng Vàng (Gold Tier)</option>
                        <option value="Inactive (30+ days)">Inactive (30+ ngày không mua)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Hẹn giờ gửi</label>
                      <input 
                        type="datetime-local" 
                        value={pushSchedule}
                        onChange={(e) => setPushSchedule(e.target.value)}
                        className="w-full px-3 py-2 bg-surface-container-low/40 border border-outline-variant/40 rounded-xl text-xs outline-none focus:border-primary font-semibold"
                      />
                    </div>
                  </div>

                  {/* High Fidelity Mobile Preview */}
                  <div className="pt-3">
                    <span className="text-[10px] font-black uppercase text-on-surface-variant tracking-wider block mb-2">
                      Xem trước trên thiết bị di động
                    </span>
                    
                    <div className="bg-black p-4 rounded-[40px] border-[5px] border-slate-700 h-[190px] relative overflow-hidden flex flex-col items-center select-none shadow-md">
                      {/* Notch */}
                      <div className="w-20 h-4 bg-black rounded-b-2xl absolute top-0 z-20" />
                      
                      {/* Wallpaper simulated bg */}
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950" />

                      {/* Notif Card Bubble */}
                      <div className="w-full bg-white/10 backdrop-blur-xl border border-white/10 p-3.5 rounded-2xl flex gap-3 items-start relative z-10 mt-6 animate-pulse">
                        <div className="w-8 h-8 rounded-lg bg-primary-container text-white flex items-center justify-center shrink-0">
                          <Bell size={16} />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex justify-between items-center text-[8px] font-bold text-white/50 mb-0.5">
                            <span>HOANTIENVIP</span>
                            <span>vừa xong</span>
                          </div>
                          <h6 className="text-[10px] font-bold text-white leading-tight truncate">
                            {pushTitle || 'Nhập tiêu đề thông báo...'}
                          </h6>
                          <p className="text-[9px] text-white/80 leading-snug line-clamp-2 mt-0.5">
                            {pushBody || 'Nhập nội dung...'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-3 border-t border-outline-variant/20">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => { setPushTitle(''); setPushBody(''); }}
                      className="flex-1 py-3 hover:bg-surface-container"
                    >
                      Bản nháp
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      className="flex-1 py-3 font-bold shadow-soft"
                    >
                      Kiểm tra khả dụng
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* FAQ Placeholder */}
        {activeTab === 'faq' && (
          <div className="bg-white rounded-3xl border border-outline-variant/30 shadow-soft p-12 text-center flex flex-col items-center justify-center min-h-[350px]">
            <div className="w-16 h-16 bg-primary/5 text-primary rounded-full flex items-center justify-center mb-4">
              <HelpCircle size={32} />
            </div>
            <h3 className="font-bold text-base text-on-surface">FAQ Management Area</h3>
            <p className="text-xs text-on-surface-variant max-w-[340px] mt-1 leading-normal">
              Công cụ quản lý danh mục câu hỏi thường gặp, sửa câu trả lời tĩnh và phân nhóm hỗ trợ. Tính năng đang phát triển ở sprint tiếp theo.
            </p>
          </div>
        )}

        {/* Deals Placeholder */}
        {activeTab === 'deals' && (
          <div className="bg-white rounded-3xl border border-outline-variant/30 shadow-soft p-12 text-center flex flex-col items-center justify-center min-h-[350px]">
            <div className="w-16 h-16 bg-primary/5 text-primary rounded-full flex items-center justify-center mb-4">
              <Star size={32} />
            </div>
            <h3 className="font-bold text-base text-on-surface">Featured Deals Editor</h3>
            <p className="text-xs text-on-surface-variant max-w-[340px] mt-1 leading-normal">
              Trình quản trị nội dung các deals hot hiển thị ngoài trang chủ, tăng thưởng độc quyền cho đối tác. Tính năng đang được thiết lập.
            </p>
          </div>
        )}

      </div>

      <ToastContainer toast={toast} setToast={setToast} />
    </div>
  );
};
