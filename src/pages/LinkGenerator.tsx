import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ToastContainer } from '../components/Toast';
import { defaultToastState, triggerToast } from '../components/toast-state';
import type { ToastState } from '../components/toast-state';
import { Link, Copy, ShoppingBag, Loader, AlertTriangle } from 'lucide-react';

export const LinkGenerator: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [inputUrl, setInputUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [errorText, setErrorText] = useState('');
  const [toast, setToast] = useState<ToastState>(defaultToastState);
  const [showRedirectModal, setShowRedirectModal] = useState(false);
  const [countdown, setCountdown] = useState(4);

  // Auto-generate if query param 'url' exists
  useEffect(() => {
    const urlParam = searchParams.get('url');
    if (urlParam) {
      setInputUrl(urlParam);
      triggerGeneration(urlParam);
    }
  }, [searchParams]);

  // Simulate redirect countdown
  useEffect(() => {
    let timer: any;
    if (showRedirectModal && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (showRedirectModal && countdown === 0) {
      setShowRedirectModal(false);
      triggerToast(setToast, 'Mô phỏng chuyển hướng đến ứng dụng sàn mua hàng thành công!', 'success');
    }
    return () => clearTimeout(timer);
  }, [showRedirectModal, countdown]);

  const triggerGeneration = (url: string) => {
    setErrorText('');
    setSuccess(false);

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      setErrorText('Đường dẫn phải là URL hợp lệ bắt đầu bằng http:// hoặc https://');
      return;
    }
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      setErrorText('Đường dẫn phải bắt đầu bằng http:// hoặc https://');
      return;
    }
    const host = parsedUrl.hostname.toLowerCase();
    const isAllowedHost = [
      'shopee.vn', 'shp.ee', 'tiktok.com', 'shop.tiktok.com', 'vt.tiktok.com',
    ].some((allowedHost) => host === allowedHost || host.endsWith(`.${allowedHost}`));
    const isSimulatedLink = host === 'shopee.vn' && parsedUrl.pathname.includes('product-detail-simulated');
    if (!isAllowedHost && !isSimulatedLink) {
      setErrorText('HOANTIENVIP hiện tại chỉ hỗ trợ hoàn tiền cho sàn Shopee và TikTok Shop.');
      return;
    }

    setLoading(true);
    
    // Simulate API call to RioHub/Shopee Link Generator
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      const randomToken = Math.random().toString(36).substr(2, 6);
      setGeneratedLink(`https://hoantienvip.vn/r/${randomToken}`);
      triggerToast(setToast, 'Tạo link mua hàng hoàn tiền thành công!', 'success');
    }, 2000);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink);
      triggerToast(setToast, 'Đã sao chép đường dẫn hoàn tiền vào clipboard!', 'success');
    } catch {
      triggerToast(setToast, 'Trình duyệt không cho phép sao chép. Hãy sao chép thủ công liên kết này.', 'error');
    }
  };

  const handleGoToApp = () => {
    setCountdown(4);
    setShowRedirectModal(true);
  };

  return (
    <div className="max-w-[800px] mx-auto px-6 py-12 text-left">
      <h1 className="font-headline-lg mb-2">Tạo Link Hoàn Tiền Tiện Lợi</h1>
      <p className="text-on-surface-variant text-sm mb-8">
        Dán đường dẫn sản phẩm Shopee hoặc TikTok Shop để tạo liên kết mua hàng đặc quyền được tích hợp mã hoàn tiền của riêng bạn.
      </p>

      <div className="bg-white p-6 md:p-8 rounded-3xl border border-outline-variant/30 shadow-soft mb-8">
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1">
            <Input
              label="Đường dẫn sản phẩm gốc"
              placeholder="Dán link sản phẩm (Ví dụ: https://shopee.vn/...)"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              error={errorText}
              disabled={loading}
              startIcon={<Link size={18} />}
            />
          </div>
          <Button
            variant="primary"
            onClick={() => triggerGeneration(inputUrl)}
            disabled={!inputUrl.trim() || loading}
            className="h-[56px] px-8"
          >
            Tạo link hoàn tiền
          </Button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-on-surface-variant">
            <Loader className="animate-spin text-primary" size={40} />
            <p className="text-sm font-semibold">Đang liên kết với đối tác đối soát...</p>
            <p className="text-xs text-on-surface-variant/80">Tự động cấu hình mã tracking hoàn tiền (RioHub/Shopee Affiliate)</p>
          </div>
        )}

        {/* Success State */}
        {success && !loading && (
          <div className="mt-8 border-t border-outline-variant/30 pt-8 animate-fade-in text-left">
            <h3 className="font-title-lg text-emerald-600 font-bold mb-4 flex items-center gap-1.5">
              <span className="material-symbols-outlined">check_circle</span> Link hoàn tiền đã sẵn sàng
            </h3>
            
            <div className="flex flex-col sm:flex-row gap-3 items-center mb-6">
              <div className="flex-1 w-full bg-surface-container-low px-5 py-4 rounded-xl font-label-md text-sm text-on-surface font-semibold border border-outline-variant/30 select-all overflow-x-auto whitespace-nowrap">
                {generatedLink}
              </div>
              <div className="flex w-full sm:w-auto gap-2 shrink-0">
                <Button 
                  variant="outline" 
                  onClick={handleCopy} 
                  className="flex-1 sm:flex-none py-4"
                  icon={<Copy size={16} />}
                >
                  Sao chép
                </Button>
                <Button 
                  variant="success" 
                  onClick={handleGoToApp} 
                  className="flex-1 sm:flex-none py-4"
                  icon={<ShoppingBag size={16} />}
                >
                  Mở ứng dụng mua ngay
                </Button>
              </div>
            </div>

            {/* Cookie Attribution Rules warning */}
            <div className="bg-primary/5 p-5 rounded-2xl border border-primary/10 flex gap-4">
              <AlertTriangle className="text-primary shrink-0 mt-0.5" size={20} />
              <div className="text-xs text-on-surface-variant leading-relaxed">
                <h5 className="font-bold text-primary mb-1">Hướng dẫn ghi nhận hoàn tiền hợp lệ:</h5>
                <ol className="list-decimal pl-4 space-y-1.5 text-on-surface-variant/90">
                  <li>Nhấn nút <strong>"Mở ứng dụng mua ngay"</strong> để kích hoạt tracking.</li>
                  <li>Ứng dụng Shopee hoặc TikTok Shop sẽ tự động mở lên. Vui lòng thêm sản phẩm vào giỏ hàng và mua hàng trực tiếp.</li>
                  <li>Hoàn tất thanh toán trong vòng <strong>20 phút</strong> kể từ khi nhấp link để tránh bị các ứng dụng quảng cáo khác gián đoạn cookie.</li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Simulation Redirect Modal Overlay */}
      {showRedirectModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-3xl p-8 max-w-sm text-center shadow-2xl z-10 w-full animate-scale-in">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
              <ShoppingBag size={32} className="animate-pulse" />
            </div>
            <h3 className="font-title-lg text-lg font-bold text-on-surface mb-2">Chuyển hướng mua sắm</h3>
            <p className="text-xs text-on-surface-variant mb-6 leading-relaxed">
              Bạn đang được tự động kết nối sang ứng dụng sàn TMĐT gốc để thanh toán an toàn.
            </p>
            
            <div className="flex justify-center items-center gap-1.5 text-sm font-semibold text-primary mb-6">
              <span>Đang mở ứng dụng trong</span>
              <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">
                {countdown}
              </span>
              <span>giây...</span>
            </div>

            <Button 
              variant="outline" 
              onClick={() => setShowRedirectModal(false)}
              className="w-full py-3"
            >
              Hủy bỏ
            </Button>
          </div>
        </div>
      )}

      {/* Render notifications */}
      <ToastContainer toast={toast} setToast={setToast} />
    </div>
  );
};
