import React, { useState } from 'react';
import { 
  mockAdminPromoCodes, mockAdminReferralCampaigns, mockTasks 
} from '../../mockData';
import type { AdminPromoCode, AdminReferralCampaign, RewardTask } from '../../mockData';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Table } from '../../components/Table';
import type { Column } from '../../components/Table';
import { ToastContainer } from '../../components/Toast';
import { defaultToastState, triggerToast } from '../../components/toast-state';
import type { ToastState } from '../../components/toast-state';
import { 
  Gift, Award, Users, Search, Plus, Edit, Trash2, GiftIcon, Save, Info, Sparkles 
} from 'lucide-react';

export const AdminPromotions: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'giftcode' | 'rewards' | 'referrals'>('giftcode');
  const [promoCodes, setPromoCodes] = useState<AdminPromoCode[]>(mockAdminPromoCodes);
  const [referrals, setReferrals] = useState<AdminReferralCampaign[]>(mockAdminReferralCampaigns);
  const [tasks, setTasks] = useState<RewardTask[]>(mockTasks);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [toast, setToast] = useState<ToastState>(defaultToastState);

  // Filter lists based on search
  const filteredPromoCodes = promoCodes.filter(c => 
    c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredReferrals = referrals.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTasks = tasks.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Editor Actions
  const handleSelectCode = (code: AdminPromoCode) => {
    setEditingItem({ itemFormType: 'giftcode', ...code });
  };

  const handleSelectReferral = (ref: AdminReferralCampaign) => {
    setEditingItem({ itemFormType: 'referral', ...ref });
  };

  const handleSelectTask = (task: RewardTask) => {
    setEditingItem({ itemFormType: 'task', ...task });
  };

  const handleCreateNewClick = () => {
    if (activeTab === 'giftcode') {
      setEditingItem({
        itemFormType: 'giftcode',
        id: '',
        code: 'PROMO' + Math.floor(100 + Math.random() * 900),
        description: 'Voucher khuyến mãi đặc biệt',
        rewardType: 'flat',
        value: 10000,
        usedCount: 0,
        limitCount: 500,
        startDate: new Date().toISOString().substring(0, 10),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
        status: 'Active'
      });
    } else if (activeTab === 'referrals') {
      setEditingItem({
        itemFormType: 'referral',
        id: '',
        name: 'Chiến dịch giới thiệu hè 2026',
        rewardPerUser: 30000,
        totalJoined: 0,
        status: 'Active',
        startDate: new Date().toISOString().substring(0, 10),
        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10)
      });
    } else {
      setEditingItem({
        itemFormType: 'task',
        id: '',
        title: 'Nhiệm vụ hàng ngày mới',
        reward: 500,
        completed: false,
        taskType: 'daily'
      });
    }
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const isNew = !editingItem.id;
    const currentId = isNew ? `item_${Date.now()}` : editingItem.id;

    if (editingItem.itemFormType === 'giftcode') {
      if (!editingItem.code || !editingItem.description) {
        triggerToast(setToast, 'Vui lòng nhập đầy đủ mã và mô tả.', 'error');
        return;
      }
      const newCode: AdminPromoCode = {
        id: currentId,
        code: editingItem.code.toUpperCase(),
        description: editingItem.description,
        type: editingItem.rewardType || 'flat',
        value: parseFloat(editingItem.value) || 0,
        usedCount: editingItem.usedCount || 0,
        limitCount: parseInt(editingItem.limitCount) || 100,
        startDate: editingItem.startDate,
        endDate: editingItem.endDate,
        status: editingItem.status || 'Active'
      };

      if (isNew) {
        setPromoCodes(prev => [...prev, newCode]);
        triggerToast(setToast, `Đã tạo Giftcode ${newCode.code} thành công!`, 'success');
      } else {
        setPromoCodes(prev => prev.map(c => c.id === newCode.id ? newCode : c));
        triggerToast(setToast, `Đã cập nhật Giftcode ${newCode.code}!`, 'success');
      }
    } else if (editingItem.itemFormType === 'referral') {
      if (!editingItem.name) {
        triggerToast(setToast, 'Vui lòng nhập tên chiến dịch.', 'error');
        return;
      }
      const newRef: AdminReferralCampaign = {
        id: currentId,
        name: editingItem.name,
        rewardPerUser: parseFloat(editingItem.rewardPerUser) || 0,
        totalJoined: editingItem.totalJoined || 0,
        status: editingItem.status || 'Active',
        startDate: editingItem.startDate,
        endDate: editingItem.endDate
      };

      if (isNew) {
        setReferrals(prev => [...prev, newRef]);
        triggerToast(setToast, `Đã tạo chiến dịch giới thiệu mới!`, 'success');
      } else {
        setReferrals(prev => prev.map(r => r.id === newRef.id ? newRef : r));
        triggerToast(setToast, `Đã cập nhật chiến dịch ${newRef.name}!`, 'success');
      }
    } else if (editingItem.itemFormType === 'task') {
      if (!editingItem.title) {
        triggerToast(setToast, 'Vui lòng nhập tên nhiệm vụ.', 'error');
        return;
      }
      const newTask: RewardTask = {
        id: currentId,
        title: editingItem.title,
        reward: parseInt(editingItem.reward) || 100,
        completed: editingItem.completed || false,
        type: editingItem.taskType || 'daily'
      };

      if (isNew) {
        setTasks(prev => [...prev, newTask]);
        triggerToast(setToast, `Đã tạo nhiệm vụ mới!`, 'success');
      } else {
        setTasks(prev => prev.map(t => t.id === newTask.id ? newTask : t));
        triggerToast(setToast, `Đã cập nhật nhiệm vụ thành công!`, 'success');
      }
    }

    setEditingItem(null);
  };

  const handleDeleteItem = (id: string, type: 'giftcode' | 'referral' | 'task', name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Bạn có chắc chắn muốn xóa ${name}?`)) {
      if (type === 'giftcode') {
        setPromoCodes(prev => prev.filter(c => c.id !== id));
      } else if (type === 'referral') {
        setReferrals(prev => prev.filter(r => r.id !== id));
      } else {
        setTasks(prev => prev.filter(t => t.id !== id));
      }
      triggerToast(setToast, `Đã xóa thành công.`, 'warning');
      if (editingItem && editingItem.id === id) {
        setEditingItem(null);
      }
    }
  };

  // Columns Definitions
  const giftcodeColumns: Column<AdminPromoCode>[] = [
    {
      header: 'Mã Code',
      accessor: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center font-bold">
            <GiftIcon size={18} />
          </div>
          <div>
            <p className="font-bold text-on-surface text-sm font-mono">{row.code}</p>
            <p className="text-[10px] text-on-surface-variant font-medium">{row.description}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Giá trị thưởng',
      accessor: (row) => {
        if (row.type === 'cashback') return <span className="font-bold text-tertiary">Hoàn tiền {row.value}%</span>;
        if (row.type === 'points') return <span className="font-bold text-amber-600">{row.value.toLocaleString()} Xu</span>;
        return <span className="font-bold text-primary">+{row.value.toLocaleString()}đ</span>;
      }
    },
    {
      header: 'Lượt sử dụng',
      accessor: (row) => {
        const pct = Math.min(100, (row.usedCount / row.limitCount) * 100);
        return (
          <div className="w-full max-w-[130px] space-y-1">
            <div className="flex justify-between text-[10px] font-bold text-on-surface-variant">
              <span>{row.usedCount}</span>
              <span>{row.limitCount} lượt</span>
            </div>
            <div className="w-full bg-surface-container rounded-full h-1.5 overflow-hidden">
              <div className="bg-primary h-full rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      }
    },
    {
      header: 'Thời hạn',
      accessor: (row) => (
        <div className="text-left text-xs font-semibold text-on-surface-variant">
          <p>{row.startDate}</p>
          <p className="text-[10px] text-outline-variant font-medium">đến {row.endDate}</p>
        </div>
      )
    },
    {
      header: 'Trạng thái',
      accessor: (row) => (
        <Badge variant={row.status === 'Active' ? 'success' : row.status === 'Expired' ? 'secondary' : 'warning'}>
          {row.status === 'Active' ? 'Hoạt động' : row.status === 'Expired' ? 'Hết hạn' : 'Lên lịch'}
        </Badge>
      )
    },
    {
      header: 'Hành động',
      accessor: (row) => (
        <div className="flex gap-1.5 justify-end">
          <Button variant="ghost" size="sm" onClick={() => handleSelectCode(row)} className="!p-1.5 text-primary">
            <Edit size={16} />
          </Button>
          <Button variant="ghost" size="sm" onClick={(e) => handleDeleteItem(row.id, 'giftcode', row.code, e)} className="!p-1.5 text-error">
            <Trash2 size={16} />
          </Button>
        </div>
      )
    }
  ];

  const referralColumns: Column<AdminReferralCampaign>[] = [
    {
      header: 'Chiến dịch',
      accessor: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-tertiary/5 text-tertiary flex items-center justify-center font-bold">
            <Users size={18} />
          </div>
          <div>
            <p className="font-bold text-on-surface text-sm">{row.name}</p>
            <p className="text-[10px] text-outline-variant font-medium">Bắt đầu: {row.startDate}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Thưởng giới thiệu',
      accessor: (row) => <span className="font-black text-tertiary">{row.rewardPerUser.toLocaleString('vi-VN')}đ/bạn mới</span>
    },
    {
      header: 'Số lượt tham gia',
      accessor: (row) => <span className="font-bold text-on-surface text-xs">{row.totalJoined.toLocaleString()} người dùng</span>
    },
    {
      header: 'Hạn cuối',
      accessor: 'endDate',
      className: 'text-xs text-on-surface-variant font-bold'
    },
    {
      header: 'Trạng thái',
      accessor: (row) => (
        <Badge variant={row.status === 'Active' ? 'success' : 'secondary'}>
          {row.status === 'Active' ? 'Đang chạy' : 'Đã kết thúc'}
        </Badge>
      )
    },
    {
      header: 'Hành động',
      accessor: (row) => (
        <div className="flex gap-1.5 justify-end">
          <Button variant="ghost" size="sm" onClick={() => handleSelectReferral(row)} className="!p-1.5 text-primary">
            <Edit size={16} />
          </Button>
          <Button variant="ghost" size="sm" onClick={(e) => handleDeleteItem(row.id, 'referral', row.name, e)} className="!p-1.5 text-error">
            <Trash2 size={16} />
          </Button>
        </div>
      )
    }
  ];

  const taskColumns: Column<RewardTask>[] = [
    {
      header: 'Nhiệm vụ',
      accessor: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
            <Award size={18} />
          </div>
          <div>
            <p className="font-bold text-on-surface text-sm">{row.title}</p>
            <p className="text-[10px] text-outline-variant font-medium uppercase tracking-wider">{row.type === 'daily' ? 'Hàng ngày' : 'Một lần'}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Phần thưởng Xu',
      accessor: (row) => <span className="font-black text-amber-600">+{row.reward.toLocaleString()} Xu</span>
    },
    {
      header: 'Loại',
      accessor: (row) => (
        <Badge variant={row.type === 'daily' ? 'info' : 'warning'}>
          {row.type === 'daily' ? 'Hàng ngày' : 'Mở tài khoản'}
        </Badge>
      )
    },
    {
      header: 'Hành động',
      accessor: (row) => (
        <div className="flex gap-1.5 justify-end">
          <Button variant="ghost" size="sm" onClick={() => handleSelectTask(row)} className="!p-1.5 text-primary">
            <Edit size={16} />
          </Button>
          <Button variant="ghost" size="sm" onClick={(e) => handleDeleteItem(row.id, 'task', row.title, e)} className="!p-1.5 text-error">
            <Trash2 size={16} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/20 pb-4">
        <div>
          <h1 className="font-headline-md text-xl font-bold text-primary">Khuyến mãi & Rewards Center</h1>
          <p className="text-xs text-on-surface-variant">Thiết lập giftcode tặng thưởng trực tiếp, phần thưởng nhiệm vụ và các chiến dịch giới thiệu.</p>
        </div>

        <Button
          variant="primary"
          onClick={handleCreateNewClick}
          icon={<Plus size={16} />}
          className="shadow-soft"
        >
          {activeTab === 'giftcode' ? 'Tạo Code quà tặng' : activeTab === 'referrals' ? 'Tạo Chiến dịch' : 'Tạo Nhiệm vụ'}
        </Button>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-outline-variant/30 text-sm font-bold">
        <button 
          onClick={() => { setActiveTab('giftcode'); setEditingItem(null); }}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 transition-colors cursor-pointer
            ${activeTab === 'giftcode' ? 'text-primary border-primary' : 'text-on-surface-variant hover:text-primary border-transparent'}
          `}
        >
          <Gift size={16} /> Giftcode quà tặng
        </button>
        <button 
          onClick={() => { setActiveTab('rewards'); setEditingItem(null); }}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 transition-colors cursor-pointer
            ${activeTab === 'rewards' ? 'text-primary border-primary' : 'text-on-surface-variant hover:text-primary border-transparent'}
          `}
        >
          <Award size={16} /> Nhiệm vụ & Xu thưởng
        </button>
        <button 
          onClick={() => { setActiveTab('referrals'); setEditingItem(null); }}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 transition-colors cursor-pointer
            ${activeTab === 'referrals' ? 'text-primary border-primary' : 'text-on-surface-variant hover:text-primary border-transparent'}
          `}
        >
          <Users size={16} /> Chiến dịch Referral
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* Left Table Section */}
        <div className="xl:col-span-8 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex items-center bg-white px-3 py-2 border border-outline-variant/30 focus-within:border-primary rounded-xl w-full max-w-sm">
              <Search className="text-on-surface-variant mr-2" size={16} />
              <input 
                type="text" 
                placeholder="Tìm kiếm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none focus:ring-0 text-xs w-full outline-none placeholder:text-on-surface-variant/40"
              />
            </div>
            <span className="text-[10px] uppercase font-bold text-on-surface-variant">
              Tổng số bản ghi: {
                activeTab === 'giftcode' ? filteredPromoCodes.length :
                activeTab === 'referrals' ? filteredReferrals.length : filteredTasks.length
              }
            </span>
          </div>

          <div className="bg-white rounded-3xl border border-outline-variant/30 shadow-soft overflow-hidden">
            {activeTab === 'giftcode' && (
              <Table
                data={filteredPromoCodes}
                columns={giftcodeColumns}
                onRowClick={(row) => handleSelectCode(row)}
                emptyMessage="Không tìm thấy Giftcode nào."
              />
            )}
            {activeTab === 'referrals' && (
              <Table
                data={filteredReferrals}
                columns={referralColumns}
                onRowClick={(row) => handleSelectReferral(row)}
                emptyMessage="Không tìm thấy chiến dịch nào."
              />
            )}
            {activeTab === 'rewards' && (
              <Table
                data={filteredTasks}
                columns={taskColumns}
                onRowClick={(row) => handleSelectTask(row)}
                emptyMessage="Không tìm thấy nhiệm vụ nào."
              />
            )}
          </div>
        </div>

        {/* Right Editor Side Panel */}
        <div className="xl:col-span-4 bg-white rounded-3xl border border-outline-variant/30 shadow-soft overflow-hidden">
          <div className="p-5 border-b border-outline-variant/20 bg-surface-container-low/40">
            <h3 className="font-title-lg text-sm font-bold flex items-center gap-1.5">
              <Sparkles size={18} className="text-primary" /> Thiết lập chiến dịch
            </h3>
            <p className="text-[10px] text-on-surface-variant/80 font-bold uppercase tracking-wider mt-1">
              {editingItem ? 'Chi tiết tham số chiến dịch' : 'Chọn một mục để chỉnh sửa'}
            </p>
          </div>

          {editingItem ? (
            <form onSubmit={handleSaveItem} className="p-5 space-y-5">
              
              {editingItem.itemFormType === 'giftcode' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Mã Code quà tặng</label>
                    <input 
                      type="text" 
                      value={editingItem.code || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, code: e.target.value })}
                      placeholder="VD: HOANTIENVIP50K"
                      className="w-full px-4 py-3 bg-surface-container-low/40 border border-outline-variant/40 rounded-xl text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Mô tả ngắn</label>
                    <input 
                      type="text" 
                      value={editingItem.description || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                      placeholder="VD: Tặng quà xuân 2026"
                      className="w-full px-4 py-3 bg-surface-container-low/40 border border-outline-variant/40 rounded-xl text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Loại quà tặng</label>
                      <select 
                        value={editingItem.rewardType || 'flat'}
                        onChange={(e) => setEditingItem({ ...editingItem, rewardType: e.target.value })}
                        className="w-full px-3 py-3 bg-surface-container-low/40 border border-outline-variant/40 rounded-xl text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary font-semibold"
                      >
                        <option value="flat">Tiền mặt cộng số dư</option>
                        <option value="points">Xu thưởng tích lũy</option>
                        <option value="cashback">Tăng tỷ lệ hoàn đơn (%)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Trị giá</label>
                      <input 
                        type="number" 
                        value={editingItem.value || 0}
                        onChange={(e) => setEditingItem({ ...editingItem, value: e.target.value })}
                        className="w-full px-4 py-3 bg-surface-container-low/40 border border-outline-variant/40 rounded-xl text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary font-bold text-primary"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Giới hạn lượt dùng</label>
                      <input 
                        type="number" 
                        value={editingItem.limitCount || 0}
                        onChange={(e) => setEditingItem({ ...editingItem, limitCount: e.target.value })}
                        className="w-full px-4 py-3 bg-surface-container-low/40 border border-outline-variant/40 rounded-xl text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Trạng thái</label>
                      <select 
                        value={editingItem.status || 'Active'}
                        onChange={(e) => setEditingItem({ ...editingItem, status: e.target.value })}
                        className="w-full px-3 py-3 bg-surface-container-low/40 border border-outline-variant/40 rounded-xl text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary font-semibold"
                      >
                        <option value="Active">Active (Mở dùng)</option>
                        <option value="Scheduled">Scheduled (Lên lịch)</option>
                        <option value="Expired">Expired (Hết hạn)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Từ ngày</label>
                      <input 
                        type="date" 
                        value={editingItem.startDate || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, startDate: e.target.value })}
                        className="w-full px-3 py-2.5 bg-surface-container-low/40 border border-outline-variant/40 rounded-xl text-xs outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Đến ngày</label>
                      <input 
                        type="date" 
                        value={editingItem.endDate || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, endDate: e.target.value })}
                        className="w-full px-3 py-2.5 bg-surface-container-low/40 border border-outline-variant/40 rounded-xl text-xs outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                </div>
              )}

              {editingItem.itemFormType === 'referral' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Tên chiến dịch</label>
                    <input 
                      type="text" 
                      value={editingItem.name || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                      placeholder="VD: Đồng hành giới thiệu bạn mới"
                      className="w-full px-4 py-3 bg-surface-container-low/40 border border-outline-variant/40 rounded-xl text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Thưởng (đ/lượt)</label>
                      <input 
                        type="number" 
                        value={editingItem.rewardPerUser || 0}
                        onChange={(e) => setEditingItem({ ...editingItem, rewardPerUser: e.target.value })}
                        className="w-full px-4 py-3 bg-surface-container-low/40 border border-outline-variant/40 rounded-xl text-xs outline-none focus:border-primary font-bold text-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Trạng thái</label>
                      <select 
                        value={editingItem.status || 'Active'}
                        onChange={(e) => setEditingItem({ ...editingItem, status: e.target.value })}
                        className="w-full px-3 py-3 bg-surface-container-low/40 border border-outline-variant/40 rounded-xl text-xs outline-none focus:border-primary font-semibold"
                      >
                        <option value="Active">Đang chạy (Active)</option>
                        <option value="Completed">Kết thúc (Completed)</option>
                        <option value="Draft">Bản nháp (Draft)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Ngày chạy</label>
                      <input 
                        type="date" 
                        value={editingItem.startDate || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, startDate: e.target.value })}
                        className="w-full px-3 py-2.5 bg-surface-container-low/40 border border-outline-variant/40 rounded-xl text-xs outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Hạn cuối</label>
                      <input 
                        type="date" 
                        value={editingItem.endDate || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, endDate: e.target.value })}
                        className="w-full px-3 py-2.5 bg-surface-container-low/40 border border-outline-variant/40 rounded-xl text-xs outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                </div>
              )}

              {editingItem.itemFormType === 'task' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Nhiệm vụ</label>
                    <input 
                      type="text" 
                      value={editingItem.title || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                      placeholder="VD: Xem 3 deals hot trong ngày"
                      className="w-full px-4 py-3 bg-surface-container-low/40 border border-outline-variant/40 rounded-xl text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Phần thưởng (Xu)</label>
                      <input 
                        type="number" 
                        value={editingItem.reward || 0}
                        onChange={(e) => setEditingItem({ ...editingItem, reward: e.target.value })}
                        className="w-full px-4 py-3 bg-surface-container-low/40 border border-outline-variant/40 rounded-xl text-xs outline-none focus:border-primary font-bold text-amber-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Chu kỳ nhiệm vụ</label>
                      <select 
                        value={editingItem.taskType || 'daily'}
                        onChange={(e) => setEditingItem({ ...editingItem, taskType: e.target.value })}
                        className="w-full px-3 py-3 bg-surface-container-low/40 border border-outline-variant/40 rounded-xl text-xs outline-none focus:border-primary font-semibold"
                      >
                        <option value="daily">Hàng ngày (Daily)</option>
                        <option value="once">Một lần duy nhất (Once)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-3 border-t border-outline-variant/20">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 py-3 hover:bg-surface-container"
                >
                  Bỏ qua
                </Button>
                <Button 
                  type="submit"
                  variant="primary"
                  className="flex-1 py-3 font-bold shadow-soft"
                  icon={<Save size={14} />}
                >
                  Lưu thiết lập
                </Button>
              </div>

            </form>
          ) : (
            <div className="p-8 text-center flex-1 flex flex-col items-center justify-center text-on-surface-variant/60 min-h-[300px]">
              <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center mb-4 text-on-surface-variant">
                <Info size={24} />
              </div>
              <p className="text-xs font-bold">Chưa chọn chiến dịch</p>
              <p className="text-[10px] max-w-[200px] mt-1 leading-normal">
                Hãy click vào một hàng trong bảng hoặc bấm "Tạo mới" ở đầu trang để hiển thị trình cấu hình.
              </p>
            </div>
          )}
        </div>

      </div>

      <ToastContainer toast={toast} setToast={setToast} />
    </div>
  );
};
