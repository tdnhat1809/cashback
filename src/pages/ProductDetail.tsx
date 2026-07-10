import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  BadgeCheck,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Heart,
  History,
  MessageSquare,
  Share2,
  ShoppingBag,
  Smartphone,
  Star,
  Store,
  Users,
  WalletCards,
  XCircle,
} from 'lucide-react';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { mockProducts } from '../mockData';
import type { Product } from '../mockData';

const stitchProductGallery = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCsZrgXxvw5vqNvysW5pCD7R_V8coyqKuyAX2lsxMRfDSv25QRVRMU_7Vd4X-4Kkqvb5UiK4eAtCu1r3jeww_7bheMrU7U-bPXszap0ShsDwxINwh9phL5l_pTvJ5bA_rscNs0SpBHBka4hkAZLCQZhtk5x7wt2lgXmgNisFxVQnli-ELAzzpa6FIB9ucoN2ILuuGiBlczolYtSvtILoHj8OSYutS0JtBhOvLk8DNLJdLFzZlxlBIHymw',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDFWrnbfCox-MdnypcezbDCcK-Bgn3HJIEG0xYtTJseKweFMZ479Ul2pUDDIL5lAdV5jjbRpoW6ozmmMottJmGcpBNVncmo0zYQJmJGdW7WiOroFm4KWMgRFzWuclncpqGKzsrxyf-CaLJVnqLFcgOyUp1nltvLzlCXqO-SgUBFsNVI3HWdNPOaM719ITyCD3LWuNy1SLEyLvW84ZHlXmZ4EMvJuZheqr2eIV5jrXSChEp1n-ls44jcdQ',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDlmBAthdfAu_iBR2hq50ZCZGQmuAmvB0TENw8zLEkitCT-0gyFEB6ZYJAWefkUtj0yLJMNOpG3B4aMLCs-IujL0HDZUTQmEPpeRNEn9L3JaFxlIIWTTQnHTD0QWfVUoz6WqWOC7xD-PvOjnzKcZiwjohY2PdBeTiDf1F__aFqo3C7MyLe6JEQEF9Pt_QImD2x40vQeZ_R1-0syULX0UJmeMXmFiVXlI6ZXocLbgdMj7FiVbUFxd66_Qg',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCTCEdNt5xzIm8bXFkhzPg3BxqIs0AcCm1tPfYGrdzyupppPfzgpWvrzZ4Hn1L4aZA5J3U4z4epzjRplREnq1z001-3e5TjA9yFAtv5DmTFOtl6ofEWqPTlY_WZOtEKGwLPSg5VYV0tTpQJTPVJHNb9n5wowvUqedTo31TcES3sZMkrZsd4nztZ6iutjPdPcxdduh5xmm3865wX36mB2rea796VPVEk4J3e1gxnL-QBKDetnNYjpi-Dlw',
];

const relatedReferenceImages = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDNI2ZXVEVX7KNMUytRMleqG4HNlPuXYx5Ejq7xdPpuglJ0V-ybtFxHDVGWKBPqXDCG6hJJosrKd_zwnTXlSkDGh-2kHSGpPsKG7yI3ovYsfFIyaQexwig4CnY9cd1Fqqmu8IzrvOTFEWlUhT8VSejYxPnGHZ7rrwZUA-Pij4fOZ7vgs3iSw-XjcCVImcue5F7k45lLrHfgywerWZ4z6SWDMckfbsdcXc9TaMXedY9L6r4JqgakApehNw',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCbkS-4XJtpP6zJpDb5_Mv1Fu79WgBbINcDKIHMY__0WXwpnnJKLuxZqXBfZgpV4rP7eubUv-TYu5J4xaPrpXjyRwPI6tNsADvXBXJJA5HgYE8lVwUzWENxiVjOHeXRxCreSApg5MAWynJxxcbL_99EkBQHt7V3kvYVyx0gd_6-gDNgA2eNZHFH7bqz3BsL9Qp3_NdwnjfLpKZBznkN-ACCkWUXn65VHll64tDnnPoYmukD827hbv3o3A',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDIkZIpYIuMtHc_TK5E9spQPKU29xokmi01WQeeC8COlSp9NLnMCd_bRvxbamnHqPF1rpjOymXodjOO290M3RNk2dqxjlaGqc9GDbaTLLbe4rRSINEvOgrIhSqpjYAHCiMvzhD0Bc9bZ-KzuPdnFjCMXnR3rGYhK2z9pgQYhd37ab9czoYCZr7yxoTbUeVUaDwHwesxxhW0TLspT7GmHcrCUhB7Q02zFX-1EQ9NW_7nmW04dFlpB1C14w',
];

