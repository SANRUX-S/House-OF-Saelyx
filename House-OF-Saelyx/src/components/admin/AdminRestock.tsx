import React, { useEffect, useMemo, useState } from 'react';
import { Play, CheckCircle2, AlertCircle, Search, Send, Zap, RefreshCw, Mail } from 'lucide-react';
import { StockNotification, Product } from '../../types';

export interface AdminRestockProps {
  stockNotifications: StockNotification[];
  products: Product[];
  onTriggerRestock: (productId?: string) => Promise<{ success: boolean; message: string }>;
}

export const AdminRestock: React.FC<AdminRestockProps> = ({ stockNotifications, products, onTriggerRestock }) => {
  const [selectedProductId, setSelectedProductId] = useState('');
  const [isTriggering, setIsTriggering] = useState(false);
  const [dispatchingProductId, setDispatchingProductId] = useState('');
  const [resultMessage, setResultMessage] = useState<{ success: boolean; message: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (selectedProductId && products.some(product => product.id === selectedProductId)) return;
    setSelectedProductId(products[0]?.id || '');
  }, [products, selectedProductId]);

  const totalRequests = stockNotifications.length;
  const pendingRequests = stockNotifications.filter(n => n.status === 'pending').length;
  const dispatchedRequests = stockNotifications.filter(n => n.status === 'sent' || n.status === 'dispatched' || n.notified).length;
  const failedRequests = stockNotifications.filter(n => n.status === 'failed').length;
  const sendingRequests = stockNotifications.filter(n => n.status === 'sending').length;

  const runDispatch = async (productId: string, mode: 'batch' | 'row') => {
    if (!productId || isTriggering || dispatchingProductId) return;
    if (mode === 'batch') setIsTriggering(true);
    else setDispatchingProductId(productId);
    setResultMessage(null);
    try {
      const result = await onTriggerRestock(productId);
      setResultMessage(result);
    } catch (error) {
      setResultMessage({ success: false, message: error instanceof Error ? error.message : 'Restock dispatch failed.' });
    } finally {
      if (mode === 'batch') setIsTriggering(false);
      else setDispatchingProductId('');
    }
  };

  const filteredList = useMemo(() => stockNotifications.filter(notification => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return notification.productTitle?.toLowerCase().includes(query) ||
      notification.customerName?.toLowerCase().includes(query) ||
      notification.customerEmail?.toLowerCase().includes(query) ||
      notification.selectedSize?.toLowerCase().includes(query);
  }), [stockNotifications, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-stat !min-h-32"><span className="stat-label">Total Waitlist Requests</span><div className="stat-value">{totalRequests}</div><span className="text-xs text-stone-500">Registered patron waitlist entries</span></div>
        <div className="card-stat !min-h-32"><span className="stat-label">Awaiting Restock Batch</span><div className="stat-value text-amber-600">{pendingRequests}</div><span className="text-xs text-stone-500">Queued for next restock batch</span></div>
        <div className="card-stat !min-h-32"><span className="stat-label">Dispatched Alerts</span><div className="stat-value text-emerald-600">{dispatchedRequests}</div><span className="text-xs text-stone-500">Successfully accepted by the email provider</span></div>
        <div className="card-stat !min-h-32 !bg-[#051C12] !text-white border-transparent"><div className="flex items-center gap-2 text-xs font-bold text-[#B4F105] uppercase tracking-wider"><Zap className="w-3.5 h-3.5" /><span>Email Delivery</span></div><div className="font-mono text-sm font-bold text-white mt-1">{sendingRequests} sending · {failedRequests} failed</div><div className="text-[11px] text-stone-400">Failed recipients can be retried without re-sending successful entries.</div></div>
      </div>

      <div className="admin-card space-y-4">
        <div><h3 className="text-base font-bold text-stone-900 flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500" /><span>Restock Email Dispatcher</span></h3><p className="text-xs text-stone-500 max-w-2xl mt-1">Select a product to send verified restock emails to pending subscribers. Delivery state is saved only after the provider accepts the request.</p></div>
        {resultMessage && <div className={`p-4 rounded-xl text-xs flex items-center gap-2.5 ${resultMessage.success ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-rose-50 border border-rose-200 text-rose-800'}`}>{resultMessage.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />}<span>{resultMessage.message}</span></div>}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
          <div className="flex-1"><select value={selectedProductId} onChange={event => setSelectedProductId(event.target.value)} className="form-input-custom font-semibold text-xs"><option value="">Select a product to restock...</option>{products.map(product => <option key={product.id} value={product.id}>{product.title} ({product.stockCount ?? 0} units)</option>)}</select></div>
          <button type="button" onClick={() => void runDispatch(selectedProductId, 'batch')} disabled={isTriggering || Boolean(dispatchingProductId) || !selectedProductId} className="btn-saelyxe-lime whitespace-nowrap text-xs disabled:opacity-50">{isTriggering ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /><span>Sending Emails...</span></> : <><Play className="w-3.5 h-3.5 fill-current" /><span>EXECUTE RESTOCK ALERTS</span></>}</button>
        </div>
      </div>

      <div className="table-card-custom">
        <div className="table-header-control"><div><h4 className="text-sm font-bold text-stone-900">Registered Waitlist Records</h4><p className="text-xs text-stone-500">Live synchronized records from Firestore stock_notifications</p></div><div className="table-search-box"><Search className="w-4 h-4 text-stone-400" /><input type="text" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Search patron, email, product..." className="table-search-input" /></div></div>
        <div className="overflow-x-auto">
          <table className="table-custom">
            <thead><tr><th>PRODUCT</th><th>PATRON DETAILS</th><th>SIZE</th><th>CHANNEL</th><th>STATUS</th><th>REGISTERED</th><th className="text-center">ACTIONS</th></tr></thead>
            <tbody>
              {filteredList.length === 0 ? <tr><td colSpan={7} className="text-center py-12 text-stone-400 text-xs">No patron restock requests queued.</td></tr> : filteredList.map(notification => {
                const alreadySent = notification.status === 'sent' || notification.status === 'dispatched' || notification.notified;
                const rowBusy = dispatchingProductId === notification.productId;
                return (
                  <tr key={notification.id}>
                    <td><div className="flex items-center gap-3">{notification.productImage ? <img src={notification.productImage} alt={notification.productTitle} className="w-10 h-10 rounded-lg object-cover bg-stone-100 flex-shrink-0" /> : <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center text-[8px] font-bold text-stone-400 text-center px-1 flex-shrink-0">NO IMAGE</div>}<div><div className="text-xs font-bold text-stone-900">{notification.productTitle}</div><div className="text-[10px] text-stone-400 font-mono">ID: {notification.productId}</div></div></div></td>
                    <td><div className="text-xs font-bold text-stone-900">{notification.customerName || 'Patron'}</div><div className="text-[11px] text-stone-500">{notification.customerEmail}</div>{notification.phone && <div className="text-[10px] text-stone-400">{notification.phone}</div>}</td>
                    <td><span className="px-2.5 py-1 bg-stone-100 rounded-md text-xs font-mono font-bold text-stone-800">{notification.selectedSize || 'All'}</span></td>
                    <td><div className="flex items-center gap-1.5 text-xs text-stone-700"><Mail className="w-3.5 h-3.5 text-stone-400" /><span>Email Alert</span></div></td>
                    <td><span className={`status-pill ${alreadySent ? 'status-paid' : notification.status === 'failed' ? 'status-failed' : 'status-processing'}`}><span className="status-dot" /><span className="capitalize">{notification.status || 'Pending'}</span></span></td>
                    <td className="text-xs text-stone-500 whitespace-nowrap">{notification.createdAt ? new Date(notification.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'}</td>
                    <td className="text-center"><button type="button" onClick={() => void runDispatch(notification.productId, 'row')} disabled={alreadySent || isTriggering || Boolean(dispatchingProductId)} className="btn-saelyxe-primary !py-1 !px-2.5 text-[11px] disabled:opacity-40">{rowBusy ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}<span>{rowBusy ? 'Sending...' : 'Dispatch'}</span></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
