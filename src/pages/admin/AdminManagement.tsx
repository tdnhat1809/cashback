import React, { useState } from 'react';
import { 
  mockCashbackOrders, mockWithdrawalRequests, mockAdminUsersList, 
  mockCarriersList
} from '../../mockData';
import type { CashbackOrder, WithdrawalRequest } from '../../mockData';
import { Badge } from '../../components/Badge';
import { Tabs } from '../../components/Tabs';
import { Table } from '../../components/Table';
import type { Column } from '../../components/Table';
import { Button } from '../../components/Button';
import { ToastContainer, defaultToastState, triggerToast } from '../../components/Toast';
import type { ToastState } from '../../components/Toast';
import { UserMinus, UserCheck, RefreshCw, CheckCircle2 } from 'lucide-react';

export const AdminManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('reconciliation');
  const [orders, setOrders] = useState<CashbackOrder[]>(mockCashbackOrders);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>(mockWithdrawalRequests);
  const [users, setUsers] = useState(mockAdminUsersList);
  const [selectedWithdrawalIds, setSelectedWithdrawalIds] = useState<string[]>([]);
  const [toast, setToast] = useState<ToastState>(defaultToastState);

  // Carrier configuration mock state
  const [carrierConfigs, setCarrierConfigs] = useState(
    mockCarriersList.map((carrier, idx) => ({
      carrier,
      endpoint: `https://api.carrier-gateway.vn/v1/${carrier.toLowerCase()}`,
      status: idx % 3 === 0 ? 'Disabled' : 'Enabled'
    }))
  );

  const tabs = [
    { id: 'reconciliation', label: 'Đối soát đơn cashback' },
    { id: 'payouts', label: 'Duyệt rút tiền theo lô' },
    { id: 'users', label: 'Quản lý thành viên' },
    { id: 'carriers', label: 'Cấu hình cổng Carrier' }
  ];

  // 1. Reconciliation logic
  const handleReconcileOrder = (id: string, status: 'Confirmed' | 'Rejected') => {
    setOrders(prev =>
      prev.map(o => {
        if (o.id === id) {
          const actCash = status === 'Confirmed' ? o.cashbackEstimate : 0;
          triggerToast(
            setToast, 
            `Đã đối soát đơn hàng ${o.orderId}: chuyển sang trạng thái ${status === 'Confirmed' ? 'Đã xác nhận' : 'Bị từ chối'}.`, 
            status === 'Confirmed' ? 'success' : 'warning'
          );
          return { ...o, status, cashbackActual: actCash };
        }
        return o;
      })
    );
  };

  // 2. Bulk Payouts logic
  const handleSelectWithdrawal = (id: string) => {
    setSelectedWithdrawalIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkApprove = () => {
    if (selectedWithdrawalIds.length === 0) {
      triggerToast(setToast, 'Vui lòng chọn ít nhất một yêu cầu rút tiền cần duyệt.', 'error');
      return;
    }

    setWithdrawals(prev =>
      prev.map(w => {
        if (selectedWithdrawalIds.includes(w.id)) {
          return { 
            ...w, 
            status: 'Approved', 
            transactionCode: `FT_BULK_${Math.random().toString(36).substr(2, 6).toUpperCase()}` 
          };
        }
        return w;
      })
    );
    triggerToast(setToast, `Đã duyệt duyệt chi thành công cho ${selectedWithdrawalIds.length} yêu cầu rút tiền chọn lọc!`, 'success');
    setSelectedWithdrawalIds([]);
  };

  // 3. User toggle active status logic
  const handleToggleUser = (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
    setUsers(prev =>
      prev.map(u => u.id === id ? { ...u, status: nextStatus } : u)
    );
    triggerToast(
      setToast, 
      `Đã chuyển trạng thái thành viên sang: ${nextStatus === 'Active' ? 'Đang hoạt động' : 'Tạm khóa (Banned)'}.`, 
      nextStatus === 'Active' ? 'success' : 'warning'
    );
  };

  // 4. Carrier configuration toggles
  const handleToggleCarrier = (carrier: string) => {
    setCarrierConfigs(prev =>
      prev.map(c => {
        if (c.carrier === carrier) {
          const nextStatus = c.status === 'Enabled' ? 'Disabled' : 'Enabled';
          triggerToast(setToast, `Đã chuyển đổi cổng ${carrier} sang trạng thái: ${nextStatus === 'Enabled' ? 'Mở kết nối' : 'Đóng kết nối'}.`, 'info');
          return { ...c, status: nextStatus };
        }
        return c;
      })
    );
  };

  // Table columns definers
  const orderColumns: Column<CashbackOrder>[] = [
    { header: 'Mã đơn', accessor: 'orderId' },
    { header: 'Sàn', accessor: 'platform' },
    { header: 'Shop', accessor: 'shopName' },
    { header: 'Giá trị đơn', accessor: (row: CashbackOrder) => `${row.orderValue.toLocaleString('vi-VN')}đ` },
    { header: 'Cashback ước tính', accessor: (row: CashbackOrder) => `${row.cashbackEstimate.toLocaleString('vi-VN')}đ` },
    { 
      header: 'Trạng thái sàn', 
      accessor: (row: CashbackOrder) => (
        <Badge variant={row.status === 'Confirmed' || row.status === 'Paid' ? 'success' : row.status === 'Pending' ? 'warning' : 'danger'}>
          {row.status}
        </Badge>
      )
    },
    {
      header: 'Hành động đối soát',
      accessor: (row: CashbackOrder) => (
        <div className="flex gap-2">
          {row.status === 'Pending' ? (
            <>
              <Button 
                variant="success" 
                size="sm" 
                onClick={() => handleReconcileOrder(row.id, 'Confirmed')}
                className="!py-1.5 !px-3 !text-xs font-bold"
              >
                Khớp đơn
              </Button>
              <Button 
                variant="danger" 
                size="sm" 
                onClick={() => handleReconcileOrder(row.id, 'Rejected')}
                className="!py-1.5 !px-3 !text-xs font-bold"
              >
                Hủy đơn
              </Button>
            </>
          ) : (
            <span className="text-xs font-bold text-slate-400">Đã chốt đối soát</span>
          )}
        </div>
      )
    }
  ];

  const payoutColumns: Column<WithdrawalRequest>[] = [
    {
      header: 'Chọn',
      accessor: (row: WithdrawalRequest) => (
        row.status === 'Pending' ? (
          <input 
            type="checkbox" 
            checked={selectedWithdrawalIds.includes(row.id)}
            onChange={() => handleSelectWithdrawal(row.id)}
            className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
          />
        ) : null
      )
    },
    { header: 'Thành viên', accessor: 'accountName' },
    {
      header: 'Tài khoản nhận',
      accessor: (row: WithdrawalRequest) => (
        <div className="text-left">
          <span className="text-xs font-bold text-slate-800 block">{row.bankName}</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">{row.accountNumber}</span>
        </div>
      )
    },
    { header: 'Số tiền rút', accessor: (row: WithdrawalRequest) => `${row.amount.toLocaleString('vi-VN')}đ` },
    {
      header: 'Trạng thái',
      accessor: (row: WithdrawalRequest) => (
        <Badge variant={row.status === 'Approved' ? 'success' : row.status === 'Pending' ? 'warning' : 'danger'}>
          {row.status === 'Approved' ? 'Đã thanh toán' : 'Chờ duyệt'}
        </Badge>
      )
    },
    { header: 'Mã GD chuyển tiền', accessor: 'transactionCode' }
  ];

  const userColumns: Column<any>[] = [
    { header: 'Thành viên', accessor: 'name' },
    { header: 'Số điện thoại', accessor: 'phone' },
    { header: 'Địa chỉ Email', accessor: 'email' },
    { header: 'Tích lũy hoàn tiền', accessor: (row: any) => `${row.cashbackTotal.toLocaleString('vi-VN')}đ` },
    { header: 'Ngày đăng ký', accessor: 'registered' },
    {
      header: 'Hành động',
      accessor: (row: any) => (
        <Button 
          variant={row.status === 'Active' ? 'danger' : 'success'} 
          size="sm"
          onClick={() => handleToggleUser(row.id, row.status)}
          className="!py-1.5 !px-3 !text-xs font-bold"
          icon={row.status === 'Active' ? <UserMinus size={14} /> : <UserCheck size={14} />}
        >
          {row.status === 'Active' ? 'Banned user' : 'Active user'}
        </Button>
      )
    }
  ];

  const carrierColumns: Column<any>[] = [
    {
      header: 'Hãng vận chuyển',
      accessor: (row: any) => (
        <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded border">
          {row.carrier}
        </span>
      )
    },
    {
      header: 'Endpoint API Gateway',
      accessor: (row: any) => (
        <input 
          type="text" 
          value={row.endpoint}
          readOnly
          className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 focus:outline-none"
        />
      )
    },
    {
      header: 'Cấu hình cổng',
      accessor: (row: any) => (
        <Button 
          variant={row.status === 'Enabled' ? 'success' : 'outline'} 
          size="sm"
          onClick={() => handleToggleCarrier(row.carrier)}
          className="!py-1.5 !px-3 !text-xs font-bold"
        >
          {row.status === 'Enabled' ? 'Đang mở cổng' : 'Đã khóa cổng'}
        </Button>
      )
    },
    {
      header: 'Hành động API',
      accessor: (row: any) => (
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => triggerToast(setToast, `Mô phỏng gọi API Health Check đến ${row.carrier} thành công! Latency: 120ms.`, 'success')}
          className="!py-1.5 !px-3 !text-xs font-bold hover:bg-slate-100"
          icon={<RefreshCw size={12} />}
        >
          Test API
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-8 text-left animate-fade-in">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Đối soát & Quản trị Hệ thống</h1>
        <p className="text-xs text-slate-500">Phê duyệt đối soát đơn hàng hoàn tiền từ Shopee/TikTok Shop, thanh toán rút tiền cho user và kiểm tra cổng API vận đơn.</p>
      </div>

      {/* Tabs navigation */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
          className="!border-0 !p-0"
        />
      </div>

      {/* Dynamic Tab Contents */}
      <div className="space-y-4">
        {/* Tab 1: Reconciliation */}
        {activeTab === 'reconciliation' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800">Danh sách đơn hàng chờ đối soát hoa hồng nguồn</h3>
              <Button 
                variant="outline" 
                size="sm" 
                className="!text-xs hover:bg-slate-100"
                onClick={() => triggerToast(setToast, 'Đồng bộ hoa hồng mới nhất từ RioHub/Shopee Affiliate thành công!', 'success')}
                icon={<RefreshCw size={14} />}
              >
                Đồng bộ hoa hồng nguồn
              </Button>
            </div>
            <Table
              data={orders}
              columns={orderColumns}
            />
          </div>
        )}

        {/* Tab 2: Payouts */}
        {activeTab === 'payouts' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800">Danh sách yêu cầu rút tiền ngân hàng của thành viên</h3>
              {selectedWithdrawalIds.length > 0 && (
                <Button 
                  variant="success" 
                  onClick={handleBulkApprove}
                  className="font-bold shadow-md bg-emerald-600 text-white"
                  icon={<CheckCircle2 size={16} />}
                >
                  Duyệt thanh toán ({selectedWithdrawalIds.length} yêu cầu)
                </Button>
              )}
            </div>
            <Table
              data={withdrawals}
              columns={payoutColumns}
            />
          </div>
        )}

        {/* Tab 3: Users */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Quản lý tài khoản thành viên hệ thống</h3>
            <Table
              data={users}
              columns={userColumns}
            />
          </div>
        )}

        {/* Tab 4: Carriers */}
        {activeTab === 'carriers' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Cấu hình API theo dõi vận đơn 14 hãng giao nhận</h3>
            <Table
              data={carrierConfigs}
              columns={carrierColumns}
            />
          </div>
        )}
      </div>

      <ToastContainer toast={toast} setToast={setToast} />
    </div>
  );
};
