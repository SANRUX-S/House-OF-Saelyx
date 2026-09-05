import React, { useState } from 'react';
import { 
  Bell, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Send, 
  Zap, 
  Clock, 
  RefreshCw,
  Mail
} from 'lucide-react';
import { StockNotification, Product } from '../../types';

export interface AdminRestockProps {
  stockNotifications: StockNotification[];
  products: Product[];
  onTriggerRestock: (productId?: string) => Promise<{ success: boolean; message: string }>;
  onDeleteNotification?: (id: string) => Promise<boolean>;
}

export const AdminRestock: React.FC<AdminRestockProps> = ({
  stockNotifications,
  products,
  onTriggerRestock
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [isTriggering, setIsTriggering] = useState(false);
  const [resultMessage, setResultMessage] = useState<{ success: boolean; message: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const totalRequests = stockNotifications.length;
  const pendingRequests = stockNotifications.filter(n => n.status === 'pending').length;
  const dispatchedRequests = stockNotifications.filter(n => n.status === 'sent' || n.status === 'dispatched' || n.notified).length;
  const failedRequests = stockNotifications.filter(n => n.status === 'failed').length;
  const sendingRequests = stockNotifications.filter(n => n.status === 'sending').length;

  const handleExecuteRestock = async () => {
    if (!selectedProductId) return;
    setIsTriggering(true);
    setResultMessage(null);
    try {
      const res = await onTriggerRestock(selectedProductId);
      setResultMessage(res);
    } catch (err: any) {
      setResultMessage({
        success: false,
        message: err.message || 'Execution failed'
      });
    } finally {
      setIsTriggering(false);
    }
  };

  const filteredList = stockNotifications.filter(n => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return n.productTitle?.toLowerCase().includes(q) ||
      n.customerName?.toLowerCase().includes(q) ||
      n.customerEmail?.toLowerCase().includes(q) ||
      n.selectedSize?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 4 Dashboard-Style Queue Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-stat !min-h-32">
          <span className="stat-label">Total Waitlist Requests</span>
          <div className="stat-value">{totalRequests}</div>
          <span className="text-xs text-stone-500">Registered patron waitlist entries</span>
        </div>

        <div className="card-stat !min-h-32">
          <span className="stat-label">Awaiting Restock Batch</span>
          <div className="stat-value text-amber-600">{pendingRequests}</div>
          <span className="text-xs text-stone-500">Queued for next atelier batch cut</span>
        </div>

        <div className="card-stat !min-h-32">
          <span className="stat-label">Dispatched Alerts</span>
          <div className="stat-value text-emerald-600">{dispatchedRequests}</div>
          <span className="text-xs text-stone-500">Successfully accepted by the email provider</span>
        </div>

        <div className="card-stat !min-h-32 !bg-[#051C12] !text-white border-transparent">
          <div className="flex items-center gap-2 text-xs font-bold text-[#B4F105] uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5" />
            <span>Email Delivery</span>
          </div>
          <div className="font-mono text-sm font-bold text-white mt-1">
            {sendingRequests} sending · {failedRequests} failed
          </div>
          <div className="text-[11px] text-stone-400">
            Failed recipients are safe to retry without re-sending successful entries.
          </div>
        </div>
      </div>

      {/* Manual Restock Email Dispatcher */}
      <div className="admin-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Restock Email Dispatcher</span>
            </h3>
            <p className="text-xs text-stone-500 max-w-2xl mt-1">
              When a replenishment is ready, select the garment below to send verified restock emails to pending Firestore waitlist subscribers. Notifications are marked as sent only after the transactional email provider accepts delivery.
            </p>
          </div>
        </div>

        {resultMessage && (
          <div className={`p-4 rounded-xl text-xs flex items-center gap-2.5 ${
            resultMessage.success 
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}>
            {resultMessage.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{resultMessage.message}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
          <div className="flex-1">
            <select
              value={selectedProductId}
              onChange={e => setSelectedProductId(e.target.value)}
              className="form-input-custom font-semibold text-xs"
            >
              <option value="">Select a Garment Silhouette to Restock...</option>
              {products.map(prod => (
                <option key={prod.id} value={prod.id}>
                  {prod.title} ({prod.badge || 'Active'} • {prod.stockCount ?? 0} units)
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleExecuteRestock}
            disabled={isTriggering || !selectedProductId}
            className="btn-saelyxe-lime whitespace-nowrap text-xs disabled:opacity-50"
          >
            {isTriggering ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Sending Emails...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>EXECUTE RESTOCK ALERTS</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Registered Patron Waitlist Records */}
      <div className="table-card-custom">
        <div className="table-header-control">
          <div>
            <h4 className="text-sm font-bold text-stone-900">Registered Patron Waitlist Records</h4>
            <p className="text-xs text-stone-500">Live synchronized records from Firestore stock_notifications</p>
          </div>

          <div className="table-search-box">
            <Search className="w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search patron, email, garment..."
              className="table-search-input"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table-custom">
            <thead>
              <tr>
                <th>GARMENT</th>
                <th>PATRON DETAILS</th>
                <th>SIZE</th>
                <th>CHANNEL</th>
                <th>STATUS</th>
                <th>REGISTERED</th>
                <th className="text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-stone-400 text-xs">
                    No patron restock requests queued.
                  </td>
                </tr>
              ) : (
                filteredList.map(n => (
                  <tr key={n.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <img
                          src={n.productImage || 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=120&q=80'}
                          alt={n.productTitle}
                          className="w-10 h-10 rounded-lg object-cover bg-stone-100 flex-shrink-0"
                        />
                        <div>
                          <div className="text-xs font-bold text-stone-900">{n.productTitle}</div>
                          <div className="text-[10px] text-stone-400 font-mono">ID: {n.productId}</div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="text-xs font-bold text-stone-900">{n.customerName || 'Patron'}</div>
                      <div className="text-[11px] text-stone-500">{n.customerEmail}</div>
                      {n.phone && <div className="text-[10px] text-stone-400">{n.phone}</div>}
                    </td>

                    <td>
                      <span className="px-2.5 py-1 bg-stone-100 rounded-md text-xs font-mono font-bold text-stone-800">
                        {n.selectedSize || 'All'}
                      </span>
                    </td>

                    <td>
                      <div className="flex items-center gap-1.5 text-xs text-stone-700">
                        {n.channel === 'both' ? (
                          <>
                            <Mail className="w-3.5 h-3.5 text-stone-400" />
                            <span>Email Alert</span>
                          </>
                        ) : (
                          <>
                            <Mail className="w-3.5 h-3.5 text-stone-400" />
                            <span>Email Alert</span>
                          </>
                        )}
                      </div>
                    </td>

                    <td>
                      <span className={`status-pill ${
                        n.status === 'sent' || n.status === 'dispatched' || n.notified 
                          ? 'status-paid' 
                          : 'status-processing'
                      }`}>
                        <span className="status-dot" />
                        <span className="capitalize">{n.status || 'Pending'}</span>
                      </span>
                    </td>

                    <td className="text-xs text-stone-500 whitespace-nowrap">
                      {n.createdAt ? new Date(n.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      }) : 'Recent'}
                    </td>

                    <td className="text-center">
                      <button
                        onClick={() => onTriggerRestock(n.productId)}
                        disabled={n.status === 'sent' || n.status === 'dispatched' || n.notified}
                        className="btn-saelyxe-primary !py-1 !px-2.5 text-[11px] disabled:opacity-40"
                      >
                        <Send className="w-3 h-3" />
                        <span>Dispatch</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
