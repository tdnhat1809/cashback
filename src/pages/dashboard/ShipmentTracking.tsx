import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Truck } from 'lucide-react';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Dropdown } from '../../components/Dropdown';
import { EmptyState } from '../../components/EmptyState';
import { Input } from '../../components/Input';
import { Table } from '../../components/Table';
import type { Column } from '../../components/Table';
import { ToastContainer } from '../../components/Toast';
import { defaultToastState, triggerToast } from '../../components/toast-state';
import type { ToastState } from '../../components/toast-state';
import { shipmentApi, type CarrierRecord, type ShipmentRecord } from '../../services/apiClient';

type Shipment = { id: string; trackingNumber: string; carrier: string; latestStatus: string; lastSynced: string };

const toShipment = (record: ShipmentRecord, carriers: CarrierRecord[]): Shipment => ({
  id: record.id,
  trackingNumber: record.tracking_number,
  carrier: carriers.find((carrier) => carrier.code === record.carrier_code)?.name ?? record.carrier_code,
  latestStatus: record.latest_status,
  lastSynced: record.last_synced_at ?? record.updated_at,
});

const getStatusColor = (status: string): 'success' | 'warning' | 'danger' | 'info' => {
  if (status === 'DELIVERED' || status.toLowerCase().includes('thành công')) return 'success';
  if (status === 'OUT_FOR_DELIVERY' || status.toLowerCase().includes('đang giao')) return 'warning';
  if (status === 'CANCELLED' || status.toLowerCase().includes('hủy')) return 'danger';
  return 'info';
};

export const ShipmentTracking: React.FC = () => {
  const navigate = useNavigate();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [carriers, setCarriers] = useState<CarrierRecord[]>([]);
  const [trackingNum, setTrackingNum] = useState('');
  const [selectedCarrier, setSelectedCarrier] = useState('auto');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(defaultToastState);

  const reload = useCallback(async () => {
    const [carrierRows, shipmentRows] = await Promise.all([shipmentApi.carriers(), shipmentApi.list()]);
    setCarriers(carrierRows);
    setShipments(shipmentRows.map((shipment) => toShipment(shipment, carrierRows)));
  }, []);

  useEffect(() => { void reload().catch((error: unknown) => triggerToast(setToast, error instanceof Error ? error.message : 'Không thể tải vận đơn.', 'error')); }, [reload]);

  const carrierOptions = [{ value: 'auto', label: 'Tự động nhận diện hãng' }, ...carriers.filter((carrier) => carrier.enabled).map((carrier) => ({ value: carrier.code, label: carrier.name }))];

  const handleAddShipment = async (event: React.FormEvent) => {
    event.preventDefault();
    const trackingNumber = trackingNum.trim().toUpperCase();
    if (!trackingNumber) { triggerToast(setToast, 'Vui lòng nhập mã vận đơn.', 'error'); return; }
    const prefixes: Array<[string, string]> = [['SPX', 'spx'], ['LEX', 'lex'], ['EMS', 'ems'], ['J&T', 'j_t'], ['JNT', 'j_t'], ['GHN', 'ghn'], ['247', '247express'], ['VN', 'vnpost'], ['VTP', 'viettel_post'], ['GHTK', 'ghtk'], ['BEST', 'best'], ['FUTA', 'futa'], ['NHT', 'nh_t_t_n'], ['NETCO', 'netco'], ['NETPOST', 'netpost']];
    const carrierCode = selectedCarrier === 'auto' ? prefixes.find(([prefix]) => trackingNumber.startsWith(prefix))?.[1] : selectedCarrier;
    if (!carrierCode) { triggerToast(setToast, 'Không nhận diện được hãng vận chuyển. Vui lòng chọn hãng trước khi thêm.', 'error'); return; }
    setLoading(true);
    try {
      const created = await shipmentApi.create({ trackingNumber, carrierCode });
      setTrackingNum(''); setSelectedCarrier('auto'); await reload();
      triggerToast(setToast, `Thêm vận đơn ${created.tracking_number} thành công!`, 'success');
    } catch (error) {
      triggerToast(setToast, error instanceof Error ? error.message : 'Không thể thêm vận đơn.', 'error');
    } finally { setLoading(false); }
  };

  const columns: Column<Shipment>[] = [
    { header: 'Mã vận đơn', accessor: (row) => <span className="block select-all font-mono text-xs font-bold">{row.trackingNumber}</span> },
    { header: 'Hãng vận chuyển', accessor: (row) => <span className="rounded-lg border border-primary/10 bg-primary/5 px-2.5 py-1 text-xs font-bold text-primary">{row.carrier}</span> },
    { header: 'Cập nhật cuối', accessor: 'lastSynced', className: 'text-xs text-on-surface-variant font-medium' },
    { header: 'Trạng thái hiện tại', accessor: (row) => <Badge variant={getStatusColor(row.latestStatus)}>{row.latestStatus}</Badge> },
    { header: 'Hành động', accessor: (row) => <Button variant="ghost" size="sm" onClick={() => navigate(`/dashboard/shipment/${encodeURIComponent(row.id)}`)} className="!p-1.5 font-bold">Chi tiết</Button> },
  ];

  return <div className="space-y-8 text-left"><div><h1 className="font-headline-md text-on-surface">Theo dõi Vận đơn</h1><p className="text-xs text-on-surface-variant">Quản lý các mã vận đơn đã thêm vào tài khoản của bạn.</p></div><div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12"><section className="space-y-6 rounded-3xl border border-outline-variant/30 bg-white p-6 shadow-soft lg:col-span-4"><h2 className="flex items-center gap-1.5 text-sm font-bold"><Plus size={18} className="text-primary" /> Thêm mã vận đơn mới</h2><form onSubmit={handleAddShipment} className="space-y-4"><Input label="Mã vận đơn" placeholder="Ví dụ: SPXVN..." value={trackingNum} onChange={(event) => setTrackingNum(event.target.value)} disabled={loading} /><Dropdown label="Hãng vận chuyển" options={carrierOptions} value={selectedCarrier} onChange={(event) => setSelectedCarrier(event.target.value)} disabled={loading} /><Button type="submit" variant="primary" className="w-full py-4 font-bold" loading={loading} icon={<Search size={16} />}>Tra cứu & Thêm vận đơn</Button></form></section><section className="space-y-4 lg:col-span-8"><h2 className="flex items-center gap-1.5 text-sm font-bold"><Truck size={18} className="text-primary" /> Vận đơn của tôi</h2>{shipments.length ? <Table data={shipments} columns={columns} /> : <EmptyState variant="shipments" onAction={() => document.querySelector<HTMLInputElement>('input')?.focus()} />}</section></div><ToastContainer toast={toast} setToast={setToast} /></div>;
};
