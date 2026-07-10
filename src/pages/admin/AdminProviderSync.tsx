import React, { useState } from 'react';
import { Button } from '../../components/Button';
import { Table } from '../../components/Table';
import type { Column } from '../../components/Table';
import { ToastContainer } from '../../components/Toast';
import { defaultToastState, triggerToast } from '../../components/toast-state';
import type { ToastState } from '../../components/toast-state';
import { 
  Play, AlertCircle, CheckCircle, AlertTriangle, Eye, EyeOff, Radio, Calendar 
} from 'lucide-react';

type TabType = 'shopee' | 'tiktok' | 'webhook' | 'schedule' | 'retry' | 'logs';

interface ProviderLog {
  id: string;
  eventId: string;
  time: string;
  provider: 'Shopee' | 'TikTok';
  statusCode: number;
  message: string;
}

export const AdminProviderSync: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('shopee');
  const [toast, setToast] = useState<ToastState>(defaultToastState);
  const [showShopeeKey, setShowShopeeKey] = useState(false);
  const [showTiktokKey, setShowTiktokKey] = useState(false);
  
  // Shopee connection states
  const [shopeeAppId, setShopeeAppId] = useState('11029384');
  const [shopeeSecret, setShopeeSecret] = useState('shopee_secret_api_key_hidden_value_long');
  const [isShopeeTesting, setIsShopeeTesting] = useState(false);
  const [shopeeStatus, setShopeeStatus] = useState<'connected' | 'error'>('connected');

  // TikTok / RioHub states
  const [tiktokUrl, setTiktokUrl] = useState('https://riohub.net/api/v1/tiktok-shop');
  const [tiktokKey, setTiktokKey] = useState('riohub_jwt_token_auth_secret_placeholder');
  const [isTiktokTesting, setIsTiktokTesting] = useState(false);
  
  // Webhook states
  const [webhookUrl, setWebhookUrl] = useState('https://hoantienvip.vn/webhooks/orders');
  const [webhookSecret, setWebhookSecret] = useState('whsec_ABC123xyz456SECRET_KEY');
  const [webhookEnabled, setWebhookEnabled] = useState(true);

  // Schedule settings
  const [cronFreq, setCronFreq] = useState('15m');
  const [maxRetries, setMaxRetries] = useState(3);
  const [isCronEnabled, setIsCronEnabled] = useState(true);

  // Technical Sync Logs mock data
  const [logs, setLogs] = useState<ProviderLog[]>([
    { id: '1', eventId: '#EV-88219', time: '2026-07-10 14:22:10', provider: 'Shopee', statusCode: 504, message: 'Gateway Timeout: Origin server did not respond' },
    { id: '2', eventId: '#EV-88218', time: '2026-07-10 14:20:00', provider: 'TikTok', statusCode: 200, message: 'Order sync completed (42 orders)' },
    { id: '3', eventId: '#EV-88217', time: '2026-07-10 14:15:05', provider: 'Shopee', statusCode: 401, message: 'Unauthorized: API Token expired' },
    { id: '4', eventId: '#EV-88216', time: '2026-07-10 13:02:44', provider: 'TikTok', statusCode: 500, message: 'Internal Server Error from RioHub Endpoint' },
    { id: '5', eventId: '#EV-88215', time: '2026-07-10 12:45:12', provider: 'Shopee', statusCode: 200, message: 'Batch product categories sync success' },
  ]);

  const handleTestConnection = (provider: 'shopee' | 'tiktok') => {
    if (provider === 'shopee') {
      setIsShopeeTesting(true);
      triggerToast(setToast, 'Đang gửi yêu cầu xác thực API tới Shopee Open Platform...', 'info');
      setTimeout(() => {
        setIsShopeeTesting(false);
        setShopeeStatus('connected');
        triggerToast(setToast, 'Kết nối Shopee thành công! Phản hồi API: 200 OK.', 'success');
      }, 1500);
    } else {
      setIsTiktokTesting(true);
      triggerToast(setToast, 'Đang bắt đầu bắt tay (Handshake) với cổng RioHub...', 'info');
      setTimeout(() => {
        setIsTiktokTesting(false);
        triggerToast(setToast, 'TikTok Shop/RioHub kết nối thành công! Đã đồng bộ SSL.', 'success');
      }, 1500);
    }
  };

  const handleRotateCredentials = (provider: 'shopee' | 'tiktok') => {
    if (window.confirm(`Bạn có chắc chắn muốn xoay khóa (Rotate Key) của ${provider.toUpperCase()}? Mọi tác vụ sync đang chạy có thể bị dừng tạm thời.`)) {
      const newKey = `rotated_secret_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
      if (provider === 'shopee') {
        setShopeeSecret(newKey);
      } else {
        setTiktokKey(newKey);
      }
      triggerToast(setToast, `Đã xoay Key ${provider.toUpperCase()} thành công! Vui lòng kiểm tra kỹ trạng thái kết nối.`, 'success');
    }
  };

  const handleSaveWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    triggerToast(setToast, 'Đã lưu cấu hình Endpoint Webhook nhận sự kiện thành công.', 'success');
  };

  const handleSaveSchedule = () => {
    triggerToast(setToast, 'Lịch trình tự động (Cron Job) đã được cập nhật thành công.', 'success');
  };

  const handleRetryLog = (log: ProviderLog) => {
    triggerToast(setToast, `Đang khởi chạy tác vụ thử lại cho sự kiện ${log.eventId}...`, 'info');
    setTimeout(() => {
      // update log in table
      setLogs(prev => prev.map(item => item.id === log.id ? { ...item, statusCode: 200, message: `Thử lại thành công vào lúc ${new Date().toLocaleTimeString()}` } : item));
      triggerToast(setToast, `Đồng bộ thủ công sự kiện ${log.eventId} thành công!`, 'success');
    }, 1200);
  };

  const columns: Column<ProviderLog>[] = [
    {
      header: 'Mã sự kiện',
      accessor: 'eventId',
      className: 'font-mono text-xs font-bold text-on-surface'
    },
    {
      header: 'Thời gian',
      accessor: 'time',
      className: 'text-xs text-on-surface-variant font-medium'
    },
    {
      header: 'Đối tác',
      accessor: (row: ProviderLog) => (
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${row.provider === 'Shopee' ? 'bg-primary/10 text-primary' : 'bg-tertiary-container/15 text-tertiary'}`}>
          {row.provider}
        </span>
      )
    },
    {
      header: 'Mã phản hồi',
      accessor: (row: ProviderLog) => (
        <span className={`font-bold text-xs ${row.statusCode === 200 ? 'text-tertiary' : 'text-error'}`}>
          {row.statusCode}
        </span>
      )
    },
    {
      header: 'Mô tả thông điệp',
      accessor: 'message',
      className: 'text-xs text-on-surface-variant text-left font-semibold max-w-[280px] truncate'
    },
    {
      header: 'Hành động',
      accessor: (row: ProviderLog) => (
        row.statusCode !== 200 ? (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleRetryLog(row)}
            className="text-primary hover:bg-primary/5 py-1 px-2.5 font-bold"
          >
            Thử lại
          </Button>
        ) : (
          <span className="text-[10px] font-bold text-tertiary/70 uppercase">Hoàn tất</span>
        )
      )
    }
  ];

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <div>
        <h1 className="font-headline-md text-on-surface">Cấu hình Provider &amp; Đồng bộ dữ liệu</h1>
        <p className="text-xs text-on-surface-variant">Quản lý kết nối API, lịch trình và nhật ký kỹ thuật hệ thống.</p>
      </div>

      {/* Tab Navigation links */}
      <div className="flex gap-6 border-b border-outline-variant/30 overflow-x-auto no-scrollbar pb-1">
        {(['shopee', 'tiktok', 'webhook', 'schedule', 'retry', 'logs'] as TabType[]).map((tab) => {
          const labels = {
            shopee: 'Shopee Affiliate',
            tiktok: 'TikTok Shop / RioHub',
            webhook: 'Webhook cấu hình',
            schedule: 'Lịch đồng bộ',
            retry: 'Hàng đợi Retry',
            logs: 'Nhật ký kỹ thuật'
          };
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-xs font-bold transition-all relative shrink-0 ${
                isActive ? 'text-primary' : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              {labels[tab]}
              {isActive && (
                <span className="absolute bottom-0 inset-x-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab contents */}
      <div className="min-h-[400px]">
        
        {/* SHOPEE TAB */}
        {activeTab === 'shopee' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-outline-variant/30 shadow-soft space-y-6">
              <div className="flex justify-between items-start flex-wrap gap-4">
                <div>
                  <h3 className="font-title-lg text-sm font-bold text-on-surface mb-1">Kết nối Shopee Open Platform</h3>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${shopeeStatus === 'connected' ? 'bg-tertiary' : 'bg-error'}`}></span>
                    <span className={`text-[10px] font-bold uppercase ${shopeeStatus === 'connected' ? 'text-tertiary' : 'text-error'}`}>
                      {shopeeStatus === 'connected' ? 'Connected & Operational' : 'Connection Error'}
                    </span>
                  </div>
                </div>
                
                <Button
                  variant="primary"
                  onClick={() => handleTestConnection('shopee')}
                  loading={isShopeeTesting}
                  icon={<Play size={14} />}
                  className="shadow-soft"
                >
                  Test Connection
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">App ID (Đối tác)</label>
                  <input 
                    type="text" 
                    value={shopeeAppId}
                    onChange={(e) => setShopeeAppId(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs font-bold outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">API Secret Key</label>
                  <div className="relative">
                    <input 
                      type={showShopeeKey ? 'text' : 'password'}
                      value={shopeeSecret}
                      onChange={(e) => setShopeeSecret(e.target.value)}
                      className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs font-mono font-semibold outline-none focus:border-primary pr-12"
                    />
                    <button 
                      onClick={() => setShowShopeeKey(!showShopeeKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-outline-variant hover:text-primary"
                    >
                      {showShopeeKey ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl border border-outline-variant/10">
                  <div className="text-left">
                    <p className="text-xs font-bold text-on-surface">Cấp lại API Credentials (Xoay key)</p>
                    <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">Cập nhật lần cuối: 12 ngày trước</p>
                  </div>
                  <Button 
                    variant="outline"
                    onClick={() => handleRotateCredentials('shopee')}
                    className="text-xs font-bold"
                  >
                    Xoay credential
                  </Button>
                </div>
              </div>
            </div>

            {/* Performance Sidebar */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-outline-variant/30 shadow-soft border-l-4 border-tertiary">
                <h4 className="text-[10px] font-bold text-on-surface-variant mb-3 uppercase tracking-wider">Hiệu năng Sync</h4>
                <div className="space-y-4 text-left">
                  <div>
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-2xl font-black text-primary">99.8%</span>
                      <span className="text-[10px] font-bold text-tertiary">Thành công</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-container-low rounded-full overflow-hidden">
                      <div className="bg-tertiary h-full" style={{ width: '99.8%' }}></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-surface-container-low rounded-xl">
                      <p className="text-[9px] font-bold text-on-surface-variant uppercase">Rate Limit</p>
                      <p className="text-sm font-bold text-on-surface">420 / 1000</p>
                    </div>
                    <div className="p-3 bg-surface-container-low rounded-xl">
                      <p className="text-[9px] font-bold text-on-surface-variant uppercase">Last Sync</p>
                      <p className="text-sm font-bold text-on-surface">2p trước</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recents Errors panel */}
              <div className="bg-white p-6 rounded-3xl border border-outline-variant/30 shadow-soft">
                <h4 className="text-[10px] font-bold text-on-surface-variant mb-3 uppercase tracking-wider">Lỗi phát sinh (24h)</h4>
                <div className="space-y-3">
                  <div className="flex gap-3 items-start text-left">
                    <div className="w-8 h-8 rounded-full bg-error-container/20 flex items-center justify-center text-error shrink-0">
                      <AlertTriangle size={15} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-on-surface">TIMEOUT_EXCEEDED</p>
                      <p className="text-[10px] text-on-surface-variant font-semibold">14:22:10 - Cổng Shopee không phản hồi</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start text-left border-t border-outline-variant/10 pt-3">
                    <div className="w-8 h-8 rounded-full bg-error-container/20 flex items-center justify-center text-error shrink-0">
                      <AlertTriangle size={15} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-on-surface">INVALID_SIGNATURE</p>
                      <p className="text-[10px] text-on-surface-variant font-semibold">08:05:44 - Lỗi chữ ký số webhook</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TIKTOK SHOP / RIOHUB TAB */}
        {activeTab === 'tiktok' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-outline-variant/30 shadow-soft space-y-6">
              <div className="flex justify-between items-start flex-wrap gap-4">
                <div>
                  <h3 className="font-title-lg text-sm font-bold text-on-surface mb-1">Kết nối TikTok Shop qua RioHub</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-tertiary rounded-full animate-pulse"></span>
                    <span className="text-[10px] font-bold text-tertiary uppercase">Synchronized &amp; Active</span>
                  </div>
                </div>
                
                <Button
                  variant="primary"
                  onClick={() => handleTestConnection('tiktok')}
                  loading={isTiktokTesting}
                  icon={<Play size={14} />}
                  className="shadow-soft"
                >
                  Test Handshake
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">RioHub API Endpoint</label>
                  <input 
                    type="text" 
                    value={tiktokUrl}
                    onChange={(e) => setTiktokUrl(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs font-bold outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">JWT Auth Bearer Token</label>
                  <div className="relative">
                    <input 
                      type={showTiktokKey ? 'text' : 'password'}
                      value={tiktokKey}
                      onChange={(e) => setTiktokKey(e.target.value)}
                      className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs font-mono font-semibold outline-none focus:border-primary pr-12"
                    />
                    <button 
                      onClick={() => setShowTiktokKey(!showTiktokKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-outline-variant hover:text-primary"
                    >
                      {showTiktokKey ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl border border-outline-variant/10">
                  <div className="text-left">
                    <p className="text-xs font-bold text-on-surface">Cấp lại JWT Token (Xoay key)</p>
                    <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">Tự động xoay sau 30 ngày.</p>
                  </div>
                  <Button 
                    variant="outline"
                    onClick={() => handleRotateCredentials('tiktok')}
                    className="text-xs font-bold"
                  >
                    Generate Token
                  </Button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-outline-variant/30 shadow-soft">
              <h4 className="text-[10px] font-bold text-on-surface-variant mb-3 uppercase tracking-wider">Đồng bộ TikTok Shop</h4>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Nền tảng sử dụng cổng trung chuyển webhook từ RioHub nhằm giảm tải và chống nghẽn API trực tiếp từ TikTok Shop Open Platform, tăng tính tức thời lên tới 99.5%.
              </p>
            </div>
          </div>
        )}

        {/* WEBHOOK TAB */}
        {activeTab === 'webhook' && (
          <form onSubmit={handleSaveWebhook} className="bg-white p-6 rounded-3xl border border-outline-variant/30 shadow-soft max-w-2xl space-y-6">
            <h3 className="font-title-lg text-sm font-bold text-on-surface flex items-center gap-2">
              <Radio className="text-primary" size={18} /> Webhook nhận sự kiện hoàn tiền
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Webhook Endpoint URL</label>
                <input 
                  type="text" 
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs font-semibold outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Signature Signing Secret Key</label>
                <input 
                  type="text" 
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs font-mono font-semibold outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl border border-outline-variant/10">
                <div className="text-left">
                  <p className="text-xs font-bold text-on-surface">Kích hoạt Webhook Receiver</p>
                  <p className="text-[10px] text-on-surface-variant mt-0.5">Nhận đơn hàng mới từ đối tác qua phương thức POST.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={webhookEnabled}
                    onChange={(e) => setWebhookEnabled(e.target.checked)}
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button type="submit" variant="primary" className="px-6 py-3 font-bold shadow-soft">
                Lưu cấu hình Webhook
              </Button>
            </div>
          </form>
        )}

        {/* SCHEDULE TAB */}
        {activeTab === 'schedule' && (
          <div className="bg-white p-6 rounded-3xl border border-outline-variant/30 shadow-soft max-w-2xl space-y-6">
            <h3 className="font-title-lg text-sm font-bold text-on-surface flex items-center gap-2">
              <Calendar className="text-primary" size={18} /> Lịch trình đồng bộ hệ thống (Cron Scheduler)
            </h3>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl border border-outline-variant/10">
                <div className="text-left">
                  <p className="text-xs font-bold text-on-surface">Tự động đồng bộ đơn hàng (Cron Job)</p>
                  <p className="text-[10px] text-on-surface-variant mt-0.5">Chạy ngầm tác vụ quét đơn hàng mới định kỳ.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={isCronEnabled}
                    onChange={(e) => setIsCronEnabled(e.target.checked)}
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Tần suất quét đồng bộ (Frequency)</label>
                  <select 
                    value={cronFreq}
                    onChange={(e) => setCronFreq(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-outline-variant/50 rounded-xl text-xs outline-none font-bold text-on-surface"
                  >
                    <option value="5m">Mỗi 5 phút</option>
                    <option value="15m">Mỗi 15 phút (Khuyên dùng)</option>
                    <option value="30m">Mỗi 30 phút</option>
                    <option value="1h">Mỗi 1 giờ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Số lần thử lại tối đa (Max Retries)</label>
                  <input 
                    type="number" 
                    value={maxRetries}
                    onChange={(e) => setMaxRetries(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 bg-white border border-outline-variant/50 rounded-xl text-xs font-bold outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="p-4 border border-primary-container/20 bg-primary-container/5 rounded-xl flex gap-3 text-left">
                <AlertCircle className="text-primary shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="text-xs font-bold text-on-surface">Cảnh báo Telegram khi nghẽn hàng đợi (Queue Alert)</p>
                  <p className="text-[10px] text-on-surface-variant mt-0.5">Gửi tin nhắn push cho kỹ thuật viên nếu hàng đợi vượt quá 500 tasks hoặc lỗi liên tục 15 phút.</p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button onClick={handleSaveSchedule} variant="primary" className="px-6 py-3 font-bold shadow-soft">
                Lưu cài đặt Cron
              </Button>
            </div>
          </div>
        )}

        {/* RETRY QUEUE TAB */}
        {activeTab === 'retry' && (
          <div className="bg-white p-6 rounded-3xl border border-outline-variant/30 shadow-soft text-left space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div>
                <h3 className="font-title-lg text-sm font-bold text-on-surface">Danh sách hàng đợi các tác vụ lỗi</h3>
                <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">Nơi lưu trữ các đơn hàng chưa đối soát thành công cần chạy lại.</p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => triggerToast(setToast, 'Không có tác vụ nào bị nghẽn.', 'success')}
                className="text-xs font-bold py-2"
              >
                Clear Queue
              </Button>
            </div>

            <div className="p-8 text-center border border-dashed border-outline-variant/30 rounded-2xl bg-surface-container-low/40">
              <CheckCircle className="text-tertiary mx-auto mb-3" size={36} />
              <p className="text-xs font-bold text-on-surface">Hàng đợi trống sạch!</p>
              <p className="text-[10px] text-on-surface-variant max-w-xs mx-auto mt-1 leading-normal font-semibold">Tất cả các sự kiện API đối soát của Shopee &amp; TikTok Shop đều đã được xử lý thành công hoặc đã thử lại xong.</p>
            </div>
          </div>
        )}

        {/* TECHNICAL LOGS TAB */}
        {activeTab === 'logs' && (
          <div className="bg-white rounded-3xl border border-outline-variant/30 shadow-soft overflow-hidden">
            <div className="p-4 bg-surface-container-low/40 border-b border-outline-variant/20 flex justify-between items-center flex-wrap gap-4 text-left">
              <div>
                <h3 className="text-xs font-bold text-on-surface">Nhật ký sự kiện kỹ thuật</h3>
                <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">Chi tiết API log giao dịch 24h gần nhất.</p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => {
                  triggerToast(setToast, 'Đã làm mới dữ liệu logs.', 'info');
                }}
                className="py-2 px-3 text-xs"
              >
                Làm mới
              </Button>
            </div>
            
            <Table
              data={logs}
              columns={columns}
              emptyMessage="Không có nhật ký nào được ghi nhận."
            />
          </div>
        )}

      </div>

      <ToastContainer toast={toast} setToast={setToast} />
    </div>
  );
};