const formatCurrency = (amount: number) => `${amount.toLocaleString('vi-VN')}đ`;

export const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const product = mockProducts.find((item) => item.id === id);
  const [activeImage, setActiveImage] = useState(0);
  const [isSaved, setIsSaved] = useState(product?.saved ?? false);

  useEffect(() => {
    setActiveImage(0);
    setIsSaved(product?.saved ?? false);
  }, [product]);

  const gallery = useMemo(() => {
    if (!product) return [];
    if (product.id === 'p1') return stitchProductGallery;
    return [
      product.imageUrl,
      ...mockProducts.filter((item) => item.id !== product.id).map((item) => item.imageUrl),
    ].slice(0, 4);
  }, [product]);

  const relatedProducts = useMemo(() => {
    if (!product) return [];
    const sameCategory = mockProducts.filter(
      (item) => item.id !== product.id && item.category === product.category,
    );
    const fallback = mockProducts.filter(
      (item) => item.id !== product.id && !sameCategory.some((match) => match.id === item.id),
    );
    return [...sameCategory, ...fallback].slice(0, 3);
  }, [product]);

  if (!product) {
    return (
      <section className="min-h-[62vh] px-5 py-20 flex items-center justify-center">
        <div className="max-w-lg text-center">
          <p className="text-primary font-black text-7xl tracking-tighter">404</p>
          <h1 className="mt-4 text-2xl sm:text-3xl font-black text-on-surface">Không tìm thấy sản phẩm</h1>
          <p className="mt-3 text-sm leading-6 text-on-surface-variant">
            Deal này có thể đã hết hạn hoặc không còn được sàn hỗ trợ hoàn tiền.
          </p>
          <Button className="mt-7" onClick={() => navigate('/deals')}>
            Xem các deal đang hoạt động
          </Button>
        </div>
      </section>
    );
  }

  const handleBuy = (selectedProduct: Product = product) => {
    const host = selectedProduct.platform === 'Shopee' ? 'shopee.vn' : 'shop.tiktok.com';
    const productUrl = `https://${host}/product-detail-${selectedProduct.id}`;
    navigate(`/link-generator?url=${encodeURIComponent(productUrl)}`);
  };

  const handleShare = async () => {
    const shareData = { title: product.name, text: product.cashbackText, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(shareData);
      else await navigator.clipboard.writeText(window.location.href);
    } catch {
      // Người dùng có thể chủ động đóng bảng chia sẻ; không hiển thị lỗi gây nhiễu.
    }
  };

  const cashbackConditions = [
    {
      icon: <CheckCircle2 size={20} />,
      tone: 'text-tertiary',
      content: <>Hoàn tất thanh toán trong <strong>01 phiên</strong> truy cập từ HOANTIENVIP.</>,
    },
    {
      icon: <XCircle size={20} />,
      tone: 'text-primary',
      content: <><strong>Không sử dụng</strong> mã giảm giá từ các nguồn bên ngoài hệ thống.</>,
    },
    {
      icon: <History size={20} />,
      tone: 'text-tertiary',
      content: <>Cashback được ghi nhận sau <strong>2–4 giờ</strong> và duyệt sau 30–45 ngày.</>,
    },
    {
      icon: <Smartphone size={20} />,
      tone: 'text-primary',
      content: <>Chỉ áp dụng khi mua trên ứng dụng di động {product.platform}.</>,
    },
  ];

  return (
    <div className="pb-28 lg:pb-0">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-5 sm:py-8 text-left">
        <nav aria-label="Đường dẫn trang" className="hidden sm:flex items-center gap-2 text-xs text-on-surface-variant mb-6">
          <Link to="/" className="hover:text-primary">Trang chủ</Link>
          <ChevronLeft size={13} className="rotate-180" />
          <Link to="/deals" className="hover:text-primary">{product.platform}</Link>
          <ChevronLeft size={13} className="rotate-180" />
          <span className="font-semibold text-on-surface">{product.category === 'electronics' ? 'Điện tử' : 'Deal nổi bật'}</span>
        </nav>

        <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-7 lg:gap-12 items-start">
          <div>
            <div className="relative overflow-hidden rounded-2xl bg-white border border-outline-variant/25 aspect-square shadow-[0_16px_40px_rgba(91,64,58,0.08)]">
              <img
                src={gallery[activeImage]}
                alt={`${product.name} - ảnh ${activeImage + 1}`}
                className="w-full h-full object-cover transition-opacity duration-300"
              />
              <Badge className="absolute top-4 right-4 !bg-primary text-white shadow-md !px-4 !py-1.5">
                -{Math.max(1, Math.round((1 - product.price / product.originalPrice) * 100))}% GIẢM
              </Badge>
              <Badge
                variant={product.platform === 'Shopee' ? 'shopee' : 'tiktok'}
                className="absolute top-4 left-4 sm:hidden shadow-sm"
              >
                {product.platform}
              </Badge>
            </div>

            <div className="grid grid-cols-4 gap-2.5 sm:gap-4 mt-3 sm:mt-4">
              {gallery.map((image, index) => (
                <button
                  key={image}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  aria-label={`Xem ảnh sản phẩm ${index + 1}`}
                  aria-pressed={activeImage === index}
                  className={`aspect-square overflow-hidden rounded-xl bg-white border-2 transition-all cursor-pointer ${
                    activeImage === index
                      ? 'border-primary shadow-sm'
                      : 'border-transparent hover:border-outline-variant'
                  }`}
                >
                  <img src={image} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-5 lg:pt-0">
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-3">
                <Badge variant={product.platform === 'Shopee' ? 'shopee' : 'tiktok'} className="uppercase tracking-wider">
                  {product.platform} Mall
                </Badge>
                <span className="inline-flex items-center gap-0.5 text-amber-500" aria-label="4,9 trên 5 sao">
                  {[0, 1, 2, 3, 4].map((star) => <Star key={star} size={15} fill="currentColor" />)}
                </span>
                <span className="text-xs text-on-surface-variant">(452 đánh giá)</span>
              </div>
              <div className="flex items-start gap-3">
                <h1 className="text-[24px] sm:text-[30px] leading-[1.25] font-black tracking-[-0.025em] text-on-surface flex-1 text-balance">
                  {product.name}
                </h1>
                <button
                  type="button"
                  onClick={() => setIsSaved((saved) => !saved)}
                  aria-label={isSaved ? 'Bỏ lưu sản phẩm' : 'Lưu sản phẩm'}
                  className={`shrink-0 w-11 h-11 rounded-full border grid place-items-center transition-all cursor-pointer ${
                    isSaved
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-on-surface-variant border-outline-variant/60 hover:text-primary'
                  }`}
                >
                  <Heart size={20} fill={isSaved ? 'currentColor' : 'none'} />
                </button>
              </div>
            </div>

            <div className="rounded-3xl bg-[#fff0ed] border border-primary/10 p-5 sm:p-6">
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-[30px] sm:text-[34px] font-black tracking-tight text-primary tabular-nums">
                  {formatCurrency(product.price)}
                </span>
                {product.originalPrice > product.price && (
                  <span className="text-sm text-on-surface-variant line-through tabular-nums">
                    {formatCurrency(product.originalPrice)}
                  </span>
                )}
              </div>
              <div className="mt-3 rounded-2xl border border-tertiary/30 bg-tertiary/5 px-4 py-3 flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-tertiary text-white grid place-items-center shrink-0">
                  <WalletCards size={21} />
                </span>
                <div>
                  <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-on-surface-variant">Ưu đãi độc quyền</p>
                  <p className="text-base sm:text-lg font-bold text-tertiary">Hoàn tiền ước tính: {formatCurrency(product.cashbackValue)}</p>
                </div>
              </div>
            </div>

            {product.coupons && product.coupons.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
                {product.coupons.map((coupon) => (
                  <span key={coupon} className="shrink-0 px-3 py-1.5 rounded-lg bg-white border border-primary/20 text-xs font-bold text-primary">
                    {coupon}
                  </span>
                ))}
              </div>
            )}

            <div>
              <h2 className="text-lg font-bold flex items-center gap-2 mb-3">
                <BadgeCheck size={20} className="text-primary" /> Điều kiện nhận Cashback
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {cashbackConditions.map((condition, index) => (
                  <div key={index} className="min-h-[72px] rounded-2xl bg-white border border-outline-variant/20 px-4 py-3.5 flex items-start gap-3 shadow-[0_5px_18px_rgba(91,64,58,0.04)]">
                    <span className={`mt-0.5 shrink-0 ${condition.tone}`}>{condition.icon}</span>
                    <p className="text-xs sm:text-sm leading-5 text-on-surface-variant">{condition.content}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="hidden sm:flex gap-3 mt-1">
              <Button
                size="lg"
                className="flex-1 shadow-[0_10px_24px_rgba(255,90,54,0.22)]"
                icon={<ShoppingBag size={20} />}
                onClick={() => handleBuy()}
              >
                Mua nhận hoàn tiền
              </Button>
              <Button variant="outline" size="lg" icon={<Share2 size={19} />} onClick={handleShare}>
                Chia sẻ
              </Button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,8fr)_minmax(270px,4fr)] gap-10 lg:gap-12 mt-14 sm:mt-16 items-start">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold mb-5">Câu hỏi thường gặp</h2>
            <div className="space-y-3">
              {[
                ['Tại sao tôi không thấy hoàn tiền ngay lập tức?', 'Đơn hợp lệ thường xuất hiện trong lịch sử sau 2–4 giờ. Sàn sẽ xác nhận tiền hoàn sau khi kết thúc thời gian đổi trả.'],
                ['Tôi có được hoàn tiền nếu hủy đơn hoặc đổi trả không?', 'Không. Đơn bị hủy, hoàn toàn bộ hoặc phát sinh gian lận sẽ không đủ điều kiện nhận cashback.'],
                ['Có áp dụng mã giảm giá của sàn không?', 'Bạn có thể dùng voucher hiển thị trực tiếp trong ứng dụng sàn, nhưng không nên mở thêm liên kết quảng cáo từ nguồn khác.'],
              ].map(([question, answer]) => (
                <details key={question} className="group rounded-2xl bg-white border border-outline-variant/30 overflow-hidden">
                  <summary className="list-none px-5 py-4 font-semibold text-sm sm:text-base flex items-center justify-between gap-4 cursor-pointer">
                    {question}
                    <ChevronDown size={18} className="shrink-0 transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="px-5 pb-5 -mt-1 text-sm leading-6 text-on-surface-variant">{answer}</p>
                </details>
              ))}
            </div>

            <article className="mt-8 rounded-3xl bg-[#ffded7] p-5 sm:p-7 flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="w-16 h-16 rounded-full bg-white grid place-items-center shadow-sm shrink-0">
                <Store size={28} className="text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold">{product.shopName}</h3>
                <p className="mt-1 text-xs sm:text-sm text-on-surface-variant">Gian hàng chính hãng, tỷ lệ phản hồi nhanh và sản phẩm được sàn bảo chứng.</p>
                <div className="flex flex-wrap gap-2 mt-3 text-[11px] font-semibold">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1"><Users size={13} /> 1,2M theo dõi</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1"><MessageSquare size={13} /> 99% phản hồi</span>
                </div>
              </div>
              <Button variant="secondary" onClick={() => navigate(`/deals?platform=${encodeURIComponent(product.platform)}`)}>
                Xem shop
              </Button>
            </article>
          </div>

          <aside aria-labelledby="related-products-title">
            <h2 id="related-products-title" className="text-xl sm:text-2xl font-bold mb-5">Sản phẩm tương tự</h2>
            <div className="space-y-4">
              {relatedProducts.map((related, index) => (
                <button
                  key={related.id}
                  type="button"
                  onClick={() => navigate(`/product/${related.id}`)}
                  className="group w-full grid grid-cols-[84px_minmax(0,1fr)] gap-3 text-left cursor-pointer"
                >
                  <img
                    src={product.id === 'p1' ? relatedReferenceImages[index] : related.imageUrl}
                    alt={related.name}
                    className="w-[84px] h-[84px] rounded-xl object-cover bg-white"
                  />
                  <span className="min-w-0 pt-1">
                    <span className="block text-sm font-bold leading-[1.25] line-clamp-2 group-hover:text-primary transition-colors">{related.name}</span>
                    <span className="block mt-1 text-xs font-bold text-primary tabular-nums">{formatCurrency(related.price)}</span>
                    <span className="block text-[10px] font-bold text-tertiary">+{formatCurrency(related.cashbackValue)} hoàn tiền</span>
                  </span>
                </button>
              ))}
            </div>
            <Link to="/deals" className="mt-6 min-h-12 rounded-xl border border-primary/30 text-primary text-sm font-bold flex items-center justify-center hover:bg-primary/5 transition-colors">
              Xem tất cả deal
            </Link>
          </aside>
        </section>
      </div>

      <div className="fixed sm:hidden inset-x-0 bottom-0 z-40 border-t border-outline-variant/30 bg-white/95 backdrop-blur-xl px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] flex gap-3 shadow-[0_-12px_30px_rgba(91,64,58,0.12)]">
        <button
          type="button"
          onClick={handleShare}
          aria-label="Chia sẻ sản phẩm"
          className="w-13 h-13 rounded-2xl border-2 border-primary text-primary grid place-items-center cursor-pointer"
        >
          <Share2 size={20} />
        </button>
        <Button className="flex-1 h-13" icon={<ShoppingBag size={19} />} onClick={() => handleBuy()}>
          Mua nhận hoàn tiền
        </Button>
      </div>
    </div>
  );
};
