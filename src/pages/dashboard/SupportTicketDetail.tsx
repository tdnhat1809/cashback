import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { ToastContainer } from '../../components/Toast';
import { defaultToastState, triggerToast } from '../../components/toast-state';
import type { ToastState } from '../../components/toast-state';
import { 
  ChevronRight, ArrowLeft, Send, Paperclip, 
  HelpCircle, Star, Ban, ExternalLink, Info, MessageSquare
} from 'lucide-react';
import { userFeaturesApi } from '../../services/apiClient';

type TicketView = {
  id: string; subject: string; status: 'Open' | 'Resolved' | 'Closed'; priority: 'Low' | 'Medium' | 'High';
  category: string; createdAt: string; linkedOrder?: string;
  messages: Array<{ id: string; sender: 'user' | 'agent' | 'system'; senderName: string; text: string; time: string; imageUrl?: string }>;
};

const toTicketView = (ticket: Awaited<ReturnType<typeof userFeaturesApi.supportTicket>>): TicketView => ({
  id: ticket.id, subject: ticket.subject,
  status: ({ open: 'Open', resolved: 'Resolved', closed: 'Closed' } as const)[ticket.status as 'open' | 'resolved' | 'closed'],
  priority: ({ low: 'Low', medium: 'Medium', high: 'High' } as const)[ticket.priority as 'low' | 'medium' | 'high'],
  category: ticket.category, createdAt: ticket.createdAt,
  messages: ticket.messages.map((message) => ({
    id: message.id, sender: message.senderType, senderName: message.senderType === 'user' ? 'Bạn' : message.senderType === 'agent' ? 'Hỗ trợ viên' : 'Hệ thống',
    text: message.body, time: new Date(message.createdAt).toLocaleString('vi-VN'),
  })),
});

