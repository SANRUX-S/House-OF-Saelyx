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
}

export const AdminCommissions: React.FC<AdminCommissionsProps> = ({
  orders,
  formatPrice,
  onUpdateOrderStatus
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

  // Open Dispatch Modal
  const handleOpenDispatchModal = (order: Order) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setNewCourier(order.courierName || 'Saelyx White-Glove Van 04');
    setNewTracking(order.trackingNumber || `EXP-${Math.floor(100000 + Math.random() * 900000)}`);
    setNewEta(order.deliveryEta || 'Same-day VIP Doorstep Delivery');
  };

  const handleSaveDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    setIsUpdating(true);
    try {
      await onUpdateOrderStatus(selectedOrder.id, newStatus, {
        courierName: newCourier,
        trackingNumber: newTracking,
        deliveryEta: newEta
      });
      setSelectedOrder(null);
    } catch (err) {
      console.error('Error updating order dispatch:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Order Number,Customer Name,Email,Phone,City,Total LKR,Status,Date,Tracking'];
    const rows = orders.map(o => 
      `"${o.orderNumber}","${o.customerName}","${o.customerEmail || ''}","${o.phone}","${o.city}",${o.totalLKR},"${o.status}","${o.createdAt}","${o.trackingNumber || ''}"`
    );
    const csvContent = headers.concat(rows).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `saelyxe_commissions_${new Date().toISOString().slice(0, 10)}.csv`);
    link.click();
  };

  // Filter orders
  const filteredOrders = orders.filter(o => {
    const matchesSearch = !searchQuery.trim() ||
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.phone?.includes(searchQuery) ||
      o.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.items?.some(i => i.productTitle.toLowerCase().includes(searchQuery.toLowerCase()));

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
              placeholder="Search orders, clients, or items..."
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
                    { id: 'dispatched', label: 'In Dispatch' },
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

            <button
              onClick={handleExportCSV}
              className="btn-table-action"
              type="button"
            >
              <FileDown className="w-3.5 h-3.5 text-stone-500" />
              <span>Export CSV</span>
            </button>
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
                    No commission records match your filter criteria.
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
                            {order.customerName?.slice(0, 2) || 'VP'}
                          </div>
                          <div>
                            <div className="table-user-name">{order.customerName || 'VIP Patron'}</div>
                            <div className="table-user-sub">
                              {order.city || 'Colombo'} • {order.phone}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Product Info */}
                      <td>
                        <div className="text-xs font-semibold text-stone-900 line-clamp-1">
                          {firstItem?.productTitle || 'Silhouette Garment'}
                        </div>
                        <div className="text-[11px] text-stone-400">
                          Size: {firstItem?.selectedSize || 'Standard'} {extraItemsCount > 0 ? `(+${extraItemsCount} more)` : ''}
                        </div>
                      </td>

                      {/* Logistics & Courier */}
                      <td>
                        <div className="text-xs font-medium text-stone-800">
                          {order.courierName || 'Saelyx White-Glove Van 04'}
                        </div>
                        <div className="text-[11px] text-stone-500 font-mono">
                          {order.trackingNumber || 'Pending Allocation'}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="font-extrabold text-stone-900 text-xs whitespace-nowrap">
                        {formatPrice(order.totalLKR)}
                      </td>

                      {/* Order Date */}
                      <td className="text-xs text-stone-500 whitespace-nowrap">
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        }) : 'Recent'}
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
                      </td>

                      {/* Actions */}
                      <td className="text-center whitespace-nowrap">
                        <button
                          onClick={() => handleOpenDispatchModal(order)}
                          className="btn-saelyxe-primary !py-1.5 !px-3 text-xs"
                          title="Update Logistics & Dispatch"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Dispatch</span>
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
        <div className="p-4 bg-[#FAFBFB] border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
          <span>Showing <strong>{filteredOrders.length}</strong> of <strong>{orders.length}</strong> commissions</span>
          <span className="font-mono text-[11px]">All orders synchronized in real-time</span>
        </div>
      </div>

      {/* Update Dispatch Status Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-stone-200">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-stone-900">
                  Update Commission Dispatch
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
              <div>
                <label className="form-label-custom">Commission Status</label>
                <select
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value as OrderStatus)}
                  className="form-input-custom font-semibold"
                >
                  <option value="placed">Placed (Pending Review)</option>
                  <option value="confirmed">Confirmed (Atelier Processing)</option>
                  <option value="dispatched">Dispatched (White-Glove En Route)</option>
                  <option value="delivered">Delivered (Handover Complete)</option>
                  <option value="cancelled">Cancelled / Refunded</option>
                </select>
              </div>

              <div>
                <label className="form-label-custom">Courier & Logistics Provider</label>
                <input
                  type="text"
                  value={newCourier}
                  onChange={e => setNewCourier(e.target.value)}
                  placeholder="e.g. Saelyx White-Glove Van 04"
                  className="form-input-custom"
                />
              </div>

              <div>
                <label className="form-label-custom">Tracking Number / Con-Note</label>
                <input
                  type="text"
                  value={newTracking}
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
                  {isUpdating ? 'Updating...' : 'Save & Transmit Dispatch Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
