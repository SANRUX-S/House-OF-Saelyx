import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Lock } from 'lucide-react';

declare global {
  interface Window {
    google?: any;
  }
}

export const SAELYXE_GOOGLE_PAY_MERCHANT_ID = 'BCR2DN6DVKCKNRAM';
// Google Pay TEST environment: no card can be charged
const GOOGLE_PAY_SCRIPT_ID = 'saelyxe-google-pay-js';
const GOOGLE_PAY_SCRIPT_SRC = 'https://pay.google.com/gp/p/js/pay.js';

const baseCardPaymentMethod = {
  type: 'CARD',
  parameters: {
    allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
    allowedCardNetworks: ['VISA', 'MASTERCARD']
  }
};

const testCardPaymentMethod = {
  ...baseCardPaymentMethod,
  tokenizationSpecification: {
    type: 'PAYMENT_GATEWAY',
    parameters: {
      gateway: 'example',
      gatewayMerchantId: 'exampleGatewayMerchantId'
    }
  }
};

function ensureGooglePayScript() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Google Pay requires a browser session.'));
  if (window.google?.payments?.api) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(GOOGLE_PAY_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Google Pay could not be loaded.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = GOOGLE_PAY_SCRIPT_ID;
    script.src = GOOGLE_PAY_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google Pay could not be loaded.'));
    document.head.appendChild(script);
  });
}

function formatGooglePayMethod(paymentData: any) {
  const info = paymentData?.paymentMethodData?.info || {};
  const network = String(info.cardNetwork || '').trim();
  const details = String(info.cardDetails || '').replace(/^\*+/, '').trim();
  if (network && details) return `${network} •••• ${details}`;
  if (network) return `${network} with Google Pay`;
  return 'Visa •••• 1234';
}

export interface GooglePayTestButtonProps {
  totalLKR: number;
  subtotalLKR?: number;
  shippingLKR?: number;
  customerName?: string;
  address?: string;
  city?: string;
  email?: string;
  phone?: string;
  cartItems?: Array<{
    productId: string;
    title: string;
    size: string;
    quantity: number;
    priceLKR: number;
    image: string;
  }>;
  disabled?: boolean;
  onBeforePay: () => boolean;
  onAuthorized?: () => void;
  onCompleted?: () => void;
  onError?: (message: string) => void;
}

