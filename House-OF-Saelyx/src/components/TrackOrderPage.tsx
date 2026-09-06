import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  Search, 
  CheckCircle2, 
  Package, 
  MapPin, 
  ShieldCheck, 
  ArrowLeft,
  AlertCircle,
  Clock,
  ExternalLink,
  Headset
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Order, OrderStatus } from '../types';
import { auth, getAppCheckRequestHeaders } from '../lib/firebase';

interface TrackOrderPageProps {
  initialOrderId?: string;
}

export const TrackOrderPage: React.FC<TrackOrderPageProps> = ({ initialOrderId }) => {
  const { currentRoute, navigateTo, user, setIsAuthOpen } = useStore();
  const [orderQuery, setOrderQuery] = useState(
    initialOrderId || (currentRoute.name === 'track-order' || currentRoute.name === 'track' ? (currentRoute as any).orderId || '' : '')
  );
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const fetchOrder = async (id: string) => {
    if (!id.trim()) return;
    if (!auth.currentUser || !user) {
      setOrder(null);
      setHasSearched(true);
      setError('Please sign in to the SAELYXE account that placed this order before tracking it.');
      return;
    }

    setLoading(true);
    setError('');
    setHasSearched(true);

    try {
      const token = await auth.currentUser.getIdToken();
      const appCheckHeaders = await getAppCheckRequestHeaders();
      const headers = new Headers({
        Authorization: `Bearer ${token}`,
        Accept: 'application/json'
      });
      Object.entries(appCheckHeaders).forEach(([key, value]) => headers.set(key, value));

      const res = await fetch(`/api/orders/${encodeURIComponent(id.trim())}`, {
        method: 'GET',
        headers,
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
      } else {
        setOrder(null);
        const payload = await res.json().catch(() => ({}));
        if (res.status === 401) {
          setError('Your session could not be verified. Please sign in again.');
        } else {
          setError(payload?.error || "We couldn't find an order belonging to this account with that reference.");
        }
      }
    } catch (err) {
      console.error(err);
      setError("We couldn't complete the tracking lookup. Please check your connection or contact atelier support.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderQuery) {
      fetchOrder(orderQuery);
    }
  }, []);

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrder(orderQuery);
  };

  const getStatusStepIndex = (status: OrderStatus) => {
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

  const trackingSteps = [
    { label: 'Order Placed', desc: 'Order securely recorded and awaiting payment/operations confirmation', icon: Clock },
    { label: 'Confirmed', desc: 'Payment verified and order confirmed', icon: CheckCircle2 },
    { label: 'Packed', desc: 'Order prepared and packed for dispatch', icon: Package },
    { label: 'Dispatched', desc: 'Courier assignment and tracking recorded', icon: Truck },
    { label: 'Out for Delivery', desc: 'Courier marked the order as out for delivery', icon: MapPin },
    { label: 'Delivered', desc: 'Order marked as delivered', icon: ShieldCheck }
  ];

  const currentStep = order ? getStatusStepIndex(order.status) : 0;

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return iso;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1816] font-[\'Plus_Jakarta_Sans\'] pt-24 sm:pt-28 pb-28 px-5 sm:px-8 md:px-12 lg:px-16">
      <div className="max-w-3xl mx-auto space-y-10">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between border-b border-[#EAE3D9] pb-4">
          <button
            onClick={() => navigateTo({ name: 'home' })}
            className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] font-medium text-[#3E3730] hover:text-[#1A1816] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 stroke-[2]" />
            <span>Return to Boutique</span>
          </button>

          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-[#3E3730]">
            <ShieldCheck className="w-4 h-4 text-emerald-800 stroke-[2]" />
            <span>Authenticated Order Tracking</span>
          </div>
        </div>

        {/* Page Header & Search Form */}
        <div className="bg-white p-8 sm:p-10 rounded-3xl border border-[#EAE3D9] shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-6">
          <div className="text-center space-y-2">
            <span className="text-[10px] uppercase tracking-[0.25em] font-semibold text-[#3E3730]">
              LOGISTICS CONCIERGE
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl text-[#1A1816] font-normal tracking-tight">
              TRACK YOUR ORDER
            </h1>
            <p className="text-xs text-[#3E3730] font-medium max-w-md mx-auto leading-relaxed">
              Sign in with the account used at checkout, then enter your private order reference to follow its delivery journey.
            </p>
          </div>

          {user ? (
            <form onSubmit={handleTrackSubmit} className="flex flex-col sm:flex-row gap-3 pt-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  required
                  placeholder="Enter your SOX order reference"
                  value={orderQuery}
                  onChange={e => setOrderQuery(e.target.value)}
                  className="w-full h-12 bg-[#FCFBF9] border border-[#D5CBBF] rounded-2xl px-4 text-sm font-mono text-[#1A1816] placeholder:text-[#9E9080] placeholder:font-sans focus:outline-none focus:border-[#1A1816] transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="h-12 px-8 bg-[#1A1816] hover:bg-black text-white text-[11px] uppercase tracking-[0.2em] font-medium rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 flex-shrink-0"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{loading ? 'LOCATING...' : 'TRACK ORDER'}</span>
              </button>
            </form>
          ) : (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setIsAuthOpen(true)}
                className="h-12 px-8 bg-[#1A1816] hover:bg-black text-white text-[11px] uppercase tracking-[0.2em] font-medium rounded-2xl transition-all shadow-md"
              >
                SIGN IN TO TRACK
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200/80 rounded-2xl flex items-start sm:items-center justify-between gap-3 text-rose-800 text-xs animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{error}</span>
              </div>
              <button
                onClick={() => navigateTo({ name: 'contact-support' })}
                className="text-[11px] font-semibold tracking-wider uppercase text-rose-900 underline whitespace-nowrap cursor-pointer hover:opacity-80"
              >
                Contact Support
              </button>
            </div>
          )}
        </div>

        {/* Tracking Results Card */}
        {order && (
          <div className="bg-white p-8 sm:p-10 rounded-3xl border border-[#EAE3D9] shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-8 animate-in fade-in">
            
            {/* Order Identity Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ECE3D8] pb-6">
              <div>
                <span className="text-[10px] uppercase tracking-[0.22em] font-semibold text-[#3E3730] block mb-1">
                  ORDER REFERENCE
                </span>
                <h3 className="font-mono text-xl sm:text-2xl font-semibold text-[#1A1816]">
                  #{order.orderNumber}
                </h3>
                <p className="text-xs text-[#3E3730] mt-1">
                  Placed on {formatDate(order.createdAt)} · Private client tracking
                </p>
              </div>

              <div className="bg-[#FAF8F5] p-3.5 sm:p-4 rounded-2xl border border-[#EAE3D9] text-left sm:text-right space-y-0.5">
                <span className="text-[10px] uppercase tracking-wider text-[#3E3730] block">
                  Current Status
                </span>
                <span className="font-serif text-lg font-medium text-emerald-900 uppercase">
                  {order.status.replace(/_/g, ' ')}
                </span>
              </div>
            </div>

            {/* Visual Status Progression */}
            <div className="space-y-6">
              <h4 className="text-xs uppercase tracking-[0.2em] font-semibold text-[#1A1816]">
                WHITE-GLOVE DISPATCH PROGRESS
              </h4>

              <div className="relative">
                {/* Horizontal Progress bar for sm+ screens */}
                <div className="hidden sm:block relative mb-8">
                  <div className="h-1 bg-[#EAE3D9] rounded-full w-full absolute top-5 -z-0" />
                  <div 
                    className="h-1 bg-[#1A1816] rounded-full absolute top-5 -z-0 transition-all duration-500" 
                    style={{ width: `${(currentStep / (trackingSteps.length - 1)) * 100}%` }}
                  />

                  <div className="flex justify-between items-start relative z-10">
                    {trackingSteps.map((step, idx) => {
                      const isDone = idx <= currentStep;
                      const isCurrent = idx === currentStep;
                      const Icon = step.icon;

                      return (
                        <div key={step.label} className="flex flex-col items-center text-center max-w-[100px]">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                            isCurrent 
                              ? 'bg-[#1A1816] text-white border-[#1A1816] shadow-md scale-110' 
                              : isDone 
                              ? 'bg-[#1A1816] text-white border-[#1A1816]' 
                              : 'bg-white text-[#A89D8F] border-[#EAE3D9]'
                          }`}>
                            <Icon className="w-4 h-4 stroke-[2]" />
                          </div>
                          <span className={`text-[10.5px] uppercase tracking-wider font-semibold mt-2 ${
                            isCurrent ? 'text-[#1A1816]' : isDone ? 'text-[#2F2A25]' : 'text-[#A89D8F]'
                          }`}>
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Vertical Step Timeline for mobile screens */}
                <div className="sm:hidden space-y-4 relative pl-8 border-l-2 border-[#EAE3D9]">
                  {trackingSteps.map((step, idx) => {
                    const isDone = idx <= currentStep;
                    const isCurrent = idx === currentStep;
                    const Icon = step.icon;

                    return (
                      <div key={step.label} className="relative pb-2">
                        <div className={`absolute -left-[41px] top-0 w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                          isCurrent 
                            ? 'bg-[#1A1816] text-white border-[#1A1816]' 
                            : isDone 
                            ? 'bg-[#1A1816] text-white border-[#1A1816]' 
                            : 'bg-white text-[#A89D8F] border-[#EAE3D9]'
                        }`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <h5 className={`text-xs uppercase tracking-wider font-semibold ${
                          isCurrent ? 'text-[#1A1816]' : isDone ? 'text-[#2F2A25]' : 'text-[#A89D8F]'
                        }`}>
                          {step.label}
                        </h5>
                        <p className="text-[11px] text-[#3E3730] font-medium mt-0.5">{step.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Courier & Delivery Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#ECE3D8] text-xs">
              <div className="bg-[#FAF8F5] p-5 rounded-2xl border border-[#EAE3D9] space-y-2">
                <span className="text-[10px] uppercase tracking-wider text-[#3E3730] font-semibold block">
                  COURIER ASSIGNMENT
                </span>
                <p className="text-sm font-semibold text-[#1A1816]">{order.courierName || 'Not assigned yet'}</p>
                <p className="text-[#2F2A25]">Tracking Ref: <span className="font-mono font-medium text-[#1A1816]">{order.trackingNumber || 'Pending'}</span></p>
                <p className="text-emerald-900 font-medium">ETA: {order.deliveryEta || 'Pending courier update'}</p>
              </div>

              <div className="bg-[#FAF8F5] p-5 rounded-2xl border border-[#EAE3D9] space-y-2">
                <span className="text-[10px] uppercase tracking-wider text-[#3E3730] font-semibold block">
                  DELIVERY REGION
                </span>
                <p className="text-sm font-semibold text-[#1A1816]">{order.city || 'Destination pending'}</p>
                <p className="text-[#2F2A25]">{order.country || 'Delivery destination protected'}</p>
                <p className="text-[#3E3730]">Full address and contact details remain private in your account.</p>
              </div>
            </div>

            {/* Items Summary in this Order */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs uppercase tracking-[0.2em] font-semibold text-[#1A1816]">
                COMMISSIONED PIECES ({order.items?.length || 0})
              </h4>
              <div className="divide-y divide-[#F2ECE2]">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-14 bg-[#FAF8F5] rounded-lg border border-[#EAE3D9] overflow-hidden flex-shrink-0">
                        <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h6 className="text-xs font-semibold text-[#1A1816]">{item.title}</h6>
                        <p className="text-[11px] text-[#3E3730] font-medium">Size: {item.size} · Quantity: {item.quantity}</p>
                      </div>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-[#3E3730] font-semibold">
                      Qty {item.quantity}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Assistance Footer */}
            <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#EAE3D9] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-[#3E3730]">
                <Headset className="w-4 h-4 text-[#1A1816]" />
                <span>Need to adjust delivery gate instructions or timing?</span>
              </div>
              <button
                onClick={() => navigateTo({ name: 'contact-support' })}
                className="px-4 py-2 bg-white border border-[#D5CBBF] hover:bg-[#FAF8F5] text-[#1A1816] text-[10.5px] uppercase tracking-wider font-semibold rounded-full transition-colors cursor-pointer"
              >
                Contact Concierge
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
