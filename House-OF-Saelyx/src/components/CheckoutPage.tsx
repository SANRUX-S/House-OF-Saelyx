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
  ChevronUp
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

function createPayzyCheckoutAttemptId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `payzy-${crypto.randomUUID()}`;
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const values = new Uint32Array(4);
    crypto.getRandomValues(values);
    return `payzy-${Array.from(values, value => value.toString(36)).join('-')}`;
  }
  throw new Error('Secure checkout identifier generation is unavailable.');
}

const PayzyMark: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg
    data-testid="payzy-mark"
    className={className}
    viewBox="0 0 64 64"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M8 8h29c11.6 0 19 7.7 19 18.4 0 10.6-7.5 18.3-19 18.3H25.7L8 58V8Z"
      fill="#13A8DD"
    />
    <path
      d="M18 17.5h18.7c6.8 0 11.3 3.7 11.3 9s-4.5 9-11.3 9H18l10.1-9L18 17.5Z"
      fill="#34353C"
    />
    <path
      d="M26.8 21.5h9.4c4.5 0 7.4 1.9 7.4 5s-2.9 5-7.4 5h-9.4"
      stroke="white"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeDasharray="3.2 3.2"
      opacity="0.95"
    />
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

  // Legacy unowned details are never adopted by another account.
  const savedDetailsKey = user?.uid ? 'saelyx_saved_delivery_details:' + user.uid : null;
  const [savedDetailsObj, setSavedDetailsObj] = useState<any>(() => {
    try {
      const saved = savedDetailsKey ? localStorage.getItem(savedDetailsKey) : null;
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [hasSavedDetails, setHasSavedDetails] = useState(() => Boolean(savedDetailsObj));

  // Checkboxes
  const [rememberDetails, setRememberDetails] = useState(false);
  const [updateSavedDetails, setUpdateSavedDetails] = useState(false);

  // Split First & Last Name
  const initialFirstName = savedDetailsObj?.firstName || user?.firstName || (savedDetailsObj?.customerName ? savedDetailsObj.customerName.split(' ')[0] : user?.name ? user.name.split(' ')[0] : '');
  const initialLastName = savedDetailsObj?.lastName || user?.lastName || (savedDetailsObj?.customerName ? savedDetailsObj.customerName.split(' ').slice(1).join(' ') : user?.name ? user.name.split(' ').slice(1).join(' ') : '');

  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [email, setEmail] = useState(savedDetailsObj?.email || user?.email || '');
  const [phone, setPhone] = useState(savedDetailsObj?.phone || user?.phoneNumber || '');
  const [address, setAddress] = useState(savedDetailsObj?.address || user?.address || '');
  const [city, setCity] = useState(savedDetailsObj?.city || user?.city || '');
  const [postalCode, setPostalCode] = useState(savedDetailsObj?.postalCode || user?.postalCode || '');
  const [country, setCountry] = useState(savedDetailsObj?.country || user?.country || 'Sri Lanka');
  const [notes, setNotes] = useState(savedDetailsObj?.notes || '');

  // Inline Field Validation Errors
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

  // Pre-fill fields whenever authenticated user profile is loaded
  useEffect(() => {
    if (user) {
      if (!firstName) {
        setFirstName(user.firstName || (user.name ? user.name.split(' ')[0] : ''));
      }
      if (!lastName) {
        setLastName(user.lastName || (user.name ? user.name.split(' ').slice(1).join(' ') : ''));
      }
      if (!email && user.email) setEmail(user.email);
      if (!phone && user.phoneNumber) setPhone(user.phoneNumber);
      if (user.address && (!savedDetailsObj || !savedDetailsObj.address)) setAddress(user.address);
      if (user.city && (!savedDetailsObj || !savedDetailsObj.city)) setCity(user.city);
      if (user.postalCode && (!savedDetailsObj || !savedDetailsObj.postalCode)) setPostalCode(user.postalCode);
      if (user.country && (!savedDetailsObj || !savedDetailsObj.country)) setCountry(user.country);
    }
  }, [user]);

  // Payment Method State: defaults to null (explicit selection required)
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
    return () => { active = false; };
  }, []);

  const paypalClientId = paymentConfig.paypal.clientId || (import.meta.env.VITE_PAYPAL_CLIENT_ID as string) || '';

  // Promo / Voucher Code state
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

  // A typed /checkout URL is not useful by itself. Keep guest checkout available
  // when the customer actually has items, but send an empty bag back to shopping.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isPayzyReturn = params.has('payzy') && params.has('orderId');
    if (cart.length === 0 && !confirmedOrder && !isPayzyReturn) {
      navigateTo({ name: 'home' });
      setIsCartOpen(true);
    }
  }, [cart.length, confirmedOrder, navigateTo, setIsCartOpen]);

  // Derived Customer Full Name
  const customerName = `${firstName.trim()} ${lastName.trim()}`.trim();

  // Track if details have been changed compared to savedDetailsObj
  const isDetailsChanged = !!(savedDetailsObj && (
    firstName !== savedDetailsObj.firstName ||
    lastName !== savedDetailsObj.lastName ||
    email !== savedDetailsObj.email ||
    phone !== savedDetailsObj.phone ||
    address !== savedDetailsObj.address ||
    city !== savedDetailsObj.city ||
    postalCode !== savedDetailsObj.postalCode ||
    country !== savedDetailsObj.country ||
    notes !== savedDetailsObj.notes
  ));

  const totalItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const subtotalLKR = cart.reduce((acc, item) => acc + item.priceLKR * item.quantity, 0);
  const discountLKR = appliedPromo ? appliedPromo.discountFixedLKR : 0;
  const discountedSubtotalLKR = Math.max(0, subtotalLKR - discountLKR);
  const freeShippingThresholdLKR = Number(settings?.freeShippingThresholdLKR) > 0
    ? Number(settings?.freeShippingThresholdLKR)
    : 50000;
  const standardShippingLKR = Number(settings?.standardShippingLKR) >= 0
    ? Number(settings?.standardShippingLKR)
    : 2500;
  const shippingLKR = cart.length === 0 ? 0 : (discountedSubtotalLKR >= freeShippingThresholdLKR ? 0 : standardShippingLKR);
  const totalLKR = discountedSubtotalLKR + shippingLKR;
  const totalInCurrency = Number((totalLKR * (selectedCurrency?.rateFromLKR || 1)).toFixed(2));
  const paypalCurrency = ['USD', 'EUR', 'GBP'].includes(selectedCurrency?.code || '')
    ? (selectedCurrency?.code || 'USD')
    : 'USD';
  const usdRateFromLKR = currencies.find(currency => currency.code === 'USD')?.rateFromLKR || 0.0033;
  const paypalDisplayAmount = paypalCurrency === selectedCurrency?.code
    ? totalInCurrency
    : Number((totalLKR * usdRateFromLKR).toFixed(2));

  // Server Promo Code Application
  const handleApplyPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setPromoError('');
    setPromoSuccess('');
    const code = promoCode.trim().toUpperCase();
    if (!code) return;

    setIsCheckingPromo(true);
    try {
      const res = await fetch('/api/promo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAppCheckRequestHeaders()) },
        body: JSON.stringify({ code, subtotalLKR })
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setAppliedPromo({
          code,
          discountFixedLKR: data.discountLKR,
          message: data.message
        });
        setPromoSuccess(data.message || 'Promo code applied successfully.');
      } else {
        setPromoError(data.error || data.message || 'Invalid promo or coupon or voucher code.');
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

  // Never clear the linked order or select a second method on uncertainty.
  const handlePaymentMethodChange = async (method: 'paypal' | 'payzy' | 'cod') => {
    if (paymentSwitchInFlightRef.current || isSubmitting) return;
    paymentSwitchInFlightRef.current = true;
    setIsSwitchingPayment(true);
    try {
      if (paymentMethod === 'paypal' && method !== 'paypal') {
        const pending = paypalPendingOrderRef.current || paypalPendingOrder;
        if (pending) {
          const reconciled = await reconcilePendingCheckout(pending);
          if (reconciled.paymentStatus === 'verified') return;
        }
      }
      setPaymentMethod(method);
      setFieldErrors(prev => ({ ...prev, paymentMethod: undefined, general: undefined }));
    } catch {
      setFieldErrors(prev => ({ ...prev, general: unresolvedPaymentMessage }));
    } finally {
      paymentSwitchInFlightRef.current = false;
      setIsSwitchingPayment(false);
    }
  };

  // Form Validation
  const validateDeliveryDetails = (): boolean => {
    const errors: typeof fieldErrors = {};

    if (!firstName.trim()) {
      errors.firstName = 'First name is required.';
    }
    if (!lastName.trim()) {
      errors.lastName = 'Last name is required.';
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please provide a valid email address.';
    }

    // Sri Lankan mobile number validation
    const cleanPhone = phone.replace(/[\s\-()]/g, '');
    const slPhoneRegex = /^(?:\+94|0)?7[0-9]{8}$/;
    if (!cleanPhone || !slPhoneRegex.test(cleanPhone)) {
      errors.phone = 'Enter a valid Sri Lankan mobile number (e.g. +94 77 123 4567).';
    }

    if (!address.trim()) {
      errors.address = 'Delivery address is required.';
    }
    if (!city.trim()) {
      errors.city = 'City / locality is required.';
    }

    setFieldErrors(errors);

    const firstErrorKey = Object.keys(errors)[0];
    if (firstErrorKey) {
      const inputElement = document.getElementById(`field-${firstErrorKey}`);
      if (inputElement) {
        inputElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        inputElement.focus();
      }
      return false;
    }

    return true;
  };

  // Save / Update Delivery Details
  const persistDeliveryDetailsIfNeeded = () => {
    if (rememberDetails || updateSavedDetails) {
      try {
        const detailsToSave = {
          customerName,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          address: address.trim(),
          city: city.trim(),
          postalCode: postalCode.trim(),
          country: country.trim() || 'Sri Lanka',
          notes: notes.trim()
        };
        if (!savedDetailsKey) return;
        localStorage.setItem(savedDetailsKey, JSON.stringify(detailsToSave));
        setSavedDetailsObj(detailsToSave);
        setHasSavedDetails(true);
        setRememberDetails(false);
        setUpdateSavedDetails(false);
      } catch (e) {
        console.warn('Non-fatal delivery details persistence note:', e);
      }
    }
  };

  // PayPal Approval Handler
  const handlePaypalApprovedOrder = async (paypalOrderId: string) => {
    const pendingOrder = paypalPendingOrderRef.current || paypalPendingOrder;
    if (!pendingOrder || !paypalOrderId) {
      setFieldErrors(prev => ({
        ...prev,
        general: 'PayPal approval was received, but the order reference is unavailable. Please contact SAELYXE support.'
      }));
      return;
    }

    setIsSubmitting(true);
    try {
      const verifiedOrder = await capturePayPalPayment(
        pendingOrder.id || pendingOrder.orderNumber,
        paypalOrderId
      );
      persistDeliveryDetailsIfNeeded();
      setConfirmedOrder(verifiedOrder);
      paypalPendingOrderRef.current = null;
      paypalCheckoutAttemptIdRef.current = null;
      setPaypalPendingOrder(null);
      clearCart();
    } catch (err) {
      console.error('PayPal server capture exception:', err);
      try {
        const reconciled = await reconcilePendingCheckout(pendingOrder);
        if (reconciled.paymentStatus === 'verified') return;
        setFieldErrors(prev => ({
          ...prev,
          general: 'PayPal payment was not captured and the pending order was cancelled. You may try again.'
        }));
      } catch {
        setFieldErrors(prev => ({
          ...prev,
          general: `PayPal payment outcome needs verification. Order ${pendingOrder.orderNumber} is recorded. Please contact support before paying again.`
        }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Payzy Custom Web Checkout Handler
  const handlePayzyOrder = async () => {
    if (cart.length === 0) {
      setFieldErrors(prev => ({ ...prev, general: 'Your shopping bag is empty. Please select garments before placing an order.' }));
      return;
    }
    if (!validateDeliveryDetails()) return;
    if (country.trim().toLowerCase() !== 'sri lanka') {
      setFieldErrors(prev => ({ ...prev, general: 'Payzy is currently available only for Sri Lankan delivery addresses.' }));
      return;
    }
    if (!paymentConfig.payzy.configured) {
      setFieldErrors(prev => ({ ...prev, general: 'Payzy server credential setup is still pending. Please use another payment method for now.' }));
      return;
    }

    setIsSubmitting(true);
    setFieldErrors(prev => ({ ...prev, general: undefined }));
    try {
      const order = await createOrder({
        customerName,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim(),
        postalCode: postalCode.trim(),
        country: country.trim() || 'Sri Lanka',
        items: cart.map(item => ({
          productId: item.productId,
          size: item.size,
          quantity: item.quantity
        })),
        currencyUsed: 'LKR',
        paymentMethod: 'payzy',
        promoCode: appliedPromo?.code,
        checkoutAttemptId: payzyCheckoutAttemptIdRef.current || (
          payzyCheckoutAttemptIdRef.current = createPayzyCheckoutAttemptId()
        ),
        notes: notes.trim()
      });

      const started = await createPayzyPayment(order.id || order.orderNumber);
      if (!started.checkoutUrl || !/^https:\/\//i.test(started.checkoutUrl)) {
        throw new Error('Payzy checkout URL could not be initialized.');
      }
      persistDeliveryDetailsIfNeeded();
      window.location.assign(started.checkoutUrl);
    } catch (err) {
      console.error('Payzy checkout exception:', err);
      setFieldErrors(prev => ({
        ...prev,
        general: err instanceof Error ? err.message : 'Payzy checkout could not be started.'
      }));
      setIsSubmitting(false);
    }
  };

  // COD Order Handler
  const handleCodOrder = async () => {
    if (cart.length === 0) {
      setFieldErrors(prev => ({ ...prev, general: 'Your shopping bag is empty. Please select garments before placing an order.' }));
      return;
    }

    if (!validateDeliveryDetails()) {
      return;
    }

    setIsSubmitting(true);
    setFieldErrors(prev => ({ ...prev, general: undefined }));

    try {
      const order = await createOrder({
        customerName,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim(),
        postalCode: postalCode.trim(),
        country: country.trim() || 'Sri Lanka',
        items: cart.map(item => ({
          productId: item.productId,
          size: item.size,
          quantity: item.quantity
        })),
        currencyUsed: selectedCurrency?.code || 'LKR',
        paymentMethod: 'cod',
        promoCode: appliedPromo?.code,
        checkoutAttemptId: codCheckoutAttemptIdRef.current || (
          codCheckoutAttemptIdRef.current = createCodCheckoutAttemptId()
        ),
        notes: notes.trim()
      });

      persistDeliveryDetailsIfNeeded();
      setConfirmedOrder(order);
      codCheckoutAttemptIdRef.current = null;
      clearCart();
    } catch (err) {
      console.error('Cash on Delivery checkout exception:', err);
      setFieldErrors(prev => ({
        ...prev,
        general: err instanceof Error ? err.message : 'Cash on Delivery order could not be placed.'
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reconcile the Payzy provider return using the protected server-side order state.
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
          setFieldErrors(prev => ({
            ...prev,
            general: `Payzy sandbox test passed for order ${order.orderNumber}. The LKR ${paymentConfig.payzy.testAmountLKR || 10} test was signature-verified. This is not a live paid order and it will not be fulfilled.`
          }));
          return;
        }
        if (payzyState === 'failed') {
          setFieldErrors(prev => ({ ...prev, general: 'Payzy reported that the payment was not completed. You can safely try again.' }));
          return;
        }
        setFieldErrors(prev => ({ ...prev, general: `Payzy payment status could not be confirmed for order ${order.orderNumber}. Please check My Orders before retrying.` }));
      } catch (error) {
        setFieldErrors(prev => ({
          ...prev,
          general: error instanceof Error ? error.message : 'Unable to reconcile the Payzy payment return.'
        }));
      } finally {
        window.history.replaceState({}, '', '/checkout');
      }
    })();
  }, [getPayzyPaymentStatus]);

  // Confirmed Order Screen
  if (confirmedOrder) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] text-[#1A1816] pt-32 pb-24 px-5 sm:px-8 select-none">
        <OrderConfirmationModal
          order={confirmedOrder}
          onClose={() => {
            setConfirmedOrder(null);
            navigateTo({ name: 'home' });
          }}
        />
        <div className="max-w-xl mx-auto bg-white p-8 sm:p-12 rounded-2xl border border-[#EAE3D9] shadow-[0_2px_16px_rgba(0,0,0,0.03)] text-center space-y-6">
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
            <p className="text-xs text-[#665A4E]">
              Your order reference is <strong className="font-mono text-[#1A1816]">{confirmedOrder.orderNumber}</strong>. Your order has been securely recorded. Payment and dispatch updates will appear in your client portal.
            </p>
          </div>

          <div className="bg-[#FAF8F5] p-5 rounded-xl border border-[#EAE3D9] text-left space-y-3 text-xs">
            <div className="flex justify-between items-center border-b border-[#ECE3D8] pb-2">
              <span className="text-[#7A6E60]">Payment Method</span>
              <span className="font-medium text-[#1A1816] uppercase">{confirmedOrder.paymentMethod === 'paypal' ? 'PayPal' : confirmedOrder.paymentMethod === 'payzy' ? 'Payzy' : 'Cash on Delivery'}</span>
            </div>
            <div className="flex justify-between items-center border-b border-[#ECE3D8] pb-2">
              <span className="text-[#7A6E60]">Logistics Courier</span>
              <span className="font-medium text-[#1A1816]">{confirmedOrder.courierName || 'Priority dispatch'}</span>
            </div>
            <div className="flex justify-between items-center border-b border-[#ECE3D8] pb-2">
              <span className="text-[#7A6E60]">Estimated Delivery</span>
              <span className="font-medium text-emerald-900">{confirmedOrder.deliveryEta || '1–4 working days'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#7A6E60]">Destination</span>
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
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1816] pt-24 sm:pt-28 pb-28 px-5 sm:px-8 md:px-12 lg:px-16 select-none">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Navigation & Encryption Header */}
        <div className="flex items-center justify-between border-b border-[#EAE3D9] pb-4">
          <button
            type="button"
            onClick={() => navigateTo({ name: 'home' })}
            className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] font-medium text-[#665A4E] hover:text-[#1A1816] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 stroke-[1.5]" />
            <span>Continue Shopping</span>
          </button>

          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-[#665A4E]">
            <Lock className="w-3.5 h-3.5 text-emerald-800 stroke-[1.5]" />
            <span>256-Bit Encrypted Checkout</span>
          </div>
        </div>

        {/* Global Error Banner */}
        {fieldErrors.general && (
          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-800 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{fieldErrors.general}</span>
          </div>
        )}

        {/* 2-Column Responsive Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          
          {/* Left Column: Delivery Details & Payment Accordion (7 Cols) */}
          <div className="lg:col-span-7 space-y-8">
            
            {!user && (
              <div className="bg-[#FAF8F5] p-4 rounded-xl border border-[#EAE3D9] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#665A4E]">
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-[#8C7A68] shrink-0" />
                  <span>Checking out as guest. Have a SAELYXE account?</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAuthOpen(true)}
                  className="font-semibold text-[#1A1816] underline underline-offset-2 hover:text-[#8C7A68] cursor-pointer self-start sm:self-auto"
                >
                  Sign in for faster checkout
                </button>
              </div>
            )}

            {/* Delivery Destination Section */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#EAE3D9] shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-6">
              
              <div className="flex items-center justify-between border-b border-[#ECE3D8] pb-3.5">
                <h3 className="font-serif text-lg font-semibold text-[#1A1816] flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#8C7A68]" />
                  Delivery & Contact Information
                </h3>
                <span className="text-[10px] uppercase tracking-[0.16em] text-[#8F8171]">
                  Step 1 of 2
                </span>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                
                {/* Name Row: First Name & Last Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="field-firstName" className="block text-[10px] uppercase tracking-[0.18em] font-medium text-[#665A4E] mb-1.5">
                      First Name *
                    </label>
                    <input
                      id="field-firstName"
                      type="text"
                      required
                      placeholder="e.g. Kasun"
                      value={firstName}
                      onChange={e => {
                        setFirstName(e.target.value);
                        if (fieldErrors.firstName) setFieldErrors(prev => ({ ...prev, firstName: undefined }));
                      }}
                      className={`w-full h-[48px] bg-[#FCFBF9] border rounded-lg px-4 text-xs text-[#1A1816] placeholder:text-[#AAA094] focus:outline-none focus:bg-white transition-colors ${
                        fieldErrors.firstName ? 'border-rose-400 focus:border-rose-500' : 'border-[#E5DDD2] focus:border-[#1A1816]'
                      }`}
                    />
                    {fieldErrors.firstName && (
                      <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {fieldErrors.firstName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="field-lastName" className="block text-[10px] uppercase tracking-[0.18em] font-medium text-[#665A4E] mb-1.5">
                      Last Name *
                    </label>
                    <input
                      id="field-lastName"
                      type="text"
                      required
                      placeholder="e.g. Fernando"
                      value={lastName}
                      onChange={e => {
                        setLastName(e.target.value);
                        if (fieldErrors.lastName) setFieldErrors(prev => ({ ...prev, lastName: undefined }));
                      }}
                      className={`w-full h-[48px] bg-[#FCFBF9] border rounded-lg px-4 text-xs text-[#1A1816] placeholder:text-[#AAA094] focus:outline-none focus:bg-white transition-colors ${
                        fieldErrors.lastName ? 'border-rose-400 focus:border-rose-500' : 'border-[#E5DDD2] focus:border-[#1A1816]'
                      }`}
                    />
                    {fieldErrors.lastName && (
                      <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {fieldErrors.lastName}
                      </p>
                    )}
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label htmlFor="field-email" className="block text-[10px] uppercase tracking-[0.18em] font-medium text-[#665A4E] mb-1.5">
                    Email Address * (For Tracking & Invoice)
                  </label>
                  <input
                    id="field-email"
                    type="email"
                    required
                    placeholder="patron@domain.com"
                    value={email}
                    onChange={e => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: undefined }));
                    }}
                    className={`w-full h-[48px] bg-[#FCFBF9] border rounded-lg px-4 text-xs text-[#1A1816] placeholder:text-[#AAA094] focus:outline-none focus:bg-white transition-colors ${
                      fieldErrors.email ? 'border-rose-400 focus:border-rose-500' : 'border-[#E5DDD2] focus:border-[#1A1816]'
                    }`}
                  />
                  {fieldErrors.email && (
                    <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                {/* Contact Phone with +94 Prefix */}
                <div>
                  <label htmlFor="field-phone" className="block text-[10px] uppercase tracking-[0.18em] font-medium text-[#665A4E] mb-1.5">
                    Contact Phone * (Sri Lankan Mobile)
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-xs font-semibold text-[#8F8171] select-none pointer-events-none">
                      +94
                    </span>
                    <input
                      id="field-phone"
                      type="tel"
                      required
                      placeholder="77 123 4567"
                      value={phone.startsWith('+94') ? phone.slice(3).trim() : phone.startsWith('0') ? phone.slice(1).trim() : phone}
                      onChange={e => {
                        const raw = e.target.value.replace(/[^\d\s]/g, '');
                        setPhone(`+94 ${raw}`.trim());
                        if (fieldErrors.phone) setFieldErrors(prev => ({ ...prev, phone: undefined }));
                      }}
                      className={`w-full h-[48px] bg-[#FCFBF9] border rounded-lg pl-14 pr-4 text-xs text-[#1A1816] placeholder:text-[#AAA094] focus:outline-none focus:bg-white transition-colors ${
                        fieldErrors.phone ? 'border-rose-400 focus:border-rose-500' : 'border-[#E5DDD2] focus:border-[#1A1816]'
                      }`}
                    />
                  </div>
                  {fieldErrors.phone && (
                    <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {fieldErrors.phone}
                    </p>
                  )}
                </div>

                {/* Street Address */}
                <div>
                  <label htmlFor="field-address" className="block text-[10px] uppercase tracking-[0.18em] font-medium text-[#665A4E] mb-1.5">
                    Street Address & Residence *
                  </label>
                  <input
                    id="field-address"
                    type="text"
                    required
                    placeholder="Street address, apartment, suite or house number"
                    value={address}
                    onChange={e => {
                      setAddress(e.target.value);
                      if (fieldErrors.address) setFieldErrors(prev => ({ ...prev, address: undefined }));
                    }}
                    className={`w-full h-[48px] bg-[#FCFBF9] border rounded-lg px-4 text-xs text-[#1A1816] placeholder:text-[#AAA094] focus:outline-none focus:bg-white transition-colors ${
                      fieldErrors.address ? 'border-rose-400 focus:border-rose-500' : 'border-[#E5DDD2] focus:border-[#1A1816]'
                    }`}
                  />
                  {fieldErrors.address && (
                    <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {fieldErrors.address}
                    </p>
                  )}
                </div>

                {/* City, Postal Code, Country Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="field-city" className="block text-[10px] uppercase tracking-[0.18em] font-medium text-[#665A4E] mb-1.5">
                      City / Locality *
                    </label>
                    <input
                      id="field-city"
                      type="text"
                      required
                      placeholder="e.g. Colombo 07"
                      value={city}
                      onChange={e => {
                        setCity(e.target.value);
                        if (fieldErrors.city) setFieldErrors(prev => ({ ...prev, city: undefined }));
                      }}
                      className={`w-full h-[48px] bg-[#FCFBF9] border rounded-lg px-4 text-xs text-[#1A1816] placeholder:text-[#AAA094] focus:outline-none focus:bg-white transition-colors ${
                        fieldErrors.city ? 'border-rose-400 focus:border-rose-500' : 'border-[#E5DDD2] focus:border-[#1A1816]'
                      }`}
                    />
                    {fieldErrors.city && (
                      <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {fieldErrors.city}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="field-postalCode" className="block text-[10px] uppercase tracking-[0.18em] font-medium text-[#665A4E] mb-1.5">
                      Postal Code
                    </label>
                    <input
                      id="field-postalCode"
                      type="text"
                      placeholder="00700"
                      value={postalCode}
                      onChange={e => setPostalCode(e.target.value)}
                      className="w-full h-[48px] bg-[#FCFBF9] border border-[#E5DDD2] rounded-lg px-4 text-xs text-[#1A1816] placeholder:text-[#AAA094] focus:outline-none focus:border-[#1A1816] focus:bg-white transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="field-country" className="block text-[10px] uppercase tracking-[0.18em] font-medium text-[#665A4E] mb-1.5">
                      Country
                    </label>
                    <div className="relative">
                      <select
                        id="field-country"
                        value={country}
                        onChange={e => setCountry(e.target.value)}
                        className="w-full h-[48px] bg-[#FCFBF9] border border-[#E5DDD2] rounded-lg px-4 text-xs text-[#1A1816] focus:outline-none focus:border-[#1A1816] focus:bg-white transition-colors appearance-none cursor-not-allowed"
                        disabled
                      >
                        <option value="Sri Lanka">Sri Lanka (Exclusively)</option>
                      </select>
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-[#8F8171] uppercase tracking-wider font-semibold pointer-events-none">
                        🇱🇰 LK
                      </span>
                    </div>
                  </div>
                </div>

                {/* Delivery Notes */}
                <div>
                  <label htmlFor="field-notes" className="block text-[10px] uppercase tracking-[0.18em] font-medium text-[#665A4E] mb-1.5">
                    Courier Delivery Instructions (Optional)
                  </label>
                  <input
                    id="field-notes"
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Gate buzzer, concierge drop-off, or specific landmark..."
                    className="w-full h-[48px] bg-[#FCFBF9] border border-[#E5DDD2] rounded-lg px-4 text-xs text-[#1A1816] placeholder:text-[#AAA094] focus:outline-none focus:border-[#1A1816] focus:bg-white transition-colors"
                  />
                </div>

                {/* Remember / Update Saved Details Checkbox */}
                {!hasSavedDetails ? (
                  <div className="flex items-center gap-2.5 pt-2 select-none">
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
                  <div className="flex items-center gap-2.5 pt-2 select-none">
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

            </div>

            {/* Payment Method Accordion Section */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#EAE3D9] shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-6">
              
              <div className="flex items-center justify-between border-b border-[#EAE3D9] pb-3.5">
                <div>
                  <h3 className="font-serif text-lg font-semibold text-[#1A1816] flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#8C7A68]" />
                    Select Payment Method
                  </h3>
                  <p className="text-xs text-[#7A6E60] mt-0.5">Choose your preferred settlement method</p>
                </div>
                <span className="text-[10px] uppercase tracking-[0.16em] text-[#8F8171]">
                  Step 2 of 2
                </span>
              </div>

              {fieldErrors.paymentMethod && (
                <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{fieldErrors.paymentMethod}</span>
                </div>
              )}

              <div className="space-y-3.5" role="radiogroup" aria-label="Payment method">
                
                {/* 1. Cash on Delivery (Standard In-Person Payment) */}
                <div
                  className={`rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden ${
                    paymentMethod === 'cod'
                      ? 'border-[#1A1816] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-[#1A1816]'
                      : 'border-[#EAE3D9] bg-[#FCFBF9]/60 hover:border-[#D5CBBF] hover:bg-white'
                  }`}
                >
                  <button type="button" role="radio" aria-label="Cash on Delivery" aria-checked={paymentMethod === 'cod'} aria-expanded={paymentMethod === 'cod'} aria-controls="payment-cod-details" disabled={isSubmitting || isSwitchingPayment} onClick={() => handlePaymentMethodChange('cod')} className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#1A1816] disabled:cursor-wait">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-[#FAF8F5] border border-[#EAE3D9] flex items-center justify-center flex-shrink-0 text-[#1A1816]">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs uppercase font-semibold tracking-wider text-[#1A1816]">
                            Cash on Delivery
                          </span>
                        </div>
                        <p className="text-[11px] text-[#665A4E] mt-0.5">
                          Pay in cash when your order is delivered.
                        </p>
                      </div>
                    </div>

                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all shrink-0 ${
                      paymentMethod === 'cod' ? 'border-[#1A1816]' : 'border-[#D5CBBF]'
                    }`}>
                      {paymentMethod === 'cod' && <div className="w-2 h-2 rounded-full bg-[#1A1816]" />}
                    </div>
                  </button>

                  {paymentMethod === 'cod' && (
                    <div id="payment-cod-details" className="px-5 pb-5 pt-3 border-t border-[#F0EBE3] bg-[#FCFBF9]/50 space-y-4">
                      <div className="rounded-lg bg-white p-3.5 border border-[#EAE3D9] text-xs text-[#5A4E40] space-y-1.5">
                        <div className="flex items-center justify-between text-[#1A1816] font-medium">
                          <span>Amount Due Upon Hand-Delivery:</span>
                          <span className="font-serif text-sm">{formatPrice(totalLKR)}</span>
                        </div>
                        <p className="text-[11px] text-[#7A6E60] leading-relaxed">
                          Your order will be registered immediately with status <strong className="text-[#1A1816]">Pending Collection</strong>. Payment is handed to the courier upon delivery.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleCodOrder();
                        }}
                        disabled={isSubmitting}
                        className="w-full h-12 rounded-xl bg-[#1A1816] text-white text-[11px] uppercase tracking-[0.2em] font-semibold hover:bg-black transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? (
                          <>
                            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                              <path className="opacity-80" d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            <span>Placing Order...</span>
                          </>
                        ) : (
                          <span>PLACE CASH ON DELIVERY ORDER</span>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. Payzy (Sri Lanka Buy Now, Pay Later) */}
                {paymentConfig.payzy.enabled && (
                  <div
                    className={`rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden ${
                      paymentMethod === 'payzy'
                        ? 'border-[#2D3138] bg-white shadow-[0_12px_32px_rgba(26,24,22,0.07)] ring-1 ring-[#2D3138]'
                        : 'border-[#E7E0D6] bg-[#FCFBF9]/80 hover:border-[#CFC3B5] hover:bg-white'
                    }`}
                  >
                    <button
                      type="button"
                      role="radio"
                      aria-label="Payzy"
                      aria-checked={paymentMethod === 'payzy'}
                      aria-expanded={paymentMethod === 'payzy'}
                      aria-controls="payment-payzy-details"
                      disabled={isSubmitting || isSwitchingPayment}
                      onClick={() => handlePaymentMethodChange('payzy')}
                      className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#1A1816] disabled:cursor-wait"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-white border border-[#E8E2DA] shadow-[0_4px_14px_rgba(26,24,22,0.06)] flex items-center justify-center flex-shrink-0">
                          <PayzyMark className="w-9 h-9" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <div className="flex items-baseline leading-none">
                              <span className="text-[15px] font-extrabold tracking-[-0.035em] text-[#34353C]">Pay</span>
                              <span className="text-[15px] font-extrabold tracking-[-0.035em] text-[#13A8DD]">zy</span>
                            </div>
                            <span className={`text-[9px] uppercase tracking-[0.14em] px-2.5 py-1 rounded-full font-semibold ${
                              paymentConfig.payzy.mode === 'sandbox'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-[#EAF8FD] text-[#087DA8] border border-[#BDEAF8]'
                            }`}>
                              {paymentConfig.payzy.mode === 'sandbox'
                                ? `Sandbox · LKR ${paymentConfig.payzy.testAmountLKR || 10}`
                                : 'Pay in 3 or 4'}
                            </span>
                          </div>
                          <p className="text-[11px] sm:text-xs text-[#665A4E] mt-1 leading-relaxed">
                            {paymentConfig.payzy.mode === 'sandbox'
                              ? 'Secure Payzy test checkout for integration verification.'
                              : 'Split your purchase into interest-free monthly instalments.'}
                          </p>
                        </div>
                      </div>

                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all shrink-0 ${
                        paymentMethod === 'payzy'
                          ? 'border-[#13A8DD] bg-[#F3FBFE]'
                          : 'border-[#D5CBBF] bg-white'
                      }`}>
                        {paymentMethod === 'payzy' && <div className="w-2.5 h-2.5 rounded-full bg-[#13A8DD]" />}
                      </div>
                    </button>

                    {paymentMethod === 'payzy' && (
                      <div id="payment-payzy-details" className="px-4 sm:px-5 pb-5 pt-4 border-t border-[#EEE8DF] bg-[linear-gradient(180deg,#FBFEFF_0%,#FCFBF9_100%)] space-y-4">
                        <div className="rounded-xl bg-white border border-[#E5DFD7] overflow-hidden shadow-[0_4px_16px_rgba(26,24,22,0.035)]">
                          <div className="p-4 flex items-start justify-between gap-4 border-b border-[#F0EBE4]">
                            <div>
                              <p className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[#8A7762]">
                                {paymentConfig.payzy.mode === 'sandbox' ? 'Sandbox amount' : 'Payzy order total'}
                              </p>
                              <p className="font-serif text-xl text-[#1A1816] mt-1">
                                LKR {paymentConfig.payzy.mode === 'sandbox'
                                  ? Number(paymentConfig.payzy.testAmountLKR || 10).toLocaleString('en-US')
                                  : totalLKR.toLocaleString('en-US')}
                              </p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-[#F2FAFD] border border-[#D5F0F9] flex items-center justify-center shrink-0">
                              <PayzyMark className="w-7 h-7" />
                            </div>
                          </div>

                          <div className="p-4 space-y-3">
                            {paymentConfig.payzy.mode === 'sandbox' ? (
                              <p className="text-[11px] text-[#6B5E50] leading-relaxed">
                                This LKR 10 sandbox transaction is not a live settlement and is only for Payzy integration verification. A successful sandbox callback is verified by the SAELYXE server and the test order is then closed without entering fulfilment.
                              </p>
                            ) : (
                              <>
                                <div className="flex gap-3">
                                  <div className="mt-0.5 w-5 h-5 rounded-full bg-[#EAF8FD] text-[#0B8CBA] flex items-center justify-center shrink-0">
                                    <Check className="w-3 h-3" strokeWidth={2.4} />
                                  </div>
                                  <div>
                                    <p className="text-[11px] font-semibold text-[#2A2724]">Choose 3 or 4 monthly instalments</p>
                                    <p className="text-[10.5px] text-[#74685B] mt-0.5 leading-relaxed">Your instalment plan is selected securely on Payzy.</p>
                                  </div>
                                </div>
                                <div className="flex gap-3">
                                  <div className="mt-0.5 w-5 h-5 rounded-full bg-[#EAF8FD] text-[#0B8CBA] flex items-center justify-center shrink-0">
                                    <Check className="w-3 h-3" strokeWidth={2.4} />
                                  </div>
                                  <div>
                                    <p className="text-[11px] font-semibold text-[#2A2724]">First instalment is due at purchase</p>
                                    <p className="text-[10.5px] text-[#74685B] mt-0.5 leading-relaxed">Remaining instalments are handled by Payzy on the selected schedule.</p>
                                  </div>
                                </div>
                                <div className="flex gap-3">
                                  <div className="mt-0.5 w-5 h-5 rounded-full bg-[#EAF8FD] text-[#0B8CBA] flex items-center justify-center shrink-0">
                                    <Lock className="w-3 h-3" strokeWidth={2.2} />
                                  </div>
                                  <div>
                                    <p className="text-[11px] font-semibold text-[#2A2724]">Secure provider checkout</p>
                                    <p className="text-[10.5px] text-[#74685B] mt-0.5 leading-relaxed">You will continue to Payzy to complete payment. SAELYXE confirms the order only after the signed payment response is verified.</p>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {!paymentConfig.payzy.configured ? (
                          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[11px] text-amber-900">
                            Payzy is temporarily unavailable while the secure payment connection is being prepared.
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handlePayzyOrder();
                            }}
                            disabled={isSubmitting}
                            className="w-full min-h-[52px] rounded-xl bg-[#303139] text-white text-[11px] uppercase tracking-[0.18em] font-semibold hover:bg-[#24252B] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-3 shadow-[0_8px_20px_rgba(48,49,57,0.16)] border border-[#303139]"
                          >
                            {isSubmitting ? (
                              <>
                                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                  <circle className="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                                  <path className="opacity-80" d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                                <span>Opening Payzy...</span>
                              </>
                            ) : (
                              <>
                                <span className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shrink-0">
                                  <PayzyMark className="w-5 h-5" />
                                </span>
                                <span>CONTINUE WITH PAYZY</span>
                              </>
                            )}
                          </button>
                        )}

                        {paymentConfig.payzy.mode === 'live' && (
                          <p className="text-center text-[9.5px] text-[#8A7D70] leading-relaxed px-2">
                            Available to eligible Payzy customers in Sri Lanka.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. PayPal (Global Online Checkout) */}
                {paymentConfig.paypal.enabled && (
                  <div
                    className={`rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden ${
                      paymentMethod === 'paypal'
                        ? 'border-[#1A1816] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-[#1A1816]'
                        : 'border-[#EAE3D9] bg-[#FCFBF9]/60 hover:border-[#D5CBBF] hover:bg-white'
                    }`}
                  >
                    <button type="button" role="radio" aria-label="PayPal" aria-checked={paymentMethod === 'paypal'} aria-expanded={paymentMethod === 'paypal'} aria-controls="payment-paypal-details" disabled={isSubmitting || isSwitchingPayment} onClick={() => handlePaymentMethodChange('paypal')} className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#1A1816] disabled:cursor-wait">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-[#FAF8F5] border border-[#EAE3D9] flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 object-contain" viewBox="0 0 24 24" fill="none">
                            <path d="M7.076 21.337H2.47a.64.64 0 0 1-.633-.74L4.944 3.72a.767.767 0 0 1 .757-.645h6.852c3.21 0 5.48 1.488 5.176 4.673-.356 3.731-2.906 5.61-6.195 5.61H9.088l-1.379 7.979h-.633z" fill="#003087"/>
                            <path d="M8.666 14.73h2.383c2.81 0 5.02-1.574 5.318-4.707.243-2.55-1.423-3.844-4.14-3.844H8.487a.64.64 0 0 0-.633.541l-2.27 14.372a.48.48 0 0 0 .474.555h3.044l1.379-7.978c.036-.208.214-.361.425-.361z" fill="#0079C1"/>
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs uppercase font-semibold tracking-wider text-[#1A1816]">
                              PayPal
                            </span>
                            <span className="text-[9px] uppercase tracking-wider bg-[#EBF3FB] text-[#1E40AF] px-2 py-0.5 rounded font-medium">
                              Global Buyer Protection
                            </span>
                          </div>
                          <p className="text-[11px] text-[#665A4E] mt-0.5">
                            Pay securely with PayPal.
                          </p>
                        </div>
                      </div>

                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all shrink-0 ${
                        paymentMethod === 'paypal' ? 'border-[#1A1816]' : 'border-[#D5CBBF]'
                      }`}>
                        {paymentMethod === 'paypal' && <div className="w-2 h-2 rounded-full bg-[#1A1816]" />}
                      </div>
                    </button>

                    {paymentMethod === 'paypal' && (
                      <div id="payment-paypal-details" className="px-5 pb-5 pt-3 border-t border-[#F0EBE3] bg-[#FCFBF9]/50 space-y-4">
                        <div className="rounded-lg bg-white p-3.5 border border-[#EAE3D9] text-xs text-[#5A4E40] space-y-1.5">
                          <div className="flex items-center justify-between text-[#1A1816] font-medium">
                            <span>Total Charge via PayPal:</span>
                            <span className="font-serif text-sm">{paypalCurrency} {paypalDisplayAmount.toFixed(2)}</span>
                          </div>
                          <p className="text-[11px] text-[#7A6E60] leading-relaxed">
                            Click the PayPal button below to authorize payment. Your order will be confirmed after the server verifies payment.
                          </p>
                        </div>

                        <div className="pt-1">
                          {paypalClientId ? (
                            <PayPalScriptProvider 
                              options={{ 
                                clientId: paypalClientId, 
                                currency: paypalCurrency 
                              }}
                            >
                              <PayPalButtons
                                style={{ layout: 'vertical', shape: 'rect', color: 'gold', height: 44 }}
                                createOrder={async () => {
                                  if (paymentSwitchInFlightRef.current) throw new Error('Please wait for payment reconciliation.');
                                  if (!validateDeliveryDetails()) {
                                    throw new Error('Please complete all required delivery fields.');
                                  }

                                  let localOrder = paypalPendingOrderRef.current || paypalPendingOrder;
                                  if (!localOrder || localOrder.status === 'cancelled') {
                                    localOrder = await createOrder({
                                      customerName,
                                      firstName: firstName.trim(),
                                      lastName: lastName.trim(),
                                      email: email.trim().toLowerCase(),
                                      phone: phone.trim(),
                                      address: address.trim(),
                                      city: city.trim(),
                                      postalCode: postalCode.trim(),
                                      country: country.trim() || 'Sri Lanka',
                                      items: cart.map(item => ({
                                        productId: item.productId,
                                        size: item.size,
                                        quantity: item.quantity
                                      })),
                                      currencyUsed: selectedCurrency?.code || 'USD',
                                      paymentMethod: 'paypal',
                                      promoCode: appliedPromo?.code,
                                      checkoutAttemptId: paypalCheckoutAttemptIdRef.current || (
                                        paypalCheckoutAttemptIdRef.current = createPayPalCheckoutAttemptId()
                                      ),
                                      notes: notes.trim()
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
                                    await reconcilePendingCheckout(pendingOrder);
                                  } catch (err) {
                                    setFieldErrors(prev => ({ ...prev, general: unresolvedPaymentMessage }));
                                  }
                                }}
                                onError={async (err) => {
                                  console.error('PayPal Button Error:', err);
                                  const pendingOrder = paypalPendingOrderRef.current || paypalPendingOrder;
                                  if (!pendingOrder) return;
                                  try {
                                    await reconcilePendingCheckout(pendingOrder);
                                  } catch {
                                    setFieldErrors(prev => ({ ...prev, general: unresolvedPaymentMessage }));
                                  }
                                }}
                              />
                            </PayPalScriptProvider>
                          ) : (
                            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-xs text-amber-900 text-center">
                              PayPal gateway is currently initializing. Please select Cash on Delivery or configure your PayPal credentials.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>

            </div>

          </div>

          {/* Right Column: ORDER SUMMARY Sticky Card (5 Cols) */}
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
              {cart.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#8F8171] bg-[#FAF8F5]/60 rounded-xl border border-dashed border-[#EAE3D9] flex flex-col items-center justify-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-[#8C7A68]" />
                  <span>Your shopping bag is currently empty.</span>
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-4 text-xs border-b border-[#F5F2EC] pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <img 
                        src={item.image} 
                        alt="" 
                        className="w-16 h-20 sm:w-20 sm:h-24 object-cover rounded-lg bg-[#FAF8F5] border border-[#EAE3D9] flex-shrink-0" 
                      />
                      <div className="min-w-0">
                        <h4 className="font-serif text-sm text-[#1A1816] font-normal leading-snug tracking-wide truncate">
                          {item.title}
                        </h4>
                        <p className="text-[11px] text-[#665A4E] uppercase tracking-wider font-sans mt-0.5">
                          Size {item.size} · Qty {item.quantity}
                        </p>
                      </div>
                    </div>
                    <div className="font-serif text-sm font-semibold text-[#1A1816] whitespace-nowrap">
                      {formatPrice(item.priceLKR * item.quantity)}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Collapsible Coupon / Coupon or Voucher Section */}
            <div className="border-t border-[#EAE3D9] pt-4">
              {appliedPromo ? (
                <div className="flex items-center justify-between p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs text-emerald-950">
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                    <div>
                      <span className="font-medium tracking-wider">{appliedPromo.code}</span>
                      <span className="text-[11px] block text-emerald-800">
                        -{formatPrice(appliedPromo.discountFixedLKR)} discount applied
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
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setIsPromoOpen(prev => !prev)}
                    className="flex items-center justify-between w-full text-[11px] uppercase tracking-[0.16em] font-medium text-[#665A4E] hover:text-[#1A1816] transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" />
                      Have a coupon or voucher?
                    </span>
                    {isPromoOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {isPromoOpen && (
                    <form onSubmit={handleApplyPromo} className="space-y-2 pt-1 animate-in fade-in">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Enter coupon code"
                          value={promoCode}
                          onChange={e => {
                            setPromoCode(e.target.value.toUpperCase());
                            if (promoError) setPromoError('');
                          }}
                          className="flex-1 h-[42px] bg-[#FCFBF9] border border-[#E5DDD2] rounded-lg px-3.5 text-xs uppercase font-mono tracking-wider text-[#1A1816] focus:outline-none focus:border-[#1A1816]"
                        />
                        <button
                          type="submit"
                          disabled={isCheckingPromo}
                          className="h-[42px] px-5 bg-[#1A1816] hover:bg-black text-white text-[10px] uppercase font-medium tracking-[0.2em] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {isCheckingPromo ? '...' : 'Apply'}
                        </button>
                      </div>

                      {promoError && (
                        <p className="text-[11px] text-rose-600 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          {promoError}
                        </p>
                      )}
                      {promoSuccess && (
                        <p className="text-[11px] text-emerald-800 font-medium flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 shrink-0" />
                          {promoSuccess}
                        </p>
                      )}
                    </form>
                  )}
                </div>
              )}
            </div>

            {/* Price Hierarchy Breakdown */}
            <div className="border-t border-[#EAE3D9] pt-4 space-y-2.5 text-xs">
              <div className="flex justify-between text-[#7A6E60]">
                <span>SUBTOTAL</span>
                <span className="font-sans text-[#1A1816]">{formatPrice(subtotalLKR)}</span>
              </div>
              <div className="flex justify-between text-[#7A6E60]">
                <span>DELIVERY</span>
                <span className="font-sans text-emerald-900 font-medium">
                  {shippingLKR === 0 ? 'COMPLIMENTARY' : formatPrice(shippingLKR)}
                </span>
              </div>
              {discountLKR > 0 && (
                <div className="flex justify-between text-emerald-800 font-medium">
                  <span>DISCOUNT ({appliedPromo?.code})</span>
                  <span className="font-sans">-{formatPrice(discountLKR)}</span>
                </div>
              )}
              <div className="border-t border-[#EAE3D9] pt-3.5 flex justify-between items-baseline">
                <div>
                  <span className="block text-xs uppercase tracking-[0.18em] font-semibold text-[#1A1816]">
                    TOTAL
                  </span>
                  <span className="text-[10px] text-[#8F8171] uppercase tracking-wider">
                    All taxes & delivery charges included
                  </span>
                </div>
                <div className="font-serif text-2xl font-normal text-[#1A1816]">
                  {formatPrice(totalLKR)}
                </div>
              </div>
            </div>

            {/* Service & Delivery Safeguards */}
            <div className="border-t border-[#EAE3D9] pt-4 space-y-3">
              <div className="flex items-start gap-2.5 text-xs text-[#5A4E40]">
                <ShieldCheck className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5 stroke-[1.5]" />
                <div>
                  <span className="block text-[10px] uppercase tracking-[0.16em] font-semibold text-[#1A1816]">
                    Size & Exchange Support
                  </span>
                  <p className="text-[11px] text-[#665A4E] leading-relaxed">
                    Personalized sizing exchange support available through your client portal.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-[#5A4E40]">
                <Truck className="w-4 h-4 text-[#8C7A68] shrink-0 mt-0.5 stroke-[1.5]" />
                <div>
                  <span className="block text-[10px] uppercase tracking-[0.16em] font-semibold text-[#1A1816]">
                    Hand-Delivered Courier Logistics
                  </span>
                  <p className="text-[11px] text-[#665A4E] leading-relaxed">
                    Priority door-to-door transit across Sri Lanka with real-time tracking updates.
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