export const SupportTicketDetail: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  
  const [ticket, setTicket] = useState<TicketView | null>(null);
  const [loadError, setLoadError] = useState('');
  const [inputText, setInputText] = useState('');
  const [rating, setRating] = useState(0);
  const [toast, setToast] = useState<ToastState>(defaultToastState);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages]);

  const reload = useCallback(async () => {
    if (!ticketId) return;
    try { setTicket(toTicketView(await userFeaturesApi.supportTicket(ticketId))); setLoadError(''); }
    catch (error) { setLoadError(error instanceof Error ? error.message : 'Không thể tải yêu cầu hỗ trợ.'); setTicket(null); }
  }, [ticketId]);

  useEffect(() => { void reload(); }, [reload]);

  if (!ticket) {
    return <div className="space-y-4"><EmptyState variant="tickets" onAction={() => navigate('/dashboard/support')} />{loadError && <p className="text-sm text-error" role="alert">{loadError}</p>}</div>;
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    try {
      await userFeaturesApi.addSupportMessage(ticket.id, inputText);
      setInputText('');
      await reload();
      triggerToast(setToast, 'Đã gửi phản hồi cho bộ phận hỗ trợ.', 'success');
    } catch (error) {
      triggerToast(setToast, error instanceof Error ? error.message : 'Không thể gửi phản hồi.', 'error');
    }
  };

  const handleCloseTicket = async () => {
    try {
      await userFeaturesApi.closeSupportTicket(ticket.id);
      await reload();
      triggerToast(setToast, 'Đã đóng yêu cầu hỗ trợ thành công. Bạn có thể đánh giá chất lượng phục vụ.', 'success');
    } catch (error) { triggerToast(setToast, error instanceof Error ? error.message : 'Không thể đóng yêu cầu.', 'error'); }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs font-bold text-on-surface-variant/80 overflow-x-auto whitespace-nowrap">
        <Link to="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link>
        <ChevronRight size={14} className="text-outline-variant" />
        <Link to="/faq" className="hover:text-primary transition-colors">Hỗ trợ</Link>
        <ChevronRight size={14} className="text-outline-variant" />
        <span className="text-primary truncate font-black">Yêu cầu #{ticket.id}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/20 pb-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors"
            aria-label="Quay lại"
          >
            <ArrowLeft className="text-on-surface-variant" size={20} />
          </button>
          <div>
            <h1 className="font-headline-md text-xl font-bold text-on-surface">Chi tiết yêu cầu hỗ trợ</h1>
            <p className="text-[10px] text-on-surface-variant font-bold uppercase mt-1 tracking-wider">
              {ticket.subject}
            </p>
          </div>
        </div>

        <div className="flex gap-2 self-start sm:self-center">
          <Badge variant={ticket.status === 'Open' ? 'success' : 'secondary'}>
            {ticket.status === 'Open' ? 'Đang xử lý' : 'Đã đóng'}
          </Badge>
          <Badge variant="danger">
            {ticket.priority === 'High' ? 'Ưu tiên cao' : 'Thường'}
          </Badge>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Chat Area */}
        <div className="lg:col-span-8 flex flex-col h-[600px] bg-white rounded-3xl border border-outline-variant/30 shadow-soft overflow-hidden">
          
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {ticket.messages.length === 0 ? (
              <EmptyState 
                variant="tickets"
                onAction={() => {
                  void userFeaturesApi.addSupportMessage(ticket.id, 'Tôi cần hỗ trợ kiểm tra yêu cầu này.').then(reload);
                }}
              />
            ) : (
              ticket.messages.map((msg) => {
                if (msg.sender === 'system') {
                  return (
                    <div key={msg.id} className="flex justify-center">
                      <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container-low px-3.5 py-1 rounded-full border border-outline-variant/20">
                        {msg.text}
                      </span>
                    </div>
                  );
                }

                const isUser = msg.sender === 'user';
                return (
                  <div key={msg.id} className={`flex gap-3 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
                    {/* Avatar */}
                    {!isUser && (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 text-primary">
                        <MessageSquare size={16} />
                      </div>
                    )}

                    {/* Bubble Content */}
                    <div className="space-y-1 text-left">
                      <div className={`p-4 rounded-2xl shadow-sm text-sm border
                        ${isUser 
                          ? 'bg-primary text-white rounded-tr-none border-primary/15' 
                          : 'bg-surface-container-low text-on-surface rounded-tl-none border-outline-variant/30'
                        }
                      `}>
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                        
                        {msg.imageUrl && (
                          <div className="mt-3 rounded-xl overflow-hidden border border-outline-variant/30 max-w-sm">
                            <img 
                              src={msg.imageUrl} 
                              alt="Attachment" 
                              className="w-full h-auto object-cover max-h-48"
                            />
                          </div>
                        )}
                      </div>
                      
                      {/* Meta info */}
                      <div className={`flex items-center gap-1.5 text-[10px] text-on-surface-variant px-1 ${isUser ? 'justify-end' : ''}`}>
                        <span className="font-bold">{msg.senderName}</span>
                        <span>•</span>
                        <span>{msg.time}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-4 bg-white border-t border-outline-variant/20">
            <form onSubmit={handleSendMessage} className="flex items-center gap-3 bg-surface-container-low border border-outline-variant/30 rounded-2xl px-4 py-2.5">
              <button 
                type="button" 
                onClick={() => triggerToast(setToast, 'Đính kèm tệp sẽ được mở khi backend lưu trữ an toàn đã sẵn sàng.', 'info')}
                className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                title="Đính kèm ảnh"
                aria-label="Đính kèm ảnh"
              >
                <Paperclip size={20} />
              </button>
              <input 
                type="text" 
                placeholder={ticket.status !== 'Open' ? 'Ticket này đã được đóng.' : 'Nhập tin nhắn phản hồi của bạn...'}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={ticket.status !== 'Open'}
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm outline-none placeholder:text-on-surface-variant/40"
              />
              <button 
                type="submit" 
                disabled={ticket.status !== 'Open' || !inputText.trim()}
                className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Ticket Sidebar Details */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Attributes Info Card */}
          <div className="bg-white p-6 rounded-3xl border border-outline-variant/30 shadow-soft text-left">
            <h3 className="font-title-lg text-sm font-bold mb-6 flex items-center gap-2 border-b border-outline-variant/20 pb-3">
              <Info size={18} className="text-primary" /> Thông tin Ticket
            </h3>

            <div className="space-y-4 text-xs font-semibold">
              <div className="flex justify-between items-center py-2 border-b border-outline-variant/10">
                <span className="text-on-surface-variant">Mã yêu cầu</span>
                <span className="text-on-surface font-black">#{ticket.id}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-outline-variant/10">
                <span className="text-on-surface-variant">Ngày tạo</span>
                <span className="text-on-surface font-bold">{ticket.createdAt}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-outline-variant/10">
                <span className="text-on-surface-variant">Loại yêu cầu</span>
                <span className="text-on-surface font-bold">{ticket.category}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-outline-variant/10">
                <span className="text-on-surface-variant">Đơn hàng liên kết</span>
                <span className="text-primary font-black flex items-center gap-1">
                  {ticket.linkedOrder || 'Không'}
                  {ticket.linkedOrder && <ExternalLink size={12} />}
                </span>
              </div>
            </div>

            {/* Rating service */}
            <div className={`mt-6 p-4 rounded-2xl border transition-all text-left
              ${ticket.status === 'Resolved' 
                ? 'bg-primary/5 border-primary/20' 
                : 'bg-surface-container-low border-outline-variant/20 opacity-60'
              }
            `}>
              <span className="text-[10px] font-black uppercase text-on-surface-variant tracking-wider block mb-2">
                Đánh giá chất lượng hỗ trợ
              </span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button 
                    key={star}
                    disabled={ticket.status !== 'Resolved'}
                    onClick={() => {
                      setRating(star);
                      triggerToast(setToast, `Đã đánh giá ${star} sao cho dịch vụ hỗ trợ.`, 'success');
                    }}
                    className={`p-1 transition-transform active:scale-95 disabled:cursor-not-allowed
                      ${ticket.status === 'Resolved' ? 'cursor-pointer hover:text-amber-500' : ''}
                      ${star <= rating ? 'text-amber-500' : 'text-on-surface-variant/40'}
                    `}
                    aria-label={`Đánh giá ${star} sao`}
                  >
                    <Star size={20} fill={star <= rating ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>
              {ticket.status === 'Open' && (
                <span className="text-[9px] text-on-surface-variant/70 italic mt-1 block">
                  Đánh giá sẽ khả dụng sau khi đóng Ticket
                </span>
              )}
            </div>

            {/* Close / Clear buttons */}
            <div className="space-y-2 mt-6">
              {ticket.status === 'Open' && (
                <Button 
                  variant="outline" 
                  onClick={() => void handleCloseTicket()}
                  className="w-full py-3.5 font-bold text-error hover:bg-error-container/20 border-error/40"
                  icon={<Ban size={16} />}
                >
                  Đóng Ticket này
                </Button>
              )}
            </div>
          </div>

          {/* Support Notes */}
          <div className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/20 text-left">
            <h4 className="font-title-lg text-xs font-bold text-on-surface mb-2 flex items-center gap-1">
              <HelpCircle size={16} className="text-primary" /> Lưu ý hỗ trợ
            </h4>
            <ul className="text-[10px] text-on-surface-variant space-y-2 leading-relaxed">
              <li className="flex items-start gap-1.5">
                <span className="text-primary shrink-0 mt-0.5">•</span>
                <span>Thời gian phản hồi thông thường của kiểm soát viên là 15 - 30 phút.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-primary shrink-0 mt-0.5">•</span>
                <span>Vui lòng chụp rõ hóa đơn hoặc lịch sử giao dịch mua hàng để quá trình đối soát diễn ra nhanh nhất.</span>
              </li>
            </ul>
          </div>

        </div>

      </div>

      <ToastContainer toast={toast} setToast={setToast} />
    </div>
  );
};
