import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Lock } from 'lucide-react';

declare global {
  interface Window {
    google?: any;
  }
}

export const SAELYXE_GOOGLE_PAY_MERCHANT_ID = 'BCR2DN6DVKCKNRAM';
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
    const existing = document.getElementById(GOOGLE_PAY_SCRIPT_ID);
    if (existing) existing.remove();

    const script = document.createElement('script');
    script.id = GOOGLE_PAY_SCRIPT_ID;
    script.src = GOOGLE_PAY_SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      if (window.google?.payments?.api) resolve();
      else reject(new Error('Google Pay loaded without the Payments API.'));
    };
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
  return 'Google Pay';
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
  const [reviewPaymentData, setReviewPaymentData] = useState<any | null>(null);
  const [isOrderComplete, setIsOrderComplete] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderReferenceNumber] = useState(() => `SLX-GP-${Math.floor(100000 + Math.random() * 900000)}`);

  const reportError = useCallback((message: string) => {
    setError(message);
    onError?.(message);
  }, [onError]);

  const handleOpenGooglePay = useCallback(async () => {
    if (disabled || !onBeforePay()) return;

    setError('');
    const client = paymentsClientRef.current;
    if (!client) {
      reportError('Google Pay is still loading. Please try again in a moment.');
      return;
    }

    try {
      const paymentData = await client.loadPaymentData({
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

      if (!paymentData?.paymentMethodData) {
        throw new Error('Google Pay returned no payment method data.');
      }

      setReviewPaymentData(paymentData);
      onAuthorized?.();
    } catch (err: any) {
      const statusCode = String(err?.statusCode || '').toUpperCase();
      if (statusCode === 'CANCELED') return;
      reportError(err?.statusMessage || err?.message || 'Google Pay payment sheet could not be completed.');
    }
  }, [disabled, onAuthorized, onBeforePay, reportError, totalLKR]);

  useEffect(() => {
    let active = true;

    void ensureGooglePayScript()
      .then(async () => {
        if (!active || !window.google?.payments?.api) throw new Error('Google Pay Payments API is unavailable.');
        const client = new window.google.payments.api.PaymentsClient({ environment: 'TEST' });
        paymentsClientRef.current = client;
        const result = await client.isReadyToPay({
          apiVersion: 2,
          apiVersionMinor: 0,
          allowedPaymentMethods: [baseCardPaymentMethod]
        });
        if (!active) return;
        setReady(Boolean(result?.result));
        if (!result?.result) setError('Google Pay is not available in this browser or Google account.');
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
    button.setAttribute('aria-label', 'Checkout with Google Pay in test mode');
    if (disabled) {
      button.style.pointerEvents = 'none';
      button.style.opacity = '0.55';
    }
    host.appendChild(button);

    return () => {
      host.replaceChildren();
    };
  }, [disabled, handleOpenGooglePay, isOrderComplete, ready, reviewPaymentData]);

  const effectiveSubtotal = Number(subtotalLKR) > 0 ? Number(subtotalLKR) : Math.max(0, totalLKR - shippingLKR);
  const destinationDisplay = [address, city, 'Sri Lanka'].filter(Boolean).join(', ') || 'Confirmed in SAELYXE checkout';
  const customerNameDisplay = customerName.trim() || 'SAELYXE customer';
  const paymentDescription = formatGooglePayMethod(reviewPaymentData);

  if (isOrderComplete && reviewPaymentData) {
    return (
      <div className="fixed inset-0 z-[280] min-h-screen overflow-y-auto bg-white px-4 py-12 sm:py-20 flex items-center justify-center" data-google-pay-review-step="post-purchase">
        <div className="w-full max-w-xl text-center space-y-6">
          <div className="w-20 h-20 rounded-full border-[5px] border-[#00B074] text-[#00B074] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-semibold text-[#202124]">Order completed successfully</h2>
            <p className="text-sm text-[#5F6368]">Google Pay TEST review completed with {paymentDescription}. No real card was charged and no production Google Pay order was created.</p>
          </div>
          <div className="bg-[#FAF8F5] p-5 rounded-xl border border-[#EAE3D9] text-left text-xs space-y-3">
            <div className="flex justify-between gap-4"><span>Order reference</span><span className="font-mono font-semibold">{orderReferenceNumber}</span></div>
            <div className="flex justify-between gap-4"><span>Payment method</span><span className="font-semibold">{paymentDescription}</span></div>
            <div className="flex justify-between gap-4"><span>Review total</span><span className="font-semibold">LKR {Math.max(0, totalLKR).toLocaleString('en-US')}</span></div>
          </div>
          <button type="button" onClick={() => { setIsOrderComplete(false); setReviewPaymentData(null); onCompleted?.(); }} className="w-full h-12 rounded-xl bg-[#1A1816] text-white text-xs font-semibold uppercase tracking-[0.18em]">Continue shopping</button>
        </div>
      </div>
    );
  }

  if (reviewPaymentData) {
    return (
      <div className="fixed inset-0 z-[270] min-h-screen overflow-y-auto bg-[#F8F9FA] px-4 py-8 sm:py-12 flex items-center justify-center" data-google-pay-review-step="transaction">
        <div className="w-full max-w-2xl rounded-2xl border border-[#DADCE0] bg-white p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-4">
            <h2 className="text-xl font-semibold text-[#202124]">Review order</h2>
            <div className="flex items-center gap-1.5 text-xs text-[#5F6368]"><Lock className="w-3.5 h-3.5" /> Secure checkout</div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#5F6368]">Ship to</p>
              <p className="mt-2 font-semibold text-[#202124]">{customerNameDisplay}</p>
              <p className="mt-1 text-xs text-[#5F6368]">{destinationDisplay}</p>
              {phone && <p className="mt-1 text-xs text-[#5F6368]">{phone}</p>}
              {email && <p className="mt-1 text-xs text-[#5F6368]">{email}</p>}
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span>Subtotal</span><span>LKR {effectiveSubtotal.toLocaleString('en-US')}</span></div>
              <div className="flex justify-between"><span>Delivery</span><span>{shippingLKR === 0 ? 'COMPLIMENTARY' : `LKR ${shippingLKR.toLocaleString('en-US')}`}</span></div>
              <div className="flex justify-between border-t pt-2 text-sm font-semibold"><span>Total</span><span>LKR {Math.max(0, totalLKR).toLocaleString('en-US')}</span></div>
            </div>
          </div>
          <div className="border-y border-[#E5E7EB] py-4 flex items-center justify-between gap-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#5F6368]">Pay with</span>
            <div className="flex items-center gap-3">
              <div className="rounded border border-[#DADCE0] bg-white px-2 py-1"><img src="/images/google-pay-mark.svg" alt="Google Pay" className="h-4 w-auto" /></div>
              <span className="text-sm font-semibold text-[#202124]">{paymentDescription}</span>
            </div>
          </div>
          {cartItems.length > 0 && (
            <div className="space-y-3">
              {cartItems.map((item, index) => (
                <div key={`${item.productId}-${item.size}-${index}`} className="flex items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={item.image} alt={item.title} className="h-14 w-12 rounded-lg object-cover" />
                    <div className="min-w-0"><p className="truncate font-semibold text-[#202124]">{item.title}</p><p className="text-[#5F6368]">Size {item.size} · Qty {item.quantity}</p></div>
                  </div>
                  <span className="font-semibold">LKR {(item.priceLKR * item.quantity).toLocaleString('en-US')}</span>
                </div>
              ))}
            </div>
          )}
          <p className="text-[10px] text-[#6B7280]">TEST review only. Place Order below does not charge a real card and does not create a production Google Pay order.</p>
          <button type="button" disabled={disabled || isPlacingOrder} onClick={() => { setIsPlacingOrder(true); setIsOrderComplete(true); setIsPlacingOrder(false); }} className="w-full h-12 rounded-xl bg-[#00B074] text-white text-xs font-semibold uppercase tracking-[0.18em] disabled:opacity-50">{isPlacingOrder ? 'Processing…' : 'Place order'}</button>
          <button type="button" onClick={() => setReviewPaymentData(null)} className="w-full py-2 text-xs text-[#5F6368] underline">Change Google Pay details</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="flex h-12 items-center justify-center rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] text-[11px] text-[#6B7280]">Loading Google Pay…</div>;
  }

  return (
    <div className="space-y-2" data-google-pay-merchant-id={SAELYXE_GOOGLE_PAY_MERCHANT_ID}>
      {ready ? <div ref={buttonHostRef} className="min-h-[48px] w-full overflow-visible rounded-lg" /> : <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[11px] text-amber-900">Google Pay is not available in this browser/account.</div>}
      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700">{error}</p>}
      <p className="text-[10px] leading-relaxed text-[#74685B]">Google Pay TEST environment · use the native Google Pay sheet for the production-review screenshot.</p>
    </div>
  );
};
