import React, { useEffect, useMemo, useState } from 'react';
import { Search, Filter, FileDown, Truck, X, RefreshCw } from 'lucide-react';
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
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState<OrderStatus>('confirmed');
  const [newCourier, setNewCourier] = useState('');
  const [newTracking, setNewTracking] = useState('');
  const [newEta, setNewEta] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [loadOlderError, setLoadOlderError] = useState('');

  const closeModal = () => {
    if (isUpdating) return;
    setSelectedOrder(null);
    setUpdateError('');
  };

  useEffect(() => {
    if (!selectedOrder) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isUpdating) closeModal();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedOrder, isUpdating]);

  const handleOpenDispatchModal = (order: Order) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setNewCourier(order.courierName || '');
    setNewTracking(order.trackingNumber || '');
    setNewEta(order.deliveryEta || '');
    setUpdateError('');
  };

  const handleSaveDispatch = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedOrder || isUpdating) return;
    setIsUpdating(true);
    setUpdateError('');
    try {
      const success = await onUpdateOrderStatus(selectedOrder.id, newStatus, {
        courierName: newCourier.trim(),
        trackingNumber: newTracking.trim(),
        deliveryEta: newEta.trim()
      });
      if (!success) {
        setUpdateError('The order could not be updated. Check payment verification, courier/tracking requirements, refund rules, and your administrator session.');
        return;
      }
      setSelectedOrder(null);
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : 'The order update failed unexpectedly. Please retry.');
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
    const blob = new Blob([[headers.map(csvCell).join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `saelyxe_orders_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    try {
      await onAudit?.('ORDER_CSV_EXPORT', `Exported ${orders.length} order records to CSV.`);
    } catch (error) {
      console.warn('Order CSV audit logging failed:', error);
    }
  };

  const filteredOrders = useMemo(() => orders.filter(order => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query ||
      order.orderNumber.toLowerCase().includes(query) ||
      order.customerName.toLowerCase().includes(query) ||
      order.phone?.includes(query) ||
      order.city?.toLowerCase().includes(query) ||
      order.items?.some(item => item.title.toLowerCase().includes(query));
    return matchesSearch && (statusFilter === 'all' || order.status === statusFilter);
  }), [orders, searchQuery, statusFilter]);

  const loadOlder = async () => {
    if (isLoadingOlder) return;
    setIsLoadingOlder(true);
    setLoadOlderError('');
    try {
      const success = await onLoadOlderOrders();
      if (!success) setLoadOlderError('Older orders could not be loaded. Please retry.');
    } catch (error) {
      setLoadOlderError(error instanceof Error ? error.message : 'Older orders could not be loaded.');
    } finally {
      setIsLoadingOlder(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="table-card-custom">
        <div className="table-header-control">
          <div className="table-search-box">
            <Search className="w-4 h-4 text-stone-400" />
            <input type="text" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Search orders, customers, or products..." className="table-search-input" />
          </div>
          <div className="table-filter-group relative">
            <div className="relative">
              <button type="button" onClick={() => setIsFilterDropdownOpen(open => !open)} className="btn-table-action"><Filter className="w-3.5 h-3.5 text-stone-500" /><span>{statusFilter === 'all' ? 'Status Filter' : `Status: ${statusFilter}`}</span></button>
              {isFilterDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-stone-200 p-1 z-20">
                  {[
                    ['all', 'All Statuses'], ['placed', 'Placed (New)'], ['confirmed', 'Confirmed / Processing'], ['packed', 'Packed'], ['dispatched', 'Dispatched'], ['out_for_delivery', 'Out for Delivery'], ['delivered', 'Delivered'], ['cancelled', 'Cancelled']
                  ].map(([id, label]) => (
                    <button type="button" key={id} onClick={() => { setStatusFilter(id); setIsFilterDropdownOpen(false); }} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold ${statusFilter === id ? 'bg-stone-100 text-stone-900 font-bold' : 'text-stone-600 hover:bg-stone-50'}`}>{label}</button>
                  ))}
                </div>
              )}
            </div>
            {isSuperAdmin && <button type="button" onClick={() => void handleExportCSV()} className="btn-table-action"><FileDown className="w-3.5 h-3.5 text-stone-500" /><span>Export CSV</span></button>}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table-custom">
            <thead><tr><th>ORDER ID</th><th>CUSTOMER</th><th>PRODUCT INFO</th><th>LOGISTICS</th><th>AMOUNT</th><th>ORDER DATE</th><th>STATUS</th><th className="text-center">ACTIONS</th></tr></thead>
            <tbody>
              {filteredOrders.length === 0 ? <tr><td colSpan={8} className="text-center py-12 text-stone-400 text-xs">No orders match the current search or filter.</td></tr> : filteredOrders.map(order => {
                const firstItem = order.items?.[0];
                const extraItemsCount = Math.max(0, (order.items?.length || 0) - 1);
                return (
                  <tr key={order.id}>
                    <td className="font-mono font-bold text-xs text-stone-900">#{order.orderNumber}</td>
                    <td><div className="table-user-cell"><div className="table-user-avatar bg-stone-100 text-stone-800 flex items-center justify-center font-bold text-xs">{order.customerName?.slice(0, 2).toUpperCase() || '—'}</div><div><div className="table-user-name">{order.customerName || 'Missing customer data'}</div><div className="table-user-sub">{order.city || '—'}{order.phone ? ` • ${order.phone}` : ''}</div></div></div></td>
                    <td><div className="text-xs font-semibold text-stone-900 line-clamp-1">{firstItem?.title || 'Unknown product'}</div><div className="text-[11px] text-stone-400">Size: {firstItem?.size || '—'} {extraItemsCount > 0 ? `(+${extraItemsCount} more)` : ''}</div></td>
                    <td><div className="text-xs font-medium text-stone-800">{order.courierName || 'Pending assignment'}</div><div className="text-[11px] text-stone-500 font-mono">{order.trackingNumber || '—'}</div></td>
                    <td className="text-xs whitespace-nowrap"><div className="font-extrabold text-stone-900">{formatPrice(order.totalLKR)}</div><div className="mt-1 text-[10px] font-bold uppercase text-stone-500">{order.paymentStatus || 'pending'}</div></td>
                    <td className="text-xs text-stone-500 whitespace-nowrap">{order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                    <td><span className={`status-pill ${order.status === 'delivered' ? 'status-paid' : order.status === 'dispatched' ? 'status-blue' : order.status === 'cancelled' ? 'status-failed' : 'status-processing'}`}><span className="status-dot" /><span className="capitalize">{order.status.replace(/_/g, ' ')}</span></span>{order.cancellationRequestStatus === 'pending' && <div className="mt-1 text-[9px] font-extrabold uppercase tracking-wider text-amber-700">Cancellation Requested</div>}</td>
                    <td className="text-center whitespace-nowrap"><button type="button" onClick={() => handleOpenDispatchModal(order)} className="btn-saelyxe-primary py-1.5! px-3! text-xs" title="Manage order fulfillment"><Truck className="w-3.5 h-3.5" /><span>Manage</span></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-[#FAFBFB] border-t border-stone-100 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-500">
          <span>Showing <strong>{filteredOrders.length}</strong> loaded orders</span>
          {loadOlderError && <span className="text-rose-700">{loadOlderError}</span>}
          {hasMoreOrders ? <button type="button" disabled={isLoadingOlder} onClick={() => void loadOlder()} className="btn-table-action">{isLoadingOlder ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading...</> : 'Load Older Orders'}</button> : <span className="font-mono text-[11px]">End of loaded order history</span>}
        </div>
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in" onMouseDown={event => { if (event.target === event.currentTarget) closeModal(); }}>
          <div role="dialog" aria-modal="true" className="bg-white rounded-2xl max-w-md w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-stone-200" onMouseDown={event => event.stopPropagation()}>
            <div className="p-5 border-b border-stone-100 flex items-center justify-between">
              <div><h3 className="text-base font-extrabold text-stone-900">Update Order</h3><p className="text-xs text-stone-500">Order #{selectedOrder.orderNumber} • {selectedOrder.customerName}</p></div>
              <button type="button" disabled={isUpdating} onClick={closeModal} className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg disabled:opacity-40" aria-label="Close order editor"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveDispatch} className="p-6 space-y-4 overflow-y-auto">
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-[11px] text-stone-600">
                Payment: <strong>{selectedOrder.paymentStatus || 'pending'}</strong>
                {selectedOrder.refundStatus ? <> · Refund: <strong>{selectedOrder.refundStatus}</strong></> : null}
                {selectedOrder.paymentCaptureId ? <><br />Capture: <span className="font-mono">{selectedOrder.paymentCaptureId}</span></> : null}
                <span className="block mt-1">Last customer email: <strong>{selectedOrder.lastStatusEmailStatus || selectedOrder.confirmationEmailStatus || 'not recorded'}</strong></span>
              </div>

              {selectedOrder.cancellationRequestStatus === 'pending' && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900"><div className="font-extrabold uppercase tracking-wider text-[10px]">Customer Cancellation Request</div><p className="mt-1">{selectedOrder.cancellationReason || 'No reason supplied.'}</p></div>}

              <div className="rounded-xl border border-stone-200 bg-white p-3">
                <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-stone-400 mb-2">Order Timeline</div>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {(selectedOrder.statusHistory || []).length > 0 ? [...(selectedOrder.statusHistory || [])].reverse().map((historyEvent, index) => (
                    <div key={`${historyEvent.status}-${historyEvent.timestamp}-${index}`} className="flex gap-2.5 text-[11px]">
                      <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-600" />
                      <div>
                        <div className="font-bold capitalize text-stone-800">{historyEvent.status.replace(/_/g, ' ')}</div>
                        <div className="text-stone-500">{historyEvent.note}</div>
                        <div className="mt-0.5 font-mono text-[9px] text-stone-400">{new Date(historyEvent.timestamp).toLocaleString()} {historyEvent.location ? `· ${historyEvent.location}` : ''}</div>
                      </div>
                    </div>
                  )) : <div className="text-[11px] text-stone-400">No timeline events recorded yet.</div>}
                </div>
              </div>

              <div>
                <label className="form-label-custom">Order Status</label>
                <select value={newStatus} onChange={event => setNewStatus(event.target.value as OrderStatus)} className="form-input-custom font-semibold">
                  <option value="placed">Placed (Pending Review)</option><option value="confirmed">Confirmed (Processing)</option><option value="packed">Packed</option><option value="dispatched">Dispatched</option><option value="out_for_delivery">Out for Delivery</option><option value="delivered">Delivered</option>
                  <option value="cancelled" disabled={(selectedOrder.paymentMethod === 'payzy' && selectedOrder.paymentStatus === 'verified') || (!isSuperAdmin && selectedOrder.paymentMethod === 'paypal' && ['verified', 'refund_pending'].includes(selectedOrder.paymentStatus || ''))}>{selectedOrder.paymentMethod === 'payzy' && selectedOrder.paymentStatus === 'verified' ? 'Refund in Payzy Merchant Portal First' : selectedOrder.paymentMethod === 'paypal' && ['verified', 'refund_pending'].includes(selectedOrder.paymentStatus || '') ? 'Cancel & Refund PayPal Payment (Super Admin)' : 'Cancelled'}</option>
                </select>
                <p className="mt-2 text-[10px] leading-relaxed text-stone-500">You can select any active order stage directly. Courier and tracking details are required for Dispatched, Out for Delivery, and Delivered. Cancelled orders remain terminal for payment and audit safety.</p>
              </div>

              {selectedOrder.paymentMethod === 'payzy' && selectedOrder.paymentStatus === 'verified' && <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">Verified Payzy orders must be refunded in the Payzy merchant portal before cancellation.</div>}
              <div><label className="form-label-custom">Courier & Logistics Provider</label><input type="text" value={newCourier} required={['dispatched', 'out_for_delivery', 'delivered'].includes(newStatus)} onChange={event => setNewCourier(event.target.value)} placeholder="Enter courier or logistics provider" className="form-input-custom" /></div>
              <div><label className="form-label-custom">Tracking Number / Con-Note</label><input type="text" value={newTracking} required={['dispatched', 'out_for_delivery', 'delivered'].includes(newStatus)} onChange={event => setNewTracking(event.target.value)} placeholder="Enter courier tracking number" className="form-input-custom font-mono" /></div>
              <div><label className="form-label-custom">Estimated Delivery ETA</label><input type="text" value={newEta} onChange={event => setNewEta(event.target.value)} placeholder="e.g. Tomorrow by 2:00 PM" className="form-input-custom" /></div>
              {['dispatched', 'out_for_delivery', 'delivered'].includes(newStatus) && (!newCourier.trim() || !newTracking.trim()) && <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">Courier and tracking number are required from Dispatch onward.</div>}
              {updateError && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{updateError}</div>}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-3"><button type="button" disabled={isUpdating} onClick={closeModal} className="btn-table-action disabled:opacity-40">Cancel</button><button type="submit" disabled={isUpdating} className="btn-saelyxe-primary">{isUpdating ? 'Updating...' : 'Save Order Update'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