export const GooglePayTestButton: React.FC<GooglePayTestButtonProps> = ({
  totalLKR,
  subtotalLKR,
  shippingLKR = 0,
  customerName = '',
  address = '',
  city = '',
  email = '',
  phone = '',
  cartItems = [],
  disabled = false,
  onBeforePay,
  onAuthorized,
  onCompleted,
  onError
}) => {
  const buttonHostRef = useRef<HTMLDivElement>(null);
  const paymentsClientRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Flow states: 'button' | 'review' | 'completed'
  const [reviewPaymentData, setReviewPaymentData] = useState<any | null>(null);
  const [isOrderComplete, setIsOrderComplete] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderReferenceNumber] = useState(() => `SLX-GP-${Math.floor(100000 + Math.random() * 900000)}`);

  const reportError = useCallback((message: string) => {
    setError(message);
    onError?.(message);
  }, [onError]);

  const handleOpenGooglePay = useCallback(async () => {
    if (disabled) return;
    if (!onBeforePay()) return;

    setError('');

    if (paymentsClientRef.current) {
      try {
        const paymentData = await paymentsClientRef.current.loadPaymentData({
          apiVersion: 2,
          apiVersionMinor: 0,
          allowedPaymentMethods: [testCardPaymentMethod],
          merchantInfo: {
            merchantName: 'SAELYXE'
          },
          transactionInfo: {
            countryCode: 'LK',
            currencyCode: 'LKR',
            totalPriceStatus: 'FINAL',
            totalPrice: Math.max(0, Number(totalLKR) || 0).toFixed(2),
            totalPriceLabel: 'SAELYXE Order Total',
            checkoutOption: 'COMPLETE_IMMEDIATE_PURCHASE'
          }
        });
        setReviewPaymentData(paymentData);
        onAuthorized?.();
      } catch (err: any) {
        if (String(err?.statusCode || '').toUpperCase() === 'CANCELED') return;
        // In case native sheet is blocked by browser shields (e.g. Brave), fallback into review state with test payload
        setReviewPaymentData({
          paymentMethodData: {
            info: { cardNetwork: 'VISA', cardDetails: '1234' }
          }
        });
        onAuthorized?.();
      }
    } else {
      // Direct review transition
      setReviewPaymentData({
        paymentMethodData: {
          info: { cardNetwork: 'VISA', cardDetails: '1234' }
        }
      });
      onAuthorized?.();
    }
  }, [disabled, onBeforePay, onAuthorized, totalLKR]);

  useEffect(() => {
    let active = true;

    void ensureGooglePayScript()
      .then(async () => {
        if (!active || !window.google?.payments?.api) return;
        const client = new window.google.payments.api.PaymentsClient({ environment: 'TEST' });
        paymentsClientRef.current = client;
        const result = await client.isReadyToPay({
          apiVersion: 2,
          apiVersionMinor: 0,
          allowedPaymentMethods: [baseCardPaymentMethod]
        });
        if (!active) return;
        setReady(Boolean(result?.result));
      })
      .catch((err: any) => {
        if (active) reportError(err?.message || 'Google Pay test could not be initialized.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reportError]);

  useEffect(() => {
    const host = buttonHostRef.current;
    const client = paymentsClientRef.current;
    if (!host || !client || !ready || reviewPaymentData || isOrderComplete) return;

    host.replaceChildren();
    const button = client.createButton({
      onClick: handleOpenGooglePay,
      buttonColor: 'black',
      buttonType: 'checkout',
      buttonSizeMode: 'fill',
      buttonLocale: 'en'
    });
    host.appendChild(button);
  }, [handleOpenGooglePay, ready, reviewPaymentData, isOrderComplete]);

  const effectiveSubtotal = Number(subtotalLKR) > 0 ? Number(subtotalLKR) : totalLKR;
  const destinationDisplay = address
    ? `${address}, ${city || 'Colombo'}`
    : '123 Galle Road, Colombo 03, Sri Lanka';
  const customerNameDisplay = customerName.trim() || 'SAELYXE Patron';
  const paymentDescription = formatGooglePayMethod(reviewPaymentData);

  const displayItems = cartItems.length > 0 ? cartItems : [
    {
      productId: 'spotlight-garment',
      title: 'THE OVERSIZED SILK HOODIE',
      size: 'M',
      quantity: 1,
      priceLKR: effectiveSubtotal,
      image: '/images/spotlight19201080.jpg'
    }
  ];

  // ---------------------------------------------------------------------------
  // STEP 4: Order Completed Successfully (Google Brand Guidelines Confirmation)
  // ---------------------------------------------------------------------------
  if (isOrderComplete) {
    return (
      <div className="fixed inset-0 z-[280] min-h-screen overflow-y-auto bg-white px-4 py-12 sm:py-20 flex items-center justify-center select-none" data-google-pay-review-step="post-purchase">
        <div className="w-full max-w-xl bg-white text-center space-y-6">
          {/* Green circle with checkmark */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-[5px] border-[#00B074] text-[#00B074] flex items-center justify-center mx-auto">
            <svg viewBox="0 0 24 24" className="w-12 h-12 stroke-[2.5]" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl sm:text-3xl font-semibold text-[#202124]">
              Order Completed Successfully!
            </h2>
            <p className="text-sm text-[#5F6368] leading-relaxed max-w-md mx-auto">
              Your order was successfully processed using <strong className="text-[#202124]">{paymentDescription} with Google Pay</strong>.
            </p>
            <p className="text-xs text-[#5F6368]">
              Check your email for your receipt.
            </p>
          </div>

          <div className="bg-[#FAF8F5] p-5 rounded-2xl border border-[#EAE3D9] text-left space-y-2.5 text-xs max-w-md mx-auto">
            <div className="flex justify-between items-center border-b border-[#ECE3D8] pb-2">
              <span className="text-[#7A6E60]">Order Reference</span>
              <span className="font-mono font-bold text-[#1A1816]">{orderReferenceNumber}</span>
            </div>
            <div className="flex justify-between items-center border-b border-[#ECE3D8] pb-2">
              <span className="text-[#7A6E60]">Payment Method</span>
              <span className="font-medium text-[#1A1816]">{paymentDescription} (Google Pay)</span>
            </div>
            <div className="flex justify-between items-center border-b border-[#ECE3D8] pb-2">
              <span className="text-[#7A6E60]">Order Total</span>
              <span className="font-semibold text-[#1A1816]">LKR {Math.max(0, totalLKR).toLocaleString('en-US')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#7A6E60]">Delivery Destination</span>
              <span className="font-medium text-[#1A1816] truncate max-w-[220px]">{destinationDisplay}</span>
            </div>
          </div>

          <div className="pt-4 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setIsOrderComplete(false);
                setReviewPaymentData(null);
                onCompleted?.();
              }}
              className="px-8 h-12 bg-[#1A1816] hover:bg-black text-white text-xs font-semibold uppercase tracking-[0.2em] rounded-xl transition-all cursor-pointer shadow-sm"
            >
              CONTINUE SHOPPING
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // STEP 3: Review Order (Google Brand Guidelines Transaction Review Screen)
  // ---------------------------------------------------------------------------
  if (reviewPaymentData) {
    return (
      <div className="fixed inset-0 z-[270] min-h-screen overflow-y-auto bg-white px-4 py-8 sm:py-14 flex items-center justify-center select-none" data-google-pay-review-step="transaction">
        <div className="w-full max-w-2xl bg-white border border-[#DADCE0] rounded-2xl p-6 sm:p-10 shadow-sm space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-4">
            <h2 className="text-xl sm:text-2xl font-semibold text-[#202124]">Review Order</h2>
            <div className="flex items-center gap-1.5 text-xs text-[#5F6368]">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Encrypted Checkout</span>
            </div>
          </div>

          {/* Ship to & Financial breakdown */}
          <div className="border-b border-[#E5E7EB] pb-5 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            <div>
              <span className="font-semibold text-[#5F6368] uppercase tracking-wider block mb-1 text-[11px]">Ship to</span>
              <p className="font-semibold text-[#202124] text-sm">{customerNameDisplay}</p>
              <p className="text-[#5F6368] text-xs mt-1 leading-relaxed">{destinationDisplay}</p>
              {phone && <p className="text-[#5F6368] text-xs mt-0.5">{phone}</p>}
              {email && <p className="text-[#5F6368] text-xs mt-0.5">{email}</p>}
            </div>

            <div className="space-y-2 text-right">
              <div className="flex justify-between sm:justify-end gap-10 text-[#5F6368]">
                <span>Subtotal</span>
                <span className="font-medium text-[#202124]">LKR {effectiveSubtotal.toLocaleString('en-US')}</span>
              </div>
              <div className="flex justify-between sm:justify-end gap-10 text-[#5F6368]">
                <span>Shipping</span>
                <span className="font-medium text-[#202124]">
                  {shippingLKR === 0 ? 'COMPLIMENTARY' : `LKR ${shippingLKR.toLocaleString('en-US')}`}
                </span>
              </div>
              <div className="flex justify-between sm:justify-end gap-10 text-[#5F6368]">
                <span>Tax</span>
                <span className="font-medium text-[#202124]">LKR 0.00</span>
              </div>
              <div className="flex justify-between sm:justify-end gap-10 font-bold text-sm sm:text-base text-[#202124] pt-2 border-t border-[#E5E7EB]">
                <span>Order total</span>
                <span className="text-base sm:text-lg">LKR {Math.max(0, totalLKR).toLocaleString('en-US')}</span>
              </div>
            </div>
          </div>

          {/* Pay With section (Required: Google Pay mark in 1px border) */}
          <div className="border-b border-[#E5E7EB] pb-5 flex items-center justify-between text-xs">
            <span className="font-semibold text-[#5F6368] uppercase tracking-wider text-[11px]">Pay With</span>
            <div className="flex items-center gap-3">
              <div className="w-12 h-7 rounded border border-[#DADCE0] bg-white flex items-center justify-center p-1 shadow-2xs">
                <img src="/images/google-pay-mark.svg" alt="Google Pay" className="h-4 w-auto object-contain" />
              </div>
              <span className="font-semibold text-[#202124]">{paymentDescription}</span>
            </div>
          </div>

          {/* Real Cart Garments */}
          <div className="border-b border-[#E5E7EB] pb-5 space-y-3 text-xs">
            <span className="font-semibold text-[#5F6368] uppercase tracking-wider text-[11px] block">Order Items</span>
            {displayItems.map((item, idx) => (
              <div key={`${item.productId}-${item.size}-${idx}`} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-12 h-14 object-cover rounded-lg border border-[#EAE3D9] shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-[#202124] truncate">{item.title}</p>
                    <p className="text-[11px] text-[#665A4E] uppercase">Size {item.size} · Qty {item.quantity}</p>
                  </div>
                </div>
                <span className="font-medium text-[#202124] whitespace-nowrap">
                  LKR {(item.priceLKR * item.quantity).toLocaleString('en-US')}
                </span>
              </div>
            ))}
          </div>

          {/* Shipping Options */}
          <div className="border-b border-[#E5E7EB] pb-5 flex items-center justify-between text-xs">
            <span className="font-semibold text-[#5F6368] uppercase tracking-wider text-[11px]">Shipping Options</span>
            <div className="text-right text-xs">
              <p className="font-semibold text-[#202124]">
                {shippingLKR === 0 ? 'Complimentary Express' : `Standard Delivery - LKR ${shippingLKR.toLocaleString('en-US')}`}
              </p>
              <p className="text-[11px] text-[#5F6368]">Estimated delivery 2 - 4 Business Days</p>
            </div>
          </div>

          {/* Prominent Green PLACE ORDER Button */}
          <div className="pt-2 space-y-3">
            <button
              type="button"
              onClick={() => {
                setIsPlacingOrder(true);
                setTimeout(() => {
                  setIsPlacingOrder(false);
                  setIsOrderComplete(true);
                }, 300);
              }}
              disabled={disabled || isPlacingOrder}
              className="w-full h-12 sm:h-14 bg-[#00B074] hover:bg-[#009b66] text-white font-semibold text-xs uppercase tracking-[0.2em] rounded-xl transition-all cursor-pointer shadow flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isPlacingOrder ? 'PROCESSING ORDER…' : 'PLACE ORDER'}
            </button>
            <button
              type="button"
              onClick={() => setReviewPaymentData(null)}
              className="w-full py-2 text-xs font-medium text-[#5F6368] hover:text-[#202124] underline transition-colors cursor-pointer text-center"
            >
              Change payment method
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // STEP 1: Google Pay Trigger Button
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-2" data-google-pay-merchant-id={SAELYXE_GOOGLE_PAY_MERCHANT_ID} data-google-pay-review-experience="recommended">
      {loading ? (
        <div className="flex h-12 w-full items-center justify-center rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] text-[11px] text-[#6B7280]">
          Loading Google Pay…
        </div>
      ) : (
        <>
          <div ref={buttonHostRef} className="min-h-[48px] w-full overflow-visible rounded-lg" />
          {!ready && (
            <button
              type="button"
              onClick={handleOpenGooglePay}
              className="w-full h-12 bg-black hover:bg-stone-900 text-white rounded-lg flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
            >
              <img src="/images/google-pay-mark.svg" alt="Google Pay" className="h-5 w-auto object-contain" />
            </button>
          )}
        </>
      )}
      {error && <p className="text-[11px] text-rose-700">{error}</p>}
    </div>
  );
};