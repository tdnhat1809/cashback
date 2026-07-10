import React, { useState } from 'react';
import { mockAdminStaffMembers, mockAdminSecurityLogs } from '../../mockData';
import type { AdminStaffMember, AdminSecurityLog } from '../../mockData';
import { Button } from '../../components/Button';
import { Table } from '../../components/Table';
import type { Column } from '../../components/Table';
import { ToastContainer } from '../../components/Toast';
import { defaultToastState, triggerToast } from '../../components/toast-state';
import type { ToastState } from '../../components/toast-state';
import { 
  ShieldCheck, UserPlus, Search, Edit, Ban, Check, X, Shield, Filter, Download, UserCheck 
} from 'lucide-react';

export const AdminStaffSecurity: React.FC = () => {
  const [staffList, setStaffList] = useState<AdminStaffMember[]>(mockAdminStaffMembers);
  const [auditLogs, setAuditLogs] = useState<AdminSecurityLog[]>(mockAdminSecurityLogs);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [inviteModal, setInviteModal] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', role: 'CSKH' as any });
  const [toast, setToast] = useState<ToastState>(defaultToastState);

  // Role permissions matrix state
  const [permissionsMatrix, setPermissionsMatrix] = useState([
    { module: 'System Settings', roles: { Admin: true, CSKH: false, Operation: false, Finance: false } },
    { module: 'Approve Cashback', roles: { Admin: true, CSKH: false, Operation: true, Finance: true } },
    { module: 'Manual Adjustments', roles: { Admin: true, CSKH: true, Operation: false, Finance: true } },
    { module: 'User Data View', roles: { Admin: true, CSKH: true, Operation: true, Finance: true } },
    { module: 'Bank API Keys', roles: { Admin: true, CSKH: false, Operation: false, Finance: false } },
  ]);

  // Handlers
  const handleTogglePermission = (moduleName: string, roleName: 'Admin' | 'CSKH' | 'Operation' | 'Finance') => {
    if (roleName === 'Admin') {
      triggerToast(setToast, 'Không thể thay đổi quyền tối cao của Admin.', 'warning');
      return;
    }
    setPermissionsMatrix(prev =>
      prev.map(p => {
        if (p.module === moduleName) {
          const nextVal = !p.roles[roleName];
          triggerToast(setToast, `Đã cập nhật quyền [${moduleName}] cho nhóm [${roleName}].`, 'info');
          return {
            ...p,
            roles: {
              ...p.roles,
              [roleName]: nextVal
            }
          };
        }
        return p;
      })
    );
  };

  const handleToggleStaffStatus = (id: string, name: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
    setStaffList(prev =>
      prev.map(st => st.id === id ? { ...st, status: nextStatus } : st)
    );
    
    // Add audit log entry
    const newLog: AdminSecurityLog = {
      id: `asl_${Date.now()}`,
      actorName: 'Khanh Nguyen',
      actorRole: 'Admin',
      action: nextStatus === 'Active' ? 'RE_ACTIVATE_STAFF' : 'SUSPEND_STAFF',
      target: `Staff: ${name}`,
      ip: '192.168.1.1',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    
    setAuditLogs(prev => [newLog, ...prev]);
    triggerToast(
      setToast, 
      nextStatus === 'Active' ? `Đã kích hoạt lại nhân sự ${name}` : `Đã tạm khóa tài khoản nhân sự ${name}`, 
      nextStatus === 'Active' ? 'success' : 'warning'
    );
  };

  const handleInviteMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.name.trim()) {
      triggerToast(setToast, 'Vui lòng nhập tên nhân sự.', 'error');
      return;
    }

    const created: AdminStaffMember = {
      id: `st_${Date.now()}`,
      name: newMember.name.trim(),
      role: newMember.role,
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      status: 'Active',
      lastActive: 'now',
      twoFaEnabled: true
    };

    setStaffList(prev => [...prev, created]);

    // Add audit log entry
    const newLog: AdminSecurityLog = {
      id: `asl_${Date.now()}`,
      actorName: 'Khanh Nguyen',
      actorRole: 'Admin',
      action: 'INVITE_STAFF',
      target: `Staff: ${created.name} (${created.role})`,
      ip: '192.168.1.1',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    setAuditLogs(prev => [newLog, ...prev]);
    triggerToast(setToast, `Đã gửi lời mời tham gia đến ${created.name}!`, 'success');
    setInviteModal(false);
    setNewMember({ name: '', role: 'CSKH' });
  };

  // Filter logs based on search input
  const filteredLogs = auditLogs.filter(log =>
    log.actorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.target.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const auditColumns: Column<AdminSecurityLog>[] = [
    {
      header: 'Nhân sự',
      accessor: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary-container text-white flex items-center justify-center font-bold text-xs">
            {row.actorName.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-on-surface text-xs">{row.actorName}</p>
            <p className="text-[9px] text-outline-variant font-bold uppercase tracking-wider">{row.actorRole}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Hành động',
      accessor: (row) => (
        <span className="bg-surface-container text-on-surface-variant border border-outline-variant/30 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase">
          {row.action}
        </span>
      )
    },
    {
      header: 'Đối tượng tác động',
      accessor: 'target',
      className: 'text-xs text-on-surface font-semibold text-left'
    },
    {
      header: 'Địa chỉ IP',
      accessor: 'ip',
      className: 'text-xs text-on-surface-variant/80 font-mono'
    },
    {
      header: 'Thời gian',
      accessor: 'timestamp',
      className: 'text-xs text-on-surface-variant font-medium'
    }
  ];

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/20 pb-4">
        <div>
          <h1 className="font-headline-md text-xl font-bold text-primary">Roles & Security Center</h1>
          <p className="text-xs text-on-surface-variant">Quản lý quyền truy cập của đội ngũ kiểm soát viên và giám sát lịch sử hoạt động bảo mật.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-tertiary-container/10 border border-tertiary-container/20 px-3 py-1.5 rounded-full text-xs font-bold text-tertiary">
            <ShieldCheck size={14} />
            <span>2FA ENFORCED</span>
          </div>
          <Button
            variant="primary"
            onClick={() => setInviteModal(true)}
            icon={<UserPlus size={16} />}
            className="shadow-soft"
          >
            Mời nhân sự
          </Button>
        </div>
      </header>

      {/* Grid: Staff list & permissions matrix */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* Staff Members List (col-span-5) */}
        <section className="xl:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-title-lg text-sm font-bold text-on-surface">Thành viên đội ngũ</h3>
            <span className="text-[10px] text-on-surface-variant font-bold uppercase">
              Tổng số: {staffList.filter(s => s.status !== 'Suspended').length} đang hoạt động
            </span>
          </div>

          <div className="space-y-3">
            {staffList.map((st) => (
              <div 
                key={st.id} 
                className="bg-white p-4 rounded-2xl border border-outline-variant/30 shadow-soft flex items-center justify-between group hover:border-primary/20 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-surface-container relative">
                    <img src={st.avatar} alt={st.name} className="w-full h-full object-cover" />
                    {st.status === 'Active' && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-tertiary rounded-full border-2 border-white" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-on-surface text-sm">{st.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border
                        ${st.role === 'Admin' ? 'bg-primary-container text-white border-primary/25' : ''}
                        ${st.role === 'CSKH' ? 'bg-tertiary-container text-white border-tertiary/25' : ''}
                        ${st.role === 'Operation' ? 'bg-secondary-container text-on-secondary-container border-secondary/20' : ''}
                        ${st.role === 'Finance' ? 'bg-rose-500 text-white border-rose-600/25' : ''}
                      `}>
                        {st.role}
                      </span>
                      <span className="text-[10px] text-on-surface-variant font-medium">Hoạt động: {st.lastActive}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => alert(`Chỉnh sửa nhóm quyền cho ${st.name} thông qua Bảng ma trận bên cạnh.`)}
                    className="p-2 text-on-surface-variant hover:text-primary rounded-lg hover:bg-surface-container transition-all cursor-pointer"
                    title="Chỉnh sửa quyền hạn"
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    onClick={() => handleToggleStaffStatus(st.id, st.name, st.status)}
                    className={`p-2 rounded-lg hover:bg-surface-container transition-all cursor-pointer
                      ${st.status === 'Suspended' ? 'text-tertiary hover:text-tertiary-container' : 'text-on-surface-variant hover:text-error'}
                    `}
                    title={st.status === 'Suspended' ? 'Mở khóa tài khoản' : 'Tạm dừng tài khoản'}
                  >
                    {st.status === 'Suspended' ? <UserCheck size={16} /> : <Ban size={16} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Permissions Matrix (col-span-7) */}
        <section className="xl:col-span-7 space-y-4">
          <h3 className="font-title-lg text-sm font-bold text-on-surface">Ma trận phân quyền Module</h3>
          <div className="bg-white rounded-3xl border border-outline-variant/30 shadow-soft overflow-hidden overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant border-b border-outline-variant/30">
                  <th className="p-4 text-xs font-black uppercase tracking-wider">Module hệ thống</th>
                  <th className="p-4 text-xs font-black uppercase tracking-wider text-center">Admin</th>
                  <th className="p-4 text-xs font-black uppercase tracking-wider text-center">CSKH</th>
                  <th className="p-4 text-xs font-black uppercase tracking-wider text-center">Operation</th>
                  <th className="p-4 text-xs font-black uppercase tracking-wider text-center">Finance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {permissionsMatrix.map((item) => (
                  <tr key={item.module} className="hover:bg-primary-fixed/5 transition-colors">
                    <td className="p-4 text-xs font-bold text-on-surface">{item.module}</td>
                    
                    {(['Admin', 'CSKH', 'Operation', 'Finance'] as any[]).map((role) => {
                      const hasPerm = (item.roles as any)[role];
                      return (
                        <td key={role} className="p-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleTogglePermission(item.module, role)}
                            className="p-1.5 rounded-lg hover:bg-surface-container transition-colors inline-flex items-center justify-center cursor-pointer"
                            aria-label={`Toggle permission ${item.module} for ${role}`}
                          >
                            {hasPerm ? (
                              <Check className="text-primary" size={18} strokeWidth={3} />
                            ) : (
                              <X className="text-outline-variant/50" size={18} strokeWidth={3} />
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>

      {/* Bottom Section: Security Audit Log */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="font-title-lg text-sm font-bold text-on-surface">Lịch sử hoạt động bảo mật (Audit Log)</h3>
          
          <div className="flex items-center gap-3">
            <div className="relative flex items-center bg-white px-3 py-2 border border-outline-variant/30 focus-within:border-primary rounded-xl w-64">
              <Search className="text-on-surface-variant mr-2" size={16} />
              <input 
                type="text" 
                placeholder="Lọc hoạt động..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none focus:ring-0 text-xs w-full outline-none placeholder:text-on-surface-variant/40"
              />
            </div>
            <button className="bg-surface-container-high p-2.5 rounded-xl text-on-surface hover:text-primary transition-all cursor-pointer">
              <Filter size={16} />
            </button>
            <button className="bg-surface-container-high p-2.5 rounded-xl text-on-surface hover:text-primary transition-all cursor-pointer">
              <Download size={16} />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-outline-variant/30 shadow-soft overflow-hidden">
          <Table
            data={filteredLogs}
            columns={auditColumns}
            emptyMessage="Không tìm thấy lịch sử hoạt động bảo mật phù hợp."
          />
        </div>
      </section>

      {/* Invite Member Modal */}
      {inviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <form 
            onSubmit={handleInviteMember}
            className="w-full max-w-[360px] bg-white rounded-3xl p-6 flex flex-col shadow-2xl animate-scale-up text-left"
          >
            <h3 className="font-headline-md text-base font-bold text-on-surface mb-2 flex items-center gap-1.5">
              <Shield size={20} className="text-primary" /> Mời thành viên mới
            </h3>
            <p className="text-[10px] text-on-surface-variant mb-6 leading-relaxed">
              Nhập tên và vai trò quản trị viên để gửi lời mời tham gia kiểm soát hệ thống HOANTIENVIP.
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Họ và Tên</label>
                <input 
                  type="text" 
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  placeholder="VD: Nguyễn Văn A"
                  className="w-full px-4 py-3 bg-surface-container-low/40 border border-outline-variant/40 rounded-xl text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Vai trò / Chức danh</label>
                <select 
                  value={newMember.role}
                  onChange={(e) => setNewMember({ ...newMember, role: e.target.value as any })}
                  className="w-full px-3 py-3 bg-surface-container-low/40 border border-outline-variant/40 rounded-xl text-xs outline-none focus:border-primary font-semibold"
                >
                  <option value="CSKH">CSKH (Customer Support)</option>
                  <option value="Operation">Operation (Vận hành đơn)</option>
                  <option value="Finance">Finance (Tài chính & Đối soát)</option>
                  <option value="Admin">Admin (Quản trị hệ thống)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setInviteModal(false)}
                className="flex-1 py-3 hover:bg-surface-container"
              >
                Hủy bỏ
              </Button>
              <Button 
                type="submit" 
                variant="primary"
                className="flex-1 py-3 font-bold shadow-soft"
              >
                Gửi lời mời
              </Button>
            </div>
          </form>
        </div>
      )}

      <ToastContainer toast={toast} setToast={setToast} />
    </div>
  );
};
