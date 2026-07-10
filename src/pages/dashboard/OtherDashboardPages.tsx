import React, { useState } from 'react';
import type { LedgerEntry } from '../../mockData';
import { Table } from '../../components/Table';
import type { Column } from '../../components/Table';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Badge } from '../../components/Badge';
import { ToastContainer } from '../../components/Toast';
import { defaultToastState, triggerToast } from '../../components/toast-state';
import type { ToastState } from '../../components/toast-state';
import { Bell, Ticket, HelpCircle } from 'lucide-react';
import { EmptyState } from '../../components/EmptyState';
import { useAppData } from '../../state/AppDataContext';

export interface ActivityLogItem {
  id: string;
  date: string;
  action: string;
  detail: string;
  ip: string;
}

// 1. Balance History (Biến động số dư)
export const BalanceHistory: React.FC = () => {
  const { ledgerEntries } = useAppData();
  const getEntryTypeBadge = (type: string) => {
    const badges = {
      cashback_received: <Badge variant="success">Hoàn tiền đơn hàng</Badge>,
      referral_bonus: <Badge variant="info">Thưởng bạn bè</Badge>,
      withdrawal: <Badge variant="danger">Rút tiền về thẻ</Badge>,
      refund: <Badge variant="warning">Hoàn tác</Badge>
    };
    return badges[type as keyof typeof badges] || <Badge variant="secondary">Khác</Badge>;
  };

  const columns: Column<LedgerEntry>[] = [
    {
      header: 'Thời gian',
      accessor: 'date',
      className: 'text-xs text-on-surface-variant font-medium'
    },
    {
      header: 'Phân loại',
      accessor: (row: any) => getEntryTypeBadge(row.type)
    },
    {
      header: 'Nội dung chi tiết',
      accessor: 'description',
      className: 'text-xs text-on-surface text-left font-semibold'
    },
    {
      header: 'Số tiền giao dịch',
      accessor: (row: any) => {
        const isPlus = row.amount > 0;
        return (
          <span className={`text-xs font-black ${isPlus ? 'text-tertiary' : 'text-error'}`}>
            {isPlus ? '+' : ''}{row.amount.toLocaleString('vi-VN')}đ
          </span>
        );
      }
    },
    {
      header: 'Số dư sau GD',
      accessor: (row: any) => (
        <span className="text-xs font-bold text-on-surface">
          {row.balanceAfter.toLocaleString('vi-VN')}đ
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <div>
        <h1 className="font-headline-md text-on-surface">Biến động số dư</h1>
        <p className="text-xs text-on-surface-variant">Lịch sử thu chi chi tiết và số dư tài khoản của bạn.</p>
      </div>

      <Table
        data={ledgerEntries}
        columns={columns}
      />
    </div>
  );
};

// 2. Activity Log (Nhật ký hoạt động)
export const ActivityLog: React.FC = () => {
  const mockActivityLogs = [
    { id: 'al_1', date: '2026-07-10 18:02', action: 'ĐĂNG_NHẬP', detail: 'Đăng nhập hệ thống qua số điện thoại thành công.', ip: '192.168.1.15' },
    { id: 'al_2', date: '2026-07-09 23:45', action: 'RÚT_TIỀN', detail: 'Gửi yêu cầu rút tiền về thẻ ngân hàng (200.000đ).', ip: '192.168.1.15' },
    { id: 'al_3', date: '2026-07-08 11:22', action: 'TẠO_AFFILIATE_LINK', detail: 'Tạo link hoàn tiền thành công cho sản phẩm Shopee.', ip: '113.161.42.10' },
    { id: 'al_4', date: '2026-07-01 10:00', action: 'ĐĂNG_KÝ', detail: 'Khởi tạo tài khoản thành viên mới thành công.', ip: '127.0.0.1' }
  ];

  const columns: Column<ActivityLogItem>[] = [
    {
      header: 'Thời gian',
      accessor: 'date',
      className: 'text-xs text-on-surface-variant font-medium'
    },
    {
      header: 'Hành động',
      accessor: (row: any) => (
        <span className="text-xs font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-lg border border-primary/10">
          {row.action}
        </span>
      )
    },
    {
      header: 'Mô tả chi tiết',
      accessor: 'detail',
      className: 'text-xs text-on-surface text-left font-semibold'
    },
    {
      header: 'Địa chỉ IP',
      accessor: 'ip',
      className: 'text-xs font-mono text-outline-variant font-medium'
    }
  ];

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <div>
        <h1 className="font-headline-md text-on-surface">Nhật ký hoạt động</h1>
        <p className="text-xs text-on-surface-variant">Lịch sử bảo mật ghi lại các thao tác chính trên tài khoản của bạn.</p>
      </div>

      <Table
        data={mockActivityLogs}
        columns={columns}
      />
    </div>
  );
};

// 3. Notifications (Thông báo)
export const Notifications: React.FC = () => {
  const [notifs, setNotifs] = useState([
    { id: 'n_1', title: 'Tiền hoàn đã về ví!', desc: 'Đơn hàng SP-992384210 của bạn đã được sàn duyệt. Ví khả dụng của bạn được cộng +15.000đ.', time: '2026-07-08 12:00', read: false },
    { id: 'n_2', title: 'Thưởng Referral thành công!', desc: 'Bạn bè đã hoàn thành việc liên kết ví. Bạn nhận thưởng giới thiệu +50.000đ.', time: '2026-07-05 15:30', read: true },
    { id: 'n_3', title: 'Yêu cầu rút tiền được phê duyệt', desc: 'Lệnh rút tiền 500K về Techcombank đã được chuyển khoản thành công. Mã GD: FT261819034281.', time: '2026-06-30 08:00', read: true }
  ]);

  const handleMarkAllRead = () => {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleClearAll = () => {
    setNotifs([]);
  };

  return (
    <div className="space-y-6 text-left animate-fade-in max-w-xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-headline-md text-on-surface">Thông báo ví</h1>
          <p className="text-xs text-on-surface-variant">Theo dõi tin tức, sự kiện và biến động số dư.</p>
        </div>
        <div className="flex gap-3">
          {notifs.length > 0 && (
            <>
              <button 
                onClick={handleMarkAllRead}
                className="text-xs font-bold text-primary hover:underline cursor-pointer"
              >
                Đọc tất cả
              </button>
              <span className="text-outline-variant">|</span>
              <button 
                onClick={handleClearAll}
                className="text-xs font-bold text-error hover:underline cursor-pointer"
              >
                Xóa tất cả
              </button>
            </>
          )}
        </div>
      </div>

      {notifs.length === 0 ? (
        <EmptyState 
          variant="notifications"
          onAction={() => {
            setNotifs([
              { id: 'n_mock', title: 'Thông báo giả lập', desc: 'Đây là thông báo giả lập để kiểm tra tính năng hiển thị.', time: new Date().toLocaleString(), read: false }
            ]);
          }}
        />
      ) : (
        <div className="space-y-4">
          {notifs.map((n) => (
            <div 
              key={n.id} 
              className={`p-5 rounded-2xl border transition-colors flex gap-4 items-start relative
                ${n.read 
                  ? 'bg-white border-outline-variant/30' 
                  : 'bg-primary/5 border-primary/20 shadow-soft'
                }
              `}
            >
              {!n.read && (
                <span className="absolute top-5 right-5 w-2.5 h-2.5 bg-primary rounded-full" />
              )}
              
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                ${n.read ? 'bg-surface-container-high text-on-surface-variant' : 'bg-primary/10 text-primary'}
              `}>
                <Bell size={20} />
              </div>

              <div className="space-y-1 text-left min-w-0">
                <h4 className="font-bold text-sm text-on-surface leading-tight">{n.title}</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">{n.desc}</p>
                <span className="text-[10px] text-outline-variant block mt-1.5">{n.time}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// 4. Giftcode (Đổi mã thưởng giftcode)
export const Giftcode: React.FC = () => {
  const { redeemGiftCode } = useAppData();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(defaultToastState);

  const handleRedeem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      triggerToast(setToast, 'Vui lòng nhập mã Giftcode.', 'error');
      return;
    }

    setLoading(true);
    try {
      const rewardVnd = redeemGiftCode(code);
      triggerToast(setToast, `Kích hoạt Giftcode thành công! Số dư khả dụng được cộng +${rewardVnd.toLocaleString('vi-VN')}đ.`, 'success');
      setCode('');
    } catch (error) {
      triggerToast(setToast, error instanceof Error ? error.message : 'Không thể kích hoạt Giftcode.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 text-left animate-fade-in max-w-md">
      <div>
        <h1 className="font-headline-md text-on-surface">Nhập mã Giftcode</h1>
        <p className="text-xs text-on-surface-variant">Quy đổi các mã voucher, giftcode sự kiện từ ban quản trị HOANTIENVIP.</p>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-3xl border border-outline-variant/30 shadow-soft space-y-6">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
          <Ticket size={32} className="rotate-12" />
        </div>

        <form onSubmit={handleRedeem} className="space-y-4">
          <Input
            label="Mã Giftcode"
            placeholder="Nhập mã thưởng (Ví dụ: HV100)"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={loading}
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full py-4 font-bold shadow-md"
            loading={loading}
          >
            Đổi mã quà tặng
          </Button>
        </form>

        <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/20 flex gap-2.5">
          <HelpCircle className="text-outline shrink-0 mt-0.5" size={16} />
          <p className="text-[10px] text-on-surface-variant/90 leading-relaxed">
            Mỗi mã Giftcode chỉ được kích hoạt sử dụng một lần duy nhất cho mỗi tài khoản. Phần thưởng sẽ được chuyển khoản thẳng vào Số dư khả dụng của bạn ngay lập tức.
          </p>
        </div>
      </div>

      <ToastContainer toast={toast} setToast={setToast} />
    </div>
  );
};
