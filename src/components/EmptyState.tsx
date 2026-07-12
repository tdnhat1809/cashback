import React from 'react';
import { Button } from './Button';
import { 
  PackageOpen, 
  Heart, 
  Truck, 
  BellOff, 
  Headset, 
  SearchCode,
  Sparkles,
  WifiOff
} from 'lucide-react';

export type EmptyStateVariant = 
  | 'cashback'
  | 'saved-products'
  | 'shipments'
  | 'notifications'
  | 'tickets'
  | 'deal-search'
  | 'rewards'
  | 'offline';

interface EmptyStateProps {
  variant: EmptyStateVariant;
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  variant,
  title,
  description,
  actionText,
  onAction
}) => {
  // Define default values for each variant
  const config = {
    cashback: {
      title: 'Không có đơn cashback',
      description: 'Bạn chưa thực hiện giao dịch nào để nhận hoàn tiền. Hãy bắt đầu mua sắm ngay!',
      actionText: 'Tạo link hoàn tiền',
      glowClass: 'bg-primary-fixed/20',
      icon: <PackageOpen size={48} className="text-primary" />
    },
    'saved-products': {
      title: 'Chưa lưu sản phẩm',
      description: 'Danh sách yêu thích của bạn đang trống. Lưu sản phẩm để theo dõi giá và deal tốt nhất.',
      actionText: 'Khám phá deal',
      glowClass: 'bg-primary-fixed/30',
      icon: <Heart size={48} className="text-primary" />
    },
    shipments: {
      title: 'Chưa có vận đơn',
      description: 'Hiện tại không có kiện hàng nào đang được vận chuyển tới địa chỉ của bạn.',
      actionText: 'Theo dõi vận đơn',
      glowClass: 'bg-tertiary-container/10',
      icon: <Truck size={48} className="text-tertiary" />
    },
    notifications: {
      title: 'Chưa có thông báo',
      description: 'Hộp thư của bạn đang sạch bóng! Chúng tôi sẽ gửi tin khi có cập nhật mới.',
      actionText: 'Cài đặt thông báo',
      glowClass: 'bg-surface-container-high/40',
      icon: <BellOff size={48} className="text-outline" />
    },
    tickets: {
      title: 'Chưa có ticket hỗ trợ',
      description: 'Mọi thứ vẫn đang vận hành trơn tru! Nếu có thắc mắc, hãy gửi yêu cầu cho chúng tôi.',
      actionText: 'Liên hệ hỗ trợ',
      glowClass: 'bg-primary-fixed/20',
      icon: <Headset size={48} className="text-primary" />
    },
    'deal-search': {
      title: 'Không tìm thấy deal',
      description: 'Rất tiếc, chúng tôi không tìm thấy kết quả phù hợp. Hãy thử tìm kiếm với từ khóa khác.',
      actionText: 'Làm mới bộ lọc',
      glowClass: 'bg-surface-container-high/40',
      icon: <SearchCode size={48} className="text-on-surface-variant/80" />
    },
    rewards: {
      title: 'Chưa có phần thưởng',
      description: 'Nhiệm vụ và danh mục đổi quà chưa được mở.',
      actionText: '',
      glowClass: 'bg-amber-100/60',
      icon: <Sparkles size={48} className="text-amber-600" />
    },
    offline: {
      title: 'Mất kết nối mạng',
      description: 'Không thể kết nối internet. Vui lòng kiểm tra lại thiết bị truyền phát hoặc wifi của bạn.',
      actionText: 'Thử lại ngay',
      glowClass: 'bg-error-container/20',
      icon: <WifiOff size={48} className="text-error" />
    }
  };

  const current = config[variant];
  const finalTitle = title || current.title;
  const finalDescription = description || current.description;
  const finalActionText = actionText || current.actionText;

  return (
    <div className="flex flex-col items-center justify-center text-center p-8 md:p-12 border border-outline-variant/30 rounded-[24px] bg-surface-container shadow-sm max-w-lg mx-auto w-full transition-transform hover:-translate-y-1 duration-300">
      <div className="w-36 h-36 mb-6 relative flex items-center justify-center">
        {/* Glow behind the icon */}
        <div className={`absolute inset-0 rounded-full scale-90 blur-xl ${current.glowClass}`} />
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-md relative z-10">
          {current.icon}
        </div>
      </div>
      
      <h3 className="font-headline-md text-lg font-bold text-on-surface mb-2">
        {finalTitle}
      </h3>
      <p className="font-body-md text-xs text-on-surface-variant mb-6 max-w-sm leading-relaxed">
        {finalDescription}
      </p>

      {finalActionText && onAction && (
        <Button 
          variant={variant === 'shipments' ? 'outline' : 'primary'} 
          onClick={onAction}
          className="px-8 py-2.5 rounded-xl font-bold active:scale-[0.98] transition-all"
        >
          {finalActionText}
        </Button>
      )}
    </div>
  );
};
