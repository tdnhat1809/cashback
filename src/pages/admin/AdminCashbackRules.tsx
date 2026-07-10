import React, { useState } from 'react';
import { mockCashbackRules } from '../../mockData';
import type { CashbackRule } from '../../mockData';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Table } from '../../components/Table';
import type { Column } from '../../components/Table';
import { ToastContainer } from '../../components/Toast';
import { defaultToastState, triggerToast } from '../../components/toast-state';
import type { ToastState } from '../../components/toast-state';
import { Search, Plus, Edit, Calculator, Trash2, FileText, Globe } from 'lucide-react';

export const AdminCashbackRules: React.FC = () => {
  const [rules, setRules] = useState<CashbackRule[]>(mockCashbackRules);
  const [selectedPlatform, setSelectedPlatform] = useState<'Shopee' | 'TikTok Shop'>('Shopee');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Editor State
  const [editingRule, setEditingRule] = useState<Partial<CashbackRule> | null>(null);
  const [toast, setToast] = useState<ToastState>(defaultToastState);

  // Filter rules by platform and search term
  const filteredRules = rules.filter(rule => 
    rule.platform === selectedPlatform &&
    rule.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handlers
  const handleSelectRule = (rule: CashbackRule) => {
    setEditingRule({ ...rule });
  };

  const handleCreateRuleClick = () => {
    setEditingRule({
      id: '',
      category: 'Electronics & Gadgets',
      platform: selectedPlatform,
      type: 'Mall',
      sourceCommission: 5.0,
      pitTax: 10,
      userCashback: 4.5,
      approvalDays: 30,
      effectiveDate: new Date().toISOString().substring(0, 10),
      status: 'Active',
      notes: ''
    });
  };

  const handleInputChange = (field: keyof CashbackRule, val: any) => {
    if (!editingRule) return;

    const updated = { ...editingRule, [field]: val };
    
    // Automatically calculate User Cashback based on commission & tax
    if (field === 'sourceCommission' || field === 'pitTax') {
      const comm = parseFloat(field === 'sourceCommission' ? val : updated.sourceCommission || 0);
      const tax = parseFloat(field === 'pitTax' ? val : updated.pitTax || 0);
      updated.userCashback = parseFloat((comm * (1 - tax / 100)).toFixed(2));
    }

    setEditingRule(updated);
  };

  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule || !editingRule.category) {
      triggerToast(setToast, 'Vui lòng nhập tên danh mục.', 'error');
      return;
    }

    const isNew = !editingRule.id;
    const ruleToSave: CashbackRule = {
      id: isNew ? `rule_${Date.now()}` : editingRule.id!,
      category: editingRule.category!,
      platform: editingRule.platform || selectedPlatform,
      type: editingRule.type || 'Mall',
      sourceCommission: parseFloat(editingRule.sourceCommission as any) || 0,
      pitTax: parseFloat(editingRule.pitTax as any) || 0,
      userCashback: parseFloat(editingRule.userCashback as any) || 0,
      approvalDays: parseInt(editingRule.approvalDays as any) || 30,
      effectiveDate: editingRule.effectiveDate || new Date().toISOString().substring(0, 10),
      status: editingRule.status || 'Active',
      notes: editingRule.notes || ''
    };

    if (isNew) {
      setRules(prev => [...prev, ruleToSave]);
      triggerToast(setToast, `Đã tạo thành công quy tắc cho danh mục ${ruleToSave.category}!`, 'success');
    } else {
      setRules(prev => prev.map(r => r.id === ruleToSave.id ? ruleToSave : r));
      triggerToast(setToast, `Đã cập nhật quy tắc cho danh mục ${ruleToSave.category}!`, 'success');
    }

    setEditingRule(null);
  };

  const handleDeleteRule = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid selecting row when clicking delete
    if (window.confirm('Bạn có chắc chắn muốn xóa quy tắc commission này?')) {
      setRules(prev => prev.filter(r => r.id !== id));
      triggerToast(setToast, 'Đã xóa quy tắc commission thành công.', 'warning');
      if (editingRule && editingRule.id === id) {
        setEditingRule(null);
      }
    }
  };

  // Formula Calculations
  const calculatedCommission = parseFloat(editingRule?.sourceCommission as any) || 0;
  const calculatedTax = parseFloat(editingRule?.pitTax as any) || 0;
  const calculatedUserNet = parseFloat((calculatedCommission * (1 - calculatedTax / 100)).toFixed(2));

  const columns: Column<CashbackRule>[] = [
    {
      header: 'Danh mục',
      accessor: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center font-bold">
            <Globe size={18} />
          </div>
          <div>
            <p className="font-bold text-on-surface text-sm">{row.category}</p>
            <p className="text-[10px] text-on-surface-variant/80 uppercase font-black tracking-wider">{row.type}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Hoa hồng gốc',
      accessor: (row) => <span className="font-bold text-on-surface text-sm">{row.sourceCommission}%</span>
    },
    {
      header: 'Thuế (PIT)',
      accessor: (row) => <span className="text-on-surface-variant font-semibold text-xs">{row.pitTax}%</span>
    },
    {
      header: 'Khách nhận (User)',
      accessor: (row) => (
        <span className="bg-tertiary-container/10 text-tertiary px-3 py-1.5 rounded-full font-black text-xs border border-tertiary/10">
          {row.userCashback}%
        </span>
      )
    },
    {
      header: 'Đối soát',
      accessor: (row) => <span className="text-on-surface-variant text-xs font-semibold">{row.approvalDays} ngày</span>
    },
    {
      header: 'Ngày hiệu lực',
      accessor: 'effectiveDate',
      className: 'text-xs text-on-surface-variant/80 font-bold'
    },
    {
      header: 'Trạng thái',
      accessor: (row) => (
        <Badge variant={row.status === 'Active' ? 'success' : 'secondary'}>
          {row.status === 'Active' ? 'Hoạt động' : 'Hết hạn'}
        </Badge>
      )
    },
    {
      header: 'Hành động',
      accessor: (row) => (
        <div className="flex gap-1.5 justify-end">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleSelectRule(row)}
            className="!p-1.5 hover:bg-primary/5 text-primary"
            aria-label="Sửa quy tắc"
          >
            <Edit size={16} />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={(e) => handleDeleteRule(row.id, e)}
            className="!p-1.5 hover:bg-error-container/20 text-error"
            aria-label="Xóa quy tắc"
          >
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
          <h1 className="font-headline-md text-xl font-bold text-primary">Cấu hình hoa hồng & Cashback</h1>
          <p className="text-xs text-on-surface-variant">Quản lý tỷ lệ ăn chia, thuế TNCN và thời gian đối soát cho từng ngành hàng.</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Platform Toggle */}
          <div className="flex bg-surface-container-low p-1 rounded-xl border border-outline-variant/30 text-xs font-bold">
            <button 
              onClick={() => setSelectedPlatform('Shopee')}
              className={`px-4 py-2 rounded-lg transition-all cursor-pointer
                ${selectedPlatform === 'Shopee' ? 'bg-primary text-white shadow-soft' : 'text-on-surface-variant'}
              `}
            >
              Shopee
            </button>
            <button 
              onClick={() => setSelectedPlatform('TikTok Shop')}
              className={`px-4 py-2 rounded-lg transition-all cursor-pointer
                ${selectedPlatform === 'TikTok Shop' ? 'bg-primary text-white shadow-soft' : 'text-on-surface-variant'}
              `}
            >
              TikTok Shop
            </button>
          </div>

          <Button
            variant="primary"
            onClick={handleCreateRuleClick}
            icon={<Plus size={16} />}
            className="shadow-soft"
          >
            Tạo Rule mới
          </Button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Table Rules */}
        <div className="xl:col-span-8 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex items-center bg-white rounded-xl border border-outline-variant/30 focus-within:border-primary px-3 py-2 w-full max-w-sm">
              <Search className="text-on-surface-variant mr-2" size={16} />
              <input 
                type="text" 
                placeholder="Tìm kiếm ngành hàng..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none focus:ring-0 text-xs w-full outline-none placeholder:text-on-surface-variant/40"
              />
            </div>
            <span className="text-[10px] uppercase font-bold text-on-surface-variant">
              Tìm thấy: {filteredRules.length} Quy tắc
            </span>
          </div>

          <div className="bg-white rounded-3xl border border-outline-variant/30 shadow-soft overflow-hidden">
            <Table
              data={filteredRules}
              columns={columns}
              onRowClick={(row) => handleSelectRule(row)}
              emptyMessage="Không tìm thấy quy tắc commission nào."
            />
          </div>
        </div>

        {/* Right Side: Editor Panel */}
        <div className="xl:col-span-4 bg-white rounded-3xl border border-outline-variant/30 shadow-soft overflow-hidden flex flex-col">
          <div className="p-5 border-b border-outline-variant/20 bg-surface-container-low/40">
            <h3 className="font-title-lg text-sm font-bold flex items-center gap-1.5">
              <Calculator size={18} className="text-primary" /> Trình Soạn Thảo Quy Tắc
            </h3>
            <p className="text-[10px] text-on-surface-variant/80 font-bold uppercase tracking-wider mt-1">
              {editingRule ? (editingRule.id ? 'Chỉnh sửa quy tắc' : 'Tạo mới quy tắc') : 'Chọn quy tắc để bắt đầu chỉnh sửa'}
            </p>
          </div>

          {editingRule ? (
            <form onSubmit={handleSaveRule} className="p-5 space-y-5 flex-1">
              <div className="space-y-4">
                {/* Category name */}
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">
                    Tên Ngành Hàng
                  </label>
                  <input 
                    type="text" 
                    value={editingRule.category || ''}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    placeholder="VD: Điện tử, Thời trang..."
                    className="w-full px-4 py-3 bg-surface-container-low/40 border border-outline-variant/40 rounded-xl text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Category Type */}
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">
                      Phân loại sàn
                    </label>
                    <select 
                      value={editingRule.type || 'Mall'}
                      onChange={(e) => handleInputChange('type', e.target.value)}
                      className="w-full px-3 py-3 bg-surface-container-low/40 border border-outline-variant/40 rounded-xl text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary font-semibold"
                    >
                      <option value="Mall">Mall (Chính hãng)</option>
                      <option value="Marketplace">Chợ thường (Marketplace)</option>
                      <option value="International">Quốc tế (Crossborder)</option>
                      <option value="Supermarket">Siêu thị (Supermarket)</option>
                    </select>
                  </div>

                  {/* Effective Date */}
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">
                      Ngày hiệu lực
                    </label>
                    <input 
                      type="date" 
                      value={editingRule.effectiveDate || ''}
                      onChange={(e) => handleInputChange('effectiveDate', e.target.value)}
                      className="w-full px-3 py-2.5 bg-surface-container-low/40 border border-outline-variant/40 rounded-xl text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Source Commission */}
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">
                      Hoa hồng gốc (%)
                    </label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={editingRule.sourceCommission || 0}
                      onChange={(e) => handleInputChange('sourceCommission', e.target.value)}
                      className="w-full px-4 py-3 bg-surface-container-low/40 border border-outline-variant/40 rounded-xl text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary font-bold text-primary"
                    />
                  </div>

                  {/* Tax */}
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">
                      Thuế TNCN PIT (%)
                    </label>
                    <input 
                      type="number" 
                      value={editingRule.pitTax || 0}
                      onChange={(e) => handleInputChange('pitTax', e.target.value)}
                      className="w-full px-4 py-3 bg-surface-container-low/40 border border-outline-variant/40 rounded-xl text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary font-bold text-on-surface-variant"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Approval Days */}
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">
                      Đối soát (Ngày)
                    </label>
                    <input 
                      type="number" 
                      value={editingRule.approvalDays || 30}
                      onChange={(e) => handleInputChange('approvalDays', e.target.value)}
                      className="w-full px-4 py-3 bg-surface-container-low/40 border border-outline-variant/40 rounded-xl text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary font-semibold"
                    />
                  </div>

                  {/* Active Status checkbox */}
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">
                      Trạng thái hoạt động
                    </label>
                    <label className="flex items-center gap-2 mt-3 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={editingRule.status === 'Active'}
                        onChange={(e) => handleInputChange('status', e.target.checked ? 'Active' : 'Expired')}
                        className="w-4.5 h-4.5 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-on-surface">Rule hoạt động</span>
                    </label>
                  </div>
                </div>

                {/* Cashback Formula Preview */}
                <div className="bg-primary/5 rounded-2xl border border-primary/20 p-4 space-y-2">
                  <span className="text-[10px] font-black uppercase text-primary tracking-wider block mb-1">
                    Công thức tính chiết khấu
                  </span>
                  <div className="space-y-1.5 text-xs font-semibold">
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Hoa hồng sàn chi trả</span>
                      <span className="font-bold">{calculatedCommission.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Khấu trừ Thuế PIT ({calculatedTax}%)</span>
                      <span className="text-error font-bold">-{(calculatedCommission * calculatedTax / 100).toFixed(2)}%</span>
                    </div>
                    <div className="h-px bg-outline-variant/30 my-1" />
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-on-surface font-bold">Khách hàng nhận thực tế</span>
                      <span className="text-tertiary font-black">{calculatedUserNet.toFixed(2)}%</span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                    Ghi chú hệ thống
                  </label>
                  <textarea 
                    value={editingRule.notes || ''}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Ghi lý do hoặc ghi chú cho rule commission này..."
                    rows={3}
                    className="w-full px-4 py-3 bg-surface-container-low/40 border border-outline-variant/40 rounded-xl text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary font-semibold"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-3 border-t border-outline-variant/20">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => setEditingRule(null)}
                  className="flex-1 py-3 hover:bg-surface-container"
                >
                  Bỏ qua
                </Button>
                <Button 
                  type="submit"
                  variant="primary"
                  className="flex-1 py-3 font-bold shadow-soft"
                >
                  Lưu Rule
                </Button>
              </div>
            </form>
          ) : (
            <div className="p-8 text-center flex-1 flex flex-col items-center justify-center text-on-surface-variant/60 min-h-[300px]">
              <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center mb-4">
                <FileText size={24} />
              </div>
              <p className="text-xs font-bold">Chưa chọn quy tắc</p>
              <p className="text-[10px] max-w-[200px] mt-1 leading-normal">
                Hãy click vào một hàng trong bảng hoặc bấm "Tạo Rule mới" để hiển thị trình chỉnh sửa.
              </p>
            </div>
          )}
        </div>

      </div>

      <ToastContainer toast={toast} setToast={setToast} />
    </div>
  );
};
