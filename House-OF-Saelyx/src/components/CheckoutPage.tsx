import { getAppCheckRequestHeaders } from '../lib/firebase';
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
  ChevronDown,
  ChevronUp,
  Globe,
  BadgePercent,
  Sparkles
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Order } from '../types';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { OrderConfirmationModal } from './OrderConfirmationModal';
import { DELIVERABLE_COUNTRIES, getCountryDialCode } from '../data/countries';

function createPayPalCheckoutAttemptId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return `paypal-${crypto.randomUUID()}`;
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const values = new Uint32Array(4);
    crypto.getRandomValues(values);
    return `paypal-${Array.from(values, value => value.toString(36)).join('-')}`;
  }
  throw new Error('Secure checkout identifier generation is unavailable.');
}

function createPayzyCheckoutAttemptId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return `payzy-${crypto.randomUUID()}`;
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const values = new Uint32Array(4);
    crypto.getRandomValues(values);
    return `payzy-${Array.from(values, value => value.toString(36)).join('-')}`;
  }
  throw new Error('Secure checkout identifier generation is unavailable.');
}

function createCodCheckoutAttemptId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `cod-${crypto.randomUUID()}`;
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const values = new Uint32Array(4);
    crypto.getRandomValues(values);
    return `cod-${Array.from(values, value => value.toString(36)).join('-')}`;
  }
  throw new Error('Secure checkout identifier generation is unavailable.');
}

const PayzyMark: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg data-testid="payzy-mark" className={className} viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <path d="M8 8h29c11.6 0 19 7.7 19 18.4 0 10.6-7.5 18.3-19 18.3H25.7L8 58V8Z" fill="#13A8DD" />
    <path d="M18 17.5h18.7c6.8 0 11.3 3.7 11.3 9s-4.5 9-11.3 9H18l10.1-9L18 17.5Z" fill="#34353C" />
    <path d="M26.8 21.5h9.4c4.5 0 7.4 1.9 7.4 5s-2.9 5-7.4 5h-9.4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="3.2 3.2" opacity="0.95" />
    <path d="M18.2 22.8 24 26.5l-5.8 3.7" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="17.6" cy="26.5" r="2.1" fill="#34353C" />
  </svg>
);

