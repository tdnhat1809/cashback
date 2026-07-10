import React, { useState } from 'react';
import { mockCashbackOrders } from '../../mockData';
import type { CashbackOrder } from '../../mockData';
import { Badge } from '../../components/Badge';
import { Tabs } from '../../components/Tabs';
import { Dropdown } from '../../components/Dropdown';
import { Table } from '../../components/Table';
import type { Column } from '../../components/Table';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { HelpCircle, Calendar } from 'lucide-react';

export const CashbackHistory: React.FC = () => {
  const orders = mockCashbackOrders;
  const [activeTab, setActiveTab] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<CashbackOrder | null>(null);

  const tabs = [
    { id: 'all', label: 'Tất cả đơn' },
    { id: 'Pending', label: 'Chờ duyệt' },
    { id: 'Confirmed', label: 'Đã xác nhận' },
    { id: 'Paid', label: 'Đã chi trả' },
    { id: 'Rejected', label: 'Bị từ chối' }
  ];

  const platformOptions = [
    { value: 'all', label: 'Tất cả các sàn' },
    { value: 'Shopee', label: 'Shopee' },
    { value: 'TikTok Shop', label: 'TikTok Shop' }
  ];

  // Filtering
  const filteredOrders = orders.filter((o) => {
    const matchTab = activeTab === 'all' || o.status === activeTab;
    const matchPlatform = platformFilter === 'all' || o.platform === platformFilter;
    return matchTab && matchPlatform;
  });

  const getStatusBadge = (status: CashbackOrder['status']) => {
    const badges = {
      Pending: <Badge variant="warning">Chờ đối soát</Badge>,
      Confirmed: <Badge variant="success">Đã xác nhận</Badge>,
      Paid: <Badge variant="info">Đã chi trả</Badge>,
      Rejected: <Badge variant="danger">Bị từ chối</Badge>,
    };
    return badges[status];
  };

  const columns: Column<CashbackOrder>[] = [
    {
      header: 'Đơn hàng',
      accessor: (row: CashbackOrder) => (
        <div className="flex items-center gap-3">
          <img src={row.productImg} alt={row.productName} className="w-10 h-10 object-cover rounded-lg bg-surface-container-low shrink-0" />
          <div className="text-left min-w-0">
            <span className="text-xs font-bold text-on-surface truncate block max-w-[200px]">{row.productName}</span>
            <span className="text-[10px] text-on-surface-variant/80 block mt-0.5">{row.orderId}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Thời gian',
      accessor: (row: CashbackOrder) => (
        <div className="text-left">
          <span className="text-xs font-medium text-on-surface block">{row.date.split(' ')[0]}</span>
          <span className="text-[10px] text-on-surface-variant/80 block mt-0.5">{row.date.split(' ')[1]}</span>
        </div>
      )
    },
    {
      header: 'Sàn',
      accessor: (row: CashbackOrder) => (
        <Badge variant={row.platform === 'Shopee' ? 'shopee' : 'tiktok'}>
          {row.platform === 'Shopee' ? 'Shopee' : 'TikTok'}
        </Badge>
      )
    },
    {
      header: 'Giá trị đơn',
      accessor: (row: CashbackOrder) => (
        <span className="text-xs font-semibold text-on-surface">
          {row.orderValue.toLocaleString('vi-VN')}đ
        </span>
      )
    },
    {
      header: 'Hoàn tiền',
      accessor: (row: CashbackOrder) => {
        const isSettled = row.status === 'Confirmed' || row.status === 'Paid';
        return (
          <div className="text-left">
            <span className={`text-xs font-bold block ${isSettled ? 'text-tertiary' : 'text-on-surface'}`}>
              {(isSettled ? row.cashbackActual : row.cashbackEstimate).toLocaleString('vi-VN')}đ
            </span>
            <span className="text-[9px] text-on-surface-variant/80 block mt-0.5">
              {isSettled ? 'Thực nhận' : 'Ước tính'}
            </span>
          </div>
        );
      }
    },
    {
      header: 'Trạng thái',
      accessor: (row: CashbackOrder) => getStatusBadge(row.status)
    },
    {
      header: 'Hành động',
      accessor: (row: CashbackOrder) => (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setSelectedOrder(row)}
          className="!p-1.5"
        >
          Chi tiết
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6 text-left">
      <div>
        <h1 className="font-headline-md text-on-surface">Lịch sử Hoàn tiền</h1>
        <p className="text-xs text-on-surface-variant">Kiểm tra chi tiết trạng thái đối soát các đơn hàng từ sàn thương mại điện tử.</p>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-3xl border border-outline-variant/30 shadow-soft">
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
          className="!border-0 !p-0"
        />
        <div className="w-full sm:w-48">
          <Dropdown
            options={platformOptions}
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Orders Table list */}
      <Table
        data={filteredOrders}
        columns={columns}
        emptyMessage="Không tìm thấy đơn hàng nào khớp với điều kiện lọc."
      />

      {/* Order Detail Popup Modal */}
      {selectedOrder && (
        <Modal
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          title={`Chi tiết đơn cashback: ${selectedOrder.orderId}`}
          footerActions={
            <Button variant="secondary" onClick={() => setSelectedOrder(null)}>
              Đóng lại
            </Button>
          }
        >
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <img 
                src={selectedOrder.productImg} 
                alt={selectedOrder.productName} 
                className="w-16 h-16 object-cover rounded-xl bg-surface-container-low" 
              />
              <div className="text-left">
                <Badge variant={selectedOrder.platform === 'Shopee' ? 'shopee' : 'tiktok'} className="mb-2">
                  {selectedOrder.platform}
                </Badge>
                <h4 className="font-bold text-sm text-on-surface leading-snug">{selectedOrder.productName}</h4>
                <p className="text-xs text-on-surface-variant/80 mt-1">Shop: {selectedOrder.shopName}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-outline-variant/20 pt-4">
              <div className="bg-surface-container-low/50 p-3 rounded-xl">
                <span className="text-[10px] text-on-surface-variant uppercase font-bold block mb-1">Giá trị đơn hàng</span>
                <span className="text-sm font-semibold text-on-surface">{selectedOrder.orderValue.toLocaleString('vi-VN')}đ</span>
              </div>
              
              <div className="bg-surface-container-low/50 p-3 rounded-xl">
                <span className="text-[10px] text-on-surface-variant uppercase font-bold block mb-1">Trạng thái</span>
                <div className="mt-0.5">{getStatusBadge(selectedOrder.status)}</div>
              </div>

              <div className="bg-surface-container-low/50 p-3 rounded-xl">
                <span className="text-[10px] text-on-surface-variant uppercase font-bold block mb-1">Tiền hoàn ước tính</span>
                <span className="text-sm font-semibold text-on-surface">{selectedOrder.cashbackEstimate.toLocaleString('vi-VN')}đ</span>
              </div>

              <div className="bg-surface-container-low/50 p-3 rounded-xl border border-tertiary/20 bg-tertiary/5">
                <span className="text-[10px] text-tertiary uppercase font-bold block mb-1">Tiền hoàn thực nhận</span>
                <span className="text-sm font-bold text-tertiary">{selectedOrder.cashbackActual.toLocaleString('vi-VN')}đ</span>
              </div>
            </div>

            <div className="flex gap-2.5 items-center text-xs text-on-surface-variant/80 font-medium">
              <Calendar size={14} className="text-outline" />
              <span>Thời gian ghi nhận: {selectedOrder.date}</span>
            </div>

            {selectedOrder.status === 'Rejected' && (
              <div className="bg-error-container/20 p-4 rounded-xl border border-error/20 flex gap-2">
                <HelpCircle size={18} className="text-error shrink-0 mt-0.5" />
                <div className="text-xs text-left">
                  <span className="font-bold text-error block mb-0.5">Lý do từ chối hoàn tiền:</span>
                  <p className="text-on-surface-variant">{selectedOrder.reason || 'Đơn hàng bị từ chối do hoàn hàng/trả hàng hoặc vi phạm điều khoản dịch vụ.'}</p>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
