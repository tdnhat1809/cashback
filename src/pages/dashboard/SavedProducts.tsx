import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockProducts } from '../../mockData';
import type { Product } from '../../mockData';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { Heart } from 'lucide-react';

export const SavedProducts: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>(mockProducts);

  const savedProducts = products.filter(p => p.saved);

  const handleSaveProduct = (id: string) => {
    setProducts(prev => 
      prev.map(p => p.id === id ? { ...p, saved: !p.saved } : p)
    );
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
          title="Không có sản phẩm nào đã lưu"
          description="Bấm vào nút hình trái tim tại các thẻ deal bên ngoài trang chủ để lưu sản phẩm vào danh sách này."
          actionText="Khám phá deal hot"
          onAction={() => navigate('/deals')}
          icon={<Heart size={32} className="text-primary" />}
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
