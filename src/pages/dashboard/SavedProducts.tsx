import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Product } from '../../mockData';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { useAppData } from '../../state/AppDataContext';


export const SavedProducts: React.FC = () => {
  const navigate = useNavigate();
  const { products, toggleSavedProduct } = useAppData();

  const savedProducts = products.filter(p => p.saved);

  const handleSaveProduct = (id: string) => {
    toggleSavedProduct(id);
  };

  const handleBuyProduct = (product: Product) => {
    navigate(`/product/${product.id}`);
  };

  return (
    <div className="space-y-6 text-left">
      <div>
        <h1 className="font-headline-md text-on-surface">Sản phẩm đã lưu</h1>
        <p className="text-xs text-on-surface-variant">Danh sách deal và mã giảm giá bạn đã đánh dấu quan tâm để theo dõi.</p>
      </div>

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
