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
      case 'payzy': return 'Payzy';
      case 'cod': return 'Cash on Delivery';
      default: return 'Other Payment';
    }
  };

  const handleWhatsAppNotify = () => {
    if (!order) return;
    const itemsSummary = (order.items || []).map(item => `• ${item.title} (${item.size || 'Standard'}) × ${item.quantity}`).join('\n');
    const waText = `✨ *SAELYXE ORDER CONFIRMATION* ✨
━━━━━━━━━━━━━━━━━
📦 *Order #:* #${order.orderNumber}
👤 *Customer:* ${order.customerName || 'Client'}
💰 *Total:* ${formatPrice(order.totalLKR)}
💳 *Payment:* ${order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}

🛍️ *Items Ordered:*
${itemsSummary}

📍 *Delivery Address:*
${[order.address, order.city, order.country].filter(Boolean).join(', ')}
━━━━━━━━━━━━━━━━━
Please confirm order handover and dispatch schedule.`;

    window.open(`https://wa.me/94707775568?text=${encodeURIComponent(waText)}`, '_blank');
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
              <h2 className="font-sans text-2xl sm:text-3xl font-black text-[#1A1816] tracking-tight uppercase">
                ORDER PLACED
              </h2>
              <p className="text-xs text-[#665A4E] leading-relaxed max-w-sm mx-auto">
                Thank you for shopping with SAELYXE. Your order has been successfully received by SAELYXE.
              </p>
            </div>

            {/* Key Order Credentials Box */}
            <div className="bg-[#FAF8F5] p-5 rounded-2xl border border-[#EAE3D9] space-y-3 text-left text-xs">
              <div className="flex justify-between items-center border-b border-[#ECE3D8] pb-2.5">
                <span className="text-[#665A4E] uppercase tracking-wider text-[10px] font-medium">Order Number</span>
                <span className="font-mono text-xs sm:text-sm font-bold text-[#1A1816]">
                  #{order.orderNumber}
                </span>
              </div>

              <div className="flex justify-between items-center border-b border-[#ECE3D8] pb-2.5">
                <span className="text-[#665A4E] uppercase tracking-wider text-[10px] font-medium">Payment</span>
                <span className="font-medium text-[#1A1816] text-right">
                  {formatPaymentMethod(order.paymentMethod)}
                  <span className="block text-[9px] uppercase tracking-wider text-[#665A4E] mt-0.5">
                    {order.paymentMethod === 'cod'
                      ? 'Pay on delivery'
                      : order.paymentStatus === 'paid' || order.paymentStatus === 'verified'
                        ? 'Verified'
                        : 'Pending verification'}
                  </span>
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[#665A4E] uppercase tracking-wider text-[10px] font-medium">Order Total</span>
                <span className="font-price text-base font-bold text-[#1A1816]">
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
                    <span className="font-price text-xs font-semibold text-[#4A4036] flex-shrink-0">
                      {formatPrice(item.priceLKR * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-[#ECE3D8] space-y-1.5 text-xs text-[#665A4E]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-price font-medium">{formatPrice(order.subtotalLKR)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery</span>
                  <span className="font-price font-medium text-emerald-800">
                    {order.shippingLKR === 0 ? 'COMPLIMENTARY' : formatPrice(order.shippingLKR)}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              
              {/* WhatsApp Atelier Direct Notification Button */}
              <button
                type="button"
                onClick={handleWhatsAppNotify}
                className="sm:col-span-2 h-12 bg-[#128C7E] hover:bg-[#0E7064] text-white text-[11px] uppercase tracking-[0.16em] font-bold rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.634.062-1.899-.462-1.503-.623-2.457-2.146-2.532-2.247-.074-.1-1.026-1.365-1.026-2.604 0-1.238.649-1.848.88-2.099.23-.25.502-.313.669-.313.167 0 .334.002.48.009.153.007.359-.059.562.428.209.502.712 1.737.774 1.863.063.125.105.272.021.439-.083.167-.125.271-.25.418-.125.146-.263.327-.376.439-.125.125-.256.261-.11.512.146.251.648 1.069 1.391 1.731.956.852 1.762 1.116 2.013 1.242.251.125.397.104.544-.063.146-.167.627-.732.794-.983.167-.251.334-.209.563-.125.23.084 1.464.69 1.715.816.251.125.418.188.48.293.063.104.063.606-.081 1.011z" />
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.66 1.434 5.178L2 22l4.981-1.309A9.957 9.957 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.182c-1.637 0-3.15-.494-4.417-1.341l-.317-.213-2.962.777.791-2.888-.233-.371A8.147 8.147 0 013.818 12c0-4.512 3.67-8.182 8.182-8.182 4.511 0 8.182 3.67 8.182 8.182 0 4.511-3.671 8.182-8.182 8.182z" />
                </svg>
                <span>Notify Atelier on WhatsApp (070 777 5568)</span>
              </button>

              <button
                onClick={handleContinueToOrders}
                className="h-12 bg-[#1A1816] hover:bg-black text-white text-[11px] uppercase tracking-[0.18em] font-semibold rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
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
                className="h-12 bg-white border border-[#D5CBBF] hover:bg-[#FAF8F5] text-[#1A1816] text-[11px] uppercase tracking-[0.18em] font-semibold rounded-2xl transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <FileText className="w-3.5 h-3.5" />
                RECEIPT / INVOICE
              </button>

              <button
                onClick={onClose}
                className="sm:col-span-2 h-11 bg-transparent text-[#665A4E] text-[10px] uppercase tracking-[0.18em] font-semibold rounded-xl hover:bg-[#FAF8F5] hover:text-[#1A1816] transition-colors cursor-pointer"
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
