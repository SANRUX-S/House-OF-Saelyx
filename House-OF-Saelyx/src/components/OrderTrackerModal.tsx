import React, { useState } from 'react';
import { X, Search, CheckCircle2, Clock, Truck, Package, MapPin, ShieldCheck, ArrowRight } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Order, OrderStatus } from '../types';
import { auth, getAppCheckRequestHeaders } from '../lib/firebase';

export const OrderTrackerModal: React.FC = () => {
  const { isTrackerOpen, setIsTrackerOpen, user, setIsAuthOpen } = useStore();
  const [query, setQuery] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    if (!auth.currentUser || !user) {
      setOrder(null);
      setError('');
      setIsTrackerOpen(false);
      setIsAuthOpen(true);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const token = await auth.currentUser.getIdToken();
      const appCheckHeaders = await getAppCheckRequestHeaders();
      const headers = new Headers({
        Authorization: `Bearer ${token}`,
        Accept: 'application/json'
      });
      Object.entries(appCheckHeaders).forEach(([key, value]) => headers.set(key, value));

      const res = await fetch(`/api/orders/${encodeURIComponent(query.trim())}`, {
        method: 'GET',
        headers,
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
      } else {
        setOrder(null);
        setError('No order belonging to this account was found with that reference.');
      }
    } catch (err) {
      setError('Unable to fetch order status. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  if (!isTrackerOpen) return null;

  const getStatusIndex = (status: OrderStatus) => {
    const map: Record<OrderStatus, number> = {
      placed: 0,
      confirmed: 1,
      packed: 2,
      dispatched: 3,
      out_for_delivery: 4,
      delivered: 5,
      cancelled: 0
    };
    return map[status] ?? 0;
  };

  const steps = [
    { label: 'Order Placed', desc: 'Order securely recorded', icon: Clock },
    { label: 'Confirmed', desc: 'Payment manually verified by SAELYXE operations', icon: CheckCircle2 },
    { label: 'Packed', desc: 'Prepared for courier collection', icon: Package },
    { label: 'Dispatched', desc: 'Collected by the assigned courier', icon: Truck },
    { label: 'Out for Delivery', desc: 'Courier is completing the final delivery leg', icon: MapPin },
    { label: 'Delivered', desc: 'Delivery completed', icon: ShieldCheck }
  ];

  const currentStep = order ? getStatusIndex(order.status) : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto select-none">
      <div
        onClick={() => setIsTrackerOpen(false)}
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
      />

      <div className="min-h-screen px-4 py-12 flex items-center justify-center">
        <div className="relative w-full max-w-2xl bg-[#181614] text-white rounded-3xl shadow-2xl border border-white/15 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-emerald-400" />
              <h2 className="font-serif text-xl tracking-wide">DIRECT HAND-DELIVERY TRACKER</h2>
            </div>
            <button
              onClick={() => setIsTrackerOpen(false)}
              className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Form */}
          <div className="p-4 sm:p-6 space-y-6">
            <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Enter your SOX order reference"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-base sm:text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-white min-h-[44px]"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-white text-black font-semibold text-xs uppercase tracking-widest rounded-xl hover:bg-neutral-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 min-h-[44px] cursor-pointer"
              >
                <span>{loading ? 'TRACKING...' : 'TRACK'}</span>
                <Search className="w-4 h-4" />
              </button>
            </form>

            {error && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
                {error}
              </div>
            )}

            {/* Live Order Status Display */}
            {order && (
              <div className="space-y-6 pt-2 animate-in fade-in">
                {/* Order Summary Card */}
                <div className="bg-white/5 rounded-2xl p-5 border border-white/10 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold">
                        Order Reference
                      </div>
                      <div className="font-mono text-base font-bold text-white">
                        {order.orderNumber}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold">
                        Courier Dispatch
                      </div>
                      <div className="text-xs text-amber-300 font-medium">
                        {order.courierName || 'Pending assignment'}{order.trackingNumber ? ` (${order.trackingNumber})` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-neutral-400 block text-[10px] uppercase tracking-wider">Recipient:</span>
                      <span className="text-white font-medium">{order.city || 'Destination protected'}</span>
                      <p className="text-[11px] text-neutral-400 mt-0.5">{order.country || 'Private delivery region'}</p>
                    </div>
                    <div>
                      <span className="text-neutral-400 block text-[10px] uppercase tracking-wider">Hand-Delivery ETA:</span>
                      <span className="text-emerald-400 font-semibold">{order.deliveryEta}</span>
                    </div>
                  </div>
                </div>

                {/* Visual Progress Stepper */}
                <div className="space-y-3">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-neutral-400 font-semibold">
                    Delivery Journey
                  </div>

                  <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/15">
                    {steps.map((step, idx) => {
                      const isComplete = idx <= currentStep;
                      const isCurrent = idx === currentStep;
                      const Icon = step.icon;

                      return (
                        <div key={idx} className="relative flex items-start gap-4">
                          <div
                            className={`absolute -left-6 top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all ${
                              isCurrent
                                ? 'bg-emerald-400 text-black ring-4 ring-emerald-400/20'
                                : isComplete
                                ? 'bg-white text-black'
                                : 'bg-neutral-800 text-neutral-500 border border-white/10'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4
                                className={`text-xs font-semibold uppercase tracking-wider ${
                                  isComplete ? 'text-white' : 'text-neutral-500'
                                }`}
                              >
                                {step.label}
                              </h4>
                              {isCurrent && (
                                <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                                  IN PROGRESS
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-neutral-400">{step.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Items in this drop order */}
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-2">
                  <div className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold mb-1">
                    Garments in Delivery
                  </div>
                  {order.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-white/5 last:border-0">
                      <div className="flex items-center gap-2 truncate">
                        <img src={item.image} alt="" className="w-8 h-10 object-cover rounded bg-neutral-800" />
                        <span className="truncate">{item.title} ({item.size})</span>
                      </div>
                      <span className="font-mono text-neutral-300">x{item.quantity}</span>
                    </div>
                  ))}
                </div>

              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
