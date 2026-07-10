import React, { useState } from 'react';
import { mockWallet, mockWithdrawalRequests, mockUserProfile } from '../../mockData';
import type { WithdrawalRequest } from '../../mockData';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Badge } from '../../components/Badge';
import { Table } from '../../components/Table';
import type { Column } from '../../components/Table';
import { ToastContainer } from '../../components/Toast';
import { defaultToastState, triggerToast } from '../../components/toast-state';
import type { ToastState } from '../../components/toast-state';
import { CreditCard, Landmark, AlertCircle, ArrowUpRight } from 'lucide-react';

export const Withdrawal: React.FC = () => {
  const [availableBalance, setAvailableBalance] = useState(mockWallet.available);
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const bankName = mockUserProfile.bankName;
  const accountNumber = mockUserProfile.bankAccount;
  const accountName = mockUserProfile.bankAccountName;
  const [requests, setRequests] = useState<WithdrawalRequest[]>(mockWithdrawalRequests);
  const [errorAmount, setErrorAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(defaultToastState);

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorAmount('');

    const amount = Number(withdrawalAmount);
    if (!withdrawalAmount.trim() || isNaN(amount)) {
      setErrorAmount('Vui lòng nhập số tiền rút hợp lệ.');
      return;
    }

    if (amount < 50000) {
      setErrorAmount('Số tiền rút tối thiểu là 50.000đ.');
      return;
    }

    if (amount > availableBalance) {
      setErrorAmount('Số dư khả dụng không đủ để thực hiện yêu cầu.');
      return;
    }

    setLoading(true);
    // Simulate API withdrawal request submission
    setTimeout(() => {
      setLoading(false);
      const newRequest: WithdrawalRequest = {
        id: `w_${Math.random().toString(36).substr(2, 5)}`,
        amount: amount,
        bankName: bankName,
        accountNumber: accountNumber,
        accountName: accountName,
        status: 'Pending',
        date: new Date().toISOString().replace('T', ' ').substring(0, 16)
      };

      setRequests([newRequest, ...requests]);
      setAvailableBalance(prev => prev - amount);
      setWithdrawalAmount('');
      triggerToast(setToast, 'Gửi yêu cầu rút tiền thành công! Vận hành đang xử lý.', 'success');
    }, 1500);
  };

  const getStatusBadge = (status: WithdrawalRequest['status']) => {
    const badges = {
      Pending: <Badge variant="warning">Đang xử lý</Badge>,
      Approved: <Badge variant="success">Thành công</Badge>,
      Rejected: <Badge variant="danger">Từ chối</Badge>,
    };
    return badges[status];
  };

  const columns: Column<WithdrawalRequest>[] = [
    {
      header: 'Thời gian',
      accessor: 'date',
      className: 'text-xs text-on-surface-variant font-medium'
    },
    {
      header: 'Ngân hàng',
      accessor: (row: WithdrawalRequest) => (
        <div className="text-left">
          <span className="text-xs font-bold text-on-surface block">{row.bankName}</span>
          <span className="text-[10px] text-on-surface-variant/80 block mt-0.5">{row.accountNumber}</span>
        </div>
      )
    },
    {
      header: 'Số tiền rút',
      accessor: (row: WithdrawalRequest) => (
        <span className="text-xs font-bold text-on-surface">
          {row.amount.toLocaleString('vi-VN')}đ
        </span>
      )
    },
    {
      header: 'Mã giao dịch',
      accessor: (row: WithdrawalRequest) => (
        <span className="text-xs font-mono text-outline-variant font-medium select-all">
          {row.transactionCode || '—'}
        </span>
      )
    },
    {
      header: 'Trạng thái',
      accessor: (row: WithdrawalRequest) => getStatusBadge(row.status)
    }
  ];

  return (
    <div className="space-y-8 text-left">
      <div>
        <h1 className="font-headline-md text-on-surface">Yêu cầu Rút tiền</h1>
        <p className="text-xs text-on-surface-variant">Chuyển tiền hoàn từ số dư khả dụng về tài khoản ngân hàng của bạn.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form: Create Withdrawal Request */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-outline-variant/30 shadow-soft space-y-6">
          {/* Quick Balance display */}
          <div className="bg-tertiary/5 border border-tertiary/20 p-5 rounded-2xl flex items-center justify-between">
            <div className="text-left">
              <span className="text-[10px] text-on-surface-variant uppercase font-bold block mb-1">Số dư khả dụng</span>
              <span className="text-2xl font-black text-tertiary tracking-tight">
                {availableBalance.toLocaleString('vi-VN')}đ
              </span>
            </div>
            <CreditCard className="text-tertiary opacity-40" size={32} />
          </div>

          {/* Form */}
          <form onSubmit={handleWithdraw} className="space-y-4">
            <Input
              label="Số tiền rút (VND)"
              placeholder="Nhập số tiền muốn rút..."
              value={withdrawalAmount}
              onChange={(e) => setWithdrawalAmount(e.target.value.replace(/\D/g, ''))}
              error={errorAmount}
              disabled={loading}
              helperText="Số tiền rút tối thiểu là 50.000đ"
            />

            {/* Bank details card readout */}
            <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/20 space-y-2">
              <div className="flex gap-2 items-center text-xs font-bold text-on-surface">
                <Landmark size={14} className="text-primary" />
                <span>Tài khoản ngân hàng nhận tiền</span>
              </div>
              <div className="text-xs text-on-surface-variant pl-5 space-y-1">
                <p>Ngân hàng: <strong>{bankName}</strong></p>
                <p>Số tài khoản: <strong>{accountNumber}</strong></p>
                <p>Chủ tài khoản: <strong>{accountName}</strong></p>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full py-4 font-bold shadow-md"
              loading={loading}
              icon={<ArrowUpRight size={16} />}
            >
              Gửi yêu cầu rút tiền
            </Button>
          </form>

          {/* Financial policy disclaimer */}
          <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 flex gap-2.5">
            <AlertCircle className="text-primary shrink-0 mt-0.5" size={16} />
            <p className="text-[10px] text-on-surface-variant/90 leading-relaxed">
              HOANTIENVIP thực hiện lệnh chuyển khoản ngân hàng thủ công. Tiền sẽ được chuyển khoản trực tiếp vào tài khoản ngân hàng của bạn trong vòng 24 giờ kể từ khi gửi yêu cầu (không tính thứ 7, Chủ Nhật và ngày lễ).
            </p>
          </div>
        </div>

        {/* Right Table: Requests History list */}
        <div className="lg:col-span-7 space-y-4">
          <h3 className="font-title-lg text-sm font-bold">Lịch sử yêu cầu rút tiền</h3>
          <Table
            data={requests}
            columns={columns}
            emptyMessage="Bạn chưa thực hiện yêu cầu rút tiền nào."
          />
        </div>
      </div>

      <ToastContainer toast={toast} setToast={setToast} />
    </div>
  );
};
