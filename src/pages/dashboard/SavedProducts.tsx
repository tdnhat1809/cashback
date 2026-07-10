import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Product } from '../../mockData';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { userFeaturesApi, type DealProduct } from '../../services/apiClient';

const toProduct = (deal: DealProduct): Product => ({
  id: deal.id,
  name: deal.name,
  price: deal.price_vnd,
  originalPrice: deal.original_price_vnd,
  cashbackValue: deal.commission_rate_bps ? Math.floor((deal.price_vnd * deal.commission_rate_bps * 0.9) / 10_000) : 0,
  cashbackText: deal.commission_rate_bps ? `Hoàn ${Math.floor((deal.price_vnd * deal.commission_rate_bps * 0.9) / 10_000).toLocaleString('vi-VN')}đ` : 'Đang cập nhật',
  platform: deal.platform === 'shopee' ? 'Shopee' : 'TikTok Shop',
  category: deal.price_vnd <= 10_000 ? 'under10k' : 'home',
  imageUrl: deal.image_url ?? '',
  shopName: deal.shop_name ?? deal.platform,
  sourceUrl: deal.source_url,
  saved: true,
});


export const SavedProducts: React.FC = () => {
  const navigate = useNavigate();
  const [savedProducts, setSavedProducts] = useState<Product[]>([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    void userFeaturesApi.savedProducts()
      .then((result) => setSavedProducts(result.items.map(toProduct)))
      .catch((error: unknown) => setLoadError(error instanceof Error ? error.message : 'Không thể tải sản phẩm đã lưu.'));
  }, []);

  const handleSaveProduct = async (id: string) => {
    try {
      await userFeaturesApi.toggleSavedProduct(id);
      setSavedProducts((current) => current.filter((product) => product.id !== id));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Không thể cập nhật sản phẩm đã lưu.');
    }
  };

  const handleBuyProduct = (product: Product) => {
    navigate(product.sourceUrl ? `/link-generator?url=${encodeURIComponent(product.sourceUrl)}` : `/product/${product.id}`);
  };

  return (
    <div className="space-y-6 text-left">
      <div>
        <h1 className="font-headline-md text-on-surface">Sản phẩm đã lưu</h1>
        <p className="text-xs text-on-surface-variant">Danh sách deal và mã giảm giá bạn đã đánh dấu quan tâm để theo dõi.</p>
      </div>

      {loadError && <p className="rounded-xl border border-error/20 bg-error-container/20 p-3 text-sm text-error" role="alert">{loadError}</p>}

      {savedProducts.length === 0 ? (
        <EmptyState
          variant="saved-products"
          onAction={() => navigate('/deals')}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
          {savedProducts.map((product) => (
            <Card
              key={product.id}
              product={product}
              onSave={handleSaveProduct}
              onBuy={handleBuyProduct}
            />
          ))}
        </div>
      )}
    </div>
  );
};
