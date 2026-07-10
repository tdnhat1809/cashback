import React, { useState } from 'react';
import { mockUserProfile } from '../../mockData';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Dropdown } from '../../components/Dropdown';
import { ToastContainer, defaultToastState, triggerToast } from '../../components/Toast';
import type { ToastState } from '../../components/Toast';
import { Landmark, User, Mail, ShieldCheck } from 'lucide-react';

export const Settings: React.FC = () => {
  const [profile, setProfile] = useState(mockUserProfile);
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [bankName, setBankName] = useState(profile.bankName);
  const [bankAccount, setBankAccount] = useState(profile.bankAccount);
  const [bankAccountName, setBankAccountName] = useState(profile.bankAccountName);
  const [emailNotify, setEmailNotify] = useState(true);
  const [pushNotify, setPushNotify] = useState(true);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(defaultToastState);

  const bankOptions = [
    { value: 'Techcombank', label: 'Techcombank' },
    { value: 'Vietcombank', label: 'Vietcombank' },
    { value: 'Vietinbank', label: 'Vietinbank' },
    { value: 'MB Bank', label: 'MB Bank (Quân Đội)' },
    { value: 'VPBank', label: 'VPBank' },
    { value: 'BIDV', label: 'BIDV' },
    { value: 'ACB', label: 'ACB' }
  ];

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      triggerToast(setToast, 'Tên người dùng không được bỏ trống.', 'error');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setProfile(prev => ({ ...prev, name, email }));
      triggerToast(setToast, 'Cập nhật thông tin tài khoản thành công!', 'success');
    }, 1200);
  };

  const handleSaveBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankAccount.trim()) {
      triggerToast(setToast, 'Số tài khoản không được bỏ trống.', 'error');
      return;
    }

    if (!bankAccountName.trim()) {
      triggerToast(setToast, 'Họ tên chủ tài khoản không được bỏ trống.', 'error');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setProfile(prev => ({ 
        ...prev, 
        bankName, 
        bankAccount, 
        bankAccountName: bankAccountName.toUpperCase() 
      }));
      triggerToast(setToast, 'Cập nhật liên kết tài khoản ngân hàng thành công!', 'success');
    }, 1200);
  };

  return (
    <div className="space-y-8 text-left animate-fade-in">
      <div>
        <h1 className="font-headline-md text-on-surface">Thiết lập tài khoản</h1>
        <p className="text-xs text-on-surface-variant">Cập nhật thông tin cá nhân, liên kết tài khoản ngân hàng nhận tiền đối soát và cấu hình thông báo.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Profile Info Form */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-outline-variant/30 shadow-soft space-y-6">
          <h3 className="font-title-lg text-sm font-bold flex items-center gap-1.5 border-b border-outline-variant/20 pb-3">
            <User size={18} className="text-primary" /> Thông tin cá nhân
          </h3>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <Input
              label="Họ và tên"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />

            <Input
              label="Số điện thoại đăng nhập"
              value={profile.phone}
              readOnly
              disabled
              helperText="Số điện thoại định danh tài khoản, không thể tự thay đổi vì lý do bảo mật."
            />

            <Input
              label="Địa chỉ Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              startIcon={<Mail size={16} />}
            />

            <Button
              type="submit"
              variant="primary"
              className="py-3 px-6 text-xs font-bold"
              loading={loading}
            >
              Lưu thông tin cá nhân
            </Button>
          </form>
        </div>

        {/* Bank Account Form */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-outline-variant/30 shadow-soft space-y-6">
          <h3 className="font-title-lg text-sm font-bold flex items-center gap-1.5 border-b border-outline-variant/20 pb-3">
            <Landmark size={18} className="text-primary" /> Liên kết Ngân hàng nhận tiền
          </h3>

          <form onSubmit={handleSaveBank} className="space-y-4">
            <Dropdown
              label="Ngân hàng nhận"
              options={bankOptions}
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              disabled={loading}
            />

            <Input
              label="Số tài khoản ngân hàng"
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value.replace(/\D/g, ''))}
              disabled={loading}
            />

            <Input
              label="Tên chủ tài khoản (Viết hoa không dấu)"
              value={bankAccountName}
              onChange={(e) => setBankAccountName(e.target.value)}
              disabled={loading}
              helperText="Tên chủ tài khoản phải khớp hoàn toàn với đăng ký tại ngân hàng."
            />

            <Button
              type="submit"
              variant="success"
              className="py-3 px-6 text-xs font-bold"
              loading={loading}
            >
              Cập nhật tài khoản nhận tiền
            </Button>
          </form>
        </div>
      </div>

      {/* Notifications settings & Security options */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-outline-variant/30 shadow-soft text-left space-y-6">
        <h3 className="font-title-lg text-sm font-bold flex items-center gap-1.5 border-b border-outline-variant/20 pb-3">
          <ShieldCheck size={18} className="text-primary" /> Cài đặt thông báo & Bảo mật
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Notification toggles */}
          <div className="space-y-4">
            <h4 className="font-semibold text-xs text-on-surface">Kênh nhận thông tin</h4>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={emailNotify} 
                  onChange={(e) => setEmailNotify(e.target.checked)}
                  className="rounded text-primary focus:ring-primary/20 w-4 h-4"
                />
                <span className="text-xs font-semibold text-on-surface-variant">Nhận thông báo lịch sử số dư ví qua Email</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={pushNotify} 
                  onChange={(e) => setPushNotify(e.target.checked)}
                  className="rounded text-primary focus:ring-primary/20 w-4 h-4"
                />
                <span className="text-xs font-semibold text-on-surface-variant">Nhận thông báo cập nhật vận đơn trên màn hình điện thoại (Push)</span>
              </label>
            </div>
          </div>

          {/* Security policy reminder */}
          <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/20 text-xs text-on-surface-variant leading-relaxed">
            <span className="font-bold text-on-surface block mb-1">Chính sách bảo mật tài chính:</span>
            Mọi thao tác thay đổi thông tin tài khoản ngân hàng sẽ được ghi nhật ký hoạt động (activity log) chi tiết. HOANTIENVIP cam kết mã hóa và bảo mật tuyệt đối các thông tin giao dịch tài chính của người dùng theo tiêu chuẩn an toàn dữ liệu.
          </div>
        </div>
      </div>

      <ToastContainer toast={toast} setToast={setToast} />
    </div>
  );
};
