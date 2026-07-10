import React from 'react';
import { HelpCircle, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';

export const FAQ: React.FC = () => {
  const faqs = [
    {
      q: 'HOANTIENVIP là gì và hoạt động thế nào?',
      a: 'HOANTIENVIP là nền tảng trung gian giúp người tiêu dùng mua hàng trên các sàn TMĐT (Shopee, TikTok Shop) và nhận lại một phần tiền hoàn (cashback). Chúng tôi nhận hoa hồng tiếp thị liên kết từ sàn và chia sẻ lại tối đa 90% số tiền đó cho người mua.'
    },
    {
      q: 'Làm thế nào để bảo đảm nhận được tiền hoàn?',
      a: 'Bạn chỉ cần copy link sản phẩm muốn mua, dán vào ô tạo link tại HOANTIENVIP để nhận link hoàn tiền, nhấn chuyển hướng mua sắm để tự động mở app sàn, sau đó đặt mua và thanh toán như bình thường trong cùng 1 phiên.'
    },
    {
      q: 'Tại sao trạng thái đơn hàng của tôi là "Bị từ chối"?',
      a: 'Đơn hàng bị từ chối thường do: 1) Bạn đã hủy đơn, hoàn hàng hoặc trả hàng; 2) Đơn hàng vi phạm chính sách của sàn (đơn ảo, tự đặt chéo gian lận); 3) Bạn sử dụng các mã giảm giá đặc biệt không áp dụng hoàn tiền của sàn.'
    },
    {
      q: 'Số tiền rút tối thiểu là bao nhiêu và bao lâu nhận được?',
      a: 'Số tiền rút tối thiểu là 50.000đ từ số dư khả dụng. Yêu cầu rút tiền được xử lý thủ công bởi bộ phận tài chính trong vòng 24h - 48h làm việc.'
    }
  ];

  return (
    <div className="max-w-[800px] mx-auto px-6 py-12 text-left animate-fade-in">
      <h1 className="font-headline-lg text-on-surface mb-2">Hỏi đáp hỗ trợ FAQ</h1>
      <p className="text-on-surface-variant text-sm mb-8">
        Tìm câu trả lời nhanh chóng cho các thắc mắc về quy trình mua sắm, tích lũy tiền hoàn, rút tiền hoặc giải quyết khiếu nại.
      </p>

      <div className="space-y-6 mb-10">
        {faqs.map((faq, idx) => (
          <div key={idx} className="bg-white p-6 rounded-3xl border border-outline-variant/30 shadow-soft">
            <h4 className="font-title-lg text-sm font-bold text-on-surface mb-2 flex items-start gap-2">
              <HelpCircle size={18} className="text-primary shrink-0 mt-0.5" />
              <span>{faq.q}</span>
            </h4>
            <p className="font-body-md text-xs text-on-surface-variant leading-relaxed pl-7">
              {faq.a}
            </p>
          </div>
        ))}
      </div>

      {/* Support center link banner */}
      <div className="bg-primary/5 border border-primary/20 rounded-3xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="font-title-lg text-sm font-bold text-on-surface mb-1 flex items-center gap-1.5">
            <MessageSquare size={18} className="text-primary" /> Bạn vẫn cần trợ giúp?
          </h3>
          <p className="text-xs text-on-surface-variant">
            Hãy gửi yêu cầu hoặc trò chuyện trực tiếp với kiểm soát viên để xử lý nhanh nhất.
          </p>
        </div>
        <Link 
          to="/dashboard/support/TK123" 
          className="bg-primary text-white font-bold text-xs py-3 px-5 rounded-xl hover:brightness-105 active:scale-95 transition-all shadow-soft shrink-0"
        >
          Xem Ticket Hỗ Trợ #TK123
        </Link>
      </div>
    </div>
  );
};
