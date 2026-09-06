import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  ShieldCheck, 
  Truck, 
  CheckCircle2, 
  CreditCard, 
  Lock, 
  MapPin, 
  ShoppingBag, 
  Tag, 
  AlertCircle, 
  Check,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Order } from '../types';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { OrderConfirmationModal } from './OrderConfirmationModal';
function createPayPalCheckoutAttemptId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `paypal-${crypto.randomUUID()}`;
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const values = new Uint32Array(4);
    crypto.getRandomValues(values);
    return `paypal-${Array.from(values, value => value.toString(36)).join('-')}`;
  }
  throw new Error('Secure checkout identifier generation is unavailable.');
}


export const CheckoutPage: React.FC = () => {
  const { 
    cart, 
    formatPrice, 
    selectedCurrency,
    currencies,
    createOrder,
    createPayPalPayment,
    capturePayPalPayment,
    cancelPayPalOrder,
    clearCart, 
    navigateTo, 
    user,
    setIsAuthOpen 
  } = useStore();

  // Load previously saved delivery details from localStorage
  const [savedDetailsObj, setSavedDetailsObj] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('saelyx_saved_delivery_details');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [hasSavedDetails, setHasSavedDetails] = useState(() => {
    try {
      const saved = localStorage.getItem('saelyx_saved_delivery_details');
      return !!saved;
    } catch {
      return false;
    }
  });

  // Checkboxes
  const [rememberDetails, setRememberDetails] = useState(false);
  const [updateSavedDetails, setUpdateSavedDetails] = useState(false);

  const [customerName, setCustomerName] = useState(savedDetailsObj?.customerName || user?.name || '');
  const [email, setEmail] = useState(savedDetailsObj?.email || user?.email || '');
  const [phone, setPhone] = useState(savedDetailsObj?.phone || user?.phoneNumber || '');
  const [address, setAddress] = useState(savedDetailsObj?.address || user?.address || '');
  const [city, setCity] = useState(savedDetailsObj?.city || user?.city || '');
  const [postalCode, setPostalCode] = useState(savedDetailsObj?.postalCode || user?.postalCode || '');
  const [country, setCountry] = useState(savedDetailsObj?.country || user?.country || 'Sri Lanka');
  const [notes, setNotes] = useState(savedDetailsObj?.notes || '');

  // Pre-fill fields whenever authenticated user profile is loaded
  useEffect(() => {
    if (user) {
      if (!customerName && user.name) setCustomerName(user.name);
      if (!email && user.email) setEmail(user.email);
      if (!phone && user.phoneNumber) setPhone(user.phoneNumber);
      if (user.address && (!savedDetailsObj || !savedDetailsObj.address)) setAddress(user.address);
      if (user.city && (!savedDetailsObj || !savedDetailsObj.city)) setCity(user.city);
      if (user.postalCode && (!savedDetailsObj || !savedDetailsObj.postalCode)) setPostalCode(user.postalCode);
      if (user.country && (!savedDetailsObj || !savedDetailsObj.country)) setCountry(user.country);
    }
  }, [user]);

  const paymentMethod = 'paypal' as const;
  const [paymentConfig, setPaymentConfig] = useState({
    paypal: { enabled: false, clientId: '', mode: 'sandbox' }
  });
  const [paymentConfigLoaded, setPaymentConfigLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/payments/config')
      .then(async response => response.ok ? response.json() : null)
      .then(config => {
        if (!active || !config) return;
        setPaymentConfig({
          paypal: {
            enabled: Boolean(config.paypal?.enabled),
            clientId: String(config.paypal?.clientId || ''),
            mode: config.paypal?.mode === 'live' ? 'live' : 'sandbox'
          }
        });
      })
      .catch(() => {})
      .finally(() => {
        if (active) setPaymentConfigLoaded(true);
      });
    return () => { active = false; };
  }, []);

  const paypalClientId = paymentConfig.paypal.clientId || '';


  // Promo / Voucher Code state
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discountPercent?: number; discountFixedLKR?: number } | null>(null);
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [paypalPendingOrder, setPaypalPendingOrder] = useState<Order | null>(null);
  const paypalPendingOrderRef = useRef<Order | null>(null);
  const paypalCheckoutAttemptIdRef = useRef<string | null>(null);

  // Sync details if user state loads or changes
  useEffect(() => {
    if (user) {
      if (!customerName) setCustomerName(user.name || '');
      if (!email) setEmail(user.email || '');
      if (!phone) setPhone(user.phoneNumber || '');
    }
  }, [user]);

  // Track if details have been changed compared to savedDetailsObj
  const isDetailsChanged = !!(savedDetailsObj && (
    customerName !== savedDetailsObj.customerName ||
    email !== savedDetailsObj.email ||
    phone !== savedDetailsObj.phone ||
    address !== savedDetailsObj.address ||
    city !== savedDetailsObj.city ||
    postalCode !== savedDetailsObj.postalCode ||
    country !== savedDetailsObj.country ||
    notes !== savedDetailsObj.notes
  ));

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    setPromoError('');
    setPromoSuccess('');
    const code = promoCode.trim().toUpperCase();
    if (!code) return;

    if (code === 'SAELYXVIP' || code === 'VIP15') {
      setAppliedPromo({ code, discountPercent: 15 });
      setPromoSuccess('15% VIP Patron Discount Applied');
    } else if (code === 'DROP10' || code === 'WELCOME10') {
      setAppliedPromo({ code, discountPercent: 10 });
      setPromoSuccess('10% Drop Launch Discount Applied');
    } else if (code === 'PRESENCE') {
      setAppliedPromo({ code, discountFixedLKR: 5000 });
      setPromoSuccess('LKR 5,000 Atelier Voucher Applied');
    } else {
      setPromoError('Invalid code. Try SAELYXVIP (15%) or DROP10 (10%).');
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCode('');
    setPromoSuccess('');
    setPromoError('');
  };

  const totalItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const subtotalLKR = cart.reduce((acc, item) => acc + item.priceLKR * item.quantity, 0);
  const discountLKR = appliedPromo
    ? appliedPromo.discountPercent
      ? Math.round(subtotalLKR * (appliedPromo.discountPercent / 100))
      : (appliedPromo.discountFixedLKR || 0)
    : 0;
  const discountedSubtotalLKR = Math.max(0, subtotalLKR - discountLKR);
  const shippingLKR = discountedSubtotalLKR > 50000 ? 0 : 2500;
  const totalLKR = discountedSubtotalLKR + shippingLKR;
  const totalInCurrency = Number((totalLKR * (selectedCurrency?.rateFromLKR || 1)).toFixed(2));
  const paypalCurrency = ['USD', 'EUR', 'GBP'].includes(selectedCurrency?.code || '')
    ? (selectedCurrency?.code || 'USD')
    : 'USD';
  const usdRateFromLKR = currencies.find(currency => currency.code === 'USD')?.rateFromLKR || 0.0033;
  const paypalDisplayAmount = paypalCurrency === selectedCurrency?.code
    ? totalInCurrency
    : Number((totalLKR * usdRateFromLKR).toFixed(2));

  // Empty Bag Guard
  if (cart.length === 0 && !confirmedOrder) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] text-[#1A1816] pt-36 pb-20 px-5 flex items-center justify-center">
        <div className="max-w-md w-full bg-white p-8 sm:p-12 rounded-2xl border border-[#EAE3D9] shadow-[0_2px_12px_rgba(0,0,0,0.03)] text-center space-y-6 animate-in fade-in">
          <div className="w-16 h-16 bg-[#FAF8F5] border border-[#EAE3D9] text-[#7A6E60] rounded-full flex items-center justify-center mx-auto">
            <ShoppingBag className="w-6 h-6 stroke-[1.25]" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] uppercase tracking-[0.25em] text-[#8F8171] font-medium">
              SHOPPING BAG EMPTY
            </span>
            <h1 className="font-serif text-2xl text-[#1A1816] font-normal">
              Your Bag is Currently Empty
            </h1>
            <p className="text-xs text-[#7A6E60] leading-relaxed max-w-xs mx-auto">
              Explore the latest Drop 001 collection and reserve bespoke garments before checking out.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              navigateTo({ name: 'home' });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="w-full h-12 bg-[#1A1816] hover:bg-black text-white text-[11px] uppercase font-medium tracking-[0.2em] rounded-xl transition-all cursor-pointer"
          >
            Explore Collection
          </button>
        </div>
      </div>
    );
  }

  // Enforce logged-in checkout
  if (!user) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] text-[#1A1816] pt-36 pb-20 px-5 flex items-center justify-center">
        <div className="max-w-md w-full bg-white p-8 sm:p-12 rounded-2xl border border-[#EAE3D9] shadow-[0_2px_12px_rgba(0,0,0,0.03)] text-center space-y-6">
          <div className="w-14 h-14 bg-[#1A1816] text-white rounded-full flex items-center justify-center mx-auto shadow-sm">
            <Lock className="w-5 h-5 stroke-[1.5]" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] uppercase tracking-[0.25em] text-[#8F8171] font-medium">
              PATRON CHECKOUT
            </span>
            <h1 className="font-serif text-2xl text-[#1A1816] font-normal">
              Authentication Required
            </h1>
            <p className="text-xs text-[#7A6E60] leading-relaxed">
              A House of Saelyxe client profile is required to reserve limited atelier garment stock and arrange priority hand-delivery.
            </p>
          </div>

          <button
            onClick={() => setIsAuthOpen(true)}
            className="w-full h-12 bg-[#1A1816] hover:bg-black text-white text-[11px] uppercase font-medium tracking-[0.2em] rounded-xl transition-all flex items-center justify-center gap-3 cursor-pointer"
          >
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Proceed with Google Sign-In</span>
          </button>
        </div>
      </div>
    );
  }

  const handlePaypalApprovedOrder = async (paypalOrderId: string) => {
    const pendingOrder = paypalPendingOrderRef.current || paypalPendingOrder;
    if (!pendingOrder || !paypalOrderId) {
      alert('PayPal approval was received, but the SAELYXE order reference is unavailable. Please contact support and do not submit another payment.');
      return;
    }

    setIsSubmitting(true);
    try {
      const verifiedOrder = await capturePayPalPayment(
        pendingOrder.id || pendingOrder.orderNumber,
        paypalOrderId
      );
      setConfirmedOrder(verifiedOrder);
      paypalPendingOrderRef.current = null;
      paypalCheckoutAttemptIdRef.current = null;
      setPaypalPendingOrder(null);
      clearCart();
    } catch (err) {
      console.error('PayPal server capture exception:', err);
      try {
        await cancelPayPalOrder(pendingOrder.id || pendingOrder.orderNumber);
        paypalPendingOrderRef.current = null;
        paypalCheckoutAttemptIdRef.current = null;
        setPaypalPendingOrder(null);
        alert('PayPal payment was not captured and the pending SAELYXE order was safely cancelled. You can try checkout again.');
      } catch {
        alert(`Your PayPal payment outcome needs verification. SAELYXE order ${pendingOrder.orderNumber} is already recorded. Please do not pay again.`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (confirmedOrder) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] text-[#1A1816] pt-32 pb-24 px-5 sm:px-8">
        <OrderConfirmationModal
          order={confirmedOrder}
          onClose={() => {
            setConfirmedOrder(null);
            navigateTo({ name: 'home' });
          }}
        />
        <div className="max-w-xl mx-auto bg-white p-8 sm:p-12 rounded-2xl border border-[#EAE3D9] shadow-[0_2px_16px_rgba(0,0,0,0.03)] text-center space-y-6 animate-in fade-in">
          <div className="w-14 h-14 bg-[#FAF8F5] border border-[#EAE3D9] text-emerald-800 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 stroke-[1.5]" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] uppercase tracking-[0.25em] text-emerald-900 font-medium">
              COMMISSION CONFIRMED & SEALED
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl text-[#1A1816] font-normal">
              Thank you, {confirmedOrder.customerName}.
            </h1>
            <p className="text-xs text-[#7A6E60]">
              Your order reference is <strong className="font-mono text-[#1A1816]">{confirmedOrder.orderNumber}</strong>. Your order has been securely recorded. Payment and dispatch updates will appear in your order status.
            </p>
          </div>

          <div className="bg-[#FAF8F5] p-5 rounded-xl border border-[#EAE3D9] text-left space-y-3 text-xs">
            <div className="flex justify-between items-center border-b border-[#ECE3D8] pb-2">
              <span className="text-[#7A6E60]">Logistics Courier</span>
              <span className="font-medium text-[#1A1816]">{confirmedOrder.courierName || 'Pending assignment'}</span>
            </div>
            <div className="flex justify-between items-center border-b border-[#ECE3D8] pb-2">
              <span className="text-[#7A6E60]">Estimated Hand-Delivery</span>
              <span className="font-medium text-emerald-900">{confirmedOrder.deliveryEta || 'To be confirmed'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#7A6E60]">Delivery Destination</span>
              <span className="font-medium text-[#1A1816]">{confirmedOrder.address}, {confirmedOrder.city}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => navigateTo({ name: 'orders' })}
              className="flex-1 h-12 bg-[#1A1816] hover:bg-black text-white text-[11px] uppercase font-medium tracking-[0.2em] rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <span>CONTINUE TO MY ORDERS</span>
              <span>→</span>
            </button>
            <button
              onClick={() => navigateTo({ name: 'track-order', orderId: confirmedOrder.orderNumber })}
              className="px-6 h-12 bg-white border border-[#D5CBBF] text-[#1A1816] text-[11px] uppercase font-medium tracking-[0.18em] rounded-xl hover:bg-[#FAF8F5] transition-colors cursor-pointer"
            >
              Track Order
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1816] pt-24 sm:pt-28 pb-28 px-5 sm:px-8 md:px-12 lg:px-16">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Navigation & Top Status */}
        <div className="flex items-center justify-between border-b border-[#EAE3D9] pb-4">
          <button
            onClick={() => navigateTo({ name: 'home' })}
            className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] font-medium text-[#7A6E60] hover:text-[#1A1816] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 stroke-[1.5]" />
            <span>Continue Shopping</span>
          </button>

          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-[#7A6E60]">
            <Lock className="w-3.5 h-3.5 text-emerald-800 stroke-[1.5]" />
            <span>256-Bit Encrypted Checkout</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          
          {/* Left Column: Delivery Details & Payment (7 Cols) */}
          <div className="lg:col-span-7 space-y-10">
            <div className="space-y-10">
              
              {/* Recipient & Hand-Delivery Destination */}
              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#EAE3D9] shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-6">
                
                {/* PROTECTED TITLE SECTION */}
                <div className="flex items-center justify-between border-b border-[#ECE3D8] pb-3">
                  <h3 className="font-serif text-lg font-semibold text-[#1A1816] flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-amber-800" />
                    White-Glove Delivery Address
                  </h3>
                  {!user && (
                    <button
                      type="button"
                      onClick={() => setIsAuthOpen(true)}
                      className="text-[11px] text-[#7A6E60] hover:text-black underline font-semibold"
                    >
                      Sign In for VIP Express
                    </button>
                  )}
                </div>

                {/* REDESIGNED FORM INPUTS (AFTER THE PROTECTED HEADING) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.18em] font-medium text-[#7A6E60] mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kasun Fernando"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      className="w-full h-[48px] sm:h-[50px] bg-[#FCFBF9] border border-[#E5DDD2] rounded-lg px-4 text-xs text-[#1A1816] placeholder:text-[#AAA094] focus:outline-none focus:border-[#1A1816] focus:bg-white transition-colors"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-[10px] uppercase tracking-[0.18em] font-medium text-[#7A6E60]">
                        Contact Phone *
                      </label>
                      {phoneError && (
                        <span className="text-[10px] text-rose-600 font-medium flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {phoneError}
                        </span>
                      )}
                    </div>
                    <input
                      id="phone-input"
                      type="tel"
                      required
                      placeholder="+94 77 123 4567"
                      value={phone}
                      onChange={e => {
                        setPhone(e.target.value);
                        if (phoneError) setPhoneError('');
                      }}
                      className={`w-full h-[48px] sm:h-[50px] bg-[#FCFBF9] border rounded-lg px-4 text-xs text-[#1A1816] placeholder:text-[#AAA094] focus:outline-none focus:bg-white transition-colors ${
                        phoneError ? 'border-rose-400 focus:border-rose-500' : 'border-[#E5DDD2] focus:border-[#1A1816]'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-[0.18em] font-medium text-[#7A6E60] mb-2">
                    Email Address * (For Tracking & Invoice)
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="patron@domain.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full h-[48px] sm:h-[50px] bg-[#FCFBF9] border border-[#E5DDD2] rounded-lg px-4 text-xs text-[#1A1816] placeholder:text-[#AAA094] focus:outline-none focus:border-[#1A1816] focus:bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-[0.18em] font-medium text-[#7A6E60] mb-2">
                    Street Address & Residence *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 74 Ward Place, Rosmead Enclave"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    className="w-full h-[48px] sm:h-[50px] bg-[#FCFBF9] border border-[#E5DDD2] rounded-lg px-4 text-xs text-[#1A1816] placeholder:text-[#AAA094] focus:outline-none focus:border-[#1A1816] focus:bg-white transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.18em] font-medium text-[#7A6E60] mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Colombo 07"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      className="w-full h-[48px] sm:h-[50px] bg-[#FCFBF9] border border-[#E5DDD2] rounded-lg px-4 text-xs text-[#1A1816] placeholder:text-[#AAA094] focus:outline-none focus:border-[#1A1816] focus:bg-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.18em] font-medium text-[#7A6E60] mb-2">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      placeholder="00700"
                      value={postalCode}
                      onChange={e => setPostalCode(e.target.value)}
                      className="w-full h-[48px] sm:h-[50px] bg-[#FCFBF9] border border-[#E5DDD2] rounded-lg px-4 text-xs text-[#1A1816] placeholder:text-[#AAA094] focus:outline-none focus:border-[#1A1816] focus:bg-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.18em] font-medium text-[#7A6E60] mb-2">
                      Country
                    </label>
                    <input
                      type="text"
                      placeholder="Sri Lanka"
                      value={country}
                      onChange={e => setCountry(e.target.value)}
                      className="w-full h-[48px] sm:h-[50px] bg-[#FCFBF9] border border-[#E5DDD2] rounded-lg px-4 text-xs text-[#1A1816] placeholder:text-[#AAA094] focus:outline-none focus:border-[#1A1816] focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-[0.18em] font-medium text-[#7A6E60] mb-2">
                    Courier Delivery Instructions (Optional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Gate code, reception drop-off, or concierge instructions..."
                    className="w-full h-[48px] sm:h-[50px] bg-[#FCFBF9] border border-[#E5DDD2] rounded-lg px-4 text-xs text-[#1A1816] placeholder:text-[#AAA094] focus:outline-none focus:border-[#1A1816] focus:bg-white transition-colors"
                  />
                </div>

                {/* Dynamically show save/remember details checkbox or update details checkbox */}
                {!hasSavedDetails ? (
                  <div className="flex items-center gap-2.5 pt-1 select-none">
                    <input
                      id="remember-details-chk"
                      type="checkbox"
                      checked={rememberDetails}
                      onChange={e => setRememberDetails(e.target.checked)}
                      className="w-4 h-4 rounded border-[#D5CBBF] text-[#1A1816] focus:ring-0 cursor-pointer accent-[#1A1816]"
                    />
                    <label htmlFor="remember-details-chk" className="text-xs text-[#5A4E40] cursor-pointer">
                      Remember my delivery details for future orders
                    </label>
                  </div>
                ) : isDetailsChanged ? (
                  <div className="flex items-center gap-2.5 pt-1 select-none animate-in fade-in">
                    <input
                      id="update-details-chk"
                      type="checkbox"
                      checked={updateSavedDetails}
                      onChange={e => setUpdateSavedDetails(e.target.checked)}
                      className="w-4 h-4 rounded border-[#D5CBBF] text-[#1A1816] focus:ring-0 cursor-pointer accent-[#1A1816]"
                    />
                    <label htmlFor="update-details-chk" className="text-xs text-amber-900 font-medium cursor-pointer">
                      Update my saved delivery details with these changes
                    </label>
                  </div>
                ) : null}
              </div>

              {/* PAYMENT METHOD SECTION - LUXURY VERTICAL SELECTOR */}
              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#EAE3D9] shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-6">
                <div className="flex items-center justify-between border-b border-[#EAE3D9] pb-3.5">
                  <h3 className="font-serif text-lg font-semibold text-[#1A1816] flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-800" />
                    Select Payment Method
                  </h3>
                  <span className="text-[10px] uppercase tracking-[0.16em] text-[#8F8171]">
                    Encrypted Gateway
                  </span>
                </div>

                <div className="space-y-3">
                  {/* PayPal — the only enabled checkout payment method */}
                  {paymentConfig.paypal.enabled && paypalClientId && (
                  <div 
                    className={`p-4 sm:p-4.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                      paymentMethod === 'paypal'
                        ? 'border-[#1A1816] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.03)]'
                        : 'border-[#EAE3D9] bg-[#FCFBF9]/60 hover:border-[#D5CBBF] hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3.5">
                        <div className="w-9 h-9 rounded-lg bg-[#FAF8F5] border border-[#EAE3D9] flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 object-contain" viewBox="0 0 24 24" fill="none">
                            <path d="M7.076 21.337H2.47a.64.64 0 0 1-.633-.74L4.944 3.72a.767.767 0 0 1 .757-.645h6.852c3.21 0 5.48 1.488 5.176 4.673-.356 3.731-2.906 5.61-6.195 5.61H9.088l-1.379 7.979h-.633z" fill="#003087"/>
                            <path d="M8.666 14.73h2.383c2.81 0 5.02-1.574 5.318-4.707.243-2.55-1.423-3.844-4.14-3.844H8.487a.64.64 0 0 0-.633.541l-2.27 14.372a.48.48 0 0 0 .474.555h3.044l1.379-7.978c.036-.208.214-.361.425-.361z" fill="#0079C1"/>
                          </svg>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs uppercase font-semibold tracking-wider text-[#1A1816]">
                              PayPal
                            </span>
                            <span className="text-[9px] uppercase tracking-wider bg-[#EBF3FB] text-[#1E40AF] px-2 py-0.5 rounded font-medium">
                              Global Buyer Protection
                            </span>
                          </div>
                          <p className="text-[11px] text-[#7A6E60] mt-0.5">
                            Global / USD / EUR / International Cards
                          </p>
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                        paymentMethod === 'paypal' ? 'border-[#1A1816]' : 'border-[#D5CBBF]'
                      }`}>
                        {paymentMethod === 'paypal' && <div className="w-2 h-2 rounded-full bg-[#1A1816]" />}
                      </div>
                    </div>

                    {paymentMethod === 'paypal' && (
                      <div className="mt-4 pt-3.5 border-t border-[#EAE3D9] space-y-3.5 animate-in fade-in">
                        <p className="text-[11px] leading-relaxed text-[#5A4E40]">
                          Pay securely using your PayPal account or eligible international payment card. PayPal will charge {paypalCurrency} {paypalDisplayAmount.toFixed(2)}.
                        </p>

                        {/* Customer-facing PayPal SDK UI; provider order creation and capture remain server-authoritative. */}
                        <div className="pt-1">
                          <PayPalScriptProvider 
                            options={{ 
                              clientId: paypalClientId, 
                              currency: paypalCurrency 
                            }}
                          >
                            <PayPalButtons
                              style={{ layout: 'vertical', shape: 'rect', color: 'gold', height: 44 }}
                              createOrder={async () => {
                                if (!customerName || !email || phone.replace(/\D/g, '').length < 9 || !address || !city || !country) {
                                  alert('Please complete your delivery and contact details before continuing to PayPal.');
                                  throw new Error('Checkout details are incomplete.');
                                }

                                let localOrder = paypalPendingOrderRef.current || paypalPendingOrder;
                                if (!localOrder || localOrder.status === 'cancelled') {
                                  localOrder = await createOrder({
                                    customerName,
                                    email,
                                    phone,
                                    address,
                                    city,
                                    postalCode,
                                    country,
                                    items: cart.map(item => ({
                                      productId: item.productId,
                                      title: item.title,
                                      image: item.image,
                                      priceLKR: item.priceLKR,
                                      size: item.size,
                                      quantity: item.quantity
                                    })),
                                    currencyUsed: selectedCurrency?.code || 'USD',
                                    paymentMethod: 'paypal',
                                    promoCode: appliedPromo?.code,
                                    checkoutAttemptId: paypalCheckoutAttemptIdRef.current || (
                                      paypalCheckoutAttemptIdRef.current = createPayPalCheckoutAttemptId()
                                    ),
                                    notes
                                  });
                                  paypalPendingOrderRef.current = localOrder;
                                  setPaypalPendingOrder(localOrder);
                                }

                                const started = await createPayPalPayment(
                                  localOrder.id || localOrder.orderNumber
                                );
                                if (!started.paypalOrderId || !started.order) {
                                  throw new Error('PayPal payment could not be initialized.');
                                }
                                paypalPendingOrderRef.current = started.order;
                                setPaypalPendingOrder(started.order);
                                return started.paypalOrderId;
                              }}
                              onApprove={async (data) => {
                                await handlePaypalApprovedOrder(data.orderID);
                              }}
                              onCancel={async () => {
                                const pendingOrder = paypalPendingOrderRef.current || paypalPendingOrder;
                                if (!pendingOrder) return;
                                try {
                                  await cancelPayPalOrder(
                                    pendingOrder.id || pendingOrder.orderNumber
                                  );
                                  paypalPendingOrderRef.current = null;
                                  paypalCheckoutAttemptIdRef.current = null;
                                  setPaypalPendingOrder(null);
                                } catch (err) {
                                  console.error('PayPal cancellation sync failed:', err);
                                  alert(`PayPal checkout was closed, but SAELYXE order ${pendingOrder.orderNumber} was kept pending because payment status could not be safely ruled out. Please do not pay again until its status is checked.`);
                                }
                              }}
                              onError={async (err) => {
                                console.error('PayPal Button Error:', err);
                                const pendingOrder = paypalPendingOrderRef.current || paypalPendingOrder;
                                if (!pendingOrder) return;
                                try {
                                  await cancelPayPalOrder(
                                    pendingOrder.id || pendingOrder.orderNumber
                                  );
                                  paypalPendingOrderRef.current = null;
                                  paypalCheckoutAttemptIdRef.current = null;
                                  setPaypalPendingOrder(null);
                                  alert('PayPal checkout could not continue, so the pending SAELYXE order was safely cancelled. You can try again.');
                                } catch {
                                  alert(`PayPal checkout encountered an error. SAELYXE order ${pendingOrder.orderNumber} was kept pending because payment status could not be safely ruled out. Please do not create another payment until this order is checked.`);
                                }
                              }}
                            />
                          </PayPalScriptProvider>
                        </div>
                      </div>
                    )}
                  </div>
                  )}

                  {paymentConfigLoaded &&
                    !paymentConfig.paypal.enabled && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                      Online payment methods are temporarily unavailable. Please contact support before placing an order.
                    </div>
                  )}

                </div>
              </div>
            </div>
          </div>

          {/* Right Column: ORDER SUMMARY (5 Cols) */}
          <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-2xl border border-[#EAE3D9] shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-6 lg:sticky lg:top-28">
            
            <div className="border-b border-[#EAE3D9] pb-3.5 flex items-baseline justify-between">
              <h3 className="font-serif text-lg font-semibold text-[#1A1816] tracking-wide">
                ORDER SUMMARY
              </h3>
              <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-[#8F8171]">
                {totalItemsCount} {totalItemsCount === 1 ? 'ITEM' : 'ITEMS'}
              </span>
            </div>

            {/* Product List */}
            <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
              {cart.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between gap-4 text-xs border-b border-[#F5F2EC] pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3.5">
                    <img 
                      src={item.image} 
                      alt="" 
                      className="w-20 h-24 object-cover rounded-lg bg-[#FAF8F5] border border-[#EAE3D9] flex-shrink-0" 
                    />
                    <div>
                      <h4 className="font-serif text-sm text-[#1A1816] font-normal leading-snug tracking-wide">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-[#7A6E60] uppercase tracking-wider font-sans mt-0.5">
                        Size {item.size} · Qty {item.quantity}
                      </p>
                    </div>
                  </div>
                  <div className="font-serif text-sm font-semibold text-[#1A1816] whitespace-nowrap">
                    {formatPrice(item.priceLKR * item.quantity)}
                  </div>
                </div>
              ))}
            </div>

            {/* Promo / Atelier Voucher */}
            <div className="border-t border-[#EAE3D9] pt-5 space-y-2.5">
              <label className="block text-[10px] uppercase tracking-[0.18em] font-medium text-[#7A6E60] flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 stroke-[1.5]" />
                PROMO / ATELIER VOUCHER CODE
              </label>
              {appliedPromo ? (
                <div className="flex items-center justify-between p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-lg text-xs text-emerald-950">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                    <div>
                      <span className="font-medium tracking-wider">{appliedPromo.code}</span>
                      <span className="text-[11px] block text-emerald-800">
                        {appliedPromo.discountPercent ? `${appliedPromo.discountPercent}% VIP Discount` : `-${formatPrice(appliedPromo.discountFixedLKR || 0)}`}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemovePromo}
                    className="text-[11px] font-medium text-rose-700 hover:text-rose-900 underline cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyPromo} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. SAELYXVIP or DROP10"
                    value={promoCode}
                    onChange={e => {
                      setPromoCode(e.target.value.toUpperCase());
                      if (promoError) setPromoError('');
                    }}
                    className="flex-1 h-[42px] bg-[#FCFBF9] border border-[#E5DDD2] rounded-lg px-3.5 text-xs uppercase font-mono tracking-wider text-[#1A1816] focus:outline-none focus:border-[#1A1816]"
                  />
                  <button
                    type="submit"
                    className="h-[42px] px-5 bg-[#1A1816] hover:bg-black text-white text-[10px] uppercase font-medium tracking-[0.2em] rounded-lg transition-colors cursor-pointer"
                  >
                    APPLY →
                  </button>
                </form>
              )}
              {promoError && (
                <p className="text-[11px] text-rose-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {promoError}
                </p>
              )}
              {promoSuccess && (
                <p className="text-[11px] text-emerald-800 font-medium flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 flex-shrink-0" />
                  {promoSuccess}
                </p>
              )}
            </div>

            {/* Price Hierarchy */}
            <div className="border-t border-[#EAE3D9] pt-5 space-y-2.5 text-xs">
              <div className="flex justify-between text-[#7A6E60]">
                <span>SUBTOTAL</span>
                <span className="font-mono text-[#1A1816]">{formatPrice(subtotalLKR)}</span>
              </div>
              <div className="flex justify-between text-[#7A6E60]">
                <span>WHITE-GLOVE DELIVERY</span>
                <span className="font-mono text-emerald-900 font-medium">
                  {shippingLKR === 0 ? 'COMPLIMENTARY' : formatPrice(shippingLKR)}
                </span>
              </div>
              {discountLKR > 0 && (
                <div className="flex justify-between text-emerald-800 font-medium">
                  <span>DISCOUNT ({appliedPromo?.code})</span>
                  <span className="font-mono">-{formatPrice(discountLKR)}</span>
                </div>
              )}
              <div className="border-t border-[#EAE3D9] pt-3.5 flex justify-between items-baseline">
                <div>
                  <span className="block text-xs uppercase tracking-[0.18em] font-semibold text-[#1A1816]">
                    TOTAL
                  </span>
                  <span className="text-[10px] text-[#8F8171] uppercase tracking-wider">
                    Taxes and courier insurance included
                  </span>
                </div>
                <div className="font-serif text-2xl font-normal text-[#1A1816]">
                  {formatPrice(totalLKR)}
                </div>
              </div>
            </div>

            {/* Trust / Service Information */}
            <div className="border-t border-[#EAE3D9] pt-5 space-y-3.5">
              <div className="flex items-start gap-3 text-xs text-[#5A4E40]">
                <ShieldCheck className="w-4 h-4 text-emerald-800 flex-shrink-0 mt-0.5 stroke-[1.5]" />
                <div>
                  <span className="block text-[10px] uppercase tracking-[0.16em] font-semibold text-[#1A1816]">
                    14-Day Size Exchange
                  </span>
                  <p className="text-[11px] text-[#7A6E60] leading-relaxed">
                    Complimentary doorstep size and silhouette exchange on eligible garments.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-xs text-[#5A4E40]">
                <Truck className="w-4 h-4 text-amber-800 flex-shrink-0 mt-0.5 stroke-[1.5]" />
                <div>
                  <span className="block text-[10px] uppercase tracking-[0.16em] font-semibold text-[#1A1816]">
                    Live Order Tracking
                  </span>
                  <p className="text-[11px] text-[#7A6E60] leading-relaxed">
                    Receive live courier GPS updates from atelier dispatch to arrival.
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
