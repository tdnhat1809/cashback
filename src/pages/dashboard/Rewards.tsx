import React, { useEffect, useState } from 'react';
import { Award, Gift, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { ApiError, userFeaturesApi } from '../../services/apiClient';

export const Rewards: React.FC = () => {
  const [points, setPoints] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPoints = async () => {
    setError(null);
    try {
      const result = await userFeaturesApi.points();
      setPoints(result.balance);
    } catch (caught) {
      setPoints(null);
      setError(caught instanceof ApiError ? caught.message : 'Không thể tải số dư Xu lúc này.');
    }
  };

  useEffect(() => {
    void loadPoints();
  }, []);

  return (
    <div className="space-y-8 text-left animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="font-headline-md text-on-surface text-wrap-balance">Xu thưởng & Nhiệm vụ</h1>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-on-surface-variant">
            Xu là điểm thưởng riêng, không phải số dư tiền mặt và không thể rút về ngân hàng.
          </p>
        </div>

        <div className="min-w-56 rounded-2xl bg-[linear-gradient(135deg,#b45309,#d97706)] px-6 py-4 text-white shadow-[0_12px_28px_rgba(180,83,9,0.18)] flex items-center gap-4 shrink-0">
          <Award size={34} className="text-amber-100" aria-hidden="true" />
          <div>
            <span className="block text-[10px] font-semibold tracking-wider text-amber-100">Số Xu hiện có</span>
            <span className="text-2xl font-black tabular-nums tracking-tight">
              {points === null ? '—' : points.toLocaleString('vi-VN')} Xu
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex flex-col gap-3 rounded-2xl border border-error/20 bg-error-container/30 px-5 py-4 sm:flex-row sm:items-center sm:justify-between" role="alert">
          <p className="text-sm font-semibold text-on-error-container">{error}</p>
          <Button variant="outline" size="sm" onClick={() => void loadPoints()} icon={<RefreshCw size={15} />}>
            Thử lại
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-3xl bg-white p-6 shadow-soft md:p-8" aria-labelledby="reward-tasks-title">
          <div className="mb-6 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles size={19} aria-hidden="true" />
            </div>
            <div>
              <h2 id="reward-tasks-title" className="text-sm font-bold text-on-surface">Nhiệm vụ tích Xu</h2>
              <p className="mt-1 text-xs leading-5 text-on-surface-variant">Hệ thống xác minh nhiệm vụ chưa được kết nối.</p>
            </div>
          </div>
          <EmptyState
            variant="rewards"
            title="Chưa có nhiệm vụ khả dụng"
            description="Nhiệm vụ sẽ xuất hiện tại đây sau khi quy trình xác minh và ghi nhận Xu được triển khai. Chúng tôi sẽ không cộng Xu từ thao tác mô phỏng."
          />
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-soft md:p-8" aria-labelledby="reward-catalog-title">
          <div className="mb-6 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tertiary/10 text-tertiary">
              <Gift size={19} aria-hidden="true" />
            </div>
            <div>
              <h2 id="reward-catalog-title" className="text-sm font-bold text-on-surface">Danh mục đổi quà</h2>
              <p className="mt-1 text-xs leading-5 text-on-surface-variant">Danh mục và quy trình duyệt đổi quà chưa được mở.</p>
            </div>
          </div>
          <EmptyState
            variant="rewards"
            title="Quà tặng đang được chuẩn bị"
            description="Khi danh mục được kết nối với kho và luồng duyệt vận hành, bạn sẽ có thể xem tồn kho và đổi quà bằng Xu tại đây."
          />
        </section>
      </div>
    </div>
  );
};
