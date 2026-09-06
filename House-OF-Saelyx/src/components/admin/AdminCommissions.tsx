import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  FileDown,
  Mail,
  MapPin,
  PackageCheck,
  Phone,
  Search,
  ShoppingBag,
  Truck,
  X
} from 'lucide-react';
import { Order, OrderStatus } from '../../types';

export interface AdminCommissionsProps {
  orders: Order[];
  formatPrice: (priceLKR: number) => string;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus, details: Partial<Order>) => Promise<boolean>;
  isSuperAdmin: boolean;
  onAudit?: (action: string, details: string) => Promise<void>;
  hasMoreOrders: boolean;
  onLoadOlderOrders: () => Promise<boolean>;
}

function statusLabel(status?: string) {
  if (!status) return 'Unknown';
  return status.replace(/_/g, ' ').replace(/w/g, char => char.toUpperCase());
}

function orderStatusClass(status?: string) {
  if (status === 'delivered') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  if (status === 'dispatched' || status === 'out_for_delivery') return 'bg-blue-50 text-blue-700 border-blue-100';
  if (status === 'cancelled') return 'bg-rose-50 text-rose-700 border-rose-100';
  if (status === 'packed') return 'bg-violet-50 text-violet-700 border-violet-100';
  return 'bg-amber-50 text-amber-700 border-amber-100';
}

function paymentStatusClass(status?: string) {
  if (status === 'verified') return 'bg-emerald-50 text-emerald-700';
  if (status === 'refunded') return 'bg-blue-50 text-blue-700';
  if (status === 'refund_pending') return 'bg-amber-50 text-amber-700';
  return 'bg-stone-100 text-stone-600';
}

function paymentLabel(status?: string) {
  if (status === 'verified') return 'Paid';
  if (status === 'refunded') return 'Refunded';
  if (status === 'refund_pending') return 'Refund pending';
  if (status === 'pending_verification') return 'Pending verification';
  return status ? statusLabel(status) : 'Pending';
}

function formatOrderDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export const AdminCommissions: React.FC<AdminCommissionsProps> = ({
  orders,
  formatPrice,
  onUpdateOrderStatus,
  isSuperAdmin,
  onAudit,
  hasMoreOrders,
  onLoadOlderOrders
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState<OrderStatus>('confirmed');
  const [newCourier, setNewCourier] = useState('');
  const [newTracking, setNewTracking] = useState('');
  const [newEta, setNewEta] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);

  const handleOpenOrder = (order: Order) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setNewCourier(order.courierName || '');
    setNewTracking(order.trackingNumber || '');
    setNewEta(order.deliveryEta || '');
    setUpdateError('');
  };

  const handleSaveDispatch = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedOrder) return;

    setIsUpdating(true);
    setUpdateError('');
    try {
      const success = await onUpdateOrderStatus(selectedOrder.id, newStatus, {
        courierName: newCourier,
        trackingNumber: newTracking,
        deliveryEta: newEta
      });

      if (success) {
        setSelectedOrder(null);
      } else {
        setUpdateError('This order could not be updated. Check the order stage, payment state, and required delivery details.');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      setUpdateError('The order update failed. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const csvCell = (value: unknown) => {
    let text = String(value ?? '').replace(/\r?\n/g, ' ');
    if (/^[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };

  const handleExportCSV = async () => {
    if (!isSuperAdmin) return;
    if (!window.confirm('Export customer order data to CSV? This file contains personal information and must be handled securely.')) return;

    const headers = ['Order Number', 'Customer Name', 'Email', 'Phone', 'City', 'Total LKR', 'Payment Status', 'Order Status', 'Date', 'Tracking'];
    const rows = orders.map(order => [
      order.orderNumber,
      order.customerName,
      order.customerEmail || order.email || '',
      order.phone,
      order.city,
      order.totalLKR,
      order.paymentStatus || '',
      order.status,
      order.createdAt,
      order.trackingNumber || ''
    ].map(csvCell).join(','));

    const csvContent = [headers.map(csvCell).join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `saelyxe_orders_${new Date().toISOString().slice(0, 10)}.csv`);
    link.click();
    URL.revokeObjectURL(url);
    await onAudit?.('ORDER_CSV_EXPORT', `Exported ${orders.length} order records to CSV.`);
  };

  const filteredOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return orders.filter(order => {
      const searchable = [
        order.orderNumber,
        order.customerName,
        order.customerEmail,
        order.email,
        order.phone,
        order.city,
        order.trackingNumber,
        ...(order.items || []).map(item => item.title)
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = !query || searchable.includes(query);
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  const summary = useMemo(() => ({
    total: orders.length,
    action: orders.filter(order => ['placed', 'confirmed', 'packed'].includes(order.status)).length,
    transit: orders.filter(order => ['dispatched', 'out_for_delivery'].includes(order.status)).length,
    delivered: orders.filter(order => order.status === 'delivered').length
  }), [orders]);

  const summaryCards = [
    { label: 'Loaded Orders', value: summary.total, icon: ShoppingBag, accent: 'bg-stone-100 text-stone-700' },
    { label: 'Needs Action', value: summary.action, icon: Clock3, accent: summary.action ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700' },
    { label: 'In Transit', value: summary.transit, icon: Truck, accent: 'bg-blue-50 text-blue-700' },
    { label: 'Delivered', value: summary.delivered, icon: CheckCircle2, accent: 'bg-emerald-50 text-emerald-700' }
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summaryCards.map(card => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-[0_6px_22px_rgba(15,23,18,0.03)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400">{card.label}</div>
                  <div className="mt-2 text-2xl font-extrabold tracking-tight text-stone-950">{card.value.toLocaleString()}</div>
                </div>
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${card.accent}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <section className="overflow-hidden rounded-[24px] border border-stone-200/80 bg-white shadow-[0_10px_32px_rgba(15,23,18,0.04)]">
        <div className="flex flex-col gap-3 border-b border-stone-100 p-4 md:flex-row md:items-center md:justify-between md:p-5">
          <div className="flex w-full max-w-xl items-center gap-2.5 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-stone-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              placeholder="Search order, customer, product, tracking..."
              className="w-full bg-transparent text-xs text-stone-800 outline-none placeholder:text-stone-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={event => setStatusFilter(event.target.value)}
              aria-label="Filter orders by status"
              className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-xs font-semibold text-stone-700 outline-none transition-colors hover:border-stone-300 focus:border-stone-400"
            >
              <option value="all">All statuses</option>
              <option value="placed">Placed</option>
              <option value="confirmed">Confirmed</option>
              <option value="packed">Packed</option>
              <option value="dispatched">Dispatched</option>
              <option value="out_for_delivery">Out for delivery</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => void handleExportCSV()}
                className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-xs font-bold text-stone-700 transition-colors hover:bg-stone-50"
              >
                <FileDown className="h-3.5 w-3.5" />
                Export
              </button>
            )}
          </div>
        </div>

        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50/70">
                {['Order', 'Customer', 'Payment', 'Fulfillment', 'Total', 'Date', ''].map(label => (
                  <th key={label} className="px-5 py-3.5 text-[10px] font-extrabold uppercase tracking-[0.11em] text-stone-400">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-14 text-center text-xs text-stone-400">
                    No orders match your current search or filter.
                  </td>
                </tr>
              ) : filteredOrders.map(order => {
                const itemCount = (order.items || []).reduce((sum, item) => sum + Math.max(0, Number(item.quantity) || 0), 0);
                return (
                  <tr
                    key={order.id}
                    onClick={() => handleOpenOrder(order)}
                    className="group cursor-pointer transition-colors hover:bg-stone-50/70"
                  >
                    <td className="px-5 py-4">
                      <div className="text-xs font-extrabold text-stone-950">#{order.orderNumber || order.id}</div>
                      <div className="mt-1 text-[10px] text-stone-400">{itemCount} item{itemCount === 1 ? '' : 's'}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="max-w-48 truncate text-xs font-bold text-stone-800">{order.customerName || 'Customer data unavailable'}</div>
                      <div className="mt-1 max-w-48 truncate text-[10px] text-stone-400">{order.customerEmail || order.email || order.phone || 'No contact data'}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${paymentStatusClass(order.paymentStatus)}`}>
                        {paymentLabel(order.paymentStatus)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${orderStatusClass(order.status)}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                        {statusLabel(order.status)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-xs font-extrabold text-stone-950">
                      {formatPrice(order.totalLKR || 0)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-[11px] font-medium text-stone-500">
                      {formatOrderDate(order.createdAt)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <ChevronRight className="ml-auto h-4 w-4 text-stone-300 transition-transform group-hover:translate-x-0.5 group-hover:text-stone-600" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-stone-100 lg:hidden">
          {filteredOrders.length === 0 ? (
            <div className="px-5 py-12 text-center text-xs text-stone-400">No orders match your current search or filter.</div>
          ) : filteredOrders.map(order => (
            <button
              key={order.id}
              type="button"
              onClick={() => handleOpenOrder(order)}
              className="w-full p-4 text-left transition-colors hover:bg-stone-50"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xs font-extrabold text-stone-950">#{order.orderNumber || order.id}</div>
                  <div className="mt-1 truncate text-[11px] font-semibold text-stone-700">{order.customerName || 'Customer data unavailable'}</div>
                  <div className="mt-1 text-[10px] text-stone-400">{formatOrderDate(order.createdAt)}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-extrabold text-stone-950">{formatPrice(order.totalLKR || 0)}</div>
                  <span className={`mt-2 inline-flex rounded-full px-2 py-1 text-[9px] font-bold ${paymentStatusClass(order.paymentStatus)}`}>
                    {paymentLabel(order.paymentStatus)}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-bold ${orderStatusClass(order.status)}`}>
                  {statusLabel(order.status)}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-stone-500">
                  View order <ChevronRight className="h-3 w-3" />
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 bg-stone-50/60 px-4 py-3.5 text-[11px] text-stone-500 md:px-5">
          <span>
            Showing <strong className="text-stone-800">{filteredOrders.length}</strong> loaded order{filteredOrders.length === 1 ? '' : 's'}
          </span>
          {hasMoreOrders ? (
            <button
              type="button"
              disabled={isLoadingOlder}
              onClick={async () => {
                setIsLoadingOlder(true);
                await onLoadOlderOrders();
                setIsLoadingOlder(false);
              }}
              className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-[10px] font-bold text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-50"
            >
              {isLoadingOlder ? 'Loading...' : 'Load older orders'}
            </button>
          ) : (
            <span className="text-[10px] text-stone-400">End of loaded history</span>
          )}
        </div>
      </section>

      {selectedOrder && (
        <div className="fixed inset-0 z-[1100] flex justify-end bg-stone-950/35 backdrop-blur-[2px]" onMouseDown={() => setSelectedOrder(null)}>
          <aside
            className="h-full w-full max-w-[560px] overflow-y-auto bg-[#F6F7F6] shadow-[-24px_0_70px_rgba(5,28,18,0.18)] animate-in slide-in-from-right duration-300"
            onMouseDown={event => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 border-b border-stone-200 bg-white/95 px-5 py-4 backdrop-blur-xl md:px-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-stone-400">Order details</div>
                  <h3 className="mt-1 text-lg font-extrabold tracking-tight text-stone-950">#{selectedOrder.orderNumber || selectedOrder.id}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-bold ${paymentStatusClass(selectedOrder.paymentStatus)}`}>
                      {paymentLabel(selectedOrder.paymentStatus)}
                    </span>
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-bold ${orderStatusClass(selectedOrder.status)}`}>
                      {statusLabel(selectedOrder.status)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-500 transition-colors hover:bg-stone-50 hover:text-stone-900"
                  aria-label="Close order details"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-4 p-4 md:p-5">
              {selectedOrder.requiresManualReview && (
                <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <div className="font-bold">Manual review required</div>
                    <div className="mt-1 text-[11px] leading-relaxed">{selectedOrder.inventoryException || 'Review this order before making further fulfilment changes.'}</div>
                  </div>
                </div>
              )}

              <section className="rounded-2xl border border-stone-200 bg-white p-4">
                <div className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-stone-400">Customer</div>
                <div className="mt-3 text-sm font-extrabold text-stone-900">{selectedOrder.customerName || 'Customer data unavailable'}</div>
                <div className="mt-3 grid gap-2 text-[11px] text-stone-600">
                  {(selectedOrder.customerEmail || selectedOrder.email) && (
                    <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-stone-400" />{selectedOrder.customerEmail || selectedOrder.email}</div>
                  )}
                  {selectedOrder.phone && (
                    <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-stone-400" />{selectedOrder.phone}</div>
                  )}
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-400" />
                    <span>
                      {[selectedOrder.address, selectedOrder.city, selectedOrder.postalCode, selectedOrder.country].filter(Boolean).join(', ') || 'Shipping address unavailable'}
                    </span>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-stone-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-stone-400">Items</div>
                  <div className="text-xs font-extrabold text-stone-900">{formatPrice(selectedOrder.totalLKR || 0)}</div>
                </div>
                <div className="mt-3 space-y-3">
                  {(selectedOrder.items || []).length === 0 ? (
                    <div className="rounded-xl bg-stone-50 p-3 text-[11px] text-stone-400">No item data available.</div>
                  ) : selectedOrder.items.map((item, index) => (
                    <div key={`${item.productId || 'item'}-${index}`} className="flex items-center gap-3 rounded-xl bg-stone-50 p-3">
                      <div className="h-12 w-10 overflow-hidden rounded-lg bg-stone-200">
                        {item.image ? <img src={item.image} alt="" className="h-full w-full object-cover" /> : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-bold text-stone-800">{item.title || 'Unknown product'}</div>
                        <div className="mt-1 text-[10px] text-stone-400">Size {item.size || '—'} · Qty {item.quantity || 0}</div>
                      </div>
                      <div className="text-[11px] font-bold text-stone-700">{formatPrice((item.priceLKR || 0) * Math.max(1, Number(item.quantity) || 1))}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-stone-200 bg-white p-4">
                  <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.13em] text-stone-400">
                    <CreditCard className="h-3.5 w-3.5" /> Payment
                  </div>
                  <div className="mt-3 text-xs font-bold text-stone-800">{paymentLabel(selectedOrder.paymentStatus)}</div>
                  <div className="mt-1 text-[10px] uppercase text-stone-400">{selectedOrder.paymentMethod || 'Payment method unavailable'}</div>
                  {selectedOrder.refundStatus && <div className="mt-2 text-[10px] font-bold text-amber-700">Refund: {statusLabel(selectedOrder.refundStatus)}</div>}
                </div>
                <div className="rounded-2xl border border-stone-200 bg-white p-4">
                  <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.13em] text-stone-400">
                    <PackageCheck className="h-3.5 w-3.5" /> Fulfillment
                  </div>
                  <div className="mt-3 text-xs font-bold text-stone-800">{statusLabel(selectedOrder.status)}</div>
                  <div className="mt-1 text-[10px] text-stone-400">{selectedOrder.courierName || 'No courier assigned'}</div>
                </div>
              </section>

              <form onSubmit={handleSaveDispatch} className="rounded-2xl border border-stone-200 bg-white p-4">
                <div className="mb-4">
                  <div className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-stone-400">Update fulfillment</div>
                  <p className="mt-1 text-[11px] text-stone-500">Change status and delivery details. Paid PayPal cancellations use the protected refund workflow.</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="form-label-custom">Order status</label>
                    <select
                      value={newStatus}
                      onChange={event => setNewStatus(event.target.value as OrderStatus)}
                      className="form-input-custom font-semibold"
                    >
                      <option value="placed">Placed</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="packed">Packed</option>
                      <option value="dispatched">Dispatched</option>
                      <option value="out_for_delivery">Out for Delivery</option>
                      <option value="delivered">Delivered</option>
                      <option
                        value="cancelled"
                        disabled={!isSuperAdmin && selectedOrder.paymentMethod === 'paypal' && ['verified', 'refund_pending'].includes(selectedOrder.paymentStatus || '')}
                      >
                        {selectedOrder.paymentMethod === 'paypal' && ['verified', 'refund_pending'].includes(selectedOrder.paymentStatus || '')
                          ? 'Cancel & Refund PayPal Payment (Super Admin)'
                          : 'Cancelled'}
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label-custom">Courier</label>
                    <input
                      type="text"
                      value={newCourier}
                      onChange={event => setNewCourier(event.target.value)}
                      placeholder="Courier or delivery provider"
                      className="form-input-custom"
                    />
                  </div>

                  <div>
                    <label className="form-label-custom">Tracking number</label>
                    <input
                      type="text"
                      value={newTracking}
                      onChange={event => setNewTracking(event.target.value)}
                      placeholder="Tracking / con-note number"
                      className="form-input-custom font-mono"
                    />
                  </div>

                  <div>
                    <label className="form-label-custom">Delivery ETA</label>
                    <input
                      type="text"
                      value={newEta}
                      onChange={event => setNewEta(event.target.value)}
                      placeholder="Estimated delivery time"
                      className="form-input-custom"
                    />
                  </div>
                </div>

                {updateError && (
                  <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700">
                    {updateError}
                  </div>
                )}

                <div className="mt-4 flex items-center justify-end gap-2 border-t border-stone-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(null)}
                    className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-xs font-bold text-stone-600 hover:bg-stone-50"
                  >
                    Close
                  </button>
                  <button type="submit" disabled={isUpdating} className="btn-saelyxe-primary">
                    {isUpdating ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>

              {selectedOrder.statusHistory?.length ? (
                <section className="rounded-2xl border border-stone-200 bg-white p-4">
                  <div className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-stone-400">Order history</div>
                  <div className="mt-3 space-y-3">
                    {[...selectedOrder.statusHistory].reverse().slice(0, 6).map((entry, index) => (
                      <div key={`${entry.timestamp}-${index}`} className="flex gap-3">
                        <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-stone-300" />
                        <div>
                          <div className="text-[11px] font-bold text-stone-700">{statusLabel(entry.status)}</div>
                          <div className="mt-0.5 text-[10px] text-stone-400">{formatOrderDate(entry.timestamp)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};
