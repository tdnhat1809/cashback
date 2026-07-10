import React from 'react';
import { mockAdminStats } from '../../mockData';
import { Badge } from '../../components/Badge';
import { Table } from '../../components/Table';
import type { Column } from '../../components/Table';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Activity, ServerCrash } from 'lucide-react';

interface CarrierHealthItem {
  carrier: string;
  status: string;
  latency: string;
  successRate: string;
}

interface SyncErrorItem {
  id: string;
  time: string;
  type: string;
  detail: string;
}

export const AdminOverview: React.FC = () => {
  const stats = mockAdminStats;

  const chartData = [
    { name: 'Tuần 1', 'Hoa hồng nguồn': 25000000, 'Cashback User': 18000000 },
    { name: 'Tuần 2', 'Hoa hồng nguồn': 45000000, 'Cashback User': 35000000 },
    { name: 'Tuần 3', 'Hoa hồng nguồn': 65000000, 'Cashback User': 52000000 },
    { name: 'Tuần 4', 'Hoa hồng nguồn': 95000000, 'Cashback User': 80000000 },
  ];

  const getHealthStatusBadge = (status: string) => {
    const statuses = {
      Healthy: <Badge variant="success">Hoạt động</Badge>,
      Degraded: <Badge variant="warning">Chậm phản hồi</Badge>,
      Maintenance: <Badge variant="danger">Bảo trì</Badge>
    };
    return statuses[status as keyof typeof statuses] || <Badge variant="secondary">Ngoại tuyến</Badge>;
  };

  const carrierColumns: Column<CarrierHealthItem>[] = [
    {
      header: 'Hãng vận chuyển',
      accessor: (row: any) => (
        <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border">
          {row.carrier}
        </span>
      )
    },
    {
      header: 'Trạng thái API',
      accessor: (row: any) => getHealthStatusBadge(row.status)
    },
    {
      header: 'Độ trễ phản hồi',
      accessor: 'latency',
      className: 'text-xs text-slate-600 font-medium'
    },
    {
      header: 'Tỷ lệ đồng bộ thành công',
      accessor: 'successRate',
      className: 'text-xs font-bold text-slate-800'
    }
  ];

  const errorColumns: Column<SyncErrorItem>[] = [
    {
      header: 'Thời gian',
      accessor: 'time',
      className: 'text-xs text-slate-600 font-medium'
    },
    {
      header: 'Phân loại lỗi',
      accessor: (row: any) => (
        <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
          {row.type}
        </span>
      )
    },
    {
      header: 'Chi tiết lỗi log',
      accessor: 'detail',
      className: 'text-xs text-slate-600 text-left font-semibold'
    }
  ];

  return (
    <div className="space-y-8 text-left">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Thống kê chỉ số hệ thống</h1>
        <p className="text-xs text-slate-500">Giám sát doanh thu GMV, đối soát hoa hồng nguồn và tình trạng đồng bộ vận đơn.</p>
      </div>

      {/* Admin stats widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col relative overflow-hidden">
          <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Tổng doanh thu GMV sàn</span>
          <span className="text-2xl font-black text-slate-900 tracking-tight">
            {stats.totalGMV.toLocaleString('vi-VN')}đ
          </span>
          <span className="text-[10px] text-slate-400 mt-2 block">Dòng tiền mua sắm qua link.</span>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col relative overflow-hidden">
          <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Hoa hồng nguồn (Đối tác trả)</span>
          <span className="text-2xl font-black text-emerald-600 tracking-tight">
            {stats.sourceCommission.toLocaleString('vi-VN')}đ
          </span>
          <span className="text-[10px] text-slate-400 mt-2 block">Doanh thu trước chia sẻ user.</span>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col relative overflow-hidden">
          <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Cashback chờ duyệt (User)</span>
          <span className="text-2xl font-black text-amber-600 tracking-tight">
            {stats.userCashbackPending.toLocaleString('vi-VN')}đ
          </span>
          <span className="text-[10px] text-slate-400 mt-2 block">Cam kết tích lũy đối soát.</span>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col relative overflow-hidden">
          <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Tổng yêu cầu rút đang chờ</span>
          <span className="text-2xl font-black text-rose-600 tracking-tight">
            {stats.withdrawalRequestsPendingCount} yêu cầu
          </span>
          <span className="text-[10px] text-slate-400 mt-2 block">Cần duyệt chuyển khoản thủ công.</span>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
        <h3 className="text-sm font-bold text-slate-800 mb-6">Biểu đồ so sánh hoa hồng nguồn vs cashback phân phối</h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} style={{ fontFamily: 'Be Vietnam Pro, sans-serif' }} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} width={50} tickFormatter={(value) => value === 0 ? '0' : `${value / 1000000}tr`} style={{ fontFamily: 'Be Vietnam Pro, sans-serif' }} />
              <Tooltip formatter={(value) => `${Number(value).toLocaleString('vi-VN')}đ`} contentStyle={{ fontFamily: 'Be Vietnam Pro, sans-serif' }} />
              <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'Be Vietnam Pro, sans-serif' }} />
              <Bar dataKey="Hoa hồng nguồn" fill="#0284c7" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Cashback User" fill="#059669" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Carrier health & Sync Errors log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Carrier Health list */}
        <div className="lg:col-span-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <Activity size={18} className="text-emerald-500" /> Cấu hình API Carrier Health (14 Hãng)
          </h3>
          <Table
            data={stats.carrierHealth.map((item, idx) => ({ ...item, id: idx }))}
            columns={carrierColumns}
          />
        </div>

        {/* Sync Errors Log */}
        <div className="lg:col-span-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <ServerCrash size={18} className="text-rose-500" /> Nhật ký lỗi đồng bộ gần đây
          </h3>
          <Table
            data={stats.recentSyncErrors}
            columns={errorColumns}
          />
        </div>
      </div>
    </div>
  );
};
