import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { mockShipments } from '../../mockData';
import { Button } from '../../components/Button';
import { 
  Calendar, MapPin, Truck, ChevronRight, HelpCircle, 
  ArrowLeft, CheckCircle2, AlertCircle, Info
} from 'lucide-react';

export const ShipmentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Find shipment in mock data, or generate a high fidelity fallback if it's a custom one
  const shipment = mockShipments.find(s => s.trackingNumber === id) || {
    id: 's_custom',
    trackingNumber: id || 'SPX12345678',
    carrier: id?.startsWith('LEX') ? 'LEX' : id?.startsWith('GHTK') ? 'GHTK' : 'SPX',
    latestStatus: 'Đang giao hàng',
    lastSynced: new Date().toISOString().replace('T', ' ').substring(0, 16),
    estimateDelivery: new Date().toISOString().substring(0, 10),
    events: [
      { 
        date: new Date().toISOString().substring(0, 10), 
        time: '12:00', 
        location: 'Bưu cục giao nhận quận 1', 
        description: 'Đang giao hàng. Shipper đang liên hệ giao hàng.', 
        status: 'OUT_FOR_DELIVERY' 
      },
      { 
        date: new Date(Date.now() - 86400000).toISOString().substring(0, 10), 
        time: '08:30', 
        location: 'Kho trung chuyển TP.HCM SOC', 
        description: 'Đã thông qua trạm phân loại trung tâm.', 
        status: 'IN_TRANSIT' 
      },
      { 
        date: new Date(Date.now() - 172800000).toISOString().substring(0, 10), 
        time: '14:40', 
        location: 'Người bán hàng', 
        description: 'Đã nhận hàng thành công từ nhà bán lẻ.', 
        status: 'PICKED_UP' 
      }
    ]
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return <CheckCircle2 className="text-white" size={20} />;
      case 'OUT_FOR_DELIVERY':
      case 'IN_TRANSIT':
        return <Truck className="text-white animate-pulse" size={20} />;
      case 'CREATED':
        return <Info className="text-white" size={20} />;
      default:
        return <AlertCircle className="text-white" size={20} />;
    }
  };

  const getStatusBgColor = (status: string, isTimeline: boolean) => {
    switch (status) {
      case 'DELIVERED':
        return 'bg-tertiary';
      case 'OUT_FOR_DELIVERY':
        return 'bg-primary ring-8 ring-primary-container/20';
      case 'IN_TRANSIT':
        return isTimeline ? 'bg-tertiary' : 'bg-primary';
      case 'CREATED':
        return 'bg-secondary';
      default:
        return 'bg-outline-variant';
    }
  };

  return (
    <div className="space-y-8 text-left">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs font-bold text-on-surface-variant/80 overflow-x-auto whitespace-nowrap">
        <Link to="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link>
        <ChevronRight size={14} className="text-outline-variant" />
        <Link to="/dashboard/shipment" className="hover:text-primary transition-colors">Theo dõi vận đơn</Link>
        <ChevronRight size={14} className="text-outline-variant" />
        <span className="text-primary truncate font-black">Chi tiết {shipment.trackingNumber}</span>
      </nav>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Shipment Details & Stepper Timeline */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Overview Card */}
          <section className="bg-white rounded-3xl p-6 border border-outline-variant/30 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
              <div>
                <span className="text-on-surface-variant text-[11px] font-bold uppercase tracking-wider block mb-1">Mã vận đơn</span>
                <h2 className="text-2xl font-black text-primary tracking-tight select-all">{shipment.trackingNumber}</h2>
              </div>
              <div className="bg-primary/5 text-primary px-4 py-2 rounded-xl border border-primary-container/20 flex items-center gap-2">
                <Truck size={18} />
                <span className="text-sm font-bold">{shipment.carrier} Express</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-outline-variant/20">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary shrink-0">
                  <Calendar size={18} />
                </div>
                <div>
                  <span className="text-on-surface-variant text-xs block">Cập nhật cuối</span>
                  <span className="text-sm font-bold text-on-surface">{shipment.lastSynced}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary shrink-0">
                  <MapPin size={18} />
                </div>
                <div>
                  <span className="text-on-surface-variant text-xs block">Địa chỉ nhận (Dự kiến)</span>
                  <span className="text-sm font-bold text-on-surface">235 Nguyễn Văn Cừ, Quận 5, TP. Hồ Chí Minh</span>
                </div>
              </div>
            </div>
          </section>

          {/* Stepper Timeline */}
          <section className="bg-white rounded-3xl p-6 border border-outline-variant/30 shadow-soft">
            <h3 className="font-title-lg text-sm font-bold mb-8 flex items-center gap-1.5 border-b border-outline-variant/20 pb-4">
              <Truck size={18} className="text-primary" /> Hành trình vận chuyển
            </h3>
            
            <div className="relative pl-6 border-l-2 border-outline-variant/50 ml-5 space-y-8">
              {shipment.events.map((event, idx) => (
                <div key={idx} className="relative text-left">
                  {/* Timeline point indicator */}
                  <span className={`absolute -left-[37px] top-1.5 w-7 h-7 rounded-full border-4 border-white flex items-center justify-center shadow-md
                    ${getStatusBgColor(event.status, true)}
                  `}>
                    {getStatusIcon(event.status)}
                  </span>
                  
                  <div className="space-y-1 pl-2">
                    <div className="flex items-center justify-between gap-4">
                      <h4 className={`text-sm font-bold ${idx === 0 ? 'text-primary' : 'text-on-surface'}`}>
                        {event.status === 'DELIVERED' ? 'Giao hàng thành công' :
                         event.status === 'OUT_FOR_DELIVERY' ? 'Đang giao hàng' :
                         event.status === 'IN_TRANSIT' ? 'Đang vận chuyển' :
                         event.status === 'PICKED_UP' ? 'Đã lấy hàng' : 'Yêu cầu tiếp nhận'}
                      </h4>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-on-surface-variant">
                        <span>{event.date}</span>
                        <span>•</span>
                        <span>{event.time}</span>
                      </div>
                    </div>
                    {event.location && (
                      <p className="text-[10px] font-bold text-tertiary flex items-center gap-1">
                        <MapPin size={12} /> {event.location}
                      </p>
                    )}
                    <p className={`text-xs leading-relaxed ${idx === 0 ? 'text-on-surface font-semibold' : 'text-on-surface-variant'}`}>
                      {event.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* Right Column: Linked Cashback & Quick Actions */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Connected Cashback Card */}
          <section className="bg-white rounded-3xl p-6 border border-outline-variant/30 shadow-soft overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-title-lg text-sm font-bold">Hoàn tiền liên kết</h3>
              <span className="bg-primary/5 text-primary text-[10px] px-2 py-0.5 rounded font-black border border-primary/10 uppercase">
                {shipment.carrier}
              </span>
            </div>

            <div className="flex gap-4 mb-6">
              <div className="w-20 h-20 rounded-2xl bg-surface-container-low overflow-hidden flex-shrink-0 border border-outline-variant/20">
                <img 
                  className="w-full h-full object-cover" 
                  alt="Sony Headphones"
                  src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=150"
                />
              </div>
              <div className="flex flex-col justify-center text-left">
                <h4 className="text-xs font-bold line-clamp-2 leading-snug text-on-surface">
                  Tai nghe Sony WH-1000XM5 Noise Canceling Wireless
                </h4>
                <span className="text-primary font-bold text-xs mt-1">7.490.000đ</span>
              </div>
            </div>

            <div className="bg-surface-container-low rounded-2xl p-4 border border-outline-variant/20 mb-4">
              <div className="flex justify-between items-center mb-1">
                <span className="text-on-surface-variant text-xs font-semibold">Hoàn tiền ước tính:</span>
                <span className="text-tertiary font-black text-base">+224.700đ</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-amber-600 text-xs font-bold">Chờ đối soát</span>
              </div>
            </div>

            <p className="text-[10px] text-on-surface-variant/80 italic text-center leading-normal">
              Hoàn tiền sẽ được cộng vào số dư khả dụng sau khi đơn giao thành công và hoàn tất đối soát trên sàn.
            </p>
          </section>

          {/* Quick Actions */}
          <div className="space-y-3">
            <Button 
              variant="outline" 
              onClick={() => navigate('/faq')}
              className="w-full py-3.5 font-bold hover:bg-primary/5" 
              icon={<HelpCircle size={16} />}
            >
              Hỗ trợ
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/dashboard/shipment')}
              className="w-full py-3.5 font-bold hover:bg-primary/5" 
              icon={<ArrowLeft size={16} />}
            >
              Quay lại danh sách
            </Button>
          </div>

          {/* Exclusive Promo Banner */}
          <div className="relative rounded-3xl overflow-hidden aspect-[4/3] shadow-soft group cursor-pointer border border-outline-variant/20">
            <div 
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110" 
              style={{ backgroundImage: "url('https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=400')" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-5 text-left">
              <span className="text-white/70 text-[9px] font-black uppercase tracking-widest mb-1">Ưu đãi độc quyền</span>
              <h4 className="text-white font-headline-md text-sm font-bold leading-tight">
                Hoàn thêm 50k cho đơn hàng vận chuyển qua SPX Express
              </h4>
              <Link to="/deals" className="mt-3 text-white border-b border-white w-fit text-[11px] font-bold pb-0.5 hover:border-b-2 transition-all">
                Xem chi tiết
              </Link>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
