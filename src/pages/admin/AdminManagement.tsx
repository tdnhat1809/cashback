import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import { Button } from '../../components/Button';
import { Table, type Column } from '../../components/Table';
import { Tabs } from '../../components/Tabs';
import { ToastContainer } from '../../components/Toast';
import { defaultToastState, triggerToast, type ToastState } from '../../components/toast-state';
import { adminApi, shipmentApi } from '../../services/apiClient';

type Settlement = Awaited<ReturnType<typeof adminApi.settlements>>[number];
type Withdrawal = Awaited<ReturnType<typeof adminApi.withdrawals>>[number];
type Carrier = Awaited<ReturnType<typeof shipmentApi.carriers>>[number] & { id: string };
const key = () => globalThis.crypto.randomUUID();

export const AdminManagement: React.FC = () => {
  const [tab, setTab] = useState('settlements');
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState>(defaultToastState);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [nextSettlements, nextWithdrawals, nextCarriers] = await Promise.all([adminApi.settlements(), adminApi.withdrawals(), shipmentApi.carriers()]);
      setSettlements(nextSettlements); setWithdrawals(nextWithdrawals); setCarriers(nextCarriers.map((carrier) => ({ ...carrier, id: carrier.code })));
    } catch (error) { triggerToast(setToast, error instanceof Error ? error.message : 'Không thể tải dữ liệu vận hành.', 'error'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  const updateWithdrawal = async (action: 'approve' | 'reject' | 'paid', row: Withdrawal) => {
    try {
      if (action === 'approve') await adminApi.approveWithdrawal(row.id, key());
      if (action === 'reject') {
        const reason = window.prompt('Lý do từ chối yêu cầu rút tiền:');
        if (!reason) return;
        await adminApi.rejectWithdrawal(row.id, reason, key());
      }
      if (action === 'paid') {
        const transactionCode = window.prompt('Nhập mã giao dịch ngân hàng đã chuyển:');
        if (!transactionCode) return;
        await adminApi.markWithdrawalPaid(row.id, transactionCode, key());
      }
      await refresh(); triggerToast(setToast, 'Đã cập nhật trạng thái rút tiền và ghi audit log.', 'success');
    } catch (error) { triggerToast(setToast, error instanceof Error ? error.message : 'Không thể cập nhật yêu cầu.', 'error'); }
  };

  const settlementColumns: Column<Settlement>[] = [
    { header: 'Report', accessor: 'external_validation_id' }, { header: 'Sàn', accessor: 'platform' },
    { header: 'Hoa hồng gộp', accessor: (row) => `${row.gross_commission_vnd.toLocaleString('vi-VN')}đ` },
    { header: 'Net phân bổ', accessor: (row) => `${row.distributable_net_vnd.toLocaleString('vi-VN')}đ` },
    { header: 'Trạng thái', accessor: (row) => <span className={row.status === 'reconciled' ? 'font-bold text-tertiary' : 'font-bold text-amber-600'}>{row.status}</span> },
    { header: 'Thời gian', accessor: (row) => new Date(row.observed_at).toLocaleString('vi-VN') },
  ];
  const withdrawalColumns: Column<Withdrawal>[] = [
    { header: 'Thành viên', accessor: (row) => <div><p className="font-bold">{row.user_name}</p><p className="text-[10px] text-on-surface-variant">{row.user_public_id}</p></div> },
    { header: 'Nhận tiền', accessor: (row) => <div><p className="font-bold">{row.bank_name}</p><p className="text-[10px]">{row.bank_account_masked} · {row.account_name}</p></div> },
    { header: 'Số tiền', accessor: (row) => `${row.amount_vnd.toLocaleString('vi-VN')}đ` },
    { header: 'Trạng thái', accessor: (row) => <span className={row.status === 'paid' ? 'font-bold text-tertiary' : row.status === 'rejected' ? 'font-bold text-error' : 'font-bold text-amber-600'}>{row.status}</span> },
    { header: 'Mã GD', accessor: (row) => row.transaction_code ?? '—' },
    { header: 'Thao tác', accessor: (row) => <div className="flex gap-2">{row.status === 'pending' && <><Button variant="success" size="sm" onClick={() => void updateWithdrawal('approve', row)} icon={<CheckCircle2 size={13} />}>Duyệt</Button><Button variant="danger" size="sm" onClick={() => void updateWithdrawal('reject', row)} icon={<XCircle size={13} />}>Từ chối</Button></>}{row.status === 'approved' && <Button variant="primary" size="sm" onClick={() => void updateWithdrawal('paid', row)}>Đã chuyển</Button>}</div> },
  ];
  const carrierColumns: Column<Carrier>[] = [
    { header: 'Hãng', accessor: 'name' }, { header: 'Mã adapter', accessor: 'code' },
    { header: 'Mode', accessor: 'mode' }, { header: 'Trạng thái', accessor: (row) => row.enabled ? 'Bật' : 'Tắt' },
  ];

  return <div className="space-y-6 text-left"><div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="font-headline-md">Đối soát & thanh toán</h1><p className="text-xs text-on-surface-variant">Các thao tác tiền đều chạy qua API server, state machine và audit log.</p></div><Button variant="outline" onClick={() => void refresh()} loading={loading} icon={<RefreshCw size={15} />}>Làm mới</Button></div>
    <Tabs tabs={[{ id: 'settlements', label: 'Đối soát Shopee' }, { id: 'withdrawals', label: 'Rút tiền thủ công' }, { id: 'carriers', label: '14 hãng vận chuyển' }]} activeTab={tab} onChange={setTab} />
    {tab === 'settlements' && <Table data={settlements} columns={settlementColumns} loading={loading} emptyMessage="Chưa có settlement Shopee nào được import." />}
    {tab === 'withdrawals' && <Table data={withdrawals} columns={withdrawalColumns} loading={loading} emptyMessage="Chưa có yêu cầu rút tiền." />}
    {tab === 'carriers' && <Table data={carriers} columns={carrierColumns} loading={loading} emptyMessage="Chưa có hãng vận chuyển." />}
    <ToastContainer toast={toast} setToast={setToast} />
  </div>;
};
