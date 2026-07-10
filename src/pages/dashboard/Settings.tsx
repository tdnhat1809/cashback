import React, { useEffect, useState } from 'react';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Dropdown } from '../../components/Dropdown';
import { ToastContainer } from '../../components/Toast';
import { defaultToastState, triggerToast } from '../../components/toast-state';
import type { ToastState } from '../../components/toast-state';
import { Landmark, User, Mail, ShieldCheck } from 'lucide-react';
import { userFeaturesApi } from '../../services/apiClient';

export const Settings: React.FC = () => {
  const [profile, setProfile] = useState<{ email: string | null }>({ email: null });
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [activeBank, setActiveBank] = useState<{ bankName: string; accountNumberMasked: string; accountName: string } | null>(null);
  const [emailNotify, setEmailNotify] = useState(false);
  const [pushNotify, setPushNotify] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(defaultToastState);

  const bankOptions = [
    { value: 'TCB', label: 'Techcombank' }, { value: 'VCB', label: 'Vietcombank' },
    { value: 'CTG', label: 'Vietinbank' }, { value: 'MBB', label: 'MB Bank (Quân Đội)' },
    { value: 'VPB', label: 'VPBank' }, { value: 'BIDV', label: 'BIDV' }, { value: 'ACB', label: 'ACB' },
  ];

  useEffect(() => {
    void Promise.all([userFeaturesApi.profile(), userFeaturesApi.bankAccounts(), userFeaturesApi.notificationPreferences()])
      .then(([nextProfile, accounts, preferences]) => {
        setProfile({ email: nextProfile.email }); setName(nextProfile.name); setEmail(nextProfile.email ?? '');
        const selected = accounts.find((account) => account.active) ?? null;
        setActiveBank(selected);
        setEmailNotify(preferences.email); setPushNotify(preferences.push);
      })
      .catch((error: unknown) => triggerToast(setToast, error instanceof Error ? error.message : 'Không thể tải thiết lập tài khoản.', 'error'));
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      triggerToast(setToast, 'Tên người dùng không được bỏ trống.', 'error');
      return;
    }

    setLoading(true);
    try {
      const updated = await userFeaturesApi.updateProfile({ name: name.trim() });
      setProfile({ email: updated.email });
      setName(updated.name); setEmail(updated.email ?? '');
      triggerToast(setToast, 'Cập nhật thông tin tài khoản thành công!', 'success');
    } catch (error) {
      triggerToast(setToast, error instanceof Error ? error.message : 'Không thể lưu thông tin cá nhân.', 'error');
    } finally { setLoading(false); }
  };

  const handleSaveBank = async (e: React.FormEvent) => {
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
    try {
      const bankOption = bankOptions.find((option) => option.value === bankName);
      if (!bankOption) throw new Error('Vui lòng chọn ngân hàng nhận tiền.');
      const updated = await userFeaturesApi.replaceDefaultBankAccount({
        bankCode: bankName, bankName: bankOption.label, accountNumber: bankAccount, accountName: bankAccountName,
      });
      setActiveBank(updated); setBankAccount(''); setBankAccountName('');
      triggerToast(setToast, 'Cập nhật liên kết tài khoản ngân hàng thành công!', 'success');
    } catch (error) {
      triggerToast(setToast, error instanceof Error ? error.message : 'Không thể lưu tài khoản ngân hàng.', 'error');
    } finally { setLoading(false); }
  };

  const savePreference = async (key: 'email' | 'push', value: boolean) => {
    if (key === 'email') setEmailNotify(value); else setPushNotify(value);
    try { await userFeaturesApi.updateNotificationPreferences({ [key]: value }); }
    catch (error) {
      if (key === 'email') setEmailNotify(!value); else setPushNotify(!value);
      triggerToast(setToast, error instanceof Error ? error.message : 'Không thể cập nhật thông báo.', 'error');
    }
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
              label="Địa chỉ Email đăng nhập"
              type="email"
              value={email}
              readOnly
              disabled
              startIcon={<Mail size={16} />}
              helperText={profile.email ? 'Email đăng nhập được xác định khi tạo tài khoản.' : 'Tài khoản này chưa có email đăng nhập.'}
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

            {activeBank && <p className="rounded-xl bg-tertiary/5 p-3 text-xs text-tertiary">Tài khoản đang dùng: {activeBank.bankName} · {activeBank.accountNumberMasked} · {activeBank.accountName}</p>}

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
                  onChange={(e) => void savePreference('email', e.target.checked)}
                  className="rounded text-primary focus:ring-primary/20 w-4 h-4"
                />
                <span className="text-xs font-semibold text-on-surface-variant">Nhận thông báo lịch sử số dư ví qua Email</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={pushNotify} 
                  onChange={(e) => void savePreference('push', e.target.checked)}
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
