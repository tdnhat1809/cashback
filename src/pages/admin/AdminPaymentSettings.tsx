import React, { useState } from 'react';
import { Button } from '../../components/Button';
import { Table } from '../../components/Table';
import type { Column } from '../../components/Table';
import { ToastContainer } from '../../components/Toast';
import { defaultToastState, triggerToast } from '../../components/toast-state';
import type { ToastState } from '../../components/toast-state';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Badge } from '../../components/Badge';
import { 
  DollarSign, Percent, Clock, Plus, Save, Info, 
  ShieldAlert, Edit2, Trash 
} from 'lucide-react';

interface BankAccount {
  id: string;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  status: 'active' | 'inactive';
}

interface AuditLog {
  id: string;
  adminName: string;
  action: string;
  time: string;
}

export const AdminPaymentSettings: React.FC = () => {
  const [toast, setToast] = useState<ToastState>(defaultToastState);
  
  // Settings Form State
  const [minWithdrawal, setMinWithdrawal] = useState('50000');
  const [withdrawalFee, setWithdrawalFee] = useState('1.5');
  const [slaTime, setSlaTime] = useState('Trong vòng 2 giờ');
  const [cutoffTime, setCutoffTime] = useState('22:00');
  const [txTemplate, setTxTemplate] = useState('HTV_{USER_ID}_{TRANSACTION_ID}');
  const [isAutoMode, setIsAutoMode] = useState(true);

  // Security constraints
  const [otpVerifyLimit, setOtpVerifyLimit] = useState(true);
  const [ipWarning, setIpWarning] = useState(true);
  const [lockOnFailedPin, setLockOnFailedPin] = useState(false);

  // Bank Accounts state
  const [banks, setBanks] = useState<BankAccount[]>([
    { id: '1', bankName: 'Vietcombank', bankCode: 'VCB', accountNumber: '1023****888', accountName: 'CONG TY HOANTIENVIP', status: 'active' },
    { id: '2', bankName: 'Techcombank', bankCode: 'TCB', accountNumber: '1903****002', accountName: 'CONG TY HOANTIENVIP', status: 'active' }
  ]);

  // Modal control
  const [showBankModal, setShowBankModal] = useState(false);
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);
  const [newBankName, setNewBankName] = useState('');
  const [newBankCode, setNewBankCode] = useState('');
  const [newBankNumber, setNewBankNumber] = useState('');
  const [newBankOwner, setNewBankOwner] = useState('');

  // Audit Logs timeline
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    { id: '1', adminName: 'Admin Tuan Tran', action: 'Thay đổi Ngưỡng rút tối thiểu từ 20k -> 50k.', time: '22/10/2026 • 10:15 AM' },
    { id: '2', adminName: 'System Auto', action: 'Chuyển trạng thái sang Manual do bảo trì Napas.', time: '21/10/2026 • 11:45 PM' },
    { id: '3', adminName: 'Admin Linh Nguyen', action: 'Cập nhật tài khoản Vietcombank.', time: '19/10/2026 • 09:20 AM' }
  ]);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Add log entry
    const newLog: AuditLog = {
      id: `log_${Date.now()}`,
      adminName: 'Nguyễn Văn Admin',
      action: 'Cập nhật cấu hình phí, ngưỡng rút và quy tắc bảo mật.',
      time: new Date().toLocaleString('vi-VN')
    };
    setAuditLogs([newLog, ...auditLogs]);

    triggerToast(setToast, 'Đã lưu cấu hình tài chính hệ thống thành công!', 'success');
  };

  const handleToggleStatus = (id: string) => {
    setBanks(prev => prev.map(b => {
      if (b.id === id) {
        const nextStatus = b.status === 'active' ? 'inactive' : 'active';
        triggerToast(setToast, `Đã ${nextStatus === 'active' ? 'kích hoạt' : 'vô hiệu hóa'} tài khoản ${b.bankCode}.`, 'info');
        return { ...b, status: nextStatus };
      }
      return b;
    }));
  };

  const handleOpenAddModal = () => {
    setEditingBank(null);
    setNewBankName('');
    setNewBankCode('');
    setNewBankNumber('');
    setNewBankOwner('CONG TY HOANTIENVIP');
    setShowBankModal(true);
  };

  const handleOpenEditModal = (bank: BankAccount) => {
    setEditingBank(bank);
    setNewBankName(bank.bankName);
    setNewBankCode(bank.bankCode);
    setNewBankNumber(bank.accountNumber);
    setNewBankOwner(bank.accountName);
    setShowBankModal(true);
  };

  const handleSaveBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankCode || !newBankNumber || !newBankOwner) {
      triggerToast(setToast, 'Vui lòng nhập đầy đủ thông tin tài khoản ngân hàng.', 'error');
      return;
    }

    if (editingBank) {
      // Edit mode
      setBanks(prev => prev.map(b => b.id === editingBank.id ? {
        ...b,
        bankName: newBankName,
        bankCode: newBankCode,
        accountNumber: newBankNumber,
        accountName: newBankOwner
      } : b));
      triggerToast(setToast, `Đã cập nhật tài khoản ngân hàng ${newBankCode}!`, 'success');
    } else {
      // Add mode
      const newBank: BankAccount = {
        id: `bank_${Date.now()}`,
        bankName: newBankName || newBankCode,
        bankCode: newBankCode,
        accountNumber: newBankNumber,
        accountName: newBankOwner,
        status: 'active'
      };
      setBanks([...banks, newBank]);
      triggerToast(setToast, `Đã thêm tài khoản ngân hàng ${newBankCode} thành công!`, 'success');
    }

    setShowBankModal(false);
  };

  const columns: Column<BankAccount>[] = [
    {
      header: 'Ngân hàng',
      accessor: (row: BankAccount) => (
        <div className="flex items-center gap-3 text-left">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center font-bold text-primary select-none text-xs">
            {row.bankCode}
          </div>
          <div>
            <p className="text-xs font-bold text-on-surface leading-tight">{row.bankName}</p>
            <p className="text-[10px] text-on-surface-variant font-semibold uppercase">{row.bankCode}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Số tài khoản',
      accessor: 'accountNumber',
      className: 'font-mono text-xs font-bold text-on-surface'
    },
    {
      header: 'Chủ tài khoản',
      accessor: 'accountName',
      className: 'text-xs text-on-surface font-semibold uppercase'
    },
    {
      header: 'Trạng thái',
      accessor: (row: BankAccount) => (
        <Badge variant={row.status === 'active' ? 'success' : 'danger'}>
          {row.status === 'active' ? 'Đang hoạt động' : 'Tạm khóa'}
        </Badge>
      )
    },
    {
      header: 'Thao tác',
      accessor: (row: BankAccount) => (
        <div className="flex justify-end gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleOpenEditModal(row)}
            className="!p-1.5 hover:bg-surface-container"
          >
            <Edit2 size={14} className="text-on-surface-variant" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleToggleStatus(row.id)}
            className={`!p-1.5 hover:bg-surface-container ${row.status === 'active' ? 'text-error' : 'text-tertiary'}`}
          >
            <Trash size={14} />
          </Button>
        </div>
      ),
      className: 'text-right'
    }
  ];

  return (
    <div className="space-y-6 text-left animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-headline-md text-on-surface">Cấu hình thanh toán &amp; Rút tiền</h1>
          <p className="text-xs text-on-surface-variant">Quản lý các quy tắc tài chính và tài khoản ngân hàng thụ hưởng toàn hệ thống.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => triggerToast(setToast, 'Đã lấy dữ liệu mới nhất từ Napas.', 'info')}
            className="py-2.5 px-4 font-bold text-xs"
          >
            Lấy dữ liệu mới nhất
          </Button>
          <Button 
            variant="primary"
            onClick={handleSaveSettings}
            className="py-2.5 px-5 font-bold text-xs shadow-md shadow-primary/10"
            icon={<Save size={14} />}
          >
            Lưu thay đổi
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left Side: Parameters Forms */}
        <div className="col-span-12 xl:col-span-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Withdrawal Limit Box */}
            <div className="bg-white p-5 rounded-3xl border border-outline-variant/30 shadow-soft">
              <div className="flex items-center justify-between mb-3 text-left">
                <h3 className="text-xs font-bold text-on-surface">Ngưỡng rút tối thiểu</h3>
                <DollarSign className="text-primary" size={20} />
              </div>
              <div className="relative">
                <input 
                  type="text" 
                  value={minWithdrawal}
                  onChange={(e) => setMinWithdrawal(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-lg font-black text-primary outline-none focus:border-primary pr-14"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-xs text-on-surface-variant">VNĐ</span>
              </div>
              <p className="text-[10px] text-on-surface-variant font-medium mt-2 leading-relaxed">Mặc định ban đầu: 10.000 VNĐ cho tài khoản người dùng mới tạo.</p>
            </div>

            {/* Fee Box */}
            <div className="bg-white p-5 rounded-3xl border border-outline-variant/30 shadow-soft">
              <div className="flex items-center justify-between mb-3 text-left">
                <h3 className="text-xs font-bold text-on-surface">Phí giao dịch rút tiền</h3>
                <Percent className="text-primary" size={20} />
              </div>
              <div className="relative">
                <input 
                  type="text" 
                  value={withdrawalFee}
                  onChange={(e) => setWithdrawalFee(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-lg font-black text-primary outline-none focus:border-primary pr-14"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-xs text-on-surface-variant">%</span>
              </div>
              <p className="text-[10px] text-on-surface-variant font-medium mt-2 leading-relaxed">Áp dụng trực tiếp trên tổng giá trị giao dịch yêu cầu rút về ngân hàng.</p>
            </div>

            {/* SLA SLA processing times */}
            <div className="bg-white p-5 rounded-3xl border border-outline-variant/30 shadow-soft sm:col-span-2 text-left space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-on-surface">Thời gian xử lý &amp; Giờ Cut-off</h3>
                <Clock className="text-primary" size={20} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Ước tính xử lý (SLA)</label>
                  <select 
                    value={slaTime}
                    onChange={(e) => setSlaTime(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-outline-variant/50 rounded-xl text-xs font-bold outline-none text-on-surface"
                  >
                    <option>Trong vòng 15 phút</option>
                    <option>Trong vòng 2 giờ</option>
                    <option>Cuối ngày làm việc</option>
                    <option>24-48 giờ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Giờ Cut-off (Ngừng nhận đơn)</label>
                  <input 
                    type="time" 
                    value={cutoffTime}
                    onChange={(e) => setCutoffTime(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-outline-variant/50 rounded-xl text-xs font-bold outline-none text-on-surface"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-primary/5 rounded-xl border border-primary/10 flex gap-2.5 items-start">
                <Info className="text-primary shrink-0 mt-0.5" size={16} />
                <p className="text-[10px] text-on-primary-container leading-relaxed">
                  Tất cả lệnh rút được gửi đi sau giờ Cut-off sẽ được tự động xếp vào hàng đợi chờ duyệt lúc 8:00 sáng ngày hôm sau.
                </p>
              </div>
            </div>

            {/* Bank account table list */}
            <div className="bg-white p-5 rounded-3xl border border-outline-variant/30 shadow-soft sm:col-span-2 space-y-4">
              <div className="flex justify-between items-center flex-wrap gap-4">
                <h3 className="text-xs font-bold text-on-surface">Danh sách tài khoản ngân hàng thụ hưởng</h3>
                <Button 
                  variant="outline"
                  onClick={handleOpenAddModal}
                  className="py-1 px-3 text-xs font-bold flex items-center gap-1 hover:bg-surface-container"
                >
                  <Plus size={14} /> Thêm tài khoản mới
                </Button>
              </div>
              
              <Table
                data={banks}
                columns={columns}
              />
            </div>

            {/* Transfer template text */}
            <div className="bg-white p-5 rounded-3xl border border-outline-variant/30 shadow-soft text-left space-y-3">
              <h3 className="text-xs font-bold text-on-surface">Cấu trúc chuyển khoản (Template)</h3>
              <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl p-3.5 space-y-2">
                <input 
                  type="text" 
                  value={txTemplate}
                  onChange={(e) => setTxTemplate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-outline-variant/30 rounded-xl text-xs font-mono font-bold outline-none focus:border-primary"
                />
                <p className="text-[10px] text-on-surface-variant">Mô phỏng thực tế: <span className="font-semibold text-on-surface font-mono">HTV_9921_W102394</span></p>
              </div>
              <div className="flex gap-2 flex-wrap text-[9px] font-bold text-on-surface-variant">
                <button type="button" onClick={() => setTxTemplate(prev => prev + '{USER_ID}')} className="bg-surface-container py-1 px-2.5 rounded-full hover:bg-outline-variant/20">{'{USER_ID}'}</button>
                <button type="button" onClick={() => setTxTemplate(prev => prev + '{FULL_NAME}')} className="bg-surface-container py-1 px-2.5 rounded-full hover:bg-outline-variant/20">{'{FULL_NAME}'}</button>
                <button type="button" onClick={() => setTxTemplate(prev => prev + '{TRANSACTION_ID}')} className="bg-surface-container py-1 px-2.5 rounded-full hover:bg-outline-variant/20">{'{TRANSACTION_ID}'}</button>
              </div>
            </div>

            {/* Risk Warnings check */}
            <div className="bg-error-container/10 p-5 rounded-3xl border border-error/20 shadow-soft text-left space-y-3">
              <h3 className="text-xs font-bold text-error flex items-center gap-1.5"><ShieldAlert size={18} /> Quy tắc hạn chế rủi ro</h3>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-2 hover:bg-white/40 rounded-xl cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={otpVerifyLimit}
                    onChange={(e) => setOtpVerifyLimit(e.target.checked)}
                    className="rounded text-primary focus:ring-primary border-outline-variant/50" 
                  />
                  <span className="text-xs font-bold text-on-surface-variant">Xác thực OTP khi rút hơn 5,000,000 VNĐ</span>
                </label>
                <label className="flex items-center gap-3 p-2 hover:bg-white/40 rounded-xl cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={ipWarning}
                    onChange={(e) => setIpWarning(e.target.checked)}
                    className="rounded text-primary focus:ring-primary border-outline-variant/50" 
                  />
                  <span className="text-xs font-bold text-on-surface-variant">Báo động cảnh báo khi phát hiện IP rút tiền lạ</span>
                </label>
                <label className="flex items-center gap-3 p-2 hover:bg-white/40 rounded-xl cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={lockOnFailedPin}
                    onChange={(e) => setLockOnFailedPin(e.target.checked)}
                    className="rounded text-primary focus:ring-primary border-outline-variant/50" 
                  />
                  <span className="text-xs font-bold text-on-surface-variant">Khóa ví tạm thời nếu nhập sai PIN 3 lần</span>
                </label>
              </div>
            </div>

          </div>
        </div>

        {/* Right Side Panel */}
        <div className="col-span-12 xl:col-span-4 space-y-6">
          
          {/* Operation Status */}
          <div className="bg-primary-container p-6 rounded-3xl text-white shadow-xl shadow-primary/20 text-left relative overflow-hidden group">
            <div className="relative z-10 space-y-4">
              <div>
                <p className="text-[10px] text-on-primary-container font-black uppercase tracking-wider opacity-85">Chế độ vận hành</p>
                <h3 className="text-lg font-bold">Trạng thái Hệ thống</h3>
              </div>
              
              <div className="bg-black/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 flex items-center justify-between">
                <div className="text-left">
                  <p className="text-xs font-bold">Duyệt tự động (AI Auto)</p>
                  <p className="text-[9px] opacity-75">Tự động đẩy đơn qua Napas247</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                  <input 
                    type="checkbox" 
                    checked={isAutoMode}
                    onChange={(e) => setIsAutoMode(e.target.checked)}
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-tertiary"></div>
                </label>
              </div>

              <div className="text-[10px] font-semibold flex items-center gap-1.5 text-white/90">
                <span className="w-2 h-2 bg-tertiary-fixed rounded-full animate-pulse"></span>
                <span>Kết nối ổn định với Napas API Gateway</span>
              </div>
            </div>
          </div>

          {/* Notifications Preview */}
          <div className="bg-white p-5 rounded-3xl border border-outline-variant/30 shadow-soft text-left space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-on-surface">Xem trước thông báo gửi đi</h3>
              <Badge variant="info">SMS &amp; In-app</Badge>
            </div>
            
            <div className="space-y-3">
              <div className="p-3 bg-surface-container-low rounded-xl border-l-4 border-primary">
                <div className="flex justify-between items-baseline mb-1">
                  <p className="text-[10px] font-bold text-on-surface">Rút tiền thành công</p>
                  <span className="text-[9px] text-on-surface-variant font-medium">Ngay bây giờ</span>
                </div>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  Bạn đã rút thành công <span className="text-primary font-bold">500.000đ</span> về ngân hàng Vietcombank (****888). Thời gian: 14:20 22/10.
                </p>
              </div>

              <div className="p-3 bg-surface-container-low rounded-xl border-l-4 border-tertiary">
                <div className="flex justify-between items-baseline mb-1">
                  <p className="text-[10px] font-bold text-on-surface">Đang phê duyệt lệnh rút</p>
                  <span className="text-[9px] text-on-surface-variant font-medium">2 giờ trước</span>
                </div>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  Yêu cầu rút tiền mã <span className="font-mono font-bold text-on-surface">#W20394</span> đang được hệ thống phê duyệt. SLA dự kiến: 15 phút.
                </p>
              </div>
            </div>
          </div>

          {/* Change History Logs */}
          <div className="bg-white p-5 rounded-3xl border border-outline-variant/30 shadow-soft text-left space-y-4">
            <h3 className="text-xs font-bold text-on-surface">Lịch sử thay đổi gần nhất</h3>
            <div className="relative space-y-5 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1px] before:bg-outline-variant/40">
              
              {auditLogs.map((log) => (
                <div key={log.id} className="relative pl-8 text-left">
                  <span className="absolute left-0 top-0.5 w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center z-10 text-primary">
                    <Info size={12} />
                  </span>
                  <p className="text-[11px] font-bold text-on-surface">{log.adminName}</p>
                  <p className="text-[10px] text-on-surface-variant mt-0.5 leading-normal">{log.action}</p>
                  <p className="text-[9px] text-outline-variant uppercase font-medium mt-1">{log.time}</p>
                </div>
              ))}

            </div>
          </div>

        </div>
      </div>

      {/* Add / Edit Bank Account Modal */}
      {showBankModal && (
        <Modal
          isOpen={showBankModal}
          onClose={() => setShowBankModal(false)}
          title={editingBank ? 'Chỉnh sửa tài khoản ngân hàng' : 'Thêm tài khoản ngân hàng hệ thống'}
        >
          <form onSubmit={handleSaveBank} className="space-y-4 text-left">
            <Input 
              label="Tên ngân hàng"
              placeholder="Ví dụ: Ngân hàng TMCP Ngoại Thương VN"
              value={newBankName}
              onChange={(e) => setNewBankName(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="Mã ngân hàng (Code)"
                placeholder="Ví dụ: VCB"
                value={newBankCode}
                onChange={(e) => setNewBankCode(e.target.value.toUpperCase())}
              />
              <Input 
                label="Số tài khoản"
                placeholder="Nhập số tài khoản"
                value={newBankNumber}
                onChange={(e) => setNewBankNumber(e.target.value)}
              />
            </div>
            <Input 
              label="Tên chủ tài khoản"
              placeholder="Ví dụ: CONG TY HOANTIENVIP"
              value={newBankOwner}
              onChange={(e) => setNewBankOwner(e.target.value.toUpperCase())}
            />

            <div className="flex justify-end gap-3 pt-3 border-t border-outline-variant/20">
              <Button type="button" variant="outline" onClick={() => setShowBankModal(false)}>
                Hủy
              </Button>
              <Button type="submit" variant="primary">
                Lưu tài khoản
              </Button>
            </div>
          </form>
        </Modal>
      )}

      <ToastContainer toast={toast} setToast={setToast} />
    </div>
  );
};
