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

      // Delivery/contact details are already required and validated by the
      // SAELYXE checkout before Google Pay opens. Do not request them again in
      // the Google Pay sheet; keep the sheet focused on payment selection.
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
      // TEST environment only: no card can be charged and CheckoutPage does not
      // persist a production Google Pay order. This advances to the review-only
      // post-purchase confirmation screen.
      onAuthorized();
    } finally {
      setIsPlacingTestOrder(false);
    }
  }, [disabled, isPlacingTestOrder, onAuthorized, reviewPaymentData]);

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
    if (!host || !client || !ready || reviewPaymentData) return;

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
  }, [disabled, openGooglePay, ready, reviewPaymentData]);

  if (loading) {
    return <div className="min-h-[52px] rounded-xl border border-[#E5DFD7] bg-[#FAF8F5] px-4 flex items-center justify-center text-[11px] text-[#74685B]">Loading Google Pay test…</div>;
  }

  if (!ready) {
    return <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[11px] text-amber-900">Google Pay is not available in this browser/account. Use a supported browser with Google Pay set up.</div>;
  }

  if (reviewPaymentData) {
    const paymentDescription = formatGooglePayMethod(reviewPaymentData);

    return (
      <div className="rounded-xl border border-[#DADCE0] bg-white p-4 sm:p-5 space-y-4" data-google-pay-review-step="transaction">
        <div className="flex items-start justify-between gap-4 border-b border-[#EEE8DF] pb-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-[#5F6368]">Review order</p>
            <h4 className="mt-1 text-base font-semibold text-[#202124]">Confirm before placing your order</h4>
            <p className="mt-1 text-[11px] leading-relaxed text-[#6B6259]">Your Google Pay payment method is selected. Delivery and contact information were already confirmed in the SAELYXE checkout.</p>
          </div>
          <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-amber-900">TEST</span>
        </div>

        <div className="divide-y divide-[#EEE8DF] rounded-lg border border-[#E7E0D6] bg-[#FCFBF9] px-4">
          <div className="py-3 flex items-start justify-between gap-5 text-[11px]">
            <span className="shrink-0 text-[#74685B]">Payment method</span>
            <span className="text-right font-medium text-[#202124]">{paymentDescription}</span>
          </div>
          <div className="py-3 flex items-start justify-between gap-5 text-[11px]">
            <span className="shrink-0 text-[#74685B]">Delivery</span>
            <span className="max-w-[70%] text-right font-medium leading-relaxed text-[#202124]">Confirmed in SAELYXE checkout</span>
          </div>
          <div className="py-3 flex items-center justify-between gap-5">
            <span className="text-[11px] text-[#74685B]">Order total</span>
            <span className="font-serif text-xl text-[#1A1816]">LKR {Math.max(0, Number(totalLKR) || 0).toLocaleString('en-US')}</span>
          </div>
        </div>

        <p className="text-[10px] leading-relaxed text-[#74685B]">TEST review only · clicking Place Order does not charge a real card and does not create a production SAELYXE order.</p>

        <button
          type="button"
          onClick={placeTestOrder}
          disabled={disabled || isPlacingTestOrder}
          className="w-full min-h-[52px] rounded-lg bg-[#1A1816] px-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white transition-opacity disabled:opacity-50"
        >
          {isPlacingTestOrder ? 'PLACING TEST ORDER…' : 'PLACE ORDER'}
        </button>

        <button
          type="button"
          onClick={() => setReviewPaymentData(null)}
          disabled={disabled || isPlacingTestOrder}
          className="w-full py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[#5F6368] underline underline-offset-4 disabled:opacity-50"
        >
          Change Google Pay details
        </button>

        {error && <p className="text-[11px] text-rose-700">{error}</p>}
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