import React, { useState } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  FileDown, 
  Truck, 
  Edit, 
  Eye, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  X,
  PackageCheck
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

  // Dispatch Update Modal state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState<OrderStatus>('confirmed');
  const [newCourier, setNewCourier] = useState('');
  const [newTracking, setNewTracking] = useState('');
  const [newEta, setNewEta] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);

  // Open Dispatch Modal
  const handleOpenDispatchModal = (order: Order) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setNewCourier(order.courierName || '');
    setNewTracking(order.trackingNumber || '');
    setNewEta(order.deliveryEta || '');
    setUpdateError('');
  };

  const handleSaveDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    setIsUpdating(true);
    try {
      const success = await onUpdateOrderStatus(selectedOrder.id, newStatus, {
        courierName: newCourier,
        trackingNumber: newTracking,
        deliveryEta: newEta
      });
      if (success) {
        setSelectedOrder(null);
        setUpdateError('');
      } else {
        setUpdateError('This status change is not valid yet, or the order could not be updated. Follow the order stages in sequence.');
      }
    } catch (err) {
      console.error('Error updating order dispatch:', err);
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
    link.setAttribute('download', `saelyxe_commissions_${new Date().toISOString().slice(0, 10)}.csv`);
    link.click();
    URL.revokeObjectURL(url);
    await onAudit?.('ORDER_CSV_EXPORT', `Exported ${orders.length} order records to CSV.`);
  };

  // Filter orders
  const filteredOrders = orders.filter(o => {
    const matchesSearch = !searchQuery.trim() ||
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.phone?.includes(searchQuery) ||
      o.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.items?.some(i => i.title.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Table Card Container matching Doc 2 */}
      <div className="table-card-custom">
        {/* Header Controls */}
        <div className="table-header-control">
          {/* Search bar */}
          <div className="table-search-box">
            <Search className="w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search orders, customers, or products..."
              className="table-search-input"
            />
          </div>

          {/* Action buttons / Filter options */}
          <div className="table-filter-group relative">
            <div className="relative">
              <button
                onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                className="btn-table-action"
                type="button"
              >
                <Filter className="w-3.5 h-3.5 text-stone-500" />
                <span>
                  {statusFilter === 'all' ? 'Status Filter' : `Status: ${statusFilter}`}
                </span>
              </button>

              {isFilterDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-stone-200 p-1 z-20">
                  {[
                    { id: 'all', label: 'All Statuses' },
                    { id: 'placed', label: 'Placed (New)' },
                    { id: 'confirmed', label: 'Confirmed / Processing' },
                    { id: 'packed', label: 'Packed' },
                    { id: 'dispatched', label: 'Dispatched' },
                    { id: 'out_for_delivery', label: 'Out for Delivery' },
                    { id: 'delivered', label: 'Delivered (Completed)' },
                    { id: 'cancelled', label: 'Cancelled' }
                  ].map(s => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setStatusFilter(s.id);
                        setIsFilterDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold ${
                        statusFilter === s.id 
                          ? 'bg-stone-100 text-stone-900 font-bold' 
                          : 'text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {isSuperAdmin && (
              <button
                onClick={() => void handleExportCSV()}
                className="btn-table-action"
                type="button"
              >
                <FileDown className="w-3.5 h-3.5 text-stone-500" />
                <span>Export CSV</span>
              </button>
            )}
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="table-custom">
            <thead>
              <tr>
                <th>ORDER ID</th>
                <th>CUSTOMER</th>
                <th>PRODUCT INFO</th>
                <th>LOGISTICS & COURIER</th>
                <th>AMOUNT</th>
                <th>ORDER DATE</th>
                <th>STATUS</th>
                <th className="text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-stone-400 text-xs">
                    No orders match your current search or filter.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => {
                  const firstItem = order.items?.[0];
                  const extraItemsCount = (order.items?.length || 1) - 1;

                  return (
                    <tr key={order.id}>
                      {/* Order ID */}
                      <td className="font-mono font-bold text-xs text-stone-900">
                        #{order.orderNumber}
                      </td>

                      {/* Customer */}
                      <td>
                        <div className="table-user-cell">
                          <div className="table-user-avatar bg-stone-100 text-stone-800 flex items-center justify-center font-bold text-xs">
                            {order.customerName?.slice(0, 2).toUpperCase() || '—'}
                          </div>
                          <div>
                            <div className="table-user-name">{order.customerName || 'Missing customer data'}</div>
                            <div className="table-user-sub">
                              {order.city || '—'}{order.phone ? ` • ${order.phone}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Product Info */}
                      <td>
                        <div className="text-xs font-semibold text-stone-900 line-clamp-1">
                          {firstItem?.title || 'Unknown product'}
                        </div>
                        <div className="text-[11px] text-stone-400">
                          Size: {firstItem?.size || '—'} {extraItemsCount > 0 ? `(+${extraItemsCount} more)` : ''}
                        </div>
                      </td>

                      {/* Logistics & Courier */}
                      <td>
                        <div className="text-xs font-medium text-stone-800">
                          {order.courierName || 'Pending assignment'}
                        </div>
                        <div className="text-[11px] text-stone-500 font-mono">
                          {order.trackingNumber || '—'}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="text-xs whitespace-nowrap">
                        <div className="font-extrabold text-stone-900">{formatPrice(order.totalLKR)}</div>
                        <div className={`mt-1 text-[10px] font-bold uppercase ${
                          order.paymentStatus === 'verified' ? 'text-emerald-700' :
                          order.paymentStatus === 'refunded' ? 'text-blue-700' :
                          order.paymentStatus === 'refund_pending' ? 'text-amber-700' :
                          'text-stone-400'
                        }`}>
                          {order.paymentStatus || 'pending'}
                        </div>
                      </td>

                      {/* Order Date */}
                      <td className="text-xs text-stone-500 whitespace-nowrap">
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        }) : '—'}
                      </td>

                      {/* Status with Dot */}
                      <td>
                        <span className={`status-pill ${
                          order.status === 'delivered' ? 'status-paid' :
                          order.status === 'dispatched' ? 'status-blue' :
                          order.status === 'cancelled' ? 'status-failed' :
                          'status-processing'
                        }`}>
                          <span className="status-dot" />
                          <span className="capitalize">{order.status}</span>
                        </span>
                        {order.cancellationRequestStatus === 'pending' && (
                          <div className="mt-1 text-[9px] font-extrabold uppercase tracking-wider text-amber-700">
                            Cancellation Requested
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="text-center whitespace-nowrap">
                        <button
                          onClick={() => handleOpenDispatchModal(order)}
                          className="btn-saelyxe-primary py-1.5! px-3! text-xs"
                          title="Manage order fulfillment"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Manage</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="p-4 bg-[#FAFBFB] border-t border-stone-100 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-500">
          <span>Showing <strong>{filteredOrders.length}</strong> loaded orders</span>
          {hasMoreOrders ? (
            <button
              type="button"
              disabled={isLoadingOlder}
              onClick={async () => {
                setIsLoadingOlder(true);
                await onLoadOlderOrders();
                setIsLoadingOlder(false);
              }}
              className="btn-table-action"
            >
              {isLoadingOlder ? 'Loading...' : 'Load Older Orders'}
            </button>
          ) : (
            <span className="font-mono text-[11px]">End of loaded order history</span>
          )}
        </div>
      </div>

      {/* Update Dispatch Status Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-stone-200">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-stone-900">
                  Update Order
                </h3>
                <p className="text-xs text-stone-500">
                  Order #{selectedOrder.orderNumber} • {selectedOrder.customerName}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDispatch} className="p-6 space-y-4">
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-[11px] text-stone-600">
                Payment: <strong>{selectedOrder.paymentStatus || 'pending'}</strong>
                {selectedOrder.refundStatus ? <> · Refund: <strong>{selectedOrder.refundStatus}</strong></> : null}
                {selectedOrder.paymentCaptureId ? <> · Capture: <span className="font-mono">{selectedOrder.paymentCaptureId}</span></> : null}
              </div>
              {selectedOrder.cancellationRequestStatus === 'pending' && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900">
                  <div className="font-extrabold uppercase tracking-wider text-[10px]">Customer Cancellation Request</div>
                  <p className="mt-1">{selectedOrder.cancellationReason || 'No reason supplied.'}</p>
                  {selectedOrder.cancellationRequestedAt && (
                    <p className="mt-1 font-mono text-[9px] text-amber-700">{new Date(selectedOrder.cancellationRequestedAt).toLocaleString()}</p>
                  )}
                </div>
              )}

              <div className="rounded-xl border border-stone-200 bg-white p-3">
                <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-stone-400 mb-2">Order Timeline</div>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {(selectedOrder.statusHistory || []).length > 0 ? [...selectedOrder.statusHistory].reverse().map((event, index) => (
                    <div key={`${event.status}-${event.timestamp}-${index}`} className="flex gap-2.5 text-[11px]">
                      <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-600" />
                      <div>
                        <div className="font-bold capitalize text-stone-800">{event.status.replace(/_/g, ' ')}</div>
                        <div className="text-stone-500">{event.note}</div>
                        <div className="mt-0.5 font-mono text-[9px] text-stone-400">
                          {new Date(event.timestamp).toLocaleString()} {event.location ? `· ${event.location}` : ''}
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-[11px] text-stone-400">No timeline events recorded yet.</div>
                  )}
                </div>
              </div>

              <div>
                <label className="form-label-custom">Order Status</label>
                <select
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value as OrderStatus)}
                  className="form-input-custom font-semibold"
                >
                  <option value="placed">Placed (Pending Review)</option>
                  <option value="confirmed">Confirmed (Payment Verified)</option>
                  <option value="packed">Packed (Ready for Dispatch)</option>
                  <option value="dispatched">Dispatched (Courier Collected)</option>
                  <option value="out_for_delivery">Out for Delivery</option>
                  <option value="delivered">Delivered (Handover Complete)</option>
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
                <label className="form-label-custom">Courier & Logistics Provider</label>
                <input
                  type="text"
                  value={newCourier}
                  required={['dispatched', 'out_for_delivery', 'delivered'].includes(newStatus)}
                  onChange={e => setNewCourier(e.target.value)}
                  placeholder="e.g. Saelyxe White-Glove Van 04"
                  className="form-input-custom"
                />
              </div>

              <div>
                <label className="form-label-custom">Tracking Number / Con-Note</label>
                <input
                  type="text"
                  value={newTracking}
                  required={['dispatched', 'out_for_delivery', 'delivered'].includes(newStatus)}
                  onChange={e => setNewTracking(e.target.value)}
                  placeholder="e.g. EXP-751395"
                  className="form-input-custom font-mono"
                />
              </div>

              <div>
                <label className="form-label-custom">Estimated Delivery ETA</label>
                <input
                  type="text"
                  value={newEta}
                  onChange={e => setNewEta(e.target.value)}
                  placeholder="e.g. Tomorrow by 2:00 PM"
                  className="form-input-custom"
                />
              </div>
              {['dispatched', 'out_for_delivery', 'delivered'].includes(newStatus) && (!newCourier.trim() || !newTracking.trim()) && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                  Courier and tracking number are required from Dispatch onward.
                </div>
              )}

              {updateError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {updateError}
                </div>
              )}

              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="btn-table-action"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="btn-saelyxe-primary"
                >
                  {isUpdating ? 'Updating...' : 'Save Order Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
