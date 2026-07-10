import React, { useEffect, useState } from 'react';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Table } from '../../components/Table';
import type { Column } from '../../components/Table';
import { ToastContainer } from '../../components/Toast';
import { defaultToastState, triggerToast } from '../../components/toast-state';
import type { ToastState } from '../../components/toast-state';
import { Share2, Copy, QrCode, Sparkles, Users, Award } from 'lucide-react';
import { userFeaturesApi } from '../../services/apiClient';

interface ReferralHistoryItem {
  name: string;
  date: string;
  status: string;
  bonus: string;
}

export const Referral: React.FC = () => {
  const [stats, setStats] = useState({ referralCode: '', counts: { total: 0, pending: 0, qualified: 0, rewarded: 0, rejected: 0 }, items: [] as Array<{ id: string; referredUser: { name: string }; status: string; createdAt: string }> });
  const [toast, setToast] = useState<ToastState>(defaultToastState);
  useEffect(() => {
    void userFeaturesApi.referrals().then((result) => setStats(result as typeof stats)).catch(() => undefined);
  }, []);
  const referralLink = `${window.location.origin}/register?ref=${encodeURIComponent(stats.referralCode)}`;

  const copyText = async (value: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(value);
      triggerToast(setToast, successMessage, 'success');
    } catch {
      triggerToast(setToast, 'Trình duyệt không cho phép sao chép. Hãy sao chép thủ công.', 'error');
    }
  };

  const handleCopyLink = () => {
    void copyText(referralLink, 'Đã sao chép đường dẫn giới thiệu!');
  };

  const handleCopyCode = () => {
    void copyText(stats.referralCode, 'Đã sao chép mã giới thiệu!');
  };

  const columns: Column<ReferralHistoryItem>[] = [
    {
      header: 'Tên thành viên',
      accessor: 'name',
      className: 'font-semibold text-on-surface text-xs'
    },
    {
      header: 'Ngày đăng ký',
      accessor: 'date',
      className: 'text-xs text-on-surface-variant font-medium'
    },
    {
      header: 'Trạng thái',
      accessor: (row: any) => (
        <span className={`text-xs font-bold ${row.status === 'Đã nhận thưởng' ? 'text-tertiary' : 'text-amber-600'}`}>
          {row.status}
        </span>
      )
    },
    {
      header: 'Hoa hồng nhận',
      accessor: 'bonus',
      className: 'text-xs font-bold text-on-surface'
    }
  ];

  return (
    <div className="space-y-8 text-left">
      <div>
        <h1 className="font-headline-md text-on-surface">Tiếp thị liên kết (Referral)</h1>
        <p className="text-xs text-on-surface-variant">Chia sẻ mã giới thiệu của bạn với bạn bè để cùng nhận thưởng cashback trọn đời.</p>
      </div>

      {/* Stats Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-outline-variant/30 shadow-soft flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shrink-0">
            <Users size={24} />
          </div>
          <div>
            <span className="text-[10px] text-on-surface-variant uppercase font-bold block mb-0.5">Số bạn bè đã mời</span>
            <span className="text-2xl font-black text-on-surface tracking-tight">{stats.counts.total} thành viên</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-outline-variant/30 shadow-soft flex items-center gap-4">
          <div className="w-12 h-12 bg-tertiary/10 rounded-2xl flex items-center justify-center text-tertiary shrink-0">
            <Award size={24} />
          </div>
          <div>
            <span className="text-[10px] text-on-surface-variant uppercase font-bold block mb-0.5">Đã nhận thưởng</span>
            <span className="text-2xl font-black text-tertiary tracking-tight">{stats.counts.rewarded} người</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-outline-variant/30 shadow-soft flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-600 shrink-0">
            <Sparkles size={24} />
          </div>
          <div>
            <span className="text-[10px] text-on-surface-variant uppercase font-bold block mb-0.5">Hoa hồng chờ duyệt</span>
            <span className="text-2xl font-black text-amber-600 tracking-tight">{stats.counts.pending} người</span>
          </div>
        </div>
      </div>

      {/* Share Links Box & QR code */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Links Box */}
        <div className="lg:col-span-8 bg-white p-6 md:p-8 rounded-3xl border border-outline-variant/30 shadow-soft space-y-6">
          <h3 className="font-title-lg text-sm font-bold">Chia sẻ liên kết của bạn</h3>
          
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 w-full">
                <Input
                  label="Đường dẫn giới thiệu riêng biệt"
                  value={referralLink}
                  readOnly
                  startIcon={<Share2 size={16} />}
                />
              </div>
              <Button 
                variant="primary" 
                onClick={handleCopyLink}
                className="h-[56px] px-6 shrink-0"
                icon={<Copy size={16} />}
              >
                Sao chép link
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 w-full">
                <Input
                  label="Mã giới thiệu"
                  value={stats.referralCode}
                  readOnly
                />
              </div>
              <Button 
                variant="outline" 
                onClick={handleCopyCode}
                className="h-[56px] px-6 shrink-0"
                icon={<Copy size={16} />}
              >
                Sao chép mã
              </Button>
            </div>
          </div>
        </div>

        {/* QR Code Placeholder */}
        <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-outline-variant/30 shadow-soft flex flex-col items-center justify-center text-center gap-4">
          <h3 className="font-title-lg text-sm font-bold text-on-surface w-full text-left">Quét mã giới thiệu</h3>
          <div className="w-48 h-48 bg-surface-container rounded-2xl flex items-center justify-center text-outline-variant border border-outline-variant/30 relative">
            <QrCode size={140} className="text-on-surface/80" />
            <div className="absolute bg-white p-1.5 rounded-lg border shadow-md font-bold text-[10px] text-primary">
              HV
            </div>
          </div>
          <p className="text-[10px] text-on-surface-variant/80 max-w-[200px] leading-normal">
            Quét mã để đăng ký nhanh và kích hoạt tự động phần thưởng 50K hoàn tiền.
          </p>
        </div>
      </div>

      {/* Invited Friends Table */}
      <div className="space-y-4">
        <h3 className="font-title-lg text-sm font-bold">Lịch sử giới thiệu bạn bè</h3>
        <Table
          data={stats.items.map((item) => ({ id: item.id, name: item.referredUser.name, date: new Date(item.createdAt).toLocaleDateString('vi-VN'), status: item.status, bonus: item.status === 'rewarded' ? 'Đã thưởng' : '—' }))}
          columns={columns}
          emptyMessage="Bạn chưa giới thiệu người bạn nào."
        />
      </div>

      <ToastContainer toast={toast} setToast={setToast} />
    </div>
  );
};