export const CheckoutPage: React.FC = () => {
  const {
    cart,
    formatPrice,
    selectedCurrency,
    currencies,
    settings,
    createOrder,
    createPayPalPayment,
    capturePayPalPayment,
    cancelPayPalOrder,
    createPayzyPayment,
    getPayzyPaymentStatus,
    clearCart,
    navigateTo,
    user,
    setIsAuthOpen,
    setIsCartOpen
  } = useStore();

  const savedDetailsKey = user?.uid ? 'saelyx_saved_delivery_details:' + user.uid : null;
  const [savedDetailsObj, setSavedDetailsObj] = useState<any>(() => {
    try {
      const saved = savedDetailsKey ? localStorage.getItem(savedDetailsKey) : null;
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [hasSavedDetails, setHasSavedDetails] = useState(() => Boolean(savedDetailsObj));
  const [rememberDetails, setRememberDetails] = useState(false);
  const [updateSavedDetails, setUpdateSavedDetails] = useState(false);

  const initialFirstName = savedDetailsObj?.firstName || user?.firstName || (savedDetailsObj?.customerName ? savedDetailsObj.customerName.split(' ')[0] : user?.name ? user.name.split(' ')[0] : '');
  const initialLastName = savedDetailsObj?.lastName || user?.lastName || (savedDetailsObj?.customerName ? savedDetailsObj.customerName.split(' ').slice(1).join(' ') : user?.name ? user.name.split(' ').slice(1).join(' ') : '');

  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [email, setEmail] = useState(savedDetailsObj?.email || user?.email || '');
  
  const rawInitialPhone = savedDetailsObj?.phone || user?.phoneNumber || '';
  const [phone, setPhone] = useState(() => {
    return rawInitialPhone.replace(/^\+\d{1,4}\s*/, '').trim();
  });

  const [address, setAddress] = useState(savedDetailsObj?.address || user?.address || '');
  const [city, setCity] = useState(savedDetailsObj?.city || user?.city || '');
  const [postalCode, setPostalCode] = useState(savedDetailsObj?.postalCode || user?.postalCode || '');
  const [country, setCountry] = useState(savedDetailsObj?.country || user?.country || 'Sri Lanka');
  const [notes, setNotes] = useState(savedDetailsObj?.notes || '');

  const [fieldErrors, setFieldErrors] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    paymentMethod?: string;
    general?: string;
  }>({});

  useEffect(() => {
    if (!user) return;
    if (!firstName) setFirstName(user.firstName || (user.name ? user.name.split(' ')[0] : ''));
    if (!lastName) setLastName(user.lastName || (user.name ? user.name.split(' ').slice(1).join(' ') : ''));
    if (!email && user.email) setEmail(user.email);
    if (!phone && user.phoneNumber) setPhone(user.phoneNumber.replace(/^\+\d{1,4}\s*/, '').trim());
    if (user.address && (!savedDetailsObj || !savedDetailsObj.address)) setAddress(user.address);
    if (user.city && (!savedDetailsObj || !savedDetailsObj.city)) setCity(user.city);
    if (user.postalCode && (!savedDetailsObj || !savedDetailsObj.postalCode)) setPostalCode(user.postalCode);
    if (user.country && (!savedDetailsObj || !savedDetailsObj.country)) setCountry(user.country);
  }, [user]);

  const [paymentMethod, setPaymentMethod] = useState<'paypal' | 'payzy' | 'cod' | null>(null);
  const [paymentConfig, setPaymentConfig] = useState({
    paypal: { enabled: true, clientId: (import.meta.env.VITE_PAYPAL_CLIENT_ID as string) || '', mode: 'sandbox' },
    payzy: { enabled: true, configured: false, mode: 'sandbox' as 'sandbox' | 'live', testAmountLKR: 10 as number | null }
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
            enabled: config.paypal?.enabled !== false,
            clientId: String(config.paypal?.clientId || (import.meta.env.VITE_PAYPAL_CLIENT_ID as string) || ''),
            mode: config.paypal?.mode === 'live' ? 'live' : 'sandbox'
          },
          payzy: {
            enabled: config.payzy?.enabled !== false,
            configured: config.payzy?.configured === true,
            mode: config.payzy?.mode === 'live' ? 'live' : 'sandbox',
            testAmountLKR: Number.isFinite(Number(config.payzy?.testAmountLKR)) ? Number(config.payzy.testAmountLKR) : null
          }
        });
      })
      .catch(() => {})
      .finally(() => {
        if (active) setPaymentConfigLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const paypalClientId = paymentConfig.paypal.clientId || (import.meta.env.VITE_PAYPAL_CLIENT_ID as string) || '';
  const [isPromoOpen, setIsPromoOpen] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [isCheckingPromo, setIsCheckingPromo] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discountFixedLKR: number; message?: string } | null>(null);
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [paypalPendingOrder, setPaypalPendingOrder] = useState<Order | null>(null);
  const paypalPendingOrderRef = useRef<Order | null>(null);
  const paypalCheckoutAttemptIdRef = useRef<string | null>(null);
  const codCheckoutAttemptIdRef = useRef<string | null>(null);
  const payzyCheckoutAttemptIdRef = useRef<string | null>(null);
  const payzyReturnHandledRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isPayzyReturn = params.has('payzy') && params.has('orderId');
    if (cart.length === 0 && !confirmedOrder && !isPayzyReturn) {
      navigateTo({ name: 'home' });
      setIsCartOpen(true);
    }
  }, [cart.length, confirmedOrder, navigateTo, setIsCartOpen]);

  const customerName = `${firstName.trim()} ${lastName.trim()}`.trim();
  const currentDialCode = getCountryDialCode(country);
  const fullPhoneNumber = `${currentDialCode} ${phone.trim()}`.trim();

  const isDetailsChanged = !!(savedDetailsObj && (
    firstName !== savedDetailsObj.firstName ||
    lastName !== savedDetailsObj.lastName ||
    email !== savedDetailsObj.email ||
    fullPhoneNumber !== savedDetailsObj.phone ||
    address !== savedDetailsObj.address ||
    city !== savedDetailsObj.city ||
    postalCode !== savedDetailsObj.postalCode ||
    country !== savedDetailsObj.country ||
    notes !== savedDetailsObj.notes
  ));

  const effectiveCart = cart;

  const totalItemsCount = effectiveCart.reduce((acc, item) => acc + item.quantity, 0);
  const subtotalLKR = effectiveCart.reduce((acc, item) => acc + item.priceLKR * item.quantity, 0);
  const discountLKR = appliedPromo ? appliedPromo.discountFixedLKR : 0;
  const discountedSubtotalLKR = Math.max(0, subtotalLKR - discountLKR);
  const freeShippingThresholdLKR = Number(settings?.freeShippingThresholdLKR) > 0 ? Number(settings.freeShippingThresholdLKR) : 50000;
  const standardShippingLKR = Number(settings?.standardShippingLKR) >= 0 ? Number(settings.standardShippingLKR) : 2500;
  const shippingLKR = effectiveCart.length === 0 ? 0 : (discountedSubtotalLKR >= freeShippingThresholdLKR ? 0 : standardShippingLKR);
  const totalLKR = discountedSubtotalLKR + shippingLKR;
  const totalInCurrency = Number((totalLKR * (selectedCurrency?.rateFromLKR || 1)).toFixed(2));
  const paypalCurrency = ['USD', 'EUR', 'GBP'].includes(selectedCurrency?.code || '') ? (selectedCurrency?.code || 'USD') : 'USD';
  const usdRateFromLKR = currencies.find(currency => currency.code === 'USD')?.rateFromLKR || 0.0033;
  const paypalDisplayAmount = paypalCurrency === selectedCurrency?.code ? totalInCurrency : Number((totalLKR * usdRateFromLKR).toFixed(2));

  const isSriLanka = country.trim().toLowerCase() === 'sri lanka';

  const handleApplyPromo = async (event: React.FormEvent) => {
    event.preventDefault();
    setPromoError('');
    setPromoSuccess('');
    const code = promoCode.trim().toUpperCase();
    if (!code) return;
    setIsCheckingPromo(true);
    try {
      const response = await fetch('/api/promo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAppCheckRequestHeaders()) },
        body: JSON.stringify({ code, subtotalLKR })
      });
      const data = await response.json();
      if (response.ok && data.valid) {
        setAppliedPromo({ code, discountFixedLKR: data.discountLKR, message: data.message });
        setPromoSuccess(data.message || 'Promo code applied successfully.');
      } else {
        setPromoError(data.error || data.message || 'Invalid promo or coupon code.');
      }
    } catch {
      setPromoError('Unable to validate promo code. Please check your connection.');
    } finally {
      setIsCheckingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCode('');
    setPromoSuccess('');
    setPromoError('');
  };

  const paymentSwitchInFlightRef = useRef(false);
  const [isSwitchingPayment, setIsSwitchingPayment] = useState(false);
  const unresolvedPaymentMessage = 'We could not confirm the previous PayPal checkout was cancelled. Please retry or refresh before changing payment method.';

  const reconcilePendingCheckout = async (pendingOrder: Order) => {
    const reconciled = await cancelPayPalOrder(pendingOrder.id || pendingOrder.orderNumber);
    if (reconciled.paymentStatus === 'verified') {
      setConfirmedOrder(reconciled);
      clearCart();
    } else if (reconciled.status !== 'cancelled') {
      throw new Error(unresolvedPaymentMessage);
    }
    paypalPendingOrderRef.current = null;
    paypalCheckoutAttemptIdRef.current = null;
    setPaypalPendingOrder(null);
    return reconciled;
  };

  const handlePaymentMethodChange = async (method: 'paypal' | 'payzy' | 'cod') => {
    if (paymentSwitchInFlightRef.current || isSubmitting || method === paymentMethod) return;
    const previousMethod = paymentMethod;

    setPaymentMethod(method);
    setFieldErrors(previous => ({ ...previous, paymentMethod: undefined, general: undefined }));
    paymentSwitchInFlightRef.current = true;
    setIsSwitchingPayment(true);
    try {
      if (previousMethod === 'paypal' && method !== 'paypal') {
        const pending = paypalPendingOrderRef.current || paypalPendingOrder;
        if (pending) {
          const reconciled = await reconcilePendingCheckout(pending);
          if (reconciled.paymentStatus === 'verified') return;
        }
      }
    } catch {
      setPaymentMethod(previousMethod);
      setFieldErrors(previous => ({ ...previous, general: unresolvedPaymentMessage }));
    } finally {
      paymentSwitchInFlightRef.current = false;
      setIsSwitchingPayment(false);
    }
  };

  const validateDeliveryDetails = (): boolean => {
    const errors: typeof fieldErrors = {};
    if (!firstName.trim()) errors.firstName = 'First name is required.';
    if (!lastName.trim()) errors.lastName = 'Last name is required.';
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = 'Please provide a valid email address.';
    
    const digitsOnly = phone.replace(/\D/g, '');
    if (!digitsOnly || digitsOnly.length < 6 || digitsOnly.length > 16) {
      errors.phone = 'Please enter a valid contact number.';
    }

    if (!address.trim()) errors.address = 'Delivery address is required.';
    if (!city.trim()) errors.city = 'City / locality is required.';
    setFieldErrors(errors);
    const firstErrorKey = Object.keys(errors)[0];
    if (!firstErrorKey) return true;
    const inputElement = document.getElementById(`field-${firstErrorKey}`);
    inputElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    inputElement?.focus();
    return false;
  };

  const persistDeliveryDetailsIfNeeded = () => {
    if (!(rememberDetails || updateSavedDetails) || !savedDetailsKey) return;
    try {
      const detailsToSave = {
        customerName,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: fullPhoneNumber,
        address: address.trim(),
        city: city.trim(),
        postalCode: postalCode.trim(),
        country: country.trim() || 'Sri Lanka',
        notes: notes.trim()
      };
      localStorage.setItem(savedDetailsKey, JSON.stringify(detailsToSave));
      setSavedDetailsObj(detailsToSave);
      setHasSavedDetails(true);
      setRememberDetails(false);
      setUpdateSavedDetails(false);
    } catch (error) {
      console.warn('Non-fatal delivery details persistence note:', error);
    }
  };

  const handlePaypalApprovedOrder = async (paypalOrderId: string) => {
    const pendingOrder = paypalPendingOrderRef.current || paypalPendingOrder;
    if (!pendingOrder || !paypalOrderId) {
      setFieldErrors(previous => ({ ...previous, general: 'PayPal approval was received, but the order reference is unavailable. Please contact SAELYXE support.' }));
      return;
    }
    setIsSubmitting(true);
    try {
      const verifiedOrder = await capturePayPalPayment(pendingOrder.id || pendingOrder.orderNumber, paypalOrderId);
      persistDeliveryDetailsIfNeeded();
      setConfirmedOrder(verifiedOrder);
      paypalPendingOrderRef.current = null;
      paypalCheckoutAttemptIdRef.current = null;
      setPaypalPendingOrder(null);
      clearCart();
    } catch (error) {
      console.error('PayPal server capture exception:', error);
      try {
        const reconciled = await reconcilePendingCheckout(pendingOrder);
        if (reconciled.paymentStatus === 'verified') return;
        setFieldErrors(previous => ({ ...previous, general: 'PayPal payment was not captured and the pending order was cancelled. You may try again.' }));
      } catch {
        setFieldErrors(previous => ({ ...previous, general: `PayPal payment outcome needs verification. Order ${pendingOrder.orderNumber} is recorded. Please contact support before paying again.` }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCodOrder = async () => {
    if (cart.length === 0) {
      setFieldErrors(previous => ({ ...previous, general: 'Your shopping bag is empty. Please select garments before placing an order.' }));
      return;
    }
    if (!validateDeliveryDetails()) return;
    if (!isSriLanka) {
      setFieldErrors(previous => ({ ...previous, general: 'Cash on Delivery is currently available only for Sri Lankan delivery addresses. For FedEx international delivery, please select PayPal.' }));
      return;
    }

    setIsSubmitting(true);
    setFieldErrors(previous => ({ ...previous, general: undefined }));
    try {
      const order = await createOrder({
        customerName,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: fullPhoneNumber,
        address: address.trim(),
        city: city.trim(),
        postalCode: postalCode.trim(),
        country: country.trim() || 'Sri Lanka',
        items: cart.map(item => ({ productId: item.productId, size: item.size, quantity: item.quantity })),
        currencyUsed: selectedCurrency?.code || 'LKR',
        paymentMethod: 'cod',
        promoCode: appliedPromo?.code,
        checkoutAttemptId: codCheckoutAttemptIdRef.current || (codCheckoutAttemptIdRef.current = createCodCheckoutAttemptId()),
        notes: notes.trim()
      });
      persistDeliveryDetailsIfNeeded();
      setConfirmedOrder(order);
      codCheckoutAttemptIdRef.current = null;
      clearCart();
    } catch (error) {
      console.error('COD checkout exception:', error);
      setFieldErrors(previous => ({ ...previous, general: error instanceof Error ? error.message : 'Cash on Delivery order could not be placed.' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayzyOrder = async () => {
    if (cart.length === 0) {
      setFieldErrors(previous => ({ ...previous, general: 'Your shopping bag is empty. Please select garments before placing an order.' }));
      return;
    }
    if (!validateDeliveryDetails()) return;
    if (!isSriLanka) {
      setFieldErrors(previous => ({ ...previous, general: 'Payzy is currently available for Sri Lankan delivery addresses only. For international delivery, please use PayPal.' }));
      return;
    }
    if (!paymentConfig.payzy.configured) {
      setFieldErrors(previous => ({ ...previous, general: 'Payzy server credential setup is currently pending. Please select PayPal or Cash on Delivery.' }));
      return;
    }

    setIsSubmitting(true);
    setFieldErrors(previous => ({ ...previous, general: undefined }));
    try {
      const order = await createOrder({
        customerName,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: fullPhoneNumber,
        address: address.trim(),
        city: city.trim(),
        postalCode: postalCode.trim(),
        country: country.trim() || 'Sri Lanka',
        items: cart.map(item => ({ productId: item.productId, size: item.size, quantity: item.quantity })),
        currencyUsed: 'LKR',
        paymentMethod: 'payzy',
        promoCode: appliedPromo?.code,
        checkoutAttemptId: payzyCheckoutAttemptIdRef.current || (payzyCheckoutAttemptIdRef.current = createPayzyCheckoutAttemptId()),
        notes: notes.trim()
      });
      const started = await createPayzyPayment(order.id || order.orderNumber);
      if (!started.checkoutUrl || !/^https:\/\//i.test(started.checkoutUrl)) throw new Error('Payzy checkout URL could not be initialized.');
      persistDeliveryDetailsIfNeeded();
      window.location.assign(started.checkoutUrl);
    } catch (error) {
      console.error('Payzy checkout exception:', error);
      setFieldErrors(previous => ({ ...previous, general: error instanceof Error ? error.message : 'Payzy checkout could not be started.' }));
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (payzyReturnHandledRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const payzyState = params.get('payzy');
    const orderId = params.get('orderId');
    if (!payzyState || !orderId) return;

    payzyReturnHandledRef.current = true;
    void (async () => {
      try {
        const order = await getPayzyPaymentStatus(orderId);
        if (payzyState === 'success' && order.paymentStatus === 'verified') {
          persistDeliveryDetailsIfNeeded();
          setConfirmedOrder(order);
          payzyCheckoutAttemptIdRef.current = null;
          clearCart();
          return;
        }
        if (payzyState === 'sandbox-success' && order.payzySandboxVerified === true) {
          payzyCheckoutAttemptIdRef.current = null;
          setFieldErrors(previous => ({ ...previous, general: `Payzy sandbox test passed for order ${order.orderNumber}. This is not a live paid order and it will not be fulfilled.` }));
          return;
        }
        if (payzyState === 'failed') {
          setFieldErrors(previous => ({ ...previous, general: 'Payzy reported that the payment was not completed. You can safely try again.' }));
          return;
        }
        setFieldErrors(previous => ({ ...previous, general: `Payzy payment status could not be confirmed for order ${order.orderNumber}. Please check My Orders before retrying.` }));
      } catch (error) {
        setFieldErrors(previous => ({ ...previous, general: error instanceof Error ? error.message : 'Unable to reconcile the Payzy payment return.' }));
      } finally {
        window.history.replaceState({}, '', '/secure-order-session');
      }
    })();
  }, [getPayzyPaymentStatus]);

  if (confirmedOrder) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] text-[#1A1816] pt-28 pb-24 px-5 sm:px-8 select-none">
        <OrderConfirmationModal order={confirmedOrder} onClose={() => { setConfirmedOrder(null); navigateTo({ name: 'home' }); }} />
        <div className="max-w-xl mx-auto bg-white p-8 sm:p-12 rounded-3xl border border-[#EAE3D9] shadow-[0_4px_30px_rgba(0,0,0,0.03)] text-center space-y-7">
          <div className="w-16 h-16 bg-[#FBF9F5] border border-[#E8E0D5] text-emerald-800 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-9 h-9 stroke-[1.5]" />
          </div>
          <div className="space-y-2.5">
            <span className="text-[10px] uppercase tracking-[0.25em] text-emerald-900 font-bold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              ORDER CONFIRMED
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl text-[#1A1816] font-normal pt-1">
              Thank you, {confirmedOrder.customerName}.
            </h1>
            <p className="text-xs text-[#665A4E] leading-relaxed">
              Your order reference is <strong className="font-price font-bold text-[#1A1816] bg-[#F6F2EC] px-2 py-0.5 rounded border border-[#E5DDD2]">{confirmedOrder.orderNumber}</strong>. 
              Track this order anytime with your reference below or through My Orders.
            </p>
          </div>

          <div className="bg-[#FAF8F5] p-5 rounded-2xl border border-[#EAE3D9] text-left space-y-3.5 text-xs">
            <div className="flex justify-between items-center border-b border-[#ECE3D8] pb-2.5">
              <span className="text-[#7A6E60]">Payment Method</span>
              <span className="font-semibold text-[#1A1816] uppercase tracking-wider">
                {confirmedOrder.paymentMethod === 'paypal' ? 'PayPal' : confirmedOrder.paymentMethod === 'payzy' ? 'Payzy' : 'Cash on Delivery'}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-[#ECE3D8] pb-2.5">
              <span className="text-[#7A6E60]">Logistics Courier</span>
              <span className="font-semibold text-[#1A1816] flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-[#8C7A68]" />
                {confirmedOrder.courierName || (confirmedOrder.country !== 'Sri Lanka' ? 'FedEx Express Worldwide' : 'Premier Express Courier')}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-[#ECE3D8] pb-2.5">
              <span className="text-[#7A6E60]">Estimated Delivery</span>
              <span className="font-price font-semibold text-emerald-900">
                {confirmedOrder.deliveryEta || (confirmedOrder.country !== 'Sri Lanka' ? '3–5 Business Days (FedEx)' : '1–3 Business Days')}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-[#ECE3D8] pb-2.5">
              <span className="text-[#7A6E60]">Destination Country</span>
              <span className="font-medium text-[#1A1816]">{confirmedOrder.country || 'Sri Lanka'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#7A6E60]">Delivery Address</span>
              <span className="font-medium text-[#1A1816] text-right truncate max-w-[240px]">{confirmedOrder.address}, {confirmedOrder.city}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigateTo({ name: 'orders' })}
              className="flex-1 h-12 bg-[#1A1816] hover:bg-black text-white text-[11px] uppercase font-semibold tracking-[0.2em] rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow-md"
            >
              CONTINUE TO MY ORDERS →
            </button>
            <button
              type="button"
              onClick={() => navigateTo({ name: 'track-order', orderId: confirmedOrder.orderNumber })}
              className="px-6 h-12 bg-white border border-[#D5CBBF] text-[#1A1816] text-[11px] uppercase font-semibold tracking-[0.18em] rounded-xl hover:bg-[#FAF8F5] transition-colors cursor-pointer"
            >
              Track Order
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1816] pt-24 sm:pt-28 pb-28 px-5 sm:px-8 md:px-12 lg:px-16 select-none">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Top Navigation & Security Header */}
        <div className="flex items-center justify-between border-b border-[#EAE3D9] pb-4">
          <button
            type="button"
            onClick={() => navigateTo({ name: 'home' })}
            className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] font-semibold text-[#665A4E] hover:text-[#1A1816] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 stroke-[1.5]" />
            <span>Continue Shopping</span>
          </button>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-[#665A4E]">
            <Lock className="w-3.5 h-3.5 text-emerald-800 stroke-[1.5]" />
            <span>{user ? 'Secure Account Checkout' : 'Secure Guest Checkout'}</span>
          </div>
        </div>

        {fieldErrors.general && (
          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-800 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{fieldErrors.general}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Left Column: Form & Steps */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* Step 1: Delivery & Contact Information */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#EAE3D9] shadow-[0_1px_4px_rgba(0,0,0,0.02)] space-y-6">
              <div className="flex items-center justify-between border-b border-[#ECE3D8] pb-4">
                <div>
                  <h3 className="font-serif text-xl font-semibold text-[#1A1816] flex items-center gap-2.5">
                    <MapPin className="w-4 h-4 text-[#8C7A68]" />
                    Delivery & Destination
                  </h3>
                  <p className="text-[11px] text-[#7A6E60] mt-0.5">Enter your recipient and destination address.</p>
                </div>
                <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#8F8171] bg-[#FAF8F5] px-2.5 py-1 rounded-full border border-[#E8E1D7]">
                  Step 1 of 2
                </span>
              </div>

              {/* Dispatch & Courier Banner */}
              <div className="p-3.5 rounded-xl bg-[#F7F4EE] border border-[#E5DDD2] flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#1A1816] text-white flex items-center justify-center shrink-0">
                    <Truck className="w-4 h-4 stroke-[1.75]" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#1A1816] block truncate">
                      {isSriLanka ? 'Premier Express Islandwide Courier' : 'FedEx Express Worldwide Courier'}
                    </span>
                    <span className="text-[11px] text-[#6E6153] block truncate">
                      {isSriLanka ? '1–3 Business Days · Door-to-door verified delivery' : `3–5 Business Days to ${country} · Signature confirmation`}
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-md text-[9px] uppercase font-bold tracking-wider bg-[#1A1816] text-[#FAF8F5] shrink-0">
                  Insured
                </span>
              </div>

              <div className="space-y-4">
                {/* First & Last Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="field-firstName" className="block text-[10px] uppercase tracking-[0.16em] font-semibold text-[#5A4E40] mb-1.5">First Name *</label>
                    <input
                      id="field-firstName"
                      type="text"
                      required
                      placeholder="First name"
                      value={firstName}
                      onChange={event => {
                        setFirstName(event.target.value);
                        if (fieldErrors.firstName) setFieldErrors(previous => ({ ...previous, firstName: undefined }));
                      }}
                      className={`w-full h-[46px] bg-white border rounded-md px-3.5 text-xs font-medium text-[#1A1816] placeholder:text-[#9E9284] focus:outline-none transition-all ${
                        fieldErrors.firstName ? 'border-rose-400 focus:border-rose-500 ring-1 ring-rose-400' : 'border-[#DCD5CB] focus:border-[#1A1816] focus:ring-1 focus:ring-[#1A1816]'
                      }`}
                    />
                    {fieldErrors.firstName && <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{fieldErrors.firstName}</p>}
                  </div>
                  <div>
                    <label htmlFor="field-lastName" className="block text-[10px] uppercase tracking-[0.16em] font-semibold text-[#5A4E40] mb-1.5">Last Name *</label>
                    <input
                      id="field-lastName"
                      type="text"
                      required
                      placeholder="Last name"
                      value={lastName}
                      onChange={event => {
                        setLastName(event.target.value);
                        if (fieldErrors.lastName) setFieldErrors(previous => ({ ...previous, lastName: undefined }));
                      }}
                      className={`w-full h-[46px] bg-white border rounded-md px-3.5 text-xs font-medium text-[#1A1816] placeholder:text-[#9E9284] focus:outline-none transition-all ${
                        fieldErrors.lastName ? 'border-rose-400 focus:border-rose-500 ring-1 ring-rose-400' : 'border-[#DCD5CB] focus:border-[#1A1816] focus:ring-1 focus:ring-[#1A1816]'
                      }`}
                    />
                    {fieldErrors.lastName && <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{fieldErrors.lastName}</p>}
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label htmlFor="field-email" className="block text-[10px] uppercase tracking-[0.16em] font-semibold text-[#5A4E40] mb-1.5">Email Address *</label>
                  <input
                    id="field-email"
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={event => {
                      setEmail(event.target.value);
                      if (fieldErrors.email) setFieldErrors(previous => ({ ...previous, email: undefined }));
                    }}
                    className={`w-full h-[46px] bg-white border rounded-md px-3.5 text-xs font-medium text-[#1A1816] placeholder:text-[#9E9284] focus:outline-none transition-all ${
                      fieldErrors.email ? 'border-rose-400 focus:border-rose-500 ring-1 ring-rose-400' : 'border-[#DCD5CB] focus:border-[#1A1816] focus:ring-1 focus:ring-[#1A1816]'
                    }`}
                  />
                  {fieldErrors.email && <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.email}</p>}
                </div>

                {/* Country Destination (50 Countries) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="field-country" className="block text-[10px] uppercase tracking-[0.16em] font-semibold text-[#5A4E40]">
                      Destination Country / Region *
                    </label>
                    <span className="text-[10px] font-semibold text-[#8C7A68] flex items-center gap-1">
                      <Globe className="w-3 h-3" /> 50 Deliverable Countries
                    </span>
                  </div>
                  <div className="relative">
                    <select
                      id="field-country"
                      value={country}
                      onChange={event => {
                        const newCountry = event.target.value;
                        setCountry(newCountry);
                        if (newCountry.trim().toLowerCase() !== 'sri lanka' && (paymentMethod === 'cod' || paymentMethod === 'payzy')) {
                          setPaymentMethod('paypal');
                        }
                        if (fieldErrors.general) setFieldErrors(previous => ({ ...previous, general: undefined }));
                      }}
                      className="w-full h-[46px] bg-white border border-[#DCD5CB] rounded-md px-3.5 pr-10 text-xs font-medium text-[#1A1816] focus:outline-none focus:border-[#1A1816] focus:ring-1 focus:ring-[#1A1816] transition-all cursor-pointer appearance-none"
                    >
                      {DELIVERABLE_COUNTRIES.map(c => (
                        <option key={c.code} value={c.name}>
                          {c.name} ({c.dialCode})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-[#8C7A68] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Seamless Unified Contact Phone with Docked Country Dial Code */}
                <div>
                  <label htmlFor="field-phone" className="block text-[10px] uppercase tracking-[0.16em] font-semibold text-[#5A4E40] mb-1.5">
                    Contact Phone Number *
                  </label>
                  <div className={`flex items-center h-[46px] bg-white border rounded-md transition-all ${
                    fieldErrors.phone
                      ? 'border-rose-400 ring-1 ring-rose-400'
                      : 'border-[#DCD5CB] focus-within:border-[#1A1816] focus-within:ring-1 focus-within:ring-[#1A1816]'
                  }`}>
                    <div className="h-full px-3.5 flex items-center justify-center text-xs font-bold text-[#1A1816] bg-[#F7F4EE] border-r border-[#E5DDD2] select-none shrink-0 rounded-l-md">
                      {currentDialCode}
                    </div>
                    <input
                      id="field-phone"
                      type="tel"
                      required
                      placeholder="Mobile number"
                      value={phone}
                      onChange={event => {
                        const raw = event.target.value.replace(/[^\d\s-]/g, '');
                        setPhone(raw);
                        if (fieldErrors.phone) setFieldErrors(previous => ({ ...previous, phone: undefined }));
                      }}
                      className="w-full h-full px-3.5 text-xs font-medium text-[#1A1816] placeholder:text-[#9E9284] bg-transparent focus:outline-none"
                    />
                  </div>
                  {fieldErrors.phone && <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.phone}</p>}
                </div>

                {/* Street Address */}
                <div>
                  <label htmlFor="field-address" className="block text-[10px] uppercase tracking-[0.16em] font-semibold text-[#5A4E40] mb-1.5">
                    Street Address & Residence *
                  </label>
                  <input
                    id="field-address"
                    type="text"
                    required
                    placeholder="House number, building, apartment, street name"
                    value={address}
                    onChange={event => {
                      setAddress(event.target.value);
                      if (fieldErrors.address) setFieldErrors(previous => ({ ...previous, address: undefined }));
                    }}
                    className={`w-full h-[46px] bg-white border rounded-md px-3.5 text-xs font-medium text-[#1A1816] placeholder:text-[#9E9284] focus:outline-none transition-all ${
                      fieldErrors.address ? 'border-rose-400 focus:border-rose-500 ring-1 ring-rose-400' : 'border-[#DCD5CB] focus:border-[#1A1816] focus:ring-1 focus:ring-[#1A1816]'
                    }`}
                  />
                  {fieldErrors.address && <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.address}</p>}
                </div>

                {/* City & Postal Code */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="field-city" className="block text-[10px] uppercase tracking-[0.16em] font-semibold text-[#5A4E40] mb-1.5">City / Locality *</label>
                    <input
                      id="field-city"
                      type="text"
                      required
                      placeholder="City or Town"
                      value={city}
                      onChange={event => {
                        setCity(event.target.value);
                        if (fieldErrors.city) setFieldErrors(previous => ({ ...previous, city: undefined }));
                      }}
                      className={`w-full h-[46px] bg-white border rounded-md px-3.5 text-xs font-medium text-[#1A1816] placeholder:text-[#9E9284] focus:outline-none transition-all ${
                        fieldErrors.city ? 'border-rose-400 focus:border-rose-500 ring-1 ring-rose-400' : 'border-[#DCD5CB] focus:border-[#1A1816] focus:ring-1 focus:ring-[#1A1816]'
                      }`}
                    />
                    {fieldErrors.city && <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.city}</p>}
                  </div>
                  <div>
                    <label htmlFor="field-postalCode" className="block text-[10px] uppercase tracking-[0.16em] font-semibold text-[#5A4E40] mb-1.5">Postal / ZIP Code</label>
                    <input
                      id="field-postalCode"
                      type="text"
                      placeholder="Postal code"
                      value={postalCode}
                      onChange={event => setPostalCode(event.target.value)}
                      className="w-full h-[46px] bg-white border border-[#DCD5CB] rounded-md px-3.5 text-xs font-medium text-[#1A1816] placeholder:text-[#9E9284] focus:outline-none focus:border-[#1A1816] focus:ring-1 focus:ring-[#1A1816] transition-all"
                    />
                  </div>
                </div>

                {/* Optional Instructions */}
                <div>
                  <label htmlFor="field-notes" className="block text-[10px] uppercase tracking-[0.16em] font-semibold text-[#5A4E40] mb-1.5">
                    Delivery Instructions (Optional)
                  </label>
                  <input
                    id="field-notes"
                    type="text"
                    placeholder="Gate code, buzzer, or specific drop-off details"
                    value={notes}
                    onChange={event => setNotes(event.target.value)}
                    className="w-full h-[46px] bg-white border border-[#DCD5CB] rounded-md px-3.5 text-xs font-medium text-[#1A1816] placeholder:text-[#9E9284] focus:outline-none focus:border-[#1A1816] focus:ring-1 focus:ring-[#1A1816] transition-all"
                  />
                </div>

                {user && (!hasSavedDetails ? (
                  <div className="flex items-center gap-2.5 pt-2">
                    <input
                      id="remember-details-chk"
                      type="checkbox"
                      checked={rememberDetails}
                      onChange={event => setRememberDetails(event.target.checked)}
                      className="w-4 h-4 accent-[#1A1816] rounded"
                    />
                    <label htmlFor="remember-details-chk" className="text-xs text-[#5A4E40] cursor-pointer">
                      Remember my delivery details for future orders
                    </label>
                  </div>
                ) : isDetailsChanged ? (
                  <div className="flex items-center gap-2.5 pt-2">
                    <input
                      id="update-details-chk"
                      type="checkbox"
                      checked={updateSavedDetails}
                      onChange={event => setUpdateSavedDetails(event.target.checked)}
                      className="w-4 h-4 accent-[#1A1816] rounded"
                    />
                    <label htmlFor="update-details-chk" className="text-xs text-amber-900 font-medium cursor-pointer">
                      Update my saved delivery details with these changes
                    </label>
                  </div>
                ) : null)}
              </div>
            </div>

            {/* Step 2: Payment Method Selection */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#EAE3D9] shadow-[0_1px_4px_rgba(0,0,0,0.02)] space-y-6">
              <div className="flex items-center justify-between border-b border-[#EAE3D9] pb-4">
                <div>
                  <h3 className="font-serif text-xl font-semibold text-[#1A1816] flex items-center gap-2.5">
                    <CreditCard className="w-4 h-4 text-[#8C7A68]" />
                    Select Payment Method
                  </h3>
                  <p className="text-xs text-[#7A6E60] mt-0.5">PayPal, Payzy, or Cash on Delivery.</p>
                </div>
                <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#8F8171] bg-[#FAF8F5] px-2.5 py-1 rounded-full border border-[#E8E1D7]">
                  Step 2 of 2
                </span>
              </div>

              {fieldErrors.paymentMethod && (
                <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-700">
                  {fieldErrors.paymentMethod}
                </div>
              )}

              <div className="space-y-4" role="radiogroup" aria-label="Payment method">
                
                {/* 1. PayPal (International & Global) */}
                {paymentConfig.paypal.enabled && (
                  <div className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                    paymentMethod === 'paypal' ? 'border-[#1A1816] ring-2 ring-[#1A1816]/10 shadow-sm bg-[#FAF8F5]/40' : 'border-[#E7E0D6] hover:border-[#D5CBBF]'
                  }`}>
                    <button
                      type="button"
                      role="radio"
                      aria-label="PayPal"
                      aria-checked={paymentMethod === 'paypal'}
                      disabled={isSubmitting || isSwitchingPayment}
                      onClick={() => handlePaymentMethodChange('paypal')}
                      className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer disabled:cursor-wait"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-white border border-[#E5DDD2] flex items-center justify-center shadow-xs">
                          <span className="font-serif italic font-bold text-lg text-[#003087]">P<span className="text-[#0079C1]">P</span></span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-[#1A1816] tracking-wide">PayPal</span>
                            <span className="px-2 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-wider bg-blue-50 text-blue-800 border border-blue-200">
                              Global & Cards
                            </span>
                          </div>
                          <p className="text-[11px] text-[#665A4E] mt-0.5">
                            Visa, Mastercard, Amex, and PayPal balances across all 50 countries.
                          </p>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        paymentMethod === 'paypal' ? 'border-[#1A1816]' : 'border-[#D5CBBF]'
                      }`}>
                        {paymentMethod === 'paypal' && <div className="w-2.5 h-2.5 rounded-full bg-[#1A1816]" />}
                      </div>
                    </button>

                    {paymentMethod === 'paypal' && (
                      <div className="px-5 pb-5 pt-3 border-t border-[#EDE7DE] space-y-4 bg-white">
                        <div className="rounded-xl bg-[#FAF8F5] p-4 border border-[#EAE3D9] text-xs space-y-2">
                          <div className="flex items-center justify-between font-semibold">
                            <span className="text-[#665A4E]">PayPal Charge Amount:</span>
                            <span className="font-price font-bold text-sm text-[#1A1816]">
                              {paypalCurrency} {paypalDisplayAmount.toFixed(2)}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#7A6E60] leading-relaxed">
                            Your payment is held in escrow and confirmed only after server-side cryptographic verification.
                          </p>
                        </div>

                        {paypalClientId ? (
                          <PayPalScriptProvider options={{ clientId: paypalClientId, currency: paypalCurrency }}>
                            <PayPalButtons
                              style={{ layout: 'vertical', shape: 'rect', color: 'gold', height: 46 }}
                              createOrder={async () => {
                                if (!validateDeliveryDetails()) {
                                  throw new Error('Please complete all required delivery fields.');
                                }
                                setFieldErrors(previous => ({ ...previous, general: undefined }));
                                let localOrder = paypalPendingOrderRef.current || paypalPendingOrder;
                                if (!localOrder || localOrder.status === 'cancelled') {
                                  localOrder = await createOrder({
                                    customerName,
                                    firstName: firstName.trim(),
                                    lastName: lastName.trim(),
                                    email: email.trim().toLowerCase(),
                                    phone: fullPhoneNumber,
                                    address: address.trim(),
                                    city: city.trim(),
                                    postalCode: postalCode.trim(),
                                    country: country.trim() || 'Sri Lanka',
                                    items: cart.map(item => ({ productId: item.productId, size: item.size, quantity: item.quantity })),
                                    currencyUsed: selectedCurrency?.code || 'USD',
                                    paymentMethod: 'paypal',
                                    promoCode: appliedPromo?.code,
                                    checkoutAttemptId: paypalCheckoutAttemptIdRef.current || (paypalCheckoutAttemptIdRef.current = createPayPalCheckoutAttemptId()),
                                    notes: notes.trim()
                                  });
                                  paypalPendingOrderRef.current = localOrder;
                                  setPaypalPendingOrder(localOrder);
                                }
                                const started = await createPayPalPayment(localOrder.id || localOrder.orderNumber);
                                paypalPendingOrderRef.current = started.order;
                                setPaypalPendingOrder(started.order);
                                return started.paypalOrderId;
                              }}
                              onApprove={async data => {
                                await handlePaypalApprovedOrder(data.orderID);
                              }}
                              onCancel={async () => {
                                const pending = paypalPendingOrderRef.current || paypalPendingOrder;
                                if (pending) {
                                  try {
                                    await reconcilePendingCheckout(pending);
                                  } catch {
                                    setFieldErrors(previous => ({ ...previous, general: unresolvedPaymentMessage }));
                                  }
                                }
                              }}
                              onError={async error => {
                                console.error('PayPal Button Error:', error);
                                const pending = paypalPendingOrderRef.current || paypalPendingOrder;
                                if (pending) {
                                  try {
                                    await reconcilePendingCheckout(pending);
                                  } catch {
                                    setFieldErrors(previous => ({ ...previous, general: unresolvedPaymentMessage }));
                                  }
                                }
                              }}
                            />
                          </PayPalScriptProvider>
                        ) : (
                          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-xs text-amber-900 text-center">
                            PayPal gateway is temporarily unavailable.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Payzy (Sri Lanka Online Checkout) */}
                {paymentConfig.payzy.enabled && (
                  <div className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                    !isSriLanka ? 'opacity-60 bg-stone-50/70 border-[#EAE3D9]' : paymentMethod === 'payzy' ? 'border-[#2D3138] ring-2 ring-[#2D3138]/10 shadow-sm bg-[#FAF8F5]/40' : 'border-[#E7E0D6] hover:border-[#D5CBBF]'
                  }`}>
                    <button
                      type="button"
                      role="radio"
                      aria-label="Payzy"
                      aria-checked={paymentMethod === 'payzy'}
                      disabled={isSubmitting || isSwitchingPayment || !isSriLanka}
                      onClick={() => handlePaymentMethodChange('payzy')}
                      className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-white border border-[#E8E2DA] flex items-center justify-center shadow-xs">
                          <PayzyMark className="w-9 h-9" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-extrabold text-[#34353C]">Pay<span className="text-[#13A8DD]">zy</span></span>
                            <span className="px-2 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-wider bg-cyan-50 text-cyan-900 border border-cyan-200">
                              Sri Lanka Only
                            </span>
                          </div>
                          <p className="text-[11px] text-[#665A4E] mt-0.5">
                            {isSriLanka
                              ? 'Instant online checkout for Sri Lankan Visa, Mastercard, and wallets.'
                              : `Payzy is only available for Sri Lankan orders. For ${country}, please select PayPal.`}
                          </p>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        paymentMethod === 'payzy' ? 'border-[#13A8DD]' : 'border-[#D5CBBF]'
                      }`}>
                        {paymentMethod === 'payzy' && <div className="w-2.5 h-2.5 rounded-full bg-[#13A8DD]" />}
                      </div>
                    </button>

                    {paymentMethod === 'payzy' && isSriLanka && (
                      <div className="px-4 sm:px-5 pb-5 pt-4 border-t border-[#EDE7DE] space-y-4 bg-white">
                        <div className="rounded-2xl bg-[#FAF8F5] border border-[#E5DFD7] p-4 space-y-1.5">
                          <p className="text-[10px] uppercase tracking-[0.16em] text-[#8A7762] font-semibold">Payzy Order Total</p>
                          <p className="font-price font-bold text-xl text-[#1A1816]">LKR {totalLKR.toLocaleString('en-US')}</p>
                          <p className="text-[11px] text-[#74685B] pt-1 leading-relaxed">
                            You will be redirected to the secure Payzy payment portal. SAELYXE validates and records your order upon receipt of the signed verification token.
                          </p>
                        </div>
                        {!paymentConfig.payzy.configured ? (
                          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[11px] text-amber-900">
                            Payzy gateway credentials are being updated. Please use PayPal or Cash on Delivery.
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={handlePayzyOrder}
                            disabled={isSubmitting}
                            className="w-full min-h-[52px] rounded-xl bg-[#303139] hover:bg-[#1E1F24] text-white text-[11px] uppercase tracking-[0.18em] font-semibold disabled:opacity-50 flex items-center justify-center gap-3 cursor-pointer shadow-sm hover:shadow-md transition-all"
                          >
                            <PayzyMark className="w-6 h-6" />
                            {isSubmitting ? 'Opening Payzy...' : 'CONTINUE WITH PAYZY'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Cash on Delivery (Domestic Sri Lanka) */}
                <div className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  !isSriLanka ? 'opacity-60 bg-stone-50/70 border-[#EAE3D9]' : paymentMethod === 'cod' ? 'border-[#1A1816] ring-2 ring-[#1A1816]/10 shadow-sm bg-[#FAF8F5]/40' : 'border-[#E7E0D6] hover:border-[#D5CBBF]'
                }`}>
                  <button
                    type="button"
                    role="radio"
                    aria-label="Cash on Delivery"
                    aria-checked={paymentMethod === 'cod'}
                    disabled={isSubmitting || isSwitchingPayment || !isSriLanka}
                    onClick={() => handlePaymentMethodChange('cod')}
                    className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-[#F6F1E9] border border-[#E5DDD2] flex items-center justify-center shadow-xs">
                        <Truck className="w-5 h-5 text-[#574A3D]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[#1A1816] tracking-wide">Cash on Delivery</span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-wider bg-stone-200/80 text-stone-800 border border-stone-300">
                            Sri Lanka Only
                          </span>
                        </div>
                        <p className="text-[11px] text-[#665A4E] mt-0.5">
                          {isSriLanka
                            ? 'Pay in cash when your order arrives at your doorstep.'
                            : `Cash on Delivery is available in Sri Lanka only. For ${country}, please select PayPal.`}
                        </p>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      paymentMethod === 'cod' ? 'border-[#1A1816]' : 'border-[#D5CBBF]'
                    }`}>
                      {paymentMethod === 'cod' && <div className="w-2.5 h-2.5 rounded-full bg-[#1A1816]" />}
                    </div>
                  </button>

                  {paymentMethod === 'cod' && isSriLanka && (
                    <div className="px-4 sm:px-5 pb-5 pt-4 border-t border-[#EDE7DE] space-y-4 bg-white">
                      <div className="rounded-2xl bg-[#FAF8F5] border border-[#E5DFD7] p-4 space-y-1.5">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-[#8A7762] font-semibold">Cash on Delivery Total</p>
                        <p className="font-price font-bold text-xl text-[#1A1816]">LKR {totalLKR.toLocaleString('en-US')}</p>
                        <p className="text-[11px] text-[#74685B] pt-1 leading-relaxed">
                          No immediate charge is required. Payment status remains pending until our logistics partner receives cash upon delivery.
                        </p>
                      </div>
                      <button
                        id="btn-cod-place-order"
                        type="button"
                        onClick={handleCodOrder}
                        disabled={isSubmitting}
                        className="w-full min-h-[52px] rounded-xl bg-[#1A1816] hover:bg-black text-white text-[11px] uppercase tracking-[0.18em] font-semibold disabled:opacity-50 flex items-center justify-center gap-3 cursor-pointer shadow-sm hover:shadow-md transition-all"
                      >
                        <Truck className="w-4 h-4" />
                        {isSubmitting ? 'PLACING ORDER...' : 'PLACE CASH ON DELIVERY ORDER'}
                      </button>
                    </div>
                  )}
                </div>

              </div>
            </div>

          </div>

          {/* Right Column: Order Summary */}
          <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-2xl border border-[#EAE3D9] shadow-[0_1px_4px_rgba(0,0,0,0.02)] space-y-6 lg:sticky lg:top-28">
            <div className="border-b border-[#EAE3D9] pb-4 flex items-baseline justify-between">
              <h3 className="font-serif text-xl font-semibold tracking-wide text-[#1A1816]">
                ORDER SUMMARY
              </h3>
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#8F8171] bg-[#FAF8F5] px-2.5 py-1 rounded-full border border-[#E8E1D7]">
                {totalItemsCount} {totalItemsCount === 1 ? 'ITEM' : 'ITEMS'}
              </span>
            </div>

            {/* Cart Items List */}
            <div className="space-y-3.5 max-h-80 overflow-y-auto pr-1 divide-y divide-[#F5F2EC]">
              {effectiveCart.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#8F8171]">
                  <ShoppingBag className="w-5 h-5 mx-auto mb-2 opacity-50" />
                  Your shopping bag is currently empty.
                </div>
              ) : (
                effectiveCart.map((item, index) => (
                  <div key={`${item.productId}-${item.size}-${index}`} className="pt-3.5 first:pt-0 flex items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-16 h-20 sm:w-18 sm:h-22 object-cover rounded-xl border border-[#EAE3D9] shadow-xs shrink-0"
                      />
                      <div className="min-w-0">
                        <h4 className="font-serif text-sm font-semibold truncate text-[#1A1816]">{item.title}</h4>
                        <p className="text-[11px] text-[#665A4E] uppercase mt-0.5 font-medium">
                          Size {item.size} · Qty {item.quantity}
                        </p>
                      </div>
                    </div>
                    <div className="font-price font-semibold text-sm text-[#1A1816] whitespace-nowrap">
                      {formatPrice(item.priceLKR * item.quantity)}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Promo Code Section */}
            <div className="border-t border-[#EAE3D9] pt-4">
              {appliedPromo ? (
                <div className="flex items-center justify-between p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs">
                  <div>
                    <span className="font-bold text-[#1A1816] tracking-wider">{appliedPromo.code}</span>
                    <span className="font-price text-[11px] text-emerald-900 block font-medium mt-0.5">
                      -{formatPrice(appliedPromo.discountFixedLKR)} discount applied
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemovePromo}
                    className="text-[11px] text-rose-700 font-semibold hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setIsPromoOpen(previous => !previous)}
                    className="flex items-center justify-between w-full text-[11px] uppercase tracking-[0.16em] font-semibold text-[#665A4E] hover:text-[#1A1816] transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" />
                      Have a coupon or voucher code?
                    </span>
                    {isPromoOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  {isPromoOpen && (
                    <form onSubmit={handleApplyPromo} className="space-y-2 pt-1">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="ENTER CODE"
                          value={promoCode}
                          onChange={event => setPromoCode(event.target.value.toUpperCase())}
                          className="flex-1 h-[44px] border border-[#E5DDD2] rounded-xl px-3.5 text-xs font-semibold uppercase tracking-wider text-[#1A1816] placeholder:text-[#AAA094] focus:outline-none focus:border-[#1A1816]"
                        />
                        <button
                          type="submit"
                          disabled={isCheckingPromo}
                          className="h-[44px] px-5 bg-[#1A1816] hover:bg-black text-white text-[10px] uppercase font-bold tracking-wider rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {isCheckingPromo ? '...' : 'Apply'}
                        </button>
                      </div>
                      {promoError && <p className="text-[11px] text-rose-600 font-medium">{promoError}</p>}
                      {promoSuccess && <p className="text-[11px] text-emerald-800 font-medium">{promoSuccess}</p>}
                    </form>
                  )}
                </div>
              )}
            </div>

            {/* Calculations Breakdown */}
            <div className="border-t border-[#EAE3D9] pt-4 space-y-3 text-xs">
              <div className="flex justify-between text-[#7A6E60]">
                <span>SUBTOTAL</span>
                <span className="font-price font-semibold text-[#1A1816]">{formatPrice(subtotalLKR)}</span>
              </div>
              <div className="flex justify-between text-[#7A6E60]">
                <span>SHIPPING & LOGISTICS</span>
                <span className="font-price font-semibold text-emerald-900">
                  {shippingLKR === 0 ? 'COMPLIMENTARY' : formatPrice(shippingLKR)}
                </span>
              </div>
              {discountLKR > 0 && (
                <div className="flex justify-between text-emerald-800">
                  <span>DISCOUNT ({appliedPromo?.code})</span>
                  <span className="font-price font-semibold text-emerald-800">-{formatPrice(discountLKR)}</span>
                </div>
              )}
              <div className="border-t border-[#EAE3D9] pt-4 flex justify-between items-baseline">
                <span className="text-xs uppercase tracking-[0.2em] font-bold text-[#1A1816]">TOTAL</span>
                <div className="font-price text-2xl font-bold tracking-tight text-[#1A1816]">
                  {formatPrice(totalLKR)}
                </div>
              </div>
            </div>

            {/* Trust Seals and Badges */}
            <div className="border-t border-[#EAE3D9] pt-5 space-y-3.5">
              <div className="flex items-start gap-3 text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" />
                <div>
                  <span className="block text-[10.5px] uppercase tracking-[0.16em] font-bold text-[#1A1816]">
                    Authentic Luxury Silhouettes
                  </span>
                  <p className="text-[11px] text-[#665A4E] leading-relaxed">
                    Every piece is crafted in limited numbers, authenticated, and delivered in bespoke protective packaging.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-xs">
                <Truck className="w-4 h-4 text-[#8C7A68] shrink-0 mt-0.5" />
                <div>
                  <span className="block text-[10.5px] uppercase tracking-[0.16em] font-bold text-[#1A1816]">
                    {isSriLanka ? 'Islandwide Express Delivery' : 'FedEx Express Worldwide Delivery'}
                  </span>
                  <p className="text-[11px] text-[#665A4E] leading-relaxed">
                    {isSriLanka
                      ? 'Domestic express courier with live tracking reference provided upon dispatch.'
                      : 'International delivery via FedEx Priority with door-to-door tracking and direct signature confirmation.'}
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
