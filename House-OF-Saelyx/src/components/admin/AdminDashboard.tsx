import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  BellRing,
  Boxes,
  Calendar,
  CheckCircle2,
  Clock3,
  MessageSquare,
  Package,
  Plus,
  ShoppingBag
} from 'lucide-react';
import { ContactMessage, Order, Product, StockNotification } from '../../types';

export interface AdminDashboardProps {
  products: Product[];
  orders: Order[];
  messages: ContactMessage[];
  stockNotifications: StockNotification[];
  formatPrice: (priceLKR: number) => string;
  onNavigateToTab: (tab: 'overview' | 'products' | 'orders' | 'messages' | 'restock' | 'staff' | 'security' | 'drop-config') => void;
  onOpenProductModal: () => void;
}

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function safeDateLabel(value?: string) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  products,
  orders,
  messages,
  stockNotifications,
  formatPrice,
  onNavigateToTab,
  onOpenProductModal
}) => {
  const today = useMemo(() => new Date(), []);
  const thirtyDaysAgo = useMemo(() => {
    const date = new Date(today);
    date.setDate(date.getDate() - 29);
    return date;
  }, [today]);

  const [startDate, setStartDate] = useState(toDateInput(thirtyDaysAgo));
  const [endDate, setEndDate] = useState(toDateInput(today));

  const rangeOrders = useMemo(() => orders.filter(order => {
    const created = order.createdAt?.slice(0, 10) || '';
    return (!startDate || created >= startDate) && (!endDate || created <= endDate);
  }), [orders, startDate, endDate]);

  const verifiedOrders = useMemo(
    () => rangeOrders.filter(order => order.paymentStatus === 'verified' && order.status !== 'cancelled'),
    [rangeOrders]
  );

  const verifiedRevenueLKR = verifiedOrders.reduce(
    (sum, order) => sum + Math.max(0, Number(order.totalLKR) || 0),
    0
  );
  const openOrdersCount = rangeOrders.filter(order => !['delivered', 'cancelled'].includes(order.status)).length;
  const completedOrdersCount = rangeOrders.filter(order => order.status === 'delivered').length;
  const totalStockCount = products.reduce((sum, product) => sum + Math.max(0, Number(product.stockCount) || 0), 0);
  const lowStockProducts = products.filter(product => product.inStock && Math.max(0, Number(product.stockCount) || 0) <= 5);
  const unreadSupportCount = messages.filter(message => message.status === 'unread').length;
  const restockRequestCount = stockNotifications.filter(notification =>
    ['pending', 'failed'].includes(notification.status)
  ).length;
  const paymentAttentionCount = orders.filter(order =>
    ['refund_pending', 'pending_verification', 'needs_recovery'].includes(order.paymentStatus || '') ||
    order.requiresManualReview
  ).length;

  const monthlyRevenue = useMemo(() => {
    const points: Array<{ key: string; label: string; total: number }> = [];
    for (let offset = 5; offset >= 0; offset -= 1) {
      const date = new Date(today.getFullYear(), today.getMonth() - offset, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      points.push({
        key,
        label: date.toLocaleDateString('en-US', { month: 'short' }),
        total: 0
      });
    }

    for (const order of orders) {
      if (order.paymentStatus !== 'verified' || order.status === 'cancelled') continue;
      const key = order.createdAt?.slice(0, 7);
      const point = points.find(item => item.key === key);
      if (point) point.total += Math.max(0, Number(order.totalLKR) || 0);
    }
    return points;
  }, [orders, today]);

  const maxMonthlyRevenue = Math.max(1, ...monthlyRevenue.map(point => point.total));

  const primaryStats = [
    {
      label: 'Verified Revenue',
      value: formatPrice(verifiedRevenueLKR),
      detail: `${verifiedOrders.length} verified payment${verifiedOrders.length === 1 ? '' : 's'}`,
      icon: Banknote,
      iconClass: 'bg-emerald-50 text-emerald-700'
    },
    {
      label: 'Orders',
      value: rangeOrders.length.toLocaleString(),
      detail: `${completedOrdersCount} delivered in range`,
      icon: ShoppingBag,
      iconClass: 'bg-stone-100 text-stone-700'
    },
    {
      label: 'Open Orders',
      value: openOrdersCount.toLocaleString(),
      detail: 'Awaiting fulfilment or delivery',
      icon: Clock3,
      iconClass: openOrdersCount ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
    },
    {
      label: 'Inventory Units',
      value: totalStockCount.toLocaleString(),
      detail: `${products.length} active product${products.length === 1 ? '' : 's'}`,
      icon: Boxes,
      iconClass: 'bg-blue-50 text-blue-700'
    }
  ];

  const actionQueue = [
    {
      label: 'Low Stock',
      value: lowStockProducts.length,
      detail: 'Products at 5 units or fewer',
      icon: AlertTriangle,
      tab: 'products' as const,
      accent: lowStockProducts.length ? 'text-amber-700 bg-amber-50 border-amber-100' : 'text-stone-600 bg-stone-50 border-stone-100'
    },
    {
      label: 'Unread Support',
      value: unreadSupportCount,
      detail: 'Customer messages waiting',
      icon: MessageSquare,
      tab: 'messages' as const,
      accent: unreadSupportCount ? 'text-blue-700 bg-blue-50 border-blue-100' : 'text-stone-600 bg-stone-50 border-stone-100'
    },
    {
      label: 'Restock Requests',
      value: restockRequestCount,
      detail: 'Pending or failed notifications',
      icon: BellRing,
      tab: 'restock' as const,
      accent: restockRequestCount ? 'text-violet-700 bg-violet-50 border-violet-100' : 'text-stone-600 bg-stone-50 border-stone-100'
    },
    {
      label: 'Payment Attention',
      value: paymentAttentionCount,
      detail: 'Refund/recovery/manual review',
      icon: CheckCircle2,
      tab: 'orders' as const,
      accent: paymentAttentionCount ? 'text-rose-700 bg-rose-50 border-rose-100' : 'text-stone-600 bg-stone-50 border-stone-100'
    }
  ];

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 7);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <section className="rounded-[24px] border border-stone-200/80 bg-white p-5 md:p-6 shadow-[0_12px_40px_rgba(15,23,18,0.04)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-stone-400">Operations snapshot</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Live data
              </span>
            </div>
            <h2 className="mt-2 text-xl font-extrabold tracking-tight text-stone-950 md:text-2xl">Store performance at a glance</h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-stone-500">
              Revenue uses verified, non-cancelled payments. Operational counts use the records currently loaded into the admin console.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2">
              <Calendar className="h-4 w-4 text-stone-400" />
              <input
                aria-label="Start date"
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={event => setStartDate(event.target.value)}
                className="max-w-28 bg-transparent text-[11px] font-semibold text-stone-700 outline-none"
              />
              <span className="text-stone-300">—</span>
              <input
                aria-label="End date"
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={event => setEndDate(event.target.value)}
                className="max-w-28 bg-transparent text-[11px] font-semibold text-stone-700 outline-none"
              />
            </div>
            <button onClick={onOpenProductModal} className="btn-saelyxe-lime text-xs">
              <Plus className="h-4 w-4" />
              Add Product
            </button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {primaryStats.map(card => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="group rounded-[22px] border border-stone-200/80 bg-white p-5 shadow-[0_8px_28px_rgba(15,23,18,0.035)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(15,23,18,0.07)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="text-[11px] font-bold uppercase tracking-[0.11em] text-stone-400">{card.label}</div>
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${card.iconClass}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-5 text-2xl font-extrabold tracking-tight text-stone-950">{card.value}</div>
              <div className="mt-1 text-[11px] text-stone-500">{card.detail}</div>
            </div>
          );
        })}
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-stone-900">Needs attention</h3>
            <p className="mt-0.5 text-[11px] text-stone-500">Jump directly to work that may need an admin action.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {actionQueue.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => onNavigateToTab(item.tab)}
                className="rounded-2xl border border-stone-200 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-xl border ${item.accent}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-xl font-extrabold tracking-tight text-stone-950">{item.value}</span>
                </div>
                <div className="mt-3 text-xs font-bold text-stone-800">{item.label}</div>
                <div className="mt-0.5 text-[10px] leading-relaxed text-stone-400">{item.detail}</div>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <section className="xl:col-span-8 rounded-[24px] border border-stone-200/80 bg-white p-5 md:p-6 shadow-[0_8px_28px_rgba(15,23,18,0.035)]">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-stone-900">Revenue trend</h3>
              <p className="mt-1 text-[11px] text-stone-500">Verified revenue across the last six calendar months.</p>
            </div>
            <button
              onClick={() => onNavigateToTab('orders')}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900"
            >
              View orders <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex h-64 items-end gap-3 rounded-2xl bg-stone-50/70 px-4 pb-3 pt-6">
            {monthlyRevenue.map(point => {
              const height = point.total > 0 ? Math.max(5, (point.total / maxMonthlyRevenue) * 100) : 2;
              return (
                <div key={point.key} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <div className="flex h-full w-full items-end justify-center">
                    <div
                      className="relative w-full max-w-11 rounded-t-xl bg-[#0a2b1d] transition-all duration-300 group-hover:bg-[#0f3a28]"
                      style={{ height: `${height}%` }}
                      title={formatPrice(point.total)}
                    >
                      {point.total > 0 && (
                        <span className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-stone-950 px-2 py-1 text-[9px] font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                          {formatPrice(point.total)}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-stone-400">{point.label}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="xl:col-span-4 rounded-[24px] border border-stone-200/80 bg-[#071c13] p-5 md:p-6 text-white shadow-[0_14px_36px_rgba(5,28,18,0.12)]">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#B4F105]">Inventory</div>
              <h3 className="mt-2 text-lg font-extrabold">Stock health</h3>
            </div>
            <Package className="h-5 w-5 text-white/50" />
          </div>

          <div className="mt-6 space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-[10px] uppercase tracking-wider text-white/50">Products</div>
              <div className="mt-1 text-2xl font-extrabold">{products.length}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-[10px] uppercase tracking-wider text-white/50">Units in stock</div>
              <div className="mt-1 text-2xl font-extrabold">{totalStockCount}</div>
            </div>
            <div className={`rounded-2xl border p-4 ${lowStockProducts.length ? 'border-amber-400/30 bg-amber-400/10' : 'border-white/10 bg-white/5'}`}>
              <div className="text-[10px] uppercase tracking-wider text-white/50">Low stock</div>
              <div className="mt-1 flex items-end justify-between gap-3">
                <div className="text-2xl font-extrabold">{lowStockProducts.length}</div>
                <span className="text-[10px] text-white/55">≤ 5 units</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigateToTab('products')}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#B4F105] px-4 py-3 text-xs font-extrabold text-[#051C12] transition-colors hover:bg-[#c1f824]"
          >
            Manage Products <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </section>
      </div>

      <section className="rounded-[24px] border border-stone-200/80 bg-white shadow-[0_8px_28px_rgba(15,23,18,0.035)]">
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4 md:px-6">
          <div>
            <h3 className="text-sm font-extrabold text-stone-900">Recent orders</h3>
            <p className="mt-0.5 text-[11px] text-stone-500">Latest loaded orders across the store.</p>
          </div>
          <button
            onClick={() => onNavigateToTab('orders')}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-600 hover:text-stone-950"
          >
            All orders <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {recentOrders.length === 0 ? (
          <div className="px-6 py-12 text-center text-xs text-stone-400">No orders have been loaded yet.</div>
        ) : (
          <div className="divide-y divide-stone-100">
            {recentOrders.map(order => (
              <button
                key={order.id}
                onClick={() => onNavigateToTab('orders')}
                className="grid w-full grid-cols-[1fr_auto] gap-4 px-5 py-3.5 text-left transition-colors hover:bg-stone-50/70 md:grid-cols-[1.2fr_1fr_auto] md:px-6"
              >
                <div className="min-w-0">
                  <div className="text-xs font-extrabold text-stone-900">#{order.orderNumber || order.id}</div>
                  <div className="mt-0.5 truncate text-[10px] text-stone-400">{safeDateLabel(order.createdAt)}</div>
                </div>
                <div className="hidden min-w-0 md:block">
                  <div className="truncate text-xs font-semibold text-stone-700">{order.customerName || 'Customer data unavailable'}</div>
                  <div className="mt-0.5 text-[10px] capitalize text-stone-400">{order.status.replace(/_/g, ' ')}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-extrabold text-stone-900">{formatPrice(order.totalLKR || 0)}</div>
                  <div className={`mt-0.5 text-[9px] font-bold uppercase ${order.paymentStatus === 'verified' ? 'text-emerald-600' : 'text-stone-400'}`}>
                    {order.paymentStatus || 'pending'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
