import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Table, type Column } from '../../components/Table';
import { ToastContainer } from '../../components/Toast';
import { defaultToastState, triggerToast, type ToastState } from '../../components/toast-state';
import { userFeaturesApi } from '../../services/apiClient';

type Ticket = { id: string; subject: string; category: string; priority: string; status: string; updatedAt: string; lastMessage: string | null };

export const SupportTickets: React.FC = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(defaultToastState);

  const reload = useCallback(async () => {
    const result = await userFeaturesApi.supportTickets();
    setTickets(result.items);
  }, []);
  useEffect(() => { void reload().catch((error: unknown) => triggerToast(setToast, error instanceof Error ? error.message : 'Không thể tải yêu cầu hỗ trợ.', 'error')); }, [reload]);

  const createTicket = async (event: React.FormEvent) => {
    event.preventDefault();
    if (subject.trim().length < 3 || message.trim().length < 2) {
      triggerToast(setToast, 'Vui lòng nhập tiêu đề và nội dung yêu cầu.', 'error');
      return;
    }
    setLoading(true);
    try {
      const ticket = await userFeaturesApi.createSupportTicket({ subject: subject.trim(), category: 'general', priority: 'medium', message: message.trim() });
      setSubject(''); setMessage(''); await reload();
      navigate(`/dashboard/support/${ticket.id}`);
    } catch (error) {
      triggerToast(setToast, error instanceof Error ? error.message : 'Không thể tạo yêu cầu hỗ trợ.', 'error');
    } finally { setLoading(false); }
  };

  const columns: Column<Ticket>[] = [
    { header: 'Yêu cầu', accessor: (row) => <div><p className="text-xs font-bold">{row.subject}</p><p className="mt-1 text-[10px] text-on-surface-variant">{row.lastMessage ?? 'Chưa có nội dung'}</p></div> },
    { header: 'Trạng thái', accessor: (row) => <span className="rounded-full bg-surface-container-low px-2 py-1 text-[10px] font-bold">{row.status}</span> },
    { header: 'Cập nhật', accessor: (row) => <span className="text-xs text-on-surface-variant">{new Date(row.updatedAt).toLocaleString('vi-VN')}</span> },
    { header: '', accessor: (row) => <Button variant="ghost" size="sm" onClick={() => navigate(`/dashboard/support/${row.id}`)}>Xem</Button> },
  ];

  return <div className="space-y-6 text-left">
    <div><h1 className="font-headline-md text-on-surface">Yêu cầu hỗ trợ</h1><p className="text-xs text-on-surface-variant">Gửi và theo dõi trao đổi với bộ phận vận hành.</p></div>
    <form onSubmit={createTicket} className="rounded-3xl border border-outline-variant/30 bg-white p-5 shadow-soft space-y-4">
      <Input label="Tiêu đề" value={subject} onChange={(event) => setSubject(event.target.value)} disabled={loading} />
      <label className="block text-sm font-semibold text-on-surface">Nội dung<textarea value={message} onChange={(event) => setMessage(event.target.value)} disabled={loading} className="mt-2 min-h-28 w-full rounded-xl border border-outline-variant/50 p-3 text-sm outline-none focus:border-primary" /></label>
      <Button type="submit" variant="primary" loading={loading}>Gửi yêu cầu</Button>
    </form>
    <Table data={tickets} columns={columns} emptyMessage="Bạn chưa có yêu cầu hỗ trợ nào." />
    <ToastContainer toast={toast} setToast={setToast} />
  </div>;
};
