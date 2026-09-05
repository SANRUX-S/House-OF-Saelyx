import React, { useMemo, useState } from 'react';
import {
  Calendar,
  ArrowRight,
  Package,
  ShoppingBag,
  Banknote,
  CheckCircle2,
  Clock3,
  Boxes,
  AlertTriangle,
  Plus
} from 'lucide-react';
import { Order, Product } from '../../types';

export interface AdminDashboardProps {
  products: Product[];
  orders: Order[];
  formatPrice: (priceLKR: number) => string;
  onNavigateToTab: (tab: 'overview' | 'products' | 'orders' | 'messages' | 'restock' | 'staff' | 'security' | 'drop-config' | 'section-settings') => void;
  onOpenProductModal: () => void;
}

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  products,
  orders,
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

  const verifiedRevenueLKR = verifiedOrders.reduce((sum, order) => sum + Math.max(0, Number(order.totalLKR) || 0), 0);
  const completedOrdersCount = rangeOrders.filter(order => order.status === 'delivered').length;
  const openOrdersCount = rangeOrders.filter(order => !['delivered', 'cancelled'].includes(order.status)).length;
  const soldUnits = verifiedOrders.reduce(
    (sum, order) => sum + (order.items || []).reduce((itemSum, item) => itemSum + Math.max(0, Number(item.quantity) || 0), 0),
    0
  );
  const totalStockCount = products.reduce((sum, product) => sum + Math.max(0, Number(product.stockCount) || 0), 0);
  const lowStockCount = products.filter(product => product.inStock && Math.max(0, Number(product.stockCount) || 0) <= 5).length;

  const recentOrders = [...rangeOrders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

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

  const statCards = [
    {
      label: 'Verified Revenue',
      value: formatPrice(verifiedRevenueLKR),
      detail: `${verifiedOrders.length} captured PayPal order${verifiedOrders.length === 1 ? '' : 's'}`,
      icon: Banknote
    },
    {
      label: 'Open Orders',
      value: openOrdersCount.toLocaleString(),
      detail: 'Awaiting fulfilment or delivery',
      icon: Clock3
    },
    {
      label: 'Delivered',
      value: completedOrdersCount.toLocaleString(),
      detail: 'Completed in selected range',
      icon: CheckCircle2
    },
    {
      label: 'Inventory Units',
      value: totalStockCount.toLocaleString(),
      detail: lowStockCount ? `${lowStockCount} low-stock product${lowStockCount === 1 ? '' : 's'}` : 'No low-stock alerts',
      icon: Boxes
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Production overview</span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">Live data</span>
          </div>
          <p className="mt-1 text-xs text-stone-400">Revenue counts only provider-verified, non-cancelled payments.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="btn-date-range">
            <Calendar className="h-4 w-4 text-stone-500" />
            <input aria-label="Start date" type="date" value={startDate} max={endDate || undefined} onChange={event => setStartDate(event.target.value)} className="bg-transparent text-xs outline-none" />
            <span className="text-stone-400">to</span>
            <input aria-label="End date" type="date" value={endDate} min={startDate || undefined} onChange={event => setEndDate(event.target.value)} className="bg-transparent text-xs outline-none" />
          </div>
          <button onClick={onOpenProductModal} className="btn-saelyxe-lime text-xs">
            <Plus className="h-4 w-4" />
            New Garment
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card-stat">
              <div className="flex items-start justify-between gap-3">
                <span className="stat-label">{card.label}</span>
                <div className="h-8 w-8 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="stat-value mt-2">{card.value}</div>
              <span className="text-xs text-stone-500">{card.detail}</span>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-8 admin-card">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-base font-bold text-stone-900">Verified Revenue — Last 6 Months</h2>
              <p className="text-xs text-stone-500 mt-1">Calculated from actual verified order records. No estimated expense data is shown.</p>
            </div>
            <button onClick={() => onNavigateToTab('orders')} className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1">
              Orders <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="h-64 flex items-end gap-3 border-b border-stone-100 px-1 pb-1">
            {monthlyRevenue.map(point => {
              const height = point.total > 0 ? Math.max(5, (point.total / maxMonthlyRevenue) * 100) : 2;
              return (
                <div key={point.key} className="group flex-1 h-full flex flex-col justify-end items-center gap-2">
                  <div className="w-full h-full flex items-end justify-center">
                    <div
                      className="relative w-full max-w-10 rounded-t-lg bg-[#072F1F] transition-all group-hover:brightness-125"
                      style={{ height: `${height}%` }}
                      title={formatPrice(point.total)}
                    >
                      {point.total > 0 && (
                        <span className="absolute opacity-0 group-hover:opacity-100 -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-stone-900 px-2 py-1 text-[9px] text-white transition-opacity">
                          {formatPrice(point.total)}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-stone-500">{point.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="xl:col-span-4 admin-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-stone-900">Catalogue Health</h2>
              <p className="text-xs text-stone-500 mt-1">Live inventory summary.</p>
            </div>
            <Package className="h-5 w-5 text-stone-400" />
          </div>

          <div className="space-y-3">
            <div className="rounded-xl bg-stone-50 border border-stone-100 p-4 flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-600">Active products</span>
              <strong className="text-sm text-stone-900">{products.length}</strong>
            </div>
            <div className="rounded-xl bg-stone-50 border border-stone-100 p-4 flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-600">Verified units sold</span>
              <strong className="text-sm text-stone-900">{soldUnits}</strong>
            </div>
            <div className="rounded-xl bg-stone-50 border border-stone-100 p-4 flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-600">Low stock</span>
              <strong className={`text-sm ${lowStockCount ? 'text-amber-700' : 'text-emerald-700'}`}>{lowStockCount}</strong>
            </div>
            {lowStockCount > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Review products with five or fewer units remaining.
              </div>
            )}
            <button onClick={() => onNavigateToTab('products')} className="btn-saelyxe-primary w-full justify-center text-xs">
              Manage Catalogue
            </button>
          </div>
        </div>
      </div>

      <div className="admin-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-stone-900">Recent Orders</h2>
            <p className="text-xs text-stone-500 mt-1">Newest records in the selected date range.</p>
          </div>
          <ShoppingBag className="h-5 w-5 text-stone-400" />
        </div>

        {recentOrders.length === 0 ? (
          <div className="py-10 text-center text-xs text-stone-400">No orders found in this date range.</div>
        ) : (
          <div className="divide-y divide-stone-100">
            {recentOrders.map(order => (
              <button
                key={order.id}
                onClick={() => onNavigateToTab('orders')}
                className="w-full py-3 flex items-center justify-between gap-4 text-left hover:bg-stone-50 px-2 rounded-lg transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-stone-900 truncate">{order.orderNumber}</div>
                  <div className="text-[11px] text-stone-500 truncate">{order.customerName} · {new Date(order.createdAt).toLocaleString()}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-bold text-stone-900">{formatPrice(order.totalLKR || 0)}</div>
                  <div className="text-[10px] uppercase font-semibold text-stone-400">{order.paymentStatus || 'pending'} · {order.status}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
