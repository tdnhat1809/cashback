import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Calendar, ChevronRight, HelpCircle, Info, MapPin, Truck } from 'lucide-react';
import { Button } from '../../components/Button';
import { ApiError, shipmentApi, type CarrierRecord, type ShipmentRecord } from '../../services/apiClient';

const formatDateTime = (value: string | null): string => value ? new Date(value).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Chưa có dữ liệu';
const statusTitle = (status: string): string => ({ DELIVERED: 'Giao hàng thành công', OUT_FOR_DELIVERY: 'Đang giao hàng', IN_TRANSIT: 'Đang vận chuyển', PICKED_UP: 'Đã lấy hàng', CREATED: 'Đã tiếp nhận' })[status] ?? status;

export const ShipmentDetail: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [shipment, setShipment] = useState<ShipmentRecord | null>(null);
  const [carriers, setCarriers] = useState<CarrierRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void Promise.all([shipmentApi.get(id), shipmentApi.carriers()])
      .then(([record, carrierRows]) => { if (active) { setShipment(record); setCarriers(carrierRows); } })
      .catch((reason: unknown) => { if (active) setError(reason instanceof ApiError ? reason : new ApiError({ status: 0, code: 'LOAD_FAILED', message: 'Không thể tải vận đơn.' })); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const carrierName = useMemo(() => shipment ? carriers.find((carrier) => carrier.code === shipment.carrier_code)?.name ?? shipment.carrier_code : '', [carriers, shipment]);

  if (loading) return <main className="min-h-[60vh] grid place-items-center text-on-surface-variant">Đang tải vận đơn…</main>;
  if (error || !shipment) return (
    <main className="min-h-[60vh] grid place-items-center px-4 text-center"><div><AlertCircle className="mx-auto text-primary" size={42} /><h1 className="mt-4 text-2xl font-bold">Không thể xem vận đơn</h1><p className="mt-2 text-sm text-on-surface-variant">{error?.status === 404 ? 'Không tìm thấy vận đơn này.' : error?.status === 403 ? 'Bạn không có quyền xem vận đơn này.' : error?.message ?? 'Vui lòng thử lại sau.'}</p><Button className="mt-6" onClick={() => navigate('/dashboard/shipment')}>Quay lại danh sách</Button></div></main>
  );

  return (
    <main className="space-y-8 text-left">
      <nav className="flex items-center gap-2 overflow-x-auto whitespace-nowrap text-xs font-bold text-on-surface-variant"><Link to="/dashboard" className="hover:text-primary">Dashboard</Link><ChevronRight size={14} /><Link to="/dashboard/shipment" className="hover:text-primary">Theo dõi vận đơn</Link><ChevronRight size={14} /><span className="truncate text-primary">{shipment.tracking_number}</span></nav>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <section className="rounded-3xl border border-outline-variant/30 bg-white p-6 shadow-soft"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Mã vận đơn</p><h1 className="mt-1 select-all text-2xl font-black text-primary">{shipment.tracking_number}</h1></div><div className="flex items-center gap-2 rounded-xl border border-primary-container/20 bg-primary/5 px-4 py-2 text-primary"><Truck size={18} /><span className="text-sm font-bold">{carrierName}</span></div></div><div className="mt-7 grid grid-cols-1 gap-5 border-t border-outline-variant/20 pt-5 sm:grid-cols-2"><div className="flex gap-3"><Calendar className="text-primary" size={20} /><div><p className="text-xs text-on-surface-variant">Cập nhật cuối</p><p className="text-sm font-bold">{formatDateTime(shipment.last_synced_at ?? shipment.updated_at)}</p></div></div><div className="flex gap-3"><Info className="text-primary" size={20} /><div><p className="text-xs text-on-surface-variant">Dự kiến giao</p><p className="text-sm font-bold">{shipment.eta ? new Date(shipment.eta).toLocaleDateString('vi-VN') : 'Chưa có dữ liệu'}</p></div></div></div></section>
          <section className="rounded-3xl border border-outline-variant/30 bg-white p-6 shadow-soft"><h2 className="flex items-center gap-2 border-b border-outline-variant/20 pb-4 text-sm font-bold"><Truck className="text-primary" size={18} /> Hành trình vận chuyển</h2>{shipment.events?.length ? <div className="relative ml-4 mt-7 space-y-7 border-l-2 border-outline-variant/50 pl-6">{shipment.events.map((event, index) => <article key={event.id} className="relative"><span className={`absolute -left-[37px] top-1 grid h-7 w-7 place-items-center rounded-full border-4 border-white ${index === 0 ? 'bg-primary text-white' : 'bg-outline-variant text-white'}`}><Truck size={14} /></span><div className="flex flex-wrap items-center justify-between gap-2"><h3 className={`text-sm font-bold ${index === 0 ? 'text-primary' : 'text-on-surface'}`}>{statusTitle(event.status)}</h3><time className="text-[11px] font-semibold text-on-surface-variant">{formatDateTime(event.occurred_at)}</time></div>{event.location && <p className="mt-1 flex items-center gap-1 text-xs font-bold text-tertiary"><MapPin size={12} /> {event.location}</p>}<p className="mt-1 text-sm text-on-surface-variant">{event.description}</p></article>)}</div> : <p className="py-8 text-center text-sm text-on-surface-variant">Chưa có sự kiện vận chuyển được đồng bộ.</p>}</section>
        </div>
        <aside className="space-y-3 lg:col-span-4"><section className="rounded-3xl border border-outline-variant/30 bg-white p-6 shadow-soft"><h2 className="text-sm font-bold">Trạng thái hiện tại</h2><p className="mt-3 text-lg font-black text-primary">{statusTitle(shipment.latest_status)}</p><p className="mt-3 text-xs leading-5 text-on-surface-variant">Thông tin vận đơn được cập nhật từ dữ liệu theo dõi hiện có. Trạng thái có thể thay đổi khi hãng vận chuyển đồng bộ lần tiếp theo.</p></section><Button variant="outline" onClick={() => navigate('/faq')} className="w-full" icon={<HelpCircle size={16} />}>Hỗ trợ</Button><Button variant="outline" onClick={() => navigate('/dashboard/shipment')} className="w-full" icon={<ArrowLeft size={16} />}>Quay lại danh sách</Button></aside>
      </div>
    </main>
  );
};
