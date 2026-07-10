import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockCarriersList } from '../../mockData';
import type { Shipment } from '../../mockData';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Dropdown } from '../../components/Dropdown';
import { Badge } from '../../components/Badge';
import { Table } from '../../components/Table';
import type { Column } from '../../components/Table';
import { Modal } from '../../components/Modal';
import { ToastContainer } from '../../components/Toast';
import { defaultToastState, triggerToast } from '../../components/toast-state';
import type { ToastState } from '../../components/toast-state';
import { Truck, Search, Plus, Calendar, MapPin, Clock } from 'lucide-react';
import { EmptyState } from '../../components/EmptyState';
import { useAppData } from '../../state/AppDataContext';

export const ShipmentTracking: React.FC = () => {
  const navigate = useNavigate();
  const { shipments, addShipment } = useAppData();
  const [trackingNum, setTrackingNum] = useState('');
  const [selectedCarrier, setSelectedCarrier] = useState('auto');
  const [activeShipment, setActiveShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(defaultToastState);

  const carrierOptions = [
    { value: 'auto', label: 'Tự động nhận diện hãng' },
    ...mockCarriersList.map(c => ({ value: c, label: c }))
  ];

  const handleAddShipment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNum.trim()) {
      triggerToast(setToast, 'Vui lòng nhập mã vận đơn.', 'error');
      return;
    }

    const normalizedTrackingNumber = trackingNum.trim().toUpperCase();
    const carrierByPrefix: Array<[string, string]> = [
      ['SPX', 'SPX'], ['LEX', 'LEX'], ['EMS', 'EMS'], ['J&T', 'J&T'], ['JNT', 'J&T'],
      ['GHN', 'GHN'], ['247', '247Express'], ['VN', 'VNPost'], ['VTP', 'Viettel Post'],
      ['GHTK', 'GHTK'], ['BEST', 'Best'], ['FUTA', 'Futa'], ['NHT', 'Nhất Tín'],
      ['NETCO', 'Netco'], ['NETPOST', 'NetPost'],
    ];
    const detectedCarrier = carrierByPrefix.find(([prefix]) => normalizedTrackingNumber.startsWith(prefix))?.[1];
    const carrier = selectedCarrier === 'auto' ? detectedCarrier : selectedCarrier;

    if (!carrier) {
      triggerToast(setToast, 'Không nhận diện được hãng vận chuyển. Vui lòng chọn hãng trước khi thêm.', 'error');
      return;
    }
    if (shipments.some((shipment) => shipment.trackingNumber === normalizedTrackingNumber && shipment.carrier === carrier)) {
      triggerToast(setToast, 'Vận đơn này đã có trong danh sách theo dõi.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const newShipment: Shipment = {
        id: `s_${globalThis.crypto?.randomUUID?.().slice(0, 8) ?? Math.random().toString(36).slice(2, 10)}`,
        trackingNumber: normalizedTrackingNumber,
        carrier: carrier,
        latestStatus: 'Đang vận chuyển',
        lastSynced: new Date().toISOString().replace('T', ' ').substring(0, 16),
        events: [
          {
            date: new Date().toISOString().substring(0, 10),
            time: '12:00',
            location: 'Bưu cục nguồn',
            description: `Hãng vận chuyển ${carrier} đã tiếp nhận thông tin yêu cầu giao nhận của người gửi.`,
            status: 'CREATED'
          }
        ]
      };

      addShipment(newShipment);
      setTrackingNum('');
      setSelectedCarrier('auto');
      triggerToast(setToast, `Thêm vận đơn ${newShipment.trackingNumber} của hãng ${carrier} thành công!`, 'success');
    } catch (error) {
      triggerToast(setToast, error instanceof Error ? error.message : 'Không thể thêm vận đơn.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    if (normalizedStatus.includes('thành công') || status === 'DELIVERED') return 'success';
    if (normalizedStatus.includes('đang giao') || status === 'OUT_FOR_DELIVERY') return 'warning';
    if (normalizedStatus.includes('hủy') || status === 'CANCELLED') return 'danger';
    return 'info';
  };

  const columns: Column<Shipment>[] = [
    {
      header: 'Mã vận đơn',
      accessor: (row: Shipment) => (
        <span className="text-xs font-bold font-mono text-on-surface select-all block">
          {row.trackingNumber}
        </span>
      )
    },
    {
      header: 'Hãng vận chuyển',
      accessor: (row: Shipment) => (
        <span className="text-xs font-bold text-primary bg-primary/5 px-2.5 py-1 rounded-lg border border-primary/10">
          {row.carrier}
        </span>
      )
    },
    {
      header: 'Cập nhật cuối',
      accessor: 'lastSynced',
      className: 'text-xs text-on-surface-variant font-medium'
    },
    {
      header: 'Trạng thái hiện tại',
      accessor: (row: Shipment) => (
        <Badge variant={getStatusColor(row.latestStatus)}>
          {row.latestStatus}
        </Badge>
      )
    },
    {
      header: 'Hành động',
      accessor: (row: Shipment) => (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate(`/dashboard/shipment/${row.trackingNumber}`)}
          className="!p-1.5 font-bold"
        >
          Chi tiết
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-8 text-left">
      <div>
        <h1 className="font-headline-md text-on-surface">Theo dõi Vận đơn</h1>
        <p className="text-xs text-on-surface-variant">
          Quản lý hành trình giao hàng của 14 hãng vận chuyển liên kết. Nhập mã vận đơn của đơn hàng cashback hoặc vận đơn tự thêm.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form: Add Shipment */}
        <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-outline-variant/30 shadow-soft space-y-6">
          <h3 className="font-title-lg text-sm font-bold flex items-center gap-1.5">
            <Plus size={18} className="text-primary" /> Thêm mã vận đơn mới
          </h3>
          
          <form onSubmit={handleAddShipment} className="space-y-4">
            <Input
              label="Mã vận đơn"
              placeholder="Nhập mã vận nhận hàng (Ví dụ: SPXVN...)"
              value={trackingNum}
              onChange={(e) => setTrackingNum(e.target.value)}
              disabled={loading}
            />

            <Dropdown
              label="Hãng vận chuyển"
              options={carrierOptions}
              value={selectedCarrier}
              onChange={(e) => setSelectedCarrier(e.target.value)}
              disabled={loading}
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full py-4 font-bold shadow-md"
              loading={loading}
              icon={<Search size={16} />}
            >
              Tra cứu & Thêm vận đơn
            </Button>
          </form>
        </div>

        {/* Right Table: Active Tracking list */}
        <div className="lg:col-span-8 space-y-4">
          <h3 className="font-title-lg text-sm font-bold flex items-center gap-1.5">
            <Truck size={18} className="text-primary" /> Vận đơn của tôi
          </h3>
          {shipments.length === 0 ? (
            <EmptyState 
              variant="shipments"
              onAction={() => {
                const input = document.getElementById('tracking-num-input') || document.querySelector('input');
                if (input) (input as HTMLInputElement).focus();
              }}
            />
          ) : (
            <Table
              data={shipments}
              columns={columns}
            />
          )}
        </div>
      </div>

      {/* Shipment Timeline Details Modal popup */}
      {activeShipment && (
        <Modal
          isOpen={!!activeShipment}
          onClose={() => setActiveShipment(null)}
          title={`Hành trình vận đơn: ${activeShipment.trackingNumber}`}
          footerActions={
            <Button variant="secondary" onClick={() => setActiveShipment(null)}>
              Đóng lại
            </Button>
          }
        >
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-surface-container-low/50 p-4 rounded-2xl border border-outline-variant/20 mb-6">
              <div className="text-left">
                <span className="text-[10px] text-on-surface-variant uppercase font-bold block mb-0.5">Hãng vận chuyển</span>
                <span className="text-sm font-bold text-primary">{activeShipment.carrier}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-on-surface-variant uppercase font-bold block mb-0.5">Đồng bộ cuối</span>
                <span className="text-xs font-semibold text-on-surface">{activeShipment.lastSynced}</span>
              </div>
            </div>

            {/* Vertical timeline */}
            <div className="relative pl-6 border-l-2 border-outline-variant/50 ml-3 space-y-8">
              {activeShipment.events.map((event, idx) => (
                <div key={idx} className="relative text-left">
                  {/* Timeline point indicator */}
                  <span className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center shadow-md
                    ${idx === 0 ? 'bg-primary scale-125' : 'bg-outline-variant'}
                  `} />
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-on-surface">
                      <span className="flex items-center gap-1"><Calendar size={12} /> {event.date}</span>
                      <span className="text-outline-variant">•</span>
                      <span className="flex items-center gap-1"><Clock size={12} /> {event.time}</span>
                    </div>
                    {event.location && (
                      <p className="text-[10px] font-bold text-primary flex items-center gap-1">
                        <MapPin size={10} /> {event.location}
                      </p>
                    )}
                    <p className={`text-xs leading-relaxed ${idx === 0 ? 'text-on-surface font-semibold' : 'text-on-surface-variant'}`}>
                      {event.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      <ToastContainer toast={toast} setToast={setToast} />
    </div>
  );
};
