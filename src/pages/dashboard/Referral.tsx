import React, { useEffect, useState } from 'react';
import { Award, Copy, Link2, QrCode, RefreshCw, Share2, Sparkles, Users } from 'lucide-react';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Table } from '../../components/Table';
import type { Column } from '../../components/Table';
import { ToastContainer } from '../../components/Toast';
import { defaultToastState, triggerToast } from '../../components/toast-state';
import type { ToastState } from '../../components/toast-state';
import { ApiError, userFeaturesApi } from '../../services/apiClient';

interface ReferralHistoryItem {
  name: string;
  date: string;
  status: string;
  bonus: string;
}

interface ReferralStats {
  referralCode: string;
  counts: { total: number; pending: number; qualified: number; rewarded: number; rejected: number };
  items: Array<{ id: string; referredUser: { name: string }; status: string; createdAt: string }>;
}

const emptyStats: ReferralStats = {
  referralCode: '',
  counts: { total: 0, pending: 0, qualified: 0, rewarded: 0, rejected: 0 },
  items: [],
};

export const Referral: React.FC = () => {
  const [stats, setStats] = useState<ReferralStats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(defaultToastState);

  const loadReferrals = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await userFeaturesApi.referrals();
      setStats(result as ReferralStats);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Không thể tải thông tin giới thiệu lúc này.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReferrals();
  }, []);

  const referralLink = stats.referralCode
    ? `${window.location.origin}/login?mode=register&ref=${encodeURIComponent(stats.referralCode)}`
    : '';

  const copyText = async (value: string, successMessage: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      triggerToast(setToast, successMessage, 'success');
    } catch {
      triggerToast(setToast, 'Trình duyệt không cho phép sao chép. Hãy sao chép thủ công.', 'error');
    }
  };

  const columns: Column<ReferralHistoryItem>[] = [
    { header: 'Tên thành viên', accessor: 'name', className: 'font-semibold text-on-surface text-xs' },
    { header: 'Ngày đăng ký', accessor: 'date', className: 'text-xs text-on-surface-variant font-medium' },
    {
      header: 'Trạng thái',
      accessor: (row) => (
        <span className={`text-xs font-bold ${row.status === 'Đã nhận thưởng' ? 'text-tertiary' : 'text-amber-600'}`}>
          {row.status}
        </span>
      ),
    },
    { header: 'Hoa hồng nhận', accessor: 'bonus', className: 'text-xs font-bold text-on-surface' },
  ];

  return (
    <div className="space-y-8 text-left">
      <div>
        <h1 className="font-headline-md text-on-surface text-wrap-balance">Tiếp thị liên kết (Referral)</h1>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-on-surface-variant">
          Chia sẻ mã giới thiệu để mời bạn bè. Thưởng chỉ được ghi nhận khi người được mời đáp ứng điều kiện chương trình.
        </p>
      </div>

      {error && (
        <div className="flex flex-col gap-3 rounded-2xl border border-error/20 bg-error-container/30 px-5 py-4 sm:flex-row sm:items-center sm:justify-between" role="alert">
          <p className="text-sm font-semibold text-on-error-container">{error}</p>
          <Button variant="outline" size="sm" onClick={() => void loadReferrals()} icon={<RefreshCw size={15} />}>
            Thử lại
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { label: 'Bạn bè đã mời', value: stats.counts.total, suffix: 'thành viên', icon: <Users size={22} />, tone: 'bg-primary/10 text-primary' },
          { label: 'Đã nhận thưởng', value: stats.counts.rewarded, suffix: 'người', icon: <Award size={22} />, tone: 'bg-tertiary/10 text-tertiary' },
          { label: 'Đang chờ duyệt', value: stats.counts.pending, suffix: 'người', icon: <Sparkles size={22} />, tone: 'bg-amber-500/10 text-amber-700' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-4 rounded-3xl bg-white p-6 shadow-soft">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${item.tone}`}>{item.icon}</div>
            <div>
              <span className="block text-[10px] font-semibold tracking-wider text-on-surface-variant">{item.label}</span>
              <span className="text-2xl font-black tabular-nums tracking-tight text-on-surface">
                {loading ? '—' : item.value} <small className="text-xs font-semibold text-on-surface-variant">{item.suffix}</small>
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="space-y-6 rounded-3xl bg-white p-6 shadow-soft md:p-8 lg:col-span-8" aria-labelledby="share-referral-title">
          <div>
            <h2 id="share-referral-title" className="text-sm font-bold text-on-surface">Chia sẻ liên kết của bạn</h2>
            <p className="mt-1 text-xs text-on-surface-variant">Mã và đường dẫn đều dẫn về cùng một chương trình giới thiệu.</p>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col items-end gap-3 sm:flex-row">
              <div className="w-full flex-1">
                <Input label="Đường dẫn giới thiệu" value={referralLink} readOnly startIcon={<Share2 size={16} />} placeholder={loading ? 'Đang tải...' : 'Chưa có đường dẫn'} />
              </div>
              <Button variant="primary" disabled={!referralLink} onClick={() => void copyText(referralLink, 'Đã sao chép đường dẫn giới thiệu.')} className="h-[56px] shrink-0 px-6" icon={<Copy size={16} />}>
                Sao chép link
              </Button>
            </div>

            <div className="flex flex-col items-end gap-3 sm:flex-row">
              <div className="w-full flex-1">
                <Input label="Mã giới thiệu" value={stats.referralCode} readOnly startIcon={<Link2 size={16} />} placeholder={loading ? 'Đang tải...' : 'Chưa có mã'} />
              </div>
              <Button variant="outline" disabled={!stats.referralCode} onClick={() => void copyText(stats.referralCode, 'Đã sao chép mã giới thiệu.')} className="h-[56px] shrink-0 px-6" icon={<Copy size={16} />}>
                Sao chép mã
              </Button>
            </div>
          </div>
        </section>

        <aside className="flex flex-col justify-between gap-5 rounded-3xl bg-surface-container-low p-6 lg:col-span-4" aria-labelledby="referral-qr-title">
          <div>
            <h2 id="referral-qr-title" className="text-sm font-bold text-on-surface">Mã QR giới thiệu</h2>
            <p className="mt-1 text-xs leading-5 text-on-surface-variant">QR thật chưa được tạo vì ứng dụng chưa có bộ mã hóa QR được kiểm chứng.</p>
          </div>
          <div className="flex min-h-44 flex-col items-center justify-center rounded-2xl border border-dashed border-outline-variant bg-white/70 px-5 text-center">
            <QrCode size={48} className="text-outline" aria-hidden="true" />
            <p className="mt-3 text-xs font-bold text-on-surface">Chưa có QR để quét</p>
            <p className="mt-1 text-[10px] leading-4 text-on-surface-variant">Hãy dùng nút sao chép đường dẫn ở bên cạnh.</p>
          </div>
        </aside>
      </div>

      <section className="space-y-4" aria-labelledby="referral-history-title">
        <h2 id="referral-history-title" className="text-sm font-bold text-on-surface">Lịch sử giới thiệu bạn bè</h2>
        <Table
          data={stats.items.map((item) => ({
            id: item.id,
            name: item.referredUser.name,
            date: new Date(item.createdAt).toLocaleDateString('vi-VN'),
            status: item.status === 'rewarded' ? 'Đã nhận thưởng' : item.status,
            bonus: item.status === 'rewarded' ? 'Đã thưởng' : '—',
          }))}
          columns={columns}
          loading={loading}
          emptyMessage={error ? 'Không thể tải lịch sử giới thiệu.' : 'Bạn chưa giới thiệu người bạn nào.'}
        />
      </section>

      <ToastContainer toast={toast} setToast={setToast} />
    </div>
  );
};
