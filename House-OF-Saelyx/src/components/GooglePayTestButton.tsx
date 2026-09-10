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

  const reportError = useCallback((message: string) => {
    setError(message);
    onError?.(message);
  }, [onError]);

  const openGooglePay = useCallback(async () => {
    if (disabled || !paymentsClientRef.current) return;
    if (!onBeforePay()) return;

    try {
      setError('');
      await paymentsClientRef.current.loadPaymentData({
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
          totalPriceLabel: 'SAELYXE Order Total'
        }
      });

      // TEST environment only: no card can be charged and no order is persisted.
      onAuthorized();
    } catch (err: any) {
      if (String(err?.statusCode || '').toUpperCase() === 'CANCELED') return;
      reportError(err?.statusMessage || err?.message || 'Google Pay test could not be completed.');
    }
  }, [disabled, onAuthorized, onBeforePay, reportError, totalLKR]);

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
    if (!host || !client || !ready) return;

    host.replaceChildren();
    const button = client.createButton({
      onClick: openGooglePay,
      buttonColor: 'black',
      buttonType: 'pay',
      buttonSizeMode: 'fill'
    });
    button.setAttribute('aria-label', 'Pay with Google Pay in test mode');
    if (disabled) {
      button.style.pointerEvents = 'none';
      button.style.opacity = '0.55';
    }
    host.appendChild(button);

    return () => {
      host.replaceChildren();
    };
  }, [disabled, openGooglePay, ready]);

  if (loading) {
    return <div className="min-h-[52px] rounded-xl border border-[#E5DFD7] bg-[#FAF8F5] px-4 flex items-center justify-center text-[11px] text-[#74685B]">Loading Google Pay test…</div>;
  }

  if (!ready) {
    return <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[11px] text-amber-900">Google Pay is not available in this browser/account. Use a supported browser with Google Pay set up.</div>;
  }

  return (
    <div className="space-y-2" data-google-pay-merchant-id={SAELYXE_GOOGLE_PAY_MERCHANT_ID}>
      <div ref={buttonHostRef} className="min-h-[48px] w-full overflow-hidden rounded-lg" />
      {error && <p className="text-[11px] text-rose-700">{error}</p>}
      <p className="text-[10px] leading-relaxed text-[#74685B]">Google Pay TEST mode · no real charge · no SAELYXE order is created. This flow is for Google production-review screenshots only.</p>
    </div>
  );
};
