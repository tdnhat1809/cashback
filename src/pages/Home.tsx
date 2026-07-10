import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import type { Product } from '../mockData';
import { Link, ShoppingCart, Percent, HelpCircle, X, ChevronRight, Share2 } from 'lucide-react';
import { catalogApi, userFeaturesApi, type DealProduct } from '../services/apiClient';

const mobileHeroArtwork = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBZ1EuaaHRQlBrXHo-m7Yzj76hNb847_ig6pXRApl24sQvEL7zkPaA_splhcgydz6FqYcO1tsEjby7GKkvTVt2-BlrZlMj8KpReZOSgtF_qj3ELhrnil_SC7OUWcHg1e2e26oBTzo4i7G0cusvdAeU2TtTHgS1FQJ-rWKKiF3jtrNkApWEKfU1cvVBxCf-zjwRyame8QL2mSXt7po8KTI7D7cWe4lgoMU6H88WO1h9KPuaPYJD6BiZv7Q';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const toProduct = (deal: DealProduct): Product => {
  const cashbackValue = deal.commission_rate_bps ? Math.floor((deal.price_vnd * deal.commission_rate_bps * 0.9) / 10_000) : 0;
  return {
    id: deal.id, name: deal.name, price: deal.price_vnd, originalPrice: deal.original_price_vnd,
    cashbackText: cashbackValue ? `Hoàn ${cashbackValue.toLocaleString('vi-VN')}đ` : 'Đang cập nhật', cashbackValue,
    platform: deal.platform === 'shopee' ? 'Shopee' : 'TikTok Shop',
    category: deal.price_vnd <= 10_000 ? 'under10k' : cashbackValue >= 20_000 ? 'high_cashback' : 'home',
    imageUrl: deal.image_url ?? '', shopName: deal.shop_name ?? deal.platform, sourceUrl: deal.source_url,
  };
};

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [linkInput, setLinkInput] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'Shopee' | 'TikTok Shop' | 'under10k' | 'high_cashback'>('all');
  const [products, setProducts] = useState<Product[]>([]);
  const [showPwa, setShowPwa] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      if (window.localStorage.getItem('pwa-install-dismissed') === '1') return;
      setInstallPrompt(event as InstallPromptEvent);
      setShowPwa(true);
    };
    const handleInstalled = () => {
      setInstallPrompt(null);
      setShowPwa(false);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  useEffect(() => {
    void Promise.all([catalogApi.listDeals({ platform: 'shopee' }), catalogApi.listDeals({ platform: 'tiktok' })])
      .then((results) => setProducts(results.flat().map(toProduct)))
      .catch(() => setProducts([]));
  }, []);

  const requestPwaInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
    setShowPwa(false);
  };

  // Handle category tab change
  const handleCategoryChange = (category: typeof activeCategory) => {
    setActiveCategory(category);
  };

  // Filter products based on active category
  const filteredProducts = products.filter((p) => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'Shopee') return p.platform === 'Shopee';
    if (activeCategory === 'TikTok Shop') return p.platform === 'TikTok Shop';
    if (activeCategory === 'under10k') return p.category === 'under10k';
    if (activeCategory === 'high_cashback') return p.category === 'high_cashback';
    return true;
  });

  const handleSaveProduct = async (id: string) => {
    try {
      const result = await userFeaturesApi.toggleSavedProduct(id);
      setProducts((current) => current.map((product) => product.id === id ? { ...product, saved: result.saved } : product));
    } catch {
      navigate('/login?redirect=/');
    }
  };

  const handleBuyProduct = (product: Product) => {
    navigate(product.sourceUrl ? `/link-generator?url=${encodeURIComponent(product.sourceUrl)}` : `/product/${product.id}`);
  };

  const handleGenerateLink = () => {
    if (!linkInput.trim()) return;
    navigate(`/link-generator?url=${encodeURIComponent(linkInput)}`);
  };

  return (
    <div className="relative overflow-x-hidden">
      <section className="lg:hidden px-4 pt-4 pb-7 bg-background">
        <div className="relative min-h-[244px] overflow-hidden rounded-[26px] bg-primary-container p-5 text-white shadow-[0_16px_35px_rgba(181,38,3,0.14)]">
          <div className="relative z-10 max-w-[70%]">
            <h1 className="text-[25px] leading-[1.18] font-black tracking-[-0.025em]">Mua sắm thông minh, nhận tiền hoàn mỗi ngày</h1>
            <p className="mt-4 text-sm leading-5 text-white/90">Hoàn tiền đến 30% cho mọi đơn hàng tại Shopee, TikTok Shop và nhiều sàn khác.</p>
            <div className="flex gap-2 mt-4 text-[10px] font-bold">
              <span className="rounded-full bg-white/20 px-3 py-1">#1 Cashback</span>
              <span className="rounded-full bg-white/20 px-3 py-1">5M+ Users</span>
            </div>
          </div>
          <img src={mobileHeroArtwork} alt="Ứng dụng HOANTIENVIP" className="absolute -right-8 bottom-0 h-[78%] w-[47%] object-contain" />
        </div>

        <div className="mt-5 rounded-2xl border border-outline-variant/30 bg-white p-4 shadow-sm">
          <label htmlFor="mobile-cashback-link" className="block text-[11px] font-semibold mb-2">Dán link sản phẩm để kiểm tra hoàn tiền</label>
          <div className="flex items-center rounded-xl border border-primary/15 bg-surface-container-low p-1">
            <input id="mobile-cashback-link" value={linkInput} onChange={(event) => setLinkInput(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && handleGenerateLink()} placeholder="https://shopee.vn/product..." className="min-w-0 flex-1 bg-transparent px-2.5 py-2.5 text-sm outline-none" />
            <button type="button" onClick={handleGenerateLink} className="min-h-10 rounded-lg bg-primary-container px-4 text-sm font-bold text-white active:scale-95 transition-transform cursor-pointer">Check →</button>
          </div>
          <div className="mt-3 flex items-center gap-2 overflow-x-auto [scrollbar-width:none]">
            <span className="text-[10px] font-bold shrink-0">Xu hướng:</span>
            {['iPhone 15', 'Nike Jordan', 'Cosmetics'].map((trend) => <button key={trend} type="button" onClick={() => setLinkInput(trend)} className="shrink-0 rounded-full bg-surface-container px-3 py-1.5 text-[10px] font-semibold cursor-pointer">{trend}</button>)}
          </div>
        </div>

        <div className="mt-7">
          <div className="flex items-center justify-between mb-3"><h2 className="text-lg font-bold">Đối tác nổi bật</h2><button type="button" onClick={() => navigate('/deals')} className="text-xs text-primary cursor-pointer">Tất cả</button></div>
          <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none]">
            {['Shopee', 'TikTok Shop', 'Lazada', 'Tiki', 'Agoda'].map((partner) => <button key={partner} type="button" onClick={() => navigate(partner === 'Shopee' || partner === 'TikTok Shop' ? `/deals?platform=${encodeURIComponent(partner)}` : '/deals')} className="w-[62px] shrink-0 text-center cursor-pointer"><span className="w-[58px] h-[52px] rounded-xl bg-white border border-outline-variant/20 grid place-items-center text-[10px] font-black text-primary shadow-sm">{partner === 'TikTok Shop' ? 'TikTok' : partner}</span><span className="block mt-1.5 text-[10px] font-semibold truncate">{partner}</span></button>)}
          </div>
        </div>
      </section>

      {/* Hero Section */}
      <section className="hidden lg:block hero-gradient py-20 px-6 relative overflow-hidden">
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center relative z-10">
          <div className="flex flex-col gap-6 text-left">
            <h1 className="font-display-lg text-[38px] sm:text-5xl md:text-[54px] leading-[1.08] text-on-surface font-black">
              Mua sắm thông minh,<br/>
              <span className="text-primary">nhận tiền hoàn</span> mỗi ngày
            </h1>
            <p className="font-body-lg text-base sm:text-lg text-on-surface-variant max-w-xl">
              Tiết kiệm đến 20% khi mua sắm tại Shopee & TikTok Shop qua HOANTIENVIP. Hệ thống tự động theo dõi và tích lũy tiền hoàn đối soát minh bạch cho bạn.
            </p>
            
            {/* Link Converter Box */}
            <div className="mt-2 p-3 bg-white rounded-2xl shadow-soft flex flex-col sm:flex-row gap-3 items-center border border-primary/20">
              <div className="flex-1 w-full relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">link</span>
                <input 
                  className="w-full pl-12 pr-4 py-4 rounded-xl border-none bg-surface-container-low focus:ring-2 focus:ring-primary/20 text-body-md font-body-md" 
                  placeholder="Dán link sản phẩm Shopee hoặc TikTok Shop tại đây..." 
                  type="text"
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerateLink()}
                />
              </div>
              <Button 
                variant="primary" 
                size="lg"
                onClick={handleGenerateLink}
                className="w-full sm:w-auto py-4 whitespace-nowrap"
              >
                Lấy link hoàn tiền
              </Button>
            </div>
            
            <div className="flex items-center gap-4 mt-2">
              <div className="flex -space-x-3">
                <img className="w-10 h-10 rounded-full border-2 border-white object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBBLm8yyajBWeqOC1ju0zaEscm5EnHf3KlNDMNJ7gFQ1rsBl_9hMXIRZEH1zcNfy86elcsri8udbyhMof1YUeXsY0YFvXv8R_YaeHWn9lSxqFNOxHw7x_Xph0vTtpqBw_UAXBc8HTBESHHzCm79cVl_7AQj8asOVwDenUZse4aItt2kljsN5EKpSDxUTFMQqpKIM5u8CzmpNZ6vgkMwKriwRz1PNGYuLWntw8ArY91A2zFbfn-Ln5JFOg" alt="Thành viên HOANTIENVIP" />
                <img className="w-10 h-10 rounded-full border-2 border-white object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAP0qTAImVJL-Ws3ZoAv8pufenRRSjTSvVolCKq21GxYszEyBdfjvfAgrj2i5Zm0eQ8puLUqiycXaLBnEdi49k9-4JYus90_QcRZvagZeiMyxTW64Uy0ewhy6CoHF9Z5FeWFqqjH9ryqQo34q81pfL0RVB_mMzpkMu1gx94T-siwmFN5VeZqE3eGG4H0e2u_rfpC3Rniz9Str95SOEXrRT_6zSsOVz-Wm21iS-aXdWEngugzqj3poljlw" alt="Thành viên HOANTIENVIP" />
                <img className="w-10 h-10 rounded-full border-2 border-white object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC7Lvp_gteHtRnw2eM0mNyfpR8n5z3D3NH-S0_avrfdFISntcfOXdGIcwVJ9CtFN0nnh2SyKO83gWpC5bQlsGaGnswQGdkKn79aAfBMoQFEAAUgJ4PdtjwdhQ4JToSyxRXjgk81XQi91jVF3PulbCw_US0PPeDIEQ-Ou3M90NU66Zp22jZSnuolGHqGxLqoforc2HUkb3TzPtlSiaI501_CKekb8Sh35LHnIFHwOTTMlA37E5bSqmEV8w" alt="Thành viên HOANTIENVIP" />
              </div>
              <p className="text-xs font-semibold text-on-surface-variant">Hơn <span className="text-primary font-bold">1.2 triệu</span> thành viên đã tin dùng</p>
            </div>
          </div>
          
          <div className="hidden lg:block relative justify-self-center w-full max-w-[560px]">
            <div className="absolute inset-8 bg-primary/10 rounded-full blur-3xl" />
            <div className="relative bg-white/85 p-5 rounded-3xl shadow-[0_20px_50px_rgba(77,31,21,0.12)] border border-white">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDAoUKpMthxeoafljyIXiKCMQYpKcU31mFketPjSqDDkC-Tf2Wcmj7o7MMhIDvJxTEHkDpU2zEf0u9TrsoyJsenNDJacHrJYfW5twYtMLkMaJYSCjEU4OW8r5f6jDIXE3RrEDUJf-MzHWdEzSl1PtdDXfSo8Oj_YqmlDpr2fLUH6YTVjCA9FDoA7dQWVZeTFGnkUuZxBoL_vNA5PL_uQQul0lI7vu4FRap4kkeUeAih64n6mZK5WXpY_w"
                alt="Ứng dụng HOANTIENVIP trên điện thoại"
                className="w-full aspect-[4/3] object-cover rounded-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="hidden lg:block py-24 px-6 bg-white border-b border-outline-variant/30">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-headline-lg text-on-surface">3 bước đơn giản để nhận hoàn tiền</h2>
            <p className="text-on-surface-variant max-w-md mx-auto mt-2 text-sm">
              Chỉ cần thay đổi thói quen mua sắm một chút, bạn sẽ nhận được phần tiền hoàn xứng đáng trên mỗi đơn hàng.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center p-6 group">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:rotate-6 transition-transform duration-300">
                <Link className="text-primary" size={32} />
              </div>
              <h3 className="font-title-lg text-lg mb-2">1. Dán link sản phẩm</h3>
              <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
                Sao chép đường dẫn (URL) sản phẩm bạn ưng ý từ Shopee hoặc TikTok Shop rồi dán vào trang chủ HOANTIENVIP.
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center p-6 group">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:-rotate-6 transition-transform duration-300">
                <ShoppingCart className="text-primary" size={32} />
              </div>
              <h3 className="font-title-lg text-lg mb-2">2. Mua sắm như cũ</h3>
              <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
                Hệ thống sẽ chuyển hướng bạn sang ứng dụng mua sắm gốc. Tiến hành chọn phân loại, thêm mã giảm giá và thanh toán như bình thường.
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center p-6 group">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:rotate-6 transition-transform duration-300">
                <Percent className="text-primary" size={32} />
              </div>
              <h3 className="font-title-lg text-lg mb-2">3. Nhận cashback về ví</h3>
              <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
                Sau khi đơn hàng chuyển giao thành công, sàn TMĐT đối soát hoa hồng và tiền hoàn sẽ được cộng thẳng vào số dư của bạn.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="hidden lg:block py-12 bg-primary text-white overflow-hidden relative">
        <div className="max-w-[1280px] mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 relative z-10">
          <div className="text-center">
            <div className="font-display-lg text-3xl sm:text-4xl font-black">150 tỷ</div>
            <div className="text-xs opacity-80 uppercase tracking-wider mt-1">VNĐ đã chi trả</div>
          </div>
          <div className="text-center">
            <div className="font-display-lg text-3xl sm:text-4xl font-black">1.2 triệu</div>
            <div className="text-xs opacity-80 uppercase tracking-wider mt-1">Khách hàng tin tưởng</div>
          </div>
          <div className="text-center">
            <div className="font-display-lg text-3xl sm:text-4xl font-black">50.000+</div>
            <div className="text-xs opacity-80 uppercase tracking-wider mt-1">Ưu đãi hôm nay</div>
          </div>
          <div className="text-center">
            <div className="font-display-lg text-3xl sm:text-4xl font-black">99.8%</div>
            <div className="text-xs opacity-80 uppercase tracking-wider mt-1">Tỷ lệ đối soát đúng</div>
          </div>
        </div>
      </section>

      {/* Deal Hot Today */}
      <section className="py-16 md:py-24 px-6 bg-background">
        <div className="max-w-[1280px] mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
            <div className="text-left">
              <h2 className="font-headline-lg">Ưu đãi nổi bật hôm nay</h2>
              
              {/* Category Tab Selector */}
              <div className="flex flex-wrap gap-2 mt-4">
                <button 
                  onClick={() => handleCategoryChange('all')}
                  className={`px-4 py-2 rounded-full font-label-md text-xs cursor-pointer transition-colors
                    ${activeCategory === 'all' ? 'bg-primary text-white' : 'bg-white hover:bg-surface-container-high text-on-surface-variant'}
                  `}
                >
                  Tất cả
                </button>
                <button 
                  onClick={() => handleCategoryChange('Shopee')}
                  className={`px-4 py-2 rounded-full font-label-md text-xs cursor-pointer transition-colors
                    ${activeCategory === 'Shopee' ? 'bg-primary text-white' : 'bg-white hover:bg-surface-container-high text-on-surface-variant'}
                  `}
                >
                  Shopee
                </button>
                <button 
                  onClick={() => handleCategoryChange('TikTok Shop')}
                  className={`px-4 py-2 rounded-full font-label-md text-xs cursor-pointer transition-colors
                    ${activeCategory === 'TikTok Shop' ? 'bg-primary text-white' : 'bg-white hover:bg-surface-container-high text-on-surface-variant'}
                  `}
                >
                  TikTok Shop
                </button>
                <button 
                  onClick={() => handleCategoryChange('under10k')}
                  className={`px-4 py-2 rounded-full font-label-md text-xs cursor-pointer transition-colors
                    ${activeCategory === 'under10k' ? 'bg-primary text-white' : 'bg-white hover:bg-surface-container-high text-on-surface-variant'}
                  `}
                >
                  Dưới 10.000đ
                </button>
                <button 
                  onClick={() => handleCategoryChange('high_cashback')}
                  className={`px-4 py-2 rounded-full font-label-md text-xs cursor-pointer transition-colors
                    ${activeCategory === 'high_cashback' ? 'bg-primary text-white' : 'bg-white hover:bg-surface-container-high text-on-surface-variant'}
                  `}
                >
                  Tỉ lệ hoàn cao
                </button>
              </div>
            </div>
            
            <button 
              onClick={() => navigate('/deals')}
              className="text-primary font-bold text-sm flex items-center gap-1 hover:underline cursor-pointer"
            >
              Xem tất cả deal <ChevronRight size={16} />
            </button>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {filteredProducts.slice(0, 4).map((p) => (
              <Card 
                key={p.id} 
                product={p} 
                onSave={handleSaveProduct}
                onBuy={handleBuyProduct}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Referral Program Banner */}
      <section className="py-8 px-6 bg-background">
        <div className="max-w-[1280px] mx-auto">
          <div className="bg-gradient-to-r from-primary to-[#ff8c70] rounded-3xl p-8 md:p-12 overflow-hidden relative shadow-2xl text-white text-left flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex-1 max-w-xl z-10">
              <Badge variant="secondary" className="!bg-white/20 text-white font-bold tracking-widest text-[10px] mb-4 uppercase">
                Chương trình hot
              </Badge>
              <h2 className="font-display-lg text-3xl sm:text-4xl font-black mb-4 leading-tight">
                Mời bạn bè tham gia,<br/>Nhận ngay 50.000đ + Hoa hồng trọn đời
              </h2>
              <p className="font-body-lg text-sm sm:text-base opacity-90 mb-6 leading-relaxed">
                Nhận ngay 50K khi bạn bè rút tiền lần đầu, cộng thêm 10% hoa hồng trọn đời từ các giao dịch hoàn tiền của họ. Giới thiệu càng nhiều, thưởng càng lớn!
              </p>
              <Button 
                variant="secondary" 
                size="lg" 
                onClick={() => navigate('/dashboard/referral')}
                className="!bg-white !text-primary hover:!scale-105"
              >
                Giới thiệu ngay
              </Button>
            </div>
            <div className="hidden md:flex justify-center z-10 shrink-0">
              <div className="bg-white p-4 rounded-3xl shadow-2xl rotate-3 w-60 h-60 flex items-center justify-center overflow-hidden">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCiMgyb20Ou1as3LSjq9DJKhdWUXGN143vlAky0w-HfzCatRs6sDKJKtkDQWX4DGfcoVYa5Yz3mKBO767T2OAE6JN6l7F33rtui8FmSM6rblQ0L_Kg5UUI5DxXf58mkOVm1D71AfznpjTnX3WGL3slgkSMuUCLGvR-_g1OZVV94nJR4Vft1Se4J_4rKV1uQMoZ0B0vRko4OTt6enJkgViuZ1sNvSaiDPVr7ocbt3c4aKHwFpVGo1_8hAQ"
                  alt="Rương quà chương trình giới thiệu"
                  className="w-full h-full object-cover rounded-2xl"
                />
              </div>
            </div>
            <div className="absolute right-0 top-0 w-1/2 h-full opacity-10 pointer-events-none">
              <Share2 size={300} className="text-white absolute -right-20 -top-20" />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ & IMPORTANT WARNING Section */}
      <section className="py-16 md:py-24 px-6 bg-surface-container-low">
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          <div className="text-left">
            <h2 className="font-headline-md mb-8 flex items-center gap-2">
              <HelpCircle className="text-primary" /> Câu hỏi thường gặp
            </h2>
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-outline-variant/30 shadow-sm text-left">
                <h4 className="font-title-lg text-sm font-bold text-on-surface mb-2">Bao lâu đơn hàng sẽ hiển thị trong lịch sử?</h4>
                <p className="font-body-md text-xs text-on-surface-variant leading-relaxed">
                  Thông thường trong vòng 1-2 tiếng sau khi bạn thanh toán thành công, đơn hàng sẽ hiển thị ở trạng thái "Chờ duyệt" tại Ví của bạn.
                </p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-outline-variant/30 shadow-sm text-left">
                <h4 className="font-title-lg text-sm font-bold text-on-surface mb-2">Tại sao tôi không nhận được hoàn tiền?</h4>
                <p className="font-body-md text-xs text-on-surface-variant leading-relaxed">
                  Nguyên nhân phổ biến nhất là do đơn hàng bị hủy, hoàn trả, hoặc bạn nhấn vào các link quảng cáo khác của bên thứ ba trước khi đặt hàng dẫn đến mất cookie ghi nhận.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-primary/5 p-8 rounded-3xl border border-primary/10 text-left">
            <div className="flex gap-3 mb-4 items-center">
              <span className="material-symbols-outlined text-primary text-2xl">warning</span>
              <h4 className="font-title-lg text-base font-black text-primary">Lưu ý cực kỳ quan trọng</h4>
            </div>
            <p className="font-body-md text-xs text-on-surface-variant mb-6 leading-relaxed">
              HOANTIENVIP đóng vai trò trung gian liên kết. Các quyết định ghi nhận và duyệt tiền hoàn được quyết định tự động 100% dựa trên hệ thống đối soát chính thức của sàn (Shopee, TikTok Shop).
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5 text-xs font-semibold text-on-surface-variant">
                <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
                <span>Không sử dụng tab ẩn danh hoặc phần mềm chặn quảng cáo khi mua hàng.</span>
              </li>
              <li className="flex items-start gap-2.5 text-xs font-semibold text-on-surface-variant">
                <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
                <span>Hãy hoàn tất việc thêm giỏ hàng và đặt mua trực tiếp trong cùng một phiên mua sắm sau khi tạo link.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* PWA Custom Install Prompt Popup */}
      {showPwa && installPrompt && (
        <div className="fixed bottom-[calc(76px+env(safe-area-inset-bottom))] left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-[60] sm:w-80 bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.15)] border border-primary/20 overflow-hidden pwa-entry">
          <div className="p-4 flex items-start gap-4">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center flex-shrink-0 text-white font-black text-lg">
              HV
            </div>
            <div className="flex-1 text-left">
              <div className="flex justify-between items-start">
                <h5 className="font-label-md font-bold text-on-surface">Cài đặt ứng dụng</h5>
                <button 
                  className="text-outline hover:text-on-surface transition-colors cursor-pointer" 
                  aria-label="Đóng gợi ý cài đặt ứng dụng"
                  onClick={() => {
                    window.localStorage.setItem('pwa-install-dismissed', '1');
                    setShowPwa(false);
                  }}
                >
                  <X size={16} />
                </button>
              </div>
              <p className="text-[11px] font-medium text-on-surface-variant mt-1 leading-normal">
                Theo dõi biến động ví, nhận nhanh deal hot dưới 10K ngay trên điện thoại của bạn.
              </p>
              <button 
                onClick={requestPwaInstall}
                className="mt-3 w-full py-2 bg-primary-container text-white rounded-lg font-bold text-xs shadow-soft hover:brightness-110 active:scale-95 transition-all cursor-pointer"
              >
                Thêm vào màn hình chính
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
