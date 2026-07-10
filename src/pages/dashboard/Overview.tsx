import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  CircleHelp,
  Clock3,
  Gift,
  PiggyBank,
  RefreshCw,
  Share2,
  ShoppingBag,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '../../components/Button';
import type { CashbackOrder } from '../../mockData';
import { dashboardApi, type WalletBalances } from '../../services/apiClient';
import { useAuth } from '../../state/auth-context';

const formatCurrency = (value: number) => `${value.toLocaleString('vi-VN')}đ`;

const formatDate = (value: string) => {
  const [date] = value.split(' ');
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
};

const statusStyles = {
  Paid: {
    label: 'Đã thanh toán',
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
  },
  Confirmed: {
    label: 'Đã xác nhận',
    className: 'bg-green-50 text-green-700 ring-green-600/10',
  },
  Pending: {
    label: 'Chờ duyệt',
    className: 'bg-amber-50 text-amber-700 ring-amber-600/10',
  },
  Rejected: {
    label: 'Từ chối',
    className: 'bg-red-50 text-red-600 ring-red-600/10',
  },
} as const;

export const Overview: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletBalances>({ pending: 0, available: 0, reserved: 0, withdrawn: 0 });
  const [cashbackOrders, setCashbackOrders] = useState<CashbackOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const reload = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const result = await dashboardApi.get();
      setWallet(result.wallet);
      setCashbackOrders(result.recentOrders.map((order) => ({
        id: order.id,
        orderId: order.external_order_id,
        platform: order.platform === 'shopee' ? 'Shopee' : 'TikTok Shop',
        shopName: order.platform === 'shopee' ? 'Shopee' : 'TikTok Shop',
        productName: `Đơn hàng ${order.external_order_id}`,
        productImg: '',
        orderValue: order.order_value_vnd,
        cashbackEstimate: order.cashback_estimate_vnd,
        cashbackActual: order.cashback_actual_vnd,
        status: ({ pending: 'Pending', confirmed: 'Confirmed', rejected: 'Rejected', paid: 'Paid' } as const)[order.cashback_status],
        date: order.completed_at ?? order.created_at,
      })));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Không thể tải số liệu ví.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const chartData = useMemo(() => {
    let running = 0;
    return [...cashbackOrders].reverse().map((order) => {
      running += order.cashbackActual;
      return { name: new Date(order.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }), cashback: running };
    });
  }, [cashbackOrders]);
  const successfulOrders = cashbackOrders.filter(
    (order) => order.status === 'Paid' || order.status === 'Confirmed',
  ).length;

  const summaryCards = [
    {
      label: 'Số dư khả dụng',
      value: formatCurrency(wallet.available),
      helper: 'Sẵn sàng để rút',
      icon: Wallet,
      iconClass: 'bg-[#fbe9e5] text-primary',
      badge: 'Sẵn sàng',
      badgeClass: 'bg-emerald-50 text-emerald-700',
      action: true,
    },
    {
      label: 'Đang chờ duyệt',
      value: formatCurrency(wallet.pending),
      helper: 'Cập nhật tự động sau đối soát',
      icon: Clock3,
      iconClass: 'bg-amber-100 text-amber-600',
      badge: 'Đang xử lý',
      badgeClass: 'bg-orange-50 text-orange-600',
    },
    {
      label: 'Tổng đã nhận',
      value: formatCurrency(wallet.available + wallet.reserved + wallet.withdrawn),
      helper: 'Số dư đã được xác nhận',
      icon: TrendingUp,
      iconClass: 'bg-emerald-100 text-emerald-700',
      helperClass: 'text-emerald-700 font-semibold',
    },
    {
      label: 'Đơn thành công',
      value: `${successfulOrders} đơn`,
      helper: `${formatCurrency(wallet.withdrawn)} đã rút thành công`,
      icon: ShoppingBag,
      iconClass: 'bg-indigo-50 text-indigo-600',
    },
  ];

  const shortcuts = [
    {
      label: 'Giftcode',
      icon: Gift,
      iconClass: 'text-primary',
      path: '/dashboard/giftcode',
    },
    {
      label: 'Tiếp thị',
      icon: Share2,
      iconClass: 'text-emerald-700',
      path: '/dashboard/referral',
    },
    {
      label: 'Xu thưởng',
      icon: Award,
      iconClass: 'text-orange-600',
      path: '/dashboard/rewards',
    },
    {
      label: 'Hỗ trợ',
      icon: CircleHelp,
      iconClass: 'text-indigo-700',
      path: '/faq',
    },
  ];

  return (
    <div className="space-y-6 text-left">
      <section className="relative isolate overflow-hidden rounded-[24px] bg-primary px-5 py-7 text-white shadow-[0_16px_36px_-22px_rgba(181,38,3,0.7)] sm:px-8 sm:py-9">
        <div className="relative z-10 max-w-2xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
            Tổng quan tài khoản
          </p>
          <h1 className="text-2xl font-extrabold leading-tight tracking-[-0.02em] sm:text-[30px]">
            Chào mừng trở lại, {user?.name ?? 'bạn'}!
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/90 sm:text-base">
            Bạn có <strong className="font-bold underline underline-offset-4">{cashbackOrders.filter((order) => order.status === 'Pending').length} đơn hàng</strong> đang chờ duyệt.
            Đừng bỏ lỡ cashback của mình nhé!
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button
              variant="outline"
              className="!border-white !bg-white !text-primary hover:!bg-white/90"
              onClick={() => navigate('/dashboard/cashback')}
            >
              Kiểm tra ngay
            </Button>
            <Button
              className="!border !border-white/30 !bg-primary-container hover:!brightness-110"
              onClick={() => navigate('/link-generator')}
            >
              Xem hướng dẫn
            </Button>
          </div>
        </div>
        <PiggyBank
          aria-hidden="true"
          className="absolute -right-4 top-1/2 hidden h-40 w-40 -translate-y-1/2 text-white/15 sm:block lg:right-10"
          strokeWidth={1.4}
        />
        <div className="absolute -bottom-20 -left-12 h-52 w-52 rounded-full bg-white/5 blur-2xl" />
      </section>

      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-on-surface">Ví hoàn tiền của bạn</h2>
          <p className="mt-1 text-xs text-on-surface-variant">Số liệu được cập nhật sau mỗi lần đối soát.</p>
        </div>
        <button
          type="button"
          className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-outline-variant/40 bg-white text-on-surface-variant transition hover:border-primary/30 hover:text-primary"
          aria-label="Làm mới dữ liệu"
          onClick={() => void reload()}
          disabled={isLoading}
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loadError && <p className="rounded-xl border border-error/20 bg-error-container/20 p-3 text-sm text-error" role="alert">{loadError}</p>}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <article
              key={card.label}
              className="flex min-h-[185px] flex-col rounded-[20px] border border-outline-variant/35 bg-white p-5 shadow-[0_8px_24px_-20px_rgba(39,24,20,0.45)]"
            >
              <div className="flex items-center justify-between gap-3">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.iconClass}`}>
                  <Icon size={20} strokeWidth={2} />
                </span>
                {card.badge ? (
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${card.badgeClass}`}>
                    {card.badge}
                  </span>
                ) : null}
              </div>
              <p className="mt-4 text-sm text-on-surface-variant">{card.label}</p>
              <p className="mt-1 text-[23px] font-extrabold leading-tight tracking-[-0.03em] text-on-surface">
                {card.value}
              </p>
              {card.action ? (
                <button
                  type="button"
                  onClick={() => navigate('/dashboard/withdrawal')}
                  className="mt-auto inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary-container px-3 py-2 text-xs font-bold text-white transition hover:brightness-105"
                >
                  Rút tiền <ArrowRight size={14} />
                </button>
              ) : (
                <p className={`mt-auto pt-4 text-[10px] ${card.helperClass ?? 'text-on-surface-variant/75'}`}>
                  {card.helper}
                </p>
              )}
            </article>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(280px,0.95fr)]">
        <article className="rounded-[20px] border border-outline-variant/35 bg-white p-5 shadow-[0_8px_24px_-20px_rgba(39,24,20,0.45)] sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-on-surface">Biến động Cashback</h2>
              <p className="mt-1 text-xs text-on-surface-variant">Tổng cashback tích lũy theo thời gian</p>
            </div>
            <span className="w-fit rounded-lg bg-surface-container-low px-3 py-2 text-[11px] font-semibold text-on-surface-variant">
              30 ngày qua
            </span>
          </div>
          <div className="mt-5 h-[260px] w-full sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="cashbackOrangeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff5a36" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#ff5a36" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#f2ded9" strokeDasharray="4 4" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#8f7069', fontSize: 10 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#8f7069', fontSize: 10 }}
                  tickFormatter={(value) => `${value / 1000}k`}
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value)), 'Cashback']}
                  contentStyle={{
                    border: '1px solid #f0d2cb',
                    borderRadius: 12,
                    boxShadow: '0 12px 32px rgba(39, 24, 20, 0.1)',
                    fontFamily: 'Be Vietnam Pro, sans-serif',
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="cashback"
                  stroke="#ff4b2b"
                  strokeWidth={3}
                  fill="url(#cashbackOrangeGradient)"
                  dot={{ r: 3.5, fill: '#ff4b2b', stroke: '#ffffff', strokeWidth: 2 }}
                  activeDot={{ r: 5, fill: '#ff4b2b', stroke: '#ffffff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-[20px] border border-outline-variant/35 bg-white p-5 shadow-[0_8px_24px_-20px_rgba(39,24,20,0.45)] sm:p-6">
          <h2 className="text-lg font-bold text-on-surface">Lối tắt</h2>
          <p className="mt-1 text-xs text-on-surface-variant">Truy cập nhanh tiện ích thường dùng</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {shortcuts.map((shortcut) => {
              const Icon = shortcut.icon;

              return (
                <button
                  key={shortcut.label}
                  type="button"
                  onClick={() => navigate(shortcut.path)}
                  className="group flex min-h-[118px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl bg-surface-container-low p-3 text-sm font-medium text-on-surface transition hover:-translate-y-0.5 hover:bg-surface-container-high"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border border-outline-variant/35 bg-white shadow-sm transition group-hover:scale-105">
                    <Icon size={20} className={shortcut.iconClass} />
                  </span>
                  {shortcut.label}
                </button>
              );
            })}
          </div>
        </article>
      </section>

      <section className="overflow-hidden rounded-[20px] border border-outline-variant/35 bg-white shadow-[0_8px_24px_-20px_rgba(39,24,20,0.45)]">
        <div className="flex items-center justify-between gap-4 border-b border-outline-variant/25 px-5 py-5 sm:px-6">
          <div>
            <h2 className="text-lg font-bold text-on-surface">Đơn hàng gần đây</h2>
            <p className="mt-1 text-xs text-on-surface-variant">Theo dõi trạng thái hoàn tiền mới nhất.</p>
          </div>
          <Link
            to="/dashboard/cashback"
            className="shrink-0 text-xs font-bold text-primary transition hover:text-primary-container"
          >
            Xem tất cả
          </Link>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead className="bg-surface-container-low">
              <tr className="text-[11px] font-bold text-on-surface-variant">
                <th className="px-5 py-3.5 sm:px-6">Sản phẩm</th>
                <th className="px-4 py-3.5">Sàn</th>
                <th className="px-4 py-3.5">Ngày mua</th>
                <th className="px-4 py-3.5 text-right">Giá trị</th>
                <th className="px-4 py-3.5 text-right">Cashback</th>
                <th className="px-5 py-3.5 text-right sm:px-6">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {cashbackOrders.slice(0, 4).map((order) => {
                const status = statusStyles[order.status];
                const cashback = order.cashbackActual || order.cashbackEstimate;

                return (
                  <tr key={order.id} className="transition hover:bg-surface-container-low/45">
                    <td className="px-5 py-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-outline-variant/25 bg-surface-container-low text-[10px] font-black text-primary">{order.platform === 'Shopee' ? 'S' : 'TT'}</span>
                        <div className="min-w-0">
                          <p className="max-w-[250px] truncate text-xs font-semibold text-on-surface">
                            {order.productName}
                          </p>
                          <p className="mt-1 text-[10px] text-on-surface-variant">{order.orderId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-md px-2 py-1 text-[9px] font-extrabold uppercase ${
                          order.platform === 'Shopee'
                            ? 'bg-orange-50 text-orange-600'
                            : 'bg-slate-900 text-white'
                        }`}
                      >
                        {order.platform}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-xs text-on-surface-variant">
                      {formatDate(order.date)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-right text-xs font-medium text-on-surface">
                      {formatCurrency(order.orderValue)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-right text-xs font-bold text-emerald-700">
                      {formatCurrency(cashback)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right sm:px-6">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ring-inset ${status.className}`}>
                        {status.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-outline-variant/20 md:hidden">
          {cashbackOrders.slice(0, 4).map((order) => {
            const status = statusStyles[order.status];
            const cashback = order.cashbackActual || order.cashbackEstimate;

            return (
              <article key={order.id} className="p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-outline-variant/25 bg-surface-container-low text-xs font-black text-primary">{order.platform === 'Shopee' ? 'S' : 'TT'}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-2 text-xs font-semibold leading-5 text-on-surface">
                        {order.productName}
                      </p>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-bold ring-1 ring-inset ${status.className}`}>
                        {status.label}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-on-surface-variant">
                      {order.platform} · {formatDate(order.date)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl bg-surface-container-low px-3 py-2.5 text-xs">
                  <div>
                    <p className="text-[10px] text-on-surface-variant">Giá trị đơn</p>
                    <p className="mt-1 font-semibold text-on-surface">{formatCurrency(order.orderValue)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-on-surface-variant">Cashback dự kiến</p>
                    <p className="mt-1 font-bold text-emerald-700">{formatCurrency(cashback)}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
};
