import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Product } from '../../mockData';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { userFeaturesApi, type SavedProductRecord } from '../../services/apiClient';

const toProduct = (deal: SavedProductRecord): Product => ({
  id: deal.id,
  name: deal.name,
  price: deal.priceVnd,
  originalPrice: deal.originalPriceVnd,
  cashbackValue: 0,
  cashbackText: 'Đang cập nhật',
  platform: deal.platform === 'shopee' ? 'Shopee' : 'TikTok Shop',
  category: deal.priceVnd <= 10_000 ? 'under10k' : 'home',
  imageUrl: deal.imageUrl ?? '',
  shopName: deal.shopName ?? deal.platform,
  sourceUrl: deal.sourceUrl,
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
