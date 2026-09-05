import React, { useState } from 'react';
import { 
  ShoppingBag, 
  ArrowLeft, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  Truck, 
  Package, 
  MapPin, 
  ShieldCheck, 
  ExternalLink,
  CreditCard,
  X
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Order, OrderStatus } from '../types';

export const OrdersPage: React.FC = () => {
  const { user, orders, formatPrice, navigateTo, currentRoute } = useStore();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Filter orders belonging to the authenticated customer
  const userOrders = orders.filter(o => {
    if (!user) return false;
    if (o.userId && o.userId === user.uid) return true;
    if (user.email && o.email && o.email.toLowerCase() === user.email.toLowerCase()) return true;
    return false;
  });

  // Automatically select order if orderId was passed in route
  React.useEffect(() => {
    if (currentRoute.name === 'orders' && (currentRoute as any).orderId) {
      const match = orders.find(o => o.orderNumber === (currentRoute as any).orderId || o.id === (currentRoute as any).orderId);
      if (match) setSelectedOrder(match);
    }
  }, [currentRoute, orders]);

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'delivered':
        return { label: 'Delivered', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      case 'out_for_delivery':
        return { label: 'Out for Delivery', bg: 'bg-blue-50 text-blue-800 border-blue-200' };
      case 'dispatched':
        return { label: 'Dispatched', bg: 'bg-blue-50 text-blue-800 border-blue-200' };
      case 'packed':
        return { label: 'Packed', bg: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'confirmed':
        return { label: 'Confirmed', bg: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'cancelled':
        return { label: 'Cancelled', bg: 'bg-rose-50 text-rose-800 border-rose-200' };
      case 'placed':
      default:
        return { label: 'Processing', bg: 'bg-stone-100 text-stone-700 border-stone-200' };
    }
  };

  const getPaymentBadge = (status?: string, method?: string) => {
    if (status === 'verified' || status === 'paid') {
      return { label: 'Paid', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
    }
    if (method === 'cod') {
      return { label: 'Pending Delivery', bg: 'bg-amber-50 text-amber-800 border-amber-200' };
    }
    return { label: 'Pending', bg: 'bg-stone-100 text-stone-700 border-stone-200' };
  };

  const formatPaymentMethodName = (method?: string) => {
    switch (method) {
      case 'paypal': return 'PayPal';
      case 'cod': return 'Cash on Delivery';
      default: return 'Atelier Commission';
    }
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return iso;
    }
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
    { label: 'Order Placed', icon: Clock },
    { label: 'Confirmed', icon: CheckCircle2 },
    { label: 'Packed', icon: Package },
    { label: 'Dispatched', icon: Truck },
    { label: 'Out for Delivery', icon: MapPin },
    { label: 'Delivered', icon: ShieldCheck }
  ];

  if (!user) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] text-[#1A1816] pt-32 pb-24 px-5 sm:px-8">
        <div className="max-w-xl mx-auto bg-white p-8 sm:p-12 rounded-3xl border border-[#EAE3D9] text-center space-y-6 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-[#FAF8F5] border border-[#EAE3D9] flex items-center justify-center mx-auto text-[#7A6E60]">
            <ShoppingBag className="w-7 h-7 stroke-[1.5]" />
          </div>
          <div className="space-y-2">
            <h2 className="font-serif text-2xl sm:text-3xl text-[#1A1816] font-normal">
              AUTHENTICATION REQUIRED
            </h2>
            <p className="text-xs text-[#7A6E60] leading-relaxed max-w-md mx-auto">
              Please log in to view your orders and commission history.
            </p>
          </div>
          <button
            onClick={() => navigateTo({ name: 'home' })}
            className="px-8 h-12 bg-[#1A1816] hover:bg-black text-white text-[11px] uppercase tracking-[0.2em] font-medium rounded-full transition-all shadow-md cursor-pointer"
          >
            RETURN TO BOUTIQUE
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1816] pt-24 sm:pt-28 pb-28 px-5 sm:px-8 md:px-12 lg:px-16">
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between border-b border-[#EAE3D9] pb-4">
          <button
            onClick={() => navigateTo({ name: 'home' })}
            className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] font-medium text-[#7A6E60] hover:text-[#1A1816] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 stroke-[1.5]" />
            <span>Return to Boutique</span>
          </button>

          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-[#7A6E60]">
            <ShieldCheck className="w-4 h-4 text-emerald-800 stroke-[1.5]" />
            <span>Authenticated Client Archive</span>
          </div>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase tracking-[0.25em] font-semibold text-[#8C7A68] block mb-1">
              HOUSE OF SAELYXE
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl text-[#1A1816] font-normal tracking-tight">
              MY ORDERS
            </h1>
          </div>
          <p className="text-xs text-[#7A6E60]">
            Showing {userOrders.length} {userOrders.length === 1 ? 'recorded order' : 'recorded orders'}
          </p>
        </div>

        {/* Orders List / Empty State */}
        {userOrders.length === 0 ? (
          <div className="bg-white p-12 sm:p-16 rounded-3xl border border-[#EAE3D9] text-center space-y-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
            <div className="w-16 h-16 rounded-full bg-[#FAF8F5] border border-[#EAE3D9] flex items-center justify-center mx-auto text-[#7A6E60]">
              <ShoppingBag className="w-7 h-7 stroke-[1.5]" />
            </div>
            <div className="space-y-2">
              <h3 className="font-serif text-2xl text-[#1A1816] font-normal">
                You haven't placed any orders yet.
              </h3>
              <p className="text-xs text-[#7A6E60] max-w-sm mx-auto leading-relaxed">
                Explore our limited-run collections and commission your first piece with complimentary white-glove hand delivery.
              </p>
            </div>
            <button
              onClick={() => navigateTo({ name: 'home' })}
              className="px-8 h-12 bg-[#1A1816] hover:bg-black text-white text-[11px] uppercase tracking-[0.2em] font-medium rounded-full transition-all shadow-md cursor-pointer inline-flex items-center gap-2"
            >
              <span>EXPLORE COLLECTION</span>
              <span>→</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {userOrders.map((ord) => {
              const statusBadge = getStatusBadge(ord.status);
              const payBadge = getPaymentBadge(ord.paymentStatus, ord.paymentMethod);
              const itemsCount = ord.items?.reduce((tot, i) => tot + i.quantity, 0) || 0;

              return (
                <div
                  key={ord.id}
                  onClick={() => setSelectedOrder(ord)}
                  className="bg-white p-6 sm:p-7 rounded-2xl border border-[#EAE3D9] hover:border-[#D5CBBF] shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition-all cursor-pointer group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-mono text-xs sm:text-sm font-semibold tracking-wider text-[#1A1816]">
                          ORDER #{ord.orderNumber}
                        </span>
                        <span className={`text-[9.5px] uppercase tracking-wider px-2.5 py-0.5 rounded-full border font-medium ${statusBadge.bg}`}>
                          {statusBadge.label}
                        </span>
                        <span className={`text-[9.5px] uppercase tracking-wider px-2.5 py-0.5 rounded-full border font-medium ${payBadge.bg}`}>
                          Payment: {payBadge.label}
                        </span>
                      </div>

                      <p className="text-xs text-[#7A6E60]">
                        {formatDate(ord.createdAt)} · {formatPaymentMethodName(ord.paymentMethod)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-[#F2ECE2]">
                      <div className="text-left sm:text-right">
                        <span className="text-sm sm:text-base font-serif font-medium text-[#1A1816] block">
                          {formatPrice(ord.totalLKR)}
                        </span>
                        <span className="text-[11px] text-[#7A6E60]">
                          {itemsCount} {itemsCount === 1 ? 'Item' : 'Items'}
                        </span>
                      </div>

                      <div className="w-8 h-8 rounded-full bg-[#FAF8F5] border border-[#EAE3D9] flex items-center justify-center text-[#7A6E60] group-hover:text-[#1A1816] group-hover:bg-[#F2ECE2] group-hover:translate-x-1 transition-all">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* Thumbnail Preview strip */}
                  {ord.items && ord.items.length > 0 && (
                    <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[#F5EFE6] overflow-x-auto">
                      {ord.items.slice(0, 4).map((item, idx) => (
                        <div key={idx} className="w-12 h-14 bg-[#FAF8F5] rounded-lg border border-[#EAE3D9] overflow-hidden shrink-0">
                          <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                        </div>
                      ))}
                      {ord.items.length > 4 && (
                        <span className="text-[10px] uppercase tracking-wider text-[#7A6E60] font-medium pl-1">
                          +{ord.items.length - 4} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Selected Order Details Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 overflow-y-auto select-none">
            <div 
              onClick={() => setSelectedOrder(null)} 
              className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity" 
            />

            <div className="min-h-screen px-4 py-8 sm:py-12 flex items-center justify-center">
              <div className="relative w-full max-w-2xl bg-white text-[#1A1816] rounded-3xl shadow-2xl border border-[#EAE3D9] overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
                
                {/* Modal Top Bar */}
                <div className="p-6 border-b border-[#ECE3D8] flex items-center justify-between bg-[#FAF8F5]">
                  <div>
                    <span className="text-[9px] uppercase tracking-[0.25em] font-semibold text-[#8C7A68] block">
                      ORDER DETAILS
                    </span>
                    <h3 className="font-mono text-sm sm:text-base font-semibold text-[#1A1816] mt-0.5">
                      #{selectedOrder.orderNumber}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="p-2 rounded-full text-[#7A6E60] hover:text-[#1A1816] hover:bg-[#EAE3D9] transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 sm:p-8 space-y-7 max-h-[75vh] overflow-y-auto">
                  
                  {/* Status Progression Bar */}
                  <div className="space-y-3 bg-[#FAF8F5] p-5 rounded-2xl border border-[#EAE3D9]">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#7A6E60]">Current Status:</span>
                      <span className="font-semibold uppercase tracking-wider text-emerald-900">
                        {selectedOrder.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="grid grid-cols-5 gap-1 pt-2">
                      {trackingSteps.map((step, idx) => {
                        const isDone = idx <= getStatusStepIndex(selectedOrder.status);
                        const isCurrent = idx === getStatusStepIndex(selectedOrder.status);
                        return (
                          <div key={step.label} className="text-center space-y-1">
                            <div className={`h-1.5 rounded-full transition-colors ${
                              isDone ? 'bg-[#1A1816]' : 'bg-[#EAE3D9]'
                            }`} />
                            <span className={`text-[8.5px] uppercase tracking-wider block ${
                              isCurrent ? 'font-bold text-[#1A1816]' : 'text-[#8C7A68]'
                            }`}>
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Products / Items List */}
                  <div className="space-y-4">
                    <h4 className="text-xs uppercase tracking-[0.2em] font-semibold text-[#1A1816] border-b border-[#ECE3D8] pb-2">
                      COMMISSIONED GARMENTS ({selectedOrder.items?.length || 0})
                    </h4>

                    <div className="divide-y divide-[#F2ECE2]">
                      {selectedOrder.items?.map((item, idx) => (
                        <div key={idx} className="py-3.5 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3.5">
                            <div className="w-14 h-16 rounded-lg bg-[#FAF8F5] border border-[#EAE3D9] overflow-hidden shrink-0">
                              <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <h5 className="text-xs font-semibold text-[#1A1816] tracking-wide">
                                {item.title}
                              </h5>
                              <p className="text-[11px] text-[#7A6E60] mt-0.5">
                                Size: <span className="font-medium text-[#1A1816]">{item.size}</span> · Qty: <span className="font-medium text-[#1A1816]">{item.quantity}</span>
                              </p>
                              <p className="text-[11px] text-[#7A6E60]">
                                Unit Price: {formatPrice(item.priceLKR)}
                              </p>
                            </div>
                          </div>

                          <span className="text-xs font-semibold font-mono text-[#1A1816]">
                            {formatPrice(item.priceLKR * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Delivery Info */}
                  <div className="space-y-3">
                    <h4 className="text-xs uppercase tracking-[0.2em] font-semibold text-[#1A1816] border-b border-[#ECE3D8] pb-2">
                      DELIVERY DESTINATION
                    </h4>
                    <div className="bg-[#FAF8F5] p-4 rounded-xl border border-[#EAE3D9] text-xs space-y-1">
                      <p className="font-semibold text-[#1A1816]">{selectedOrder.customerName}</p>
                      <p className="text-[#4A4036]">{selectedOrder.address}, {selectedOrder.city} {selectedOrder.postalCode}</p>
                      <p className="text-[#7A6E60]">Phone: {selectedOrder.phone}</p>
                      <p className="text-[#7A6E60]">White-Glove Courier: {selectedOrder.courierName || 'Saelyxe Dedicated Courier'}</p>
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="space-y-2.5 pt-2 border-t border-[#ECE3D8] text-xs">
                    <div className="flex justify-between text-[#7A6E60]">
                      <span>Subtotal</span>
                      <span className="font-mono">{formatPrice(selectedOrder.subtotalLKR)}</span>
                    </div>
                    <div className="flex justify-between text-[#7A6E60]">
                      <span>White-Glove Hand-Delivery</span>
                      <span className="font-mono">
                        {selectedOrder.shippingLKR === 0 ? 'COMPLIMENTARY' : formatPrice(selectedOrder.shippingLKR)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold text-[#1A1816] pt-2 border-t border-[#ECE3D8]">
                      <span>Final Total</span>
                      <span className="font-serif text-base">{formatPrice(selectedOrder.totalLKR)}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="p-4 sm:p-6 border-t border-[#ECE3D8] bg-[#FAF8F5] flex flex-col sm:flex-row gap-3 justify-end">
                  <button
                    onClick={() => {
                      const id = selectedOrder.orderNumber;
                      setSelectedOrder(null);
                      navigateTo({ name: 'track-order', orderId: id });
                    }}
                    className="h-11 px-6 bg-[#1A1816] hover:bg-black text-white text-[11px] uppercase tracking-[0.18em] font-medium rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>TRACK LIVE COURIER</span>
                  </button>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="h-11 px-6 bg-white border border-[#D5CBBF] text-[#1A1816] text-[11px] uppercase tracking-[0.18em] font-medium rounded-xl hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                  >
                    CLOSE
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
