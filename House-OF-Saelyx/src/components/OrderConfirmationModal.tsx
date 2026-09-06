import React from 'react';
import { CheckCircle2, ShoppingBag, ArrowRight, X, Truck, ShieldCheck, FileText } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Order } from '../types';
import { openOrderReceipt } from '../lib/orderReceipt';

interface OrderConfirmationModalProps {
  order: Order | null;
  onClose: () => void;
}

export const OrderConfirmationModal: React.FC<OrderConfirmationModalProps> = ({ order, onClose }) => {
  const { navigateTo, formatPrice } = useStore();

  if (!order) return null;

  const handleContinueToOrders = () => {
    onClose();
    navigateTo({ name: 'orders' });
  };

  const formatPaymentMethod = (method?: string) => {
    switch (method) {
      case 'paypal': return 'PayPal';
      case 'cod': return 'Cash on Delivery';
      default: return 'Atelier Commission';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto select-none">
      {/* Dark backdrop */}
      <div 
        onClick={onClose} 
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300"
      />

      <div className="min-h-screen px-4 py-8 sm:py-12 flex items-center justify-center">
        <div className="relative w-full max-w-xl bg-white text-[#1A1816] rounded-3xl shadow-2xl border border-[#EAE3D9] overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-300">
          
          {/* Top Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full text-[#7A6E60] hover:text-[#1A1816] hover:bg-[#FAF8F5] transition-colors cursor-pointer z-20"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-8 sm:p-10 text-center space-y-6">
            
            {/* Success Icon */}
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8 stroke-[1.5]" />
            </div>

            {/* Title & Subtitle */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase tracking-[0.25em] font-semibold text-emerald-900 block">
                COMMISSION REGISTERED & SEALED
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl text-[#1A1816] font-normal tracking-tight">
                ORDER PLACED
              </h2>
              <p className="text-xs text-[#7A6E60] leading-relaxed max-w-sm mx-auto">
                Thank you for shopping with SAELYXE. Your bespoke order has been successfully placed in our atelier ledger.
              </p>
            </div>

            {/* Key Order Credentials Box */}
            <div className="bg-[#FAF8F5] p-5 rounded-2xl border border-[#EAE3D9] space-y-3 text-left text-xs">
              <div className="flex justify-between items-center border-b border-[#ECE3D8] pb-2.5">
                <span className="text-[#7A6E60] uppercase tracking-wider text-[10px] font-medium">Order Number</span>
                <span className="font-mono text-xs sm:text-sm font-bold text-[#1A1816]">
                  #{order.orderNumber}
                </span>
              </div>

              <div className="flex justify-between items-center border-b border-[#ECE3D8] pb-2.5">
                <span className="text-[#7A6E60] uppercase tracking-wider text-[10px] font-medium">Payment</span>
                <span className="font-medium text-[#1A1816] text-right">
                  {formatPaymentMethod(order.paymentMethod)}
                  <span className="block text-[9px] uppercase tracking-wider text-[#7A6E60] mt-0.5">
                    {order.paymentMethod === 'cod'
                      ? 'Pay on delivery'
                      : order.paymentStatus === 'paid' || order.paymentStatus === 'verified'
                        ? 'Verified'
                        : 'Pending verification'}
                  </span>
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[#7A6E60] uppercase tracking-wider text-[10px] font-medium">Order Total</span>
                <span className="font-serif text-base font-semibold text-[#1A1816]">
                  {formatPrice(order.totalLKR)}
                </span>
              </div>
            </div>

            {/* Compact Order Summary */}
            <div className="text-left space-y-3 pt-2">
              <h4 className="text-[10.5px] uppercase tracking-[0.2em] font-semibold text-[#1A1816] border-b border-[#ECE3D8] pb-2">
                ORDER SUMMARY
              </h4>

              <div className="divide-y divide-[#F2ECE2] max-h-36 overflow-y-auto pr-1">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5 truncate max-w-[280px]">
                      <div className="w-9 h-11 bg-[#FAF8F5] rounded border border-[#EAE3D9] overflow-hidden flex-shrink-0">
                        <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                      </div>
                      <span className="truncate text-[#1A1816] font-medium">
                        {item.title} <span className="text-[#7A6E60]">× {item.quantity}</span>
                      </span>
                    </div>
                    <span className="font-mono text-xs text-[#4A4036] flex-shrink-0">
                      {formatPrice(item.priceLKR * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-[#ECE3D8] space-y-1.5 text-xs text-[#7A6E60]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-mono">{formatPrice(order.subtotalLKR)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery</span>
                  <span className="font-mono text-emerald-800">
                    {order.shippingLKR === 0 ? 'COMPLIMENTARY' : formatPrice(order.shippingLKR)}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleContinueToOrders}
                className="h-12 bg-[#1A1816] hover:bg-black text-white text-[11px] uppercase tracking-[0.2em] font-medium rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>CONTINUE TO MY ORDERS</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => {
                  if (!openOrderReceipt(order)) {
                    window.alert('Your browser blocked the receipt window. Please allow pop-ups for SAELYXE and try again.');
                  }
                }}
                className="h-12 bg-white border border-[#D5CBBF] hover:bg-[#FAF8F5] text-[#1A1816] text-[11px] uppercase tracking-[0.18em] font-medium rounded-2xl transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <FileText className="w-3.5 h-3.5" />
                RECEIPT / INVOICE
              </button>

              <button
                onClick={onClose}
                className="sm:col-span-2 h-11 bg-transparent text-[#7A6E60] text-[10px] uppercase tracking-[0.18em] font-medium rounded-xl hover:bg-[#FAF8F5] hover:text-[#1A1816] transition-colors cursor-pointer"
              >
                RETURN TO BOUTIQUE
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
