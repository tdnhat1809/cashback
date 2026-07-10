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
  const [banners, setBanners] = useState<AdminPromoBanner[]>(mockAdminPromoBanners);
  const [notifications, setNotifications] = useState<AdminPushNotification[]>(mockAdminPushNotifications);
  
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
    const newBanner: AdminPromoBanner = {
      id: `b_${Date.now()}`,
      title: 'Đại tiệc công nghệ - Hoàn tiền tới 20%',
      imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800',
      link: 'hoantienvip.com/deals/tech-week',
      startDate: new Date().toISOString().substring(0, 10),
      endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
      status: 'Active'
    };
    setBanners(prev => [...prev, newBanner]);
    triggerToast(setToast, 'Đã tải lên và kích hoạt banner mới thành công.', 'success');
  };

  const handleDeleteBanner = (id: string, title: string) => {
    if (window.confirm(`Bạn có muốn xóa banner "${title}" không?`)) {
      setBanners(prev => prev.filter(b => b.id !== id));
      triggerToast(setToast, 'Đã gỡ bỏ banner thành công.', 'warning');
    }
  };

  const handleSendPush = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pushTitle.trim() || !pushBody.trim()) {
      triggerToast(setToast, 'Vui lòng nhập tiêu đề và nội dung thông báo.', 'error');
      return;
    }

    const created: AdminPushNotification = {
      id: `pn_${Date.now()}`,
      title: pushTitle.trim(),
      body: pushBody.trim(),
      target: pushTarget,
      sentCount: pushTarget === 'All Users' ? 124500 : pushTarget === 'Gold Tier Only' ? 12800 : 5400,
      status: pushSchedule ? 'Scheduled' : 'Delivered',
      sentDate: pushSchedule ? undefined : 'Hôm nay',
      scheduleTime: pushSchedule || undefined
    };

    setNotifications(prev => [created, ...prev]);
    triggerToast(
      setToast, 
      pushSchedule ? 'Đã lên lịch gửi thông báo thành công.' : 'Thông báo push đã được gửi đến thiết bị người dùng!', 
      'success'
    );

    // Reset inputs
    setPushTitle('');
    setPushBody('');
    setPushSchedule('');
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/20 pb-4">
        <div>
          <h1 className="font-headline-md text-xl font-bold text-primary">Quản lý nội dung & Thông báo</h1>
          <p className="text-xs text-on-surface-variant">Soạn thảo tin push báo động số dư, cập nhật banner trang chủ và danh sách hỏi đáp FAQ.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex items-center bg-white px-3 py-2 border border-outline-variant/30 focus-within:border-primary rounded-xl w-64">
            <Search className="text-on-surface-variant mr-2" size={16} />
            <input 
              type="text" 
              placeholder="Tìm kiếm tài nguyên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-xs w-full outline-none placeholder:text-on-surface-variant/40"
            />
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-outline-variant/30 text-sm font-bold">
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
              <h3 className="font-title-lg text-sm font-bold text-on-surface">Banners đang hiển thị</h3>
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
                      <Badge variant="success">Active</Badge>
                    </div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between text-left">
                    <div className="space-y-2">
                      <h4 className="font-bold text-sm text-on-surface leading-snug">{banner.title}</h4>
                      <p className="text-[10px] text-primary font-mono font-bold truncate">{banner.link}</p>
                    </div>

                    <div className="flex items-center justify-between border-t border-outline-variant/10 pt-4 mt-4">
                      <div>
                        <span className="text-[8px] font-black uppercase text-on-surface-variant tracking-wider block">Thời hạn</span>
                        <span className="text-[10px] font-bold text-on-surface">{banner.startDate} ~ {banner.endDate}</span>
                      </div>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => alert('Sửa đổi banner đang được xử lý...')}
                          className="p-2 text-on-surface-variant hover:text-primary rounded-lg hover:bg-surface-container-low transition-colors cursor-pointer"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteBanner(banner.id, banner.title)}
                          className="p-2 text-on-surface-variant hover:text-error rounded-lg hover:bg-surface-container-low transition-colors cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Upload Placeholder */}
              <div 
                onClick={handleAddBanner}
                className="bg-surface-container-low/40 border-2 border-dashed border-outline-variant/50 rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-surface-container-low transition-all min-h-[300px]"
              >
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-on-surface-variant/70 border border-outline-variant/30 mb-4 shadow-sm">
                  <Image size={22} />
                </div>
                <p className="text-xs font-bold text-on-surface">Tải lên Banner mới</p>
                <p className="text-[10px] text-on-surface-variant max-w-[200px] mt-1 leading-normal">
                  Định dạng ảnh JPG/PNG. Kích thước khuyến nghị: 1200x400px.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Push Notification Tab */}
        {activeTab === 'push' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Sent logs */}
            <div className="lg:col-span-7 space-y-4">
              <h3 className="font-title-lg text-sm font-bold text-on-surface">Lịch sử thông báo đã gửi</h3>
              
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
                      {notif.status === 'Delivered' ? 'Đã gửi' : 'Chờ gửi'}
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
                      Gửi ngay
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
