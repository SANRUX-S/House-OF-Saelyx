import React, { useCallback, useEffect, useRef, useState } from 'react';

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
  if (network && details) return `${network} •••• ${details} with Google Pay`;
  if (network) return `${network} with Google Pay`;
  return 'Google Pay';
}

export interface GooglePayTestButtonProps {
  totalLKR: number;
  disabled?: boolean;
  onBeforePay: () => boolean;
  onAuthorized: () => void;
  onError?: (message: string) => void;
}

export const GooglePayTestButton: React.FC<GooglePayTestButtonProps> = ({
  totalLKR,
  disabled = false,
  onBeforePay,
  onAuthorized,
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

  // Kept in the public prop contract because CheckoutPage already supplies it.
  // The production-review flow is intentionally contained here so the legacy
  // TEST-only parent completion page is not shown.
  void onAuthorized;

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

      // Delivery/contact details are already collected by SAELYXE before the
      // Google Pay sheet opens. After payment selection, move to the merchant
      // transaction-review step before the post-purchase confirmation screen.
      setReviewPaymentData(paymentData);
    } catch (err: any) {
      if (String(err?.statusCode || '').toUpperCase() === 'CANCELED') return;
      reportError(err?.statusMessage || err?.message || 'Google Pay test could not be completed.');
    }
  }, [disabled, onBeforePay, reportError, totalLKR]);

  const placeTestOrder = useCallback(() => {
    if (disabled || isPlacingTestOrder || !reviewPaymentData) return;
    setIsPlacingTestOrder(true);
    try {
      // TEST environment only. This advances the review UI to its post-purchase
      // screen; no production order is persisted and no real card is charged.
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
      buttonRadius: 8,
      allowedPaymentMethods: [baseCardPaymentMethod]
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
  }, [disabled, openGooglePay, ready, reviewPaymentData, testOrderComplete]);

  if (loading) {
    return <div className="min-h-[52px] rounded-xl border border-[#E5DFD7] bg-[#FAF8F5] px-4 flex items-center justify-center text-[11px] text-[#74685B]">Loading Google Pay test…</div>;
  }

  if (!ready) {
    return <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[11px] text-amber-900">Google Pay is not available in this browser/account. Use a supported browser with Google Pay set up.</div>;
  }

  if (testOrderComplete && reviewPaymentData) {
    const paymentDescription = formatGooglePayMethod(reviewPaymentData);

    return (
      <div className="fixed inset-0 z-[250] flex min-h-screen items-center justify-center bg-white px-6 py-12" data-google-pay-review-step="post-purchase">
        <div className="w-full max-w-3xl text-center">
          <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full border-[5px] border-emerald-500 text-emerald-500">
            <svg viewBox="0 0 24 24" className="h-14 w-14" fill="none" aria-hidden="true">
              <path d="m6 12.5 4 4L18.5 8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <h2 className="text-2xl sm:text-3xl font-semibold text-[#202124]">Order completed successfully</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm sm:text-base leading-relaxed text-[#5F6368]">
            Your review order was processed using {paymentDescription}.
          </p>

          <div className="mx-auto mt-8 max-w-xl border-t border-[#E5E7EB] pt-6 text-sm text-[#5F6368]">
            <div className="flex items-center justify-between gap-6 py-2">
              <span>Order total</span>
              <span className="font-medium text-[#202124]">LKR {Math.max(0, Number(totalLKR) || 0).toLocaleString('en-US')}</span>
            </div>
            <div className="flex items-center justify-between gap-6 py-2">
              <span>Payment method</span>
              <span className="text-right font-medium text-[#202124]">{paymentDescription}</span>
            </div>
          </div>

          <p className="mt-8 text-[10px] uppercase tracking-[0.16em] text-[#7A6E60]">TEST REVIEW · NO REAL CHARGE · NO PRODUCTION ORDER CREATED</p>

          <button
            type="button"
            onClick={() => {
              setTestOrderComplete(false);
              setReviewPaymentData(null);
            }}
            className="mt-7 rounded-lg border border-[#DADCE0] bg-white px-8 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#202124] hover:bg-[#F8F9FA]"
          >
            Return to checkout
          </button>
        </div>
      </div>
    );
  }

  if (reviewPaymentData) {
    const paymentDescription = formatGooglePayMethod(reviewPaymentData);

    return (
      <div className="fixed inset-0 z-[240] min-h-screen overflow-y-auto bg-[#F8F9FA] px-5 py-10 sm:px-8 sm:py-14" data-google-pay-review-step="transaction">
        <div className="mx-auto max-w-4xl bg-white border border-[#E5E7EB] shadow-sm">
          <div className="border-b border-[#E5E7EB] px-6 py-5 sm:px-10">
            <h3 className="text-xl font-semibold text-[#202124]">Review order</h3>
          </div>

          <div className="px-6 py-6 sm:px-10 sm:py-8">
            <div className="grid gap-8 md:grid-cols-[1fr_320px]">
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5F6368]">Ship to</p>
                  <p className="mt-2 text-sm leading-relaxed text-[#202124]">Delivery and contact information confirmed in SAELYXE checkout.</p>
                </div>

                <div className="border-t border-[#E5E7EB] pt-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5F6368]">Pay with</p>
                  <div className="mt-3 flex items-center justify-between gap-4 rounded-lg border border-[#DADCE0] px-4 py-3">
                    <span className="text-sm font-medium text-[#202124]">{paymentDescription}</span>
                    <span className="rounded-full bg-[#F1F3F4] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#5F6368]">TEST</span>
                  </div>
                </div>
              </div>

              <div className="border border-[#E5E7EB] bg-[#FAFAFA] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5F6368]">Order total</p>
                <p className="mt-3 text-2xl font-semibold text-[#202124]">LKR {Math.max(0, Number(totalLKR) || 0).toLocaleString('en-US')}</p>
                <p className="mt-3 text-[11px] leading-relaxed text-[#6B7280]">TEST review only. No real card will be charged and no production SAELYXE order will be created.</p>
              </div>
            </div>

            <div className="mt-8 border-t border-[#E5E7EB] pt-6">
              <button
                type="button"
                onClick={placeTestOrder}
                disabled={disabled || isPlacingTestOrder}
                className="w-full min-h-[52px] bg-emerald-500 px-5 text-[12px] font-semibold uppercase tracking-[0.16em] text-white disabled:opacity-50"
              >
                {isPlacingTestOrder ? 'PLACING TEST ORDER…' : 'PLACE ORDER'}
              </button>
              <button
                type="button"
                onClick={() => setReviewPaymentData(null)}
                disabled={disabled || isPlacingTestOrder}
                className="mt-4 w-full py-2 text-[11px] font-medium text-[#5F6368] underline underline-offset-4 disabled:opacity-50"
              >
                Change Google Pay details
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2" data-google-pay-merchant-id={SAELYXE_GOOGLE_PAY_MERCHANT_ID} data-google-pay-review-experience="recommended">
      <div ref={buttonHostRef} className="min-h-[48px] w-full overflow-visible rounded-lg" />
      {error && <p className="text-[11px] text-rose-700">{error}</p>}
      <p className="text-[10px] leading-relaxed text-[#74685B]">Google Pay TEST environment · payment details stay non-chargeable for production review.</p>
    </div>
  );
};