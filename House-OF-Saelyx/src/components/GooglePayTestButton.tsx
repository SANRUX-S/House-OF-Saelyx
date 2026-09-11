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
  return 'Google Pay (Test Card)';
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
  const [isPlacingTestOrder, setIsPlacingTestOrder] = useState(false);
  const [testOrderComplete, setTestOrderComplete] = useState(false);
  const [orderReferenceNumber] = useState(() => `SLX-GP-${Math.floor(100000 + Math.random() * 900000)}`);

  const reportError = useCallback((message: string) => {
    setError(message);
    onError?.(message);
  }, [onError]);

  const openGooglePay = useCallback(async () => {
    if (disabled || !paymentsClientRef.current) return;
    if (!onBeforePay()) return;

    try {
      setError('');
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
      reportError(err?.statusMessage || err?.message || 'Google Pay test could not be completed.');
    }
  }, [disabled, onBeforePay, onAuthorized, reportError, totalLKR]);

  const placeTestOrder = useCallback(() => {
    if (disabled || isPlacingTestOrder || !reviewPaymentData) return;
    setIsPlacingTestOrder(true);
    try {
      setTestOrderComplete(true);
    } finally {
      setIsPlacingTestOrder(false);
    }
  }, [disabled, isPlacingTestOrder, reviewPaymentData]);

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
    if (!host || !client || !ready || reviewPaymentData || testOrderComplete) return;

    host.replaceChildren();
    const button = client.createButton({
      onClick: openGooglePay,
      buttonColor: 'black',
      buttonType: 'checkout',
      buttonSizeMode: 'fill',
      buttonLocale: 'en'
    });
    host.appendChild(button);
  }, [openGooglePay, ready, reviewPaymentData, testOrderComplete]);

  if (loading) {
    return (
      <div className="flex h-12 w-full items-center justify-center rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] text-[11px] text-[#6B7280]">
        Loading Google Pay…
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[11px] text-amber-900">
        Google Pay is not available in this browser/account. Use a supported browser with Google Pay set up.
      </div>
    );
  }

  // Step 4 in Google Pay Brand Guidelines: Order completed successfully
  if (testOrderComplete && reviewPaymentData) {
    const paymentDescription = formatGooglePayMethod(reviewPaymentData);
    const destinationDisplay = address ? `${address}, ${city || 'Colombo'}, Sri Lanka` : 'Colombo, Sri Lanka';

    return (
      <div className="fixed inset-0 z-[250] flex min-h-screen items-center justify-center bg-[#FAF8F5] px-4 py-8 select-none" data-google-pay-review-step="post-purchase">
        <div className="w-full max-w-xl bg-white p-8 sm:p-10 rounded-2xl border border-[#EAE3D9] shadow-sm text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 stroke-[2]" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] uppercase tracking-[0.25em] text-emerald-800 font-semibold">Payment Verified</span>
            <h2 className="font-serif text-2xl sm:text-3xl text-[#1A1816] font-normal">Order completed successfully</h2>
            <p className="text-xs text-[#665A4E] max-w-md mx-auto leading-relaxed">
              Your order was processed using <strong className="text-[#1A1816]">{paymentDescription}</strong> with Google Pay.
            </p>
          </div>

          <div className="bg-[#FAF8F5] p-5 rounded-xl border border-[#EAE3D9] text-left space-y-3 text-xs">
            <div className="flex justify-between items-center border-b border-[#ECE3D8] pb-2">
              <span className="text-[#7A6E60]">Order Reference</span>
              <span className="font-mono font-bold text-[#1A1816]">{orderReferenceNumber}</span>
            </div>
            <div className="flex justify-between items-center border-b border-[#ECE3D8] pb-2">
              <span className="text-[#7A6E60]">Payment Method</span>
              <span className="font-medium text-[#1A1816]">{paymentDescription} with Google Pay</span>
            </div>
            <div className="flex justify-between items-center border-b border-[#ECE3D8] pb-2">
              <span className="text-[#7A6E60]">Order Total</span>
              <span className="font-semibold text-[#1A1816]">LKR {Math.max(0, totalLKR).toLocaleString('en-US')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#7A6E60]">Delivery Destination</span>
              <span className="font-medium text-[#1A1816] truncate max-w-[260px]">{destinationDisplay}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setTestOrderComplete(false);
              setReviewPaymentData(null);
              onCompleted?.();
            }}
            className="w-full h-12 bg-[#1A1816] hover:bg-black text-white text-[11px] uppercase font-medium tracking-[0.2em] rounded-xl transition-all cursor-pointer shadow-sm"
          >
            CONTINUE SHOPPING
          </button>
        </div>
      </div>
    );
  }

  // Step 3 in Google Pay Brand Guidelines: Review order screen
  if (reviewPaymentData) {
    const paymentDescription = formatGooglePayMethod(reviewPaymentData);
    const destinationDisplay = address ? `${address}, ${city || 'Colombo'}, Sri Lanka` : '123 Galle Road, Colombo 03, Sri Lanka';
    const effectiveSubtotal = Number(subtotalLKR) > 0 ? Number(subtotalLKR) : totalLKR;

    return (
      <div className="fixed inset-0 z-[240] min-h-screen overflow-y-auto bg-[#F8F9FA] px-4 py-8 sm:px-6 sm:py-12 flex items-center justify-center" data-google-pay-review-step="transaction">
        <div className="w-full max-w-2xl bg-white rounded-2xl border border-[#DADCE0] shadow-sm overflow-hidden my-auto">
          <div className="border-b border-[#E5E7EB] px-6 py-5 sm:px-8 flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-semibold text-[#202124]">Review order</h2>
            <div className="flex items-center gap-1.5 text-xs text-[#5F6368]">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Encrypted Checkout</span>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Ship to */}
            <div className="border-b border-[#E5E7EB] pb-5">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#5F6368] block mb-1.5">Ship to</span>
              <p className="text-sm font-semibold text-[#202124]">{customerName || 'Kasun Fernando'}</p>
              <p className="text-xs text-[#5F6368] mt-0.5">{destinationDisplay}</p>
              <p className="text-xs text-[#5F6368] mt-0.5">{phone || '+94 77 123 4567'} {email ? `· ${email}` : ''}</p>
            </div>

            {/* Pay with */}
            <div className="border-b border-[#E5E7EB] pb-5">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#5F6368] block mb-2">Pay with</span>
              <div className="flex items-center gap-3.5 p-3.5 rounded-xl border border-[#DADCE0] bg-[#FAFAFA]">
                <div className="w-12 h-8 rounded bg-white border border-[#DADCE0] flex items-center justify-center p-1 shrink-0">
                  <img src="/images/google-pay-mark.svg" alt="Google Pay" className="h-4 w-auto object-contain" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#202124]">{paymentDescription}</p>
                  <p className="text-[11px] text-[#5F6368]">Google Pay</p>
                </div>
              </div>
            </div>

            {/* Order summary */}
            <div className="rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] p-4 sm:p-5 space-y-2.5 text-xs text-[#5F6368]">
              <div className="flex justify-between">
                <span>Items Subtotal</span>
                <span className="font-medium text-[#202124]">LKR {effectiveSubtotal.toLocaleString('en-US')}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery</span>
                <span className="font-medium text-[#202124]">{shippingLKR === 0 ? 'COMPLIMENTARY' : `LKR ${shippingLKR.toLocaleString('en-US')}`}</span>
              </div>
              <div className="border-t border-[#E5E7EB] pt-3 flex justify-between items-baseline">
                <span className="text-sm font-semibold text-[#202124]">Order total</span>
                <span className="text-2xl font-bold text-[#202124]">LKR {Math.max(0, totalLKR).toLocaleString('en-US')}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 space-y-3">
              <button
                type="button"
                onClick={placeTestOrder}
                disabled={disabled || isPlacingTestOrder}
                className="w-full h-12 sm:h-14 bg-[#1A1816] hover:bg-black text-white text-xs font-semibold uppercase tracking-[0.2em] rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isPlacingTestOrder ? 'PROCESSING ORDER…' : 'PLACE ORDER'}
              </button>
              <button
                type="button"
                onClick={() => setReviewPaymentData(null)}
                disabled={disabled || isPlacingTestOrder}
                className="w-full py-2 text-xs font-medium text-[#5F6368] hover:text-[#202124] underline transition-colors cursor-pointer text-center"
              >
                Change Google Pay details
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 1 / 2 in Google Pay Brand Guidelines: Button trigger
  return (
    <div className="space-y-2" data-google-pay-merchant-id={SAELYXE_GOOGLE_PAY_MERCHANT_ID} data-google-pay-review-experience="recommended">
      <div ref={buttonHostRef} className="min-h-[48px] w-full overflow-visible rounded-lg" />
      {error && <p className="text-[11px] text-rose-700">{error}</p>}
    </div>
  );
};