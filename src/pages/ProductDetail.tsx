import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Heart, Share2, ShoppingBag, Store, WalletCards } from 'lucide-react';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { ApiError, catalogApi, type DealProduct, userFeaturesApi } from '../services/apiClient';
import { useAuth } from '../state/auth-context';

const formatCurrency = (amount: number) => `${amount.toLocaleString('vi-VN')}đ`;

export const ProductDetail: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { status } = useAuth();
  const [product, setProduct] = useState<DealProduct | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<DealProduct[]>([]);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setSaveError('');
    void catalogApi.getProduct(id)
      .then(async (record) => {
        const related = await catalogApi.listDeals({ platform: record.platform as 'shopee' | 'tiktok' });
        const savedIds = status === 'authenticated'
          ? await userFeaturesApi.savedProducts().then((result) => new Set(result.items.map((item) => item.id))).catch(() => new Set<string>())
          : new Set<string>();
        if (!active) return;
        setProduct(record);
        setRelatedProducts(related.filter((item) => item.id !== record.id).slice(0, 3));
        setSaved(savedIds.has(record.id));
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof ApiError ? reason : new ApiError({ status: 0, code: 'LOAD_FAILED', message: 'Không thể tải sản phẩm.' }));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, status]);

  const discount = useMemo(() => product && product.original_price_vnd > product.price_vnd
    ? Math.round((1 - product.price_vnd / product.original_price_vnd) * 100)
    : 0, [product]);

  const handleSave = async () => {
    if (!product) return;
    if (status !== 'authenticated') {
      navigate(`/login?redirect=${encodeURIComponent(`/product/${product.id}`)}`);
      return;
    }
    setSaveError('');
    try {
      const result = await userFeaturesApi.toggleSavedProduct(product.id);
      setSaved(result.saved);
    } catch (reason) {
      setSaveError(reason instanceof Error ? reason.message : 'Không thể cập nhật sản phẩm đã lưu.');
    }
  };

  const handleBuy = () => {
    if (product) navigate(`/link-generator?url=${encodeURIComponent(product.source_url)}`);
  };

  const handleShare = async () => {
    try {
      if (navigator.share && product) await navigator.share({ title: product.name, url: window.location.href });
      else await navigator.clipboard.writeText(window.location.href);
    } catch { /* Dismissed native share sheets are expected. */ }
  };

  if (loading) return <main className="min-h-[60vh] grid place-items-center text-on-surface-variant">Đang tải sản phẩm…</main>;
  if (error || !product) return (
    <main className="min-h-[60vh] grid place-items-center px-5 text-center">
      <div><p className="text-primary font-black text-6xl">{error?.status === 404 ? '404' : '!'}</p><h1 className="mt-3 text-2xl font-black">Không tìm thấy sản phẩm</h1><p className="mt-2 text-sm text-on-surface-variant">Deal có thể đã hết hạn hoặc hiện không khả dụng.</p><Button className="mt-6" onClick={() => navigate('/deals')}>Xem deal đang hoạt động</Button></div>
    </main>
  );

  return (
    <main className="mx-auto max-w-[1280px] px-4 py-7 pb-28 text-left sm:px-6 lg:pb-12">
      <nav className="flex items-center gap-2 text-xs text-on-surface-variant mb-6"><Link to="/" className="hover:text-primary">Trang chủ</Link><ChevronLeft size={13} className="rotate-180" /><Link to="/deals" className="hover:text-primary">Deal</Link><ChevronLeft size={13} className="rotate-180" /><span className="truncate text-on-surface">{product.name}</span></nav>
      <section className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
        <div className="aspect-square overflow-hidden rounded-3xl border border-outline-variant/25 bg-white shadow-soft">
          {product.image_url ? <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-sm text-on-surface-variant">Chưa có ảnh sản phẩm</div>}
        </div>
        <div className="flex flex-col gap-5">
          <div className="flex items-start gap-3"><div className="flex-1"><Badge variant={product.platform === 'shopee' ? 'shopee' : 'tiktok'}>{product.platform === 'shopee' ? 'Shopee' : 'TikTok Shop'}</Badge><h1 className="mt-3 text-3xl font-black leading-tight text-on-surface">{product.name}</h1></div><button type="button" onClick={() => void handleSave()} aria-label={saved ? 'Bỏ lưu sản phẩm' : 'Lưu sản phẩm'} className={`grid h-11 w-11 place-items-center rounded-full border ${saved ? 'border-primary bg-primary text-white' : 'border-outline-variant/60 bg-white text-on-surface-variant'}`}><Heart size={20} fill={saved ? 'currentColor' : 'none'} /></button></div>
          {saveError && <p className="rounded-xl border border-error/20 bg-error-container/20 p-3 text-sm text-error" role="alert">{saveError}</p>}
          <div className="rounded-3xl border border-primary/10 bg-[#fff0ed] p-6"><div className="flex flex-wrap items-baseline gap-3"><span className="text-3xl font-black text-primary">{formatCurrency(product.price_vnd)}</span>{product.original_price_vnd > product.price_vnd && <span className="text-sm line-through text-on-surface-variant">{formatCurrency(product.original_price_vnd)}</span>}{discount > 0 && <Badge className="!bg-primary text-white">-{discount}%</Badge>}</div><div className="mt-4 flex items-center gap-3 rounded-2xl border border-tertiary/20 bg-tertiary/5 p-3"><WalletCards className="text-tertiary" size={22} /><p className="text-sm font-bold text-tertiary">Ưu đãi cashback đang cập nhật theo chính sách của sàn.</p></div></div>
          <div className="rounded-2xl border border-outline-variant/25 bg-white p-5"><h2 className="font-bold">Điều kiện nhận cashback</h2><ul className="mt-3 space-y-2 text-sm text-on-surface-variant"><li>Mở link từ HOANTIENVIP và hoàn tất thanh toán trong cùng phiên.</li><li>Đơn bị hủy hoặc hoàn tiền sẽ không đủ điều kiện nhận cashback.</li><li>Cashback chỉ được xác nhận sau khi sàn đối soát.</li></ul></div>
          <div className="hidden gap-3 sm:flex"><Button size="lg" className="flex-1" icon={<ShoppingBag size={20} />} onClick={handleBuy}>Mua nhận hoàn tiền</Button><Button size="lg" variant="outline" icon={<Share2 size={18} />} onClick={() => void handleShare()}>Chia sẻ</Button></div>
        </div>
      </section>
      <section className="mt-14 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,8fr)_minmax(280px,4fr)]"><div className="rounded-3xl bg-white border border-outline-variant/25 p-6"><Store className="text-primary" size={28} /><h2 className="mt-3 text-xl font-bold">{product.shop_name ?? product.platform}</h2><p className="mt-2 text-sm text-on-surface-variant">Thông tin gian hàng được đồng bộ từ danh mục deal hiện có.</p></div><aside><h2 className="mb-4 text-xl font-bold">Sản phẩm tương tự</h2><div className="space-y-4">{relatedProducts.map((item) => <button key={item.id} type="button" onClick={() => navigate(`/product/${item.id}`)} className="grid w-full grid-cols-[72px_1fr] gap-3 text-left"><div className="h-[72px] overflow-hidden rounded-xl bg-surface-container">{item.image_url && <img src={item.image_url} alt="" className="h-full w-full object-cover" />}</div><span><span className="line-clamp-2 text-sm font-bold">{item.name}</span><span className="mt-1 block text-xs font-bold text-primary">{formatCurrency(item.price_vnd)}</span></span></button>)}</div></aside></section>
      <div className="fixed inset-x-0 bottom-0 z-40 flex gap-3 border-t border-outline-variant/30 bg-white/95 p-3 backdrop-blur sm:hidden"><button type="button" onClick={() => void handleShare()} className="grid h-13 w-13 place-items-center rounded-2xl border-2 border-primary text-primary"><Share2 size={20} /></button><Button className="h-13 flex-1" icon={<ShoppingBag size={19} />} onClick={handleBuy}>Mua nhận hoàn tiền</Button></div>
    </main>
  );
};
