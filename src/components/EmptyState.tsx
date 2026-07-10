import React from 'react';
import { PackageOpen } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  title?: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Không có dữ liệu',
  description,
  actionText,
  onAction,
  icon
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-outline-variant/50 rounded-3xl bg-white/50 backdrop-blur-sm min-h-[300px]">
      <div className="w-16 h-16 bg-surface-container rounded-2xl flex items-center justify-center mb-4 text-outline-variant">
        {icon || <PackageOpen size={32} className="text-outline/75" />}
      </div>
      <h4 className="font-title-lg text-base font-bold text-on-surface mb-2">{title}</h4>
      <p className="font-body-md text-sm text-on-surface-variant max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {actionText && onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
};
