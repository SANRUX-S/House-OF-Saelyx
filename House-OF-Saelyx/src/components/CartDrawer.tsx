import React, { useState, useEffect } from 'react';
import { X, Trash2, Plus, Minus, ArrowRight, ShieldCheck, Check, Sparkles } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export const CartDrawer: React.FC = () => {
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    removeFromCart,
    updateQuantity,
    formatPrice,
    clearCart,
    selectedCurrency,
    createOrder,
    user,
    setIsAuthOpen,
    navigateTo
  } = useStore();

  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [orderComplete, setOrderComplete] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // Lifecycle state for managing smooth enter/exit animations
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isCartOpen) {
      setShouldRender(true);
      const timer = setTimeout(() => setIsAnimating(true), 20);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isCartOpen]);

  // Checkout form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'Sri Lanka',
    notes: ''
  });

  const subtotalLKR = cart.reduce((acc, item) => acc + item.priceLKR * item.quantity, 0);
  const isFreeShipping = subtotalLKR >= 50000 || subtotalLKR === 0;
  const shippingLKR = isFreeShipping ? 0 : 2500;
  const totalLKR = subtotalLKR + shippingLKR;

  const handleClose = () => {
    setIsCartOpen(false);
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    setLoading(true);
    try {
      const orderPayload = {
        customerName: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        postalCode: formData.postalCode,
        country: formData.country,
        items: cart.map(item => ({
          productId: item.productId,
          title: item.title,
          image: item.image,
          priceLKR: item.priceLKR,
          size: item.size,
          quantity: item.quantity
        })),
        subtotalLKR,
        shippingLKR,
        totalLKR,
        currencyUsed: selectedCurrency.code,
        totalInCurrency: totalLKR * selectedCurrency.rateFromLKR,
        notes: formData.notes,
      };

      const placed = await createOrder(orderPayload as any);
      setOrderComplete(placed);
      clearCart();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!shouldRender) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {/* Animated Backdrop */}
      <div
        onClick={handleClose}
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-out ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        {/* Animated Slide Drawer */}
        <div 
          className={`w-screen max-w-full sm:max-w-md bg-[#181614] text-white shadow-2xl border-l border-white/10 flex flex-col justify-between h-full transform transition-transform duration-300 ease-in-out ${
            isAnimating ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Header */}
          <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-lg sm:text-xl tracking-wide">YOUR SHOPPING BAG</h2>
              <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-neutral-300">
                {cart.reduce((t, i) => t + i.quantity, 0)}
              </span>
            </div>
            <button
              onClick={handleClose}
              className="min-w-[40px] min-h-[40px] p-2 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center cursor-pointer"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Content / Checkout Step */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-5">
            {orderComplete ? (
              <div className="py-10 text-center space-y-6 animate-in fade-in">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-400 flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-serif text-2xl text-white">ORDER CONFIRMED</h3>
                  <p className="text-xs text-neutral-400">
                    Thank you for choosing SAELYXE. Your limited drop garment is being prepared.
                  </p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-left space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Order Reference:</span>
                    <span className="font-mono text-white font-bold">{orderComplete.orderNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Customer:</span>
                    <span className="text-white">{orderComplete.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Delivery Status:</span>
                    <span className="text-emerald-400 font-semibold uppercase">Dispatched to Atelier</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Direct Hand Delivery ETA:</span>
                    <span className="text-amber-300">{orderComplete.deliveryEta}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setOrderComplete(null);
                    setIsCheckingOut(false);
                    handleClose();
                  }}
                  className="w-full py-3.5 bg-white text-black font-semibold text-xs tracking-widest uppercase rounded-full hover:bg-neutral-200 transition-colors cursor-pointer"
                >
                  RETURN TO STORE
                </button>
              </div>
            ) : isCheckingOut ? (
              <form onSubmit={handlePlaceOrder} className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="text-xs uppercase tracking-widest text-neutral-400 font-semibold">
                    Delivery Details
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCheckingOut(false)}
                    className="text-[11px] text-neutral-300 hover:text-white underline cursor-pointer p-1"
                  >
                    Back to items
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-neutral-400 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kasun Fernando"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-base sm:text-xs text-white focus:outline-none focus:border-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-neutral-400 mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="name@domain.com"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-base sm:text-xs text-white focus:outline-none focus:border-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-neutral-400 mb-1">
                        Phone (for courier) *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="+94 77 000 0000"
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-base sm:text-xs text-white focus:outline-none focus:border-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-neutral-400 mb-1">
                      Hand-Delivery Street Address *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apt 4B, 18 Flower Road"
                      value={formData.address}
                      onChange={e => setFormData({ ...formData, address: e.target.value })}
                      className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-base sm:text-xs text-white focus:outline-none focus:border-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-neutral-400 mb-1">
                        City *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.city}
                        onChange={e => setFormData({ ...formData, city: e.target.value })}
                        className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-base sm:text-xs text-white focus:outline-none focus:border-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-neutral-400 mb-1">
                        Country
                      </label>
                      <input
                        type="text"
                        value={formData.country}
                        onChange={e => setFormData({ ...formData, country: e.target.value })}
                        className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-base sm:text-xs text-white focus:outline-none focus:border-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-neutral-400 mb-1">
                      Delivery Notes / Gate Code
                    </label>
                    <input
                      type="text"
                      placeholder="Special instructions for direct hand-delivery"
                      value={formData.notes}
                      onChange={e => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-base sm:text-xs text-white focus:outline-none focus:border-white"
                    />
                  </div>
                </div>

                <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1.5 text-xs text-neutral-300">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                    <ShieldCheck className="w-4 h-4" />
                    <span>White-Glove Direct Dispatch</span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Hand-delivered in our signature luxury presentation box with protective dust sleeve.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 sm:py-4 bg-white text-black font-semibold text-xs tracking-[0.2em] uppercase rounded-full hover:bg-neutral-200 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2 mt-4 cursor-pointer"
                >
                  <span>{loading ? 'PROCESSING...' : `CONFIRM & PLACE ORDER — ${formatPrice(totalLKR)}`}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : cart.length === 0 ? (
              <div className="py-20 text-center space-y-4">
                <p className="text-neutral-400 text-sm font-serif">Your shopping bag is empty.</p>
                <button
                  onClick={handleClose}
                  className="text-xs uppercase tracking-widest text-white underline underline-offset-4 cursor-pointer"
                >
                  Continue Shopping
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {cart.map(item => (
                  <div
                    key={`${item.productId}-${item.size}`}
                    className="flex gap-3.5 p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/15 transition-all"
                  >
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-16 h-20 sm:w-20 sm:h-24 object-cover rounded-lg bg-neutral-800 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-semibold uppercase tracking-wide truncate">
                            {item.title}
                          </h4>
                          <button
                            onClick={() => removeFromCart(item.productId, item.size)}
                            className="text-neutral-500 hover:text-rose-400 transition-colors p-1 cursor-pointer"
                            aria-label="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="text-[11px] text-neutral-400 mt-0.5">
                          Size: <span className="text-white font-medium">{item.size}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center bg-black/40 rounded-full border border-white/10 px-2 py-1 gap-2">
                          <button
                            onClick={() => updateQuantity(item.productId, item.size, item.quantity - 1)}
                            className="min-w-[28px] min-h-[28px] flex items-center justify-center text-neutral-400 hover:text-white cursor-pointer"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-mono font-medium min-w-[14px] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.size, item.quantity + 1)}
                            className="min-w-[28px] min-h-[28px] flex items-center justify-center text-neutral-400 hover:text-white cursor-pointer"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <span className="text-xs font-bold font-serif">
                          {formatPrice(item.priceLKR * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Free Packaging Feature */}
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-neutral-300">
                  <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span className="text-[11px]">Complimentary SÆ matte presentation packaging included.</span>
                </div>
              </div>
            )}
          </div>

          {/* Footer Subtotal & Action (when not checked out) */}
          {!orderComplete && cart.length > 0 && !isCheckingOut && (
            <div className="p-4 sm:p-6 border-t border-white/10 bg-[#121110] space-y-3.5">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-neutral-400">
                  <span>Subtotal</span>
                  <span className="text-white font-medium">{formatPrice(subtotalLKR)}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Delivery</span>
                  <span>{isFreeShipping ? <span className="text-emerald-400 font-semibold">FREE</span> : formatPrice(shippingLKR)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-white/10">
                  <span>Estimated Total</span>
                  <span>{formatPrice(totalLKR)}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  if (!user) {
                    setIsAuthOpen(true);
                  } else {
                    handleClose();
                    navigateTo({ name: 'checkout' });
                  }
                }}
                className="w-full py-3.5 sm:py-4 bg-white text-black font-semibold text-xs tracking-[0.2em] uppercase rounded-full hover:bg-neutral-200 transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>PROCEED TO CHECKOUT</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};