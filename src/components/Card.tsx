import React from 'react';
import type { Product } from '../mockData';
import { Badge } from './Badge';
import { Button } from './Button';
import { Heart } from 'lucide-react';

interface CardProps {
  product: Product;
  onSave?: (id: string) => void;
  onBuy?: (product: Product) => void;
}

export const Card: React.FC<CardProps> = ({
  product,
  onSave,
  onBuy
}) => {
  const { id, name, price, originalPrice, cashbackText, platform, imageUrl, shopName, saved } = product;

  return (
    <article className="bg-white rounded-2xl overflow-hidden shadow-soft group hover:-translate-y-1 transition-all duration-300 border border-outline-variant/30 flex flex-col h-full min-w-0">
      {/* Product Image Section */}
      <div className="relative h-40 sm:h-56 lg:h-64 overflow-hidden bg-surface-container-low">
        <img
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          src={imageUrl}
          alt={name}
        />
        
        {/* Floating Cashback Badge */}
        <div className="absolute top-3 right-3 transform group-hover:scale-105 transition-all duration-300">
          <Badge variant="primary" className="!bg-primary text-white shadow-md !px-2 sm:!px-3 !py-1 text-[10px] sm:text-xs">
            {cashbackText}
          </Badge>
        </div>
        
        {/* Floating Platform Badge */}
        <div className="absolute bottom-3 left-3">
          <Badge variant={platform === 'Shopee' ? 'shopee' : 'tiktok'} className="backdrop-blur-md opacity-90 !px-2 !py-0.5 text-[9px] sm:text-xs">
            {platform}
          </Badge>
        </div>

        {/* Save Product Toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onSave) onSave(id);
          }}
          aria-label={saved ? 'Bỏ lưu sản phẩm' : 'Lưu sản phẩm'}
          className={`absolute top-3 left-3 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border transition-all shadow-sm cursor-pointer
            ${saved 
              ? 'bg-primary text-white border-primary hover:brightness-110' 
              : 'bg-white/80 hover:bg-white text-outline border-outline-variant/50'
            }
          `}
        >
          <Heart size={16} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Product Info Section */}
      <div className="p-3 sm:p-5 flex flex-col flex-1">
        <div className="text-[10px] sm:text-xs text-on-surface-variant/80 font-medium mb-1 text-left flex justify-between items-center truncate">
          <span>{shopName}</span>
        </div>
        
        <h3 className="font-title-lg text-xs sm:text-sm font-semibold mb-2 sm:mb-3 line-clamp-2 min-h-[36px] sm:min-h-[40px] text-left text-on-surface hover:text-primary transition-colors">
          {name}
        </h3>
        
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mb-3 sm:mb-4 mt-auto">
          <span className="text-primary font-bold text-sm sm:text-lg">
            {price.toLocaleString('vi-VN')}đ
          </span>
          {originalPrice > price && (
            <span className="text-outline text-[10px] sm:text-xs line-through">
              {originalPrice.toLocaleString('vi-VN')}đ
            </span>
          )}
        </div>
        
        <Button
          variant="secondary"
          size="sm"
          className="w-full font-bold hover:!bg-primary hover:!text-white group-hover:shadow-md transition-all duration-300 mt-auto !px-2 sm:!px-3"
          onClick={() => onBuy && onBuy(product)}
        >
          Mua nhận hoàn tiền
        </Button>
      </div>
    </article>
  );
};
