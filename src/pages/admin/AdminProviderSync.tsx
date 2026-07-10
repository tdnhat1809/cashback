import React, { useCallback, useEffect, useState } from 'react';
import { Activity, Database, RefreshCw, ShieldAlert } from 'lucide-react';
import { Button } from '../../components/Button';
import { Table, type Column } from '../../components/Table';
import { adminApi } from '../../services/apiClient';

type Provider = Awaited<ReturnType<typeof adminApi.providers>>[number];
type SyncRun = Awaited<ReturnType<typeof adminApi.syncRuns>>[number];

export const AdminProviderSync: React.FC = () => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [runs, setRuns] = useState<SyncRun[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [nextProviders, nextRuns] = await Promise.all([adminApi.providers(), adminApi.syncRuns()]);
      setProviders(nextProviders); setRuns(nextRuns);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể tải trạng thái provider.');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  const columns: Column<SyncRun>[] = [
    { header: 'Provider', accessor: (row) => <span className="font-bold text-primary">{row.provider}</span> },
    { header: 'Luồng', accessor: 'stream' },
    { header: 'Kết quả', accessor: (row) => <span className={row.status === 'completed' ? 'font-bold text-tertiary' : row.status === 'failed' ? 'font-bold text-error' : 'font-bold text-amber-600'}>{row.status}</span> },
    { header: 'Bản ghi', accessor: 'record_count' },
    { header: 'Bắt đầu', accessor: (row) => new Date(row.started_at).toLocaleString('vi-VN') },
    { header: 'Lỗi', accessor: (row) => <span className="max-w-56 truncate text-xs text-error">{row.error ?? '—'}</span> },
  ];

  return <div className="space-y-6 text-left">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="font-headline-md text-on-surface">Provider & đối soát</h1><p className="text-xs text-on-surface-variant">Thông tin bí mật chỉ tồn tại trên máy chủ qua biến môi trường, không hiển thị hoặc chỉnh sửa trong trình duyệt.</p></div><Button variant="primary" onClick={() => void refresh()} loading={loading} icon={<RefreshCw size={16} />}>Làm mới</Button></div>
    {error && <p className="rounded-xl border border-error/20 bg-error-container/20 p-3 text-sm text-error" role="alert">{error}</p>}
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {providers.map((provider) => <article key={provider.provider} className="rounded-3xl border border-outline-variant/30 bg-white p-5 shadow-soft"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${provider.healthy ? 'bg-tertiary/10 text-tertiary' : 'bg-error-container/30 text-error'}`}><Activity size={20} /></span><div><h2 className="font-bold">{provider.provider}</h2><p className="text-xs text-on-surface-variant">Mode: {provider.mode}</p></div></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${provider.healthy ? 'bg-tertiary/10 text-tertiary' : 'bg-error-container/30 text-error'}`}>{provider.healthy ? 'Sẵn sàng' : 'Chưa sẵn sàng'}</span></div><p className="mt-4 text-xs leading-relaxed text-on-surface-variant">{provider.message ?? (provider.configured ? 'Đã có cấu hình trên máy chủ.' : 'Chưa có cấu hình máy chủ.')}</p>{provider.payable === false && <p className="mt-3 rounded-lg bg-amber-50 p-2 text-[10px] font-bold text-amber-700">Mock only — không được dùng để chi trả cashback.</p>}</article>)}
    </section>
    <section className="rounded-3xl border border-outline-variant/30 bg-white p-5 shadow-soft"><h2 className="mb-4 flex items-center gap-2 font-bold"><Database size={18} className="text-primary" /> Lịch sử chạy đối soát</h2><Table data={runs} columns={columns} loading={loading} emptyMessage="Chưa có lần đồng bộ nào." /></section>
    <section className="rounded-3xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900"><div className="flex gap-3"><ShieldAlert className="shrink-0" size={20} /><p>Chỉ import báo cáo Shopee đã xác thực vào endpoint quản trị. Hệ thống chỉ chuyển cashback từ “chờ duyệt” sang “khả dụng” ở trạng thái validated/settled và lưu log đối soát bất biến.</p></div></section>
  </div>;
};
