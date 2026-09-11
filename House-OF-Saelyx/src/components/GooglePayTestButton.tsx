import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

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
          checkoutOption: 'CONTINUE_TO_REVIEW'
        }
      });

      if (!paymentData?.paymentMethodData) throw new Error('Google Pay returned no payment method data.');
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

    return () => host.replaceChildren();
  }, [disabled, handleOpenGooglePay, isOrderComplete, ready, reviewPaymentData]);

  const subtotal = Number(subtotalLKR) > 0 ? Number(subtotalLKR) : Math.max(0, totalLKR - shippingLKR);
  const customer = customerName.trim() || 'SAELYXE customer';
  const destination = [address, city, 'Sri Lanka'].filter(Boolean).join(', ') || 'Confirmed in checkout';
  const paymentDescription = formatGooglePayMethod(reviewPaymentData);

  if (isOrderComplete && reviewPaymentData) {
    return (
      <div className="fixed inset-0 z-[300] overflow-y-auto bg-white px-6 py-16 sm:py-24" data-google-pay-review-step="post-purchase">
        <div className="mx-auto flex min-h-[70vh] w-full max-w-4xl flex-col items-center justify-center text-center">
          <div className="mb-7 flex h-24 w-24 items-center justify-center rounded-full border-[6px] border-[#16c784] text-[#16c784]">
            <CheckCircle2 className="h-14 w-14" strokeWidth={2.1} />
          </div>
          <h2 className="text-2xl font-medium text-[#3c4043] sm:text-3xl">Order Completed Successfully!</h2>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-[#5f6368]">
            Your order was successfully processed using {paymentDescription} with Google Pay.
          </p>
          <p className="mt-2 text-sm text-[#5f6368]">Check your email for your receipt.</p>
          <p className="mt-8 text-[11px] text-[#9aa0a6]">Google Pay TEST review only · no card can be charged and no production order was created.</p>
          <button
            type="button"
            onClick={() => {
              setIsOrderComplete(false);
              setReviewPaymentData(null);
              onCompleted?.();
            }}
            className="mt-8 border-b border-[#5f6368] pb-1 text-xs font-medium uppercase tracking-[0.16em] text-[#5f6368]"
          >
            Return to checkout
          </button>
        </div>
      </div>
    );
  }

  if (reviewPaymentData) {
    return (
      <div className="fixed inset-0 z-[290] overflow-y-auto bg-white px-4 py-10 sm:px-8 sm:py-14" data-google-pay-review-step="transaction">
        <div className="mx-auto w-full max-w-5xl text-[#3c4043]">
          <div className="border-y border-[#dadce0] py-3 text-center text-lg font-medium">Review Order</div>

          <div className="grid grid-cols-1 gap-8 border-b border-[#dadce0] py-5 text-xs sm:grid-cols-[1fr_280px]">
            <div>
              <div className="mb-2 text-[11px] font-medium text-[#5f6368]">Ship to</div>
              <div className="font-medium text-[#202124]">{customer}</div>
              <div className="mt-1 leading-5 text-[#5f6368]">{destination}</div>
              {phone && <div className="mt-1 text-[#5f6368]">{phone}</div>}
              {email && <div className="mt-1 text-[#5f6368]">{email}</div>}
            </div>

            <div className="space-y-2 text-[#5f6368]">
              <div className="flex justify-between gap-8"><span>Subtotal</span><span className="text-[#202124]">LKR {subtotal.toLocaleString('en-US')}</span></div>
              <div className="flex justify-between gap-8"><span>Shipping</span><span className="text-[#202124]">{shippingLKR === 0 ? 'LKR 0.00' : `LKR ${shippingLKR.toLocaleString('en-US')}`}</span></div>
              <div className="flex justify-between gap-8"><span>Tax</span><span className="text-[#202124]">LKR 0.00</span></div>
              <div className="flex justify-between gap-8 border-t border-[#dadce0] pt-2 font-medium text-[#202124]"><span>Order total</span><span>LKR {Math.max(0, totalLKR).toLocaleString('en-US')}</span></div>
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-[#dadce0] py-4 text-xs">
            <span className="text-[#5f6368]">Pay With</span>
            <div className="flex items-center gap-3">
              <div className="flex h-7 min-w-12 items-center justify-center rounded border border-[#dadce0] bg-white px-2">
                <img src="/images/google-pay-mark.svg" alt="Google Pay" className="h-4 w-auto" />
              </div>
              <span className="font-medium text-[#202124]">{paymentDescription}</span>
            </div>
          </div>

          <div className="border-b border-[#dadce0] py-4">
            {cartItems.length > 0 ? cartItems.map((item, index) => (
              <div key={`${item.productId}-${item.size}-${index}`} className="flex items-center justify-between gap-5 py-2 text-xs">
                <div className="flex min-w-0 items-center gap-4">
                  <img src={item.image} alt={item.title} className="h-16 w-14 object-cover" />
                  <div className="min-w-0">
                    <div className="truncate font-medium text-[#202124]">{item.title}</div>
                    <div className="mt-1 text-[#5f6368]">Size {item.size} · Qty {item.quantity}</div>
                  </div>
                </div>
                <div className="font-medium text-[#202124]">LKR {(item.priceLKR * item.quantity).toLocaleString('en-US')}</div>
              </div>
            )) : (
              <div className="py-4 text-xs text-[#5f6368]">Your selected SAELYXE item is confirmed for this review.</div>
            )}
          </div>

          <div className="border-b border-[#dadce0] py-5 text-xs">
            <div className="mb-3 font-medium text-[#5f6368]">Shipping Options</div>
            <div className="flex items-center justify-between gap-6">
              <div>
                <div className="font-medium text-[#202124]">SAELYXE Delivery</div>
                <div className="mt-1 text-[#5f6368]">Delivery details are confirmed from your checkout information.</div>
              </div>
              <div className="text-[#202124]">{shippingLKR === 0 ? 'Complimentary' : `LKR ${shippingLKR.toLocaleString('en-US')}`}</div>
            </div>
          </div>

          <div className="mx-auto mt-7 max-w-xl">
            <button
              type="button"
              disabled={disabled || isPlacingOrder}
              onClick={() => {
                setIsPlacingOrder(true);
                setIsOrderComplete(true);
                setIsPlacingOrder(false);
              }}
              className="h-12 w-full bg-[#16c784] text-xs font-semibold uppercase tracking-[0.14em] text-white disabled:opacity-50"
            >
              {isPlacingOrder ? 'Processing…' : 'Place Order'}
            </button>
            <button type="button" onClick={() => setReviewPaymentData(null)} className="mt-3 w-full py-2 text-[11px] text-[#5f6368] underline">Change Google Pay details</button>
          </div>

          <p className="mt-5 text-center text-[10px] text-[#9aa0a6]">TEST review only. Place Order does not charge a real card or create a production Google Pay order.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="flex h-12 items-center justify-center rounded-lg border border-[#e0e0e0] bg-white text-[11px] text-[#5f6368]">Loading Google Pay…</div>;
  }

  return (
    <div className="space-y-2" data-google-pay-merchant-id={SAELYXE_GOOGLE_PAY_MERCHANT_ID}>
      {ready ? (
        <div className="p-2">
          <div ref={buttonHostRef} className="min-h-[48px] w-full overflow-visible" />
        </div>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-[11px] text-amber-900">Google Pay is not available in this browser/account.</div>
      )}
      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700">{error}</p>}
      <p className="text-[10px] leading-relaxed text-[#74685B]">Google Pay TEST environment · open the native Google Pay selector and capture that selector screen for the Google Pay API payment-screen review slot.</p>
    </div>
  );
};
