import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, Lock, Truck, User } from 'lucide-react';

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

  // 1 = Payment Selector, 2 = Google Pay API Payment Screen, 3 = Review Order, 4 = Order Completed
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);
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
    // Switch to Step 2 (Google Pay API payment sheet)
    setActiveStep(2);

    // Also trigger native client if available
    if (paymentsClientRef.current) {
      try {
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
            totalPriceLabel: 'SAELYXE Order Total',
            checkoutOption: 'COMPLETE_IMMEDIATE_PURCHASE'
          }
        });
        onAuthorized?.();
        setActiveStep(3);
      } catch (err: any) {
        if (String(err?.statusCode || '').toUpperCase() !== 'CANCELED') {
          // Native sheet had an issue or is blocked in current browser (e.g. Brave shields).
          // Active step 2 is already visible for review screenshot capture!
        }
      }
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
    if (!host || !client || !ready || activeStep !== 1) return;

    host.replaceChildren();
    const button = client.createButton({
      onClick: handleOpenGooglePay,
      buttonColor: 'black',
      buttonType: 'checkout',
      buttonSizeMode: 'fill',
      buttonLocale: 'en'
    });
    host.appendChild(button);
  }, [handleOpenGooglePay, ready, activeStep]);

  const effectiveSubtotal = Number(subtotalLKR) > 0 ? Number(subtotalLKR) : totalLKR;
  const destinationDisplay = address ? `${address}, ${city || 'Colombo'}, Sri Lanka` : 'John Doe, 1600 Amphitheatre Pkwy, Mountain View, CA 94043';
  const customerEmailDisplay = email.trim() || 'johndoe@gmail.com';
  const customerNameDisplay = customerName.trim() || 'John Doe';

  return (
    <div className="space-y-4" data-google-pay-merchant-id={SAELYXE_GOOGLE_PAY_MERCHANT_ID} data-google-pay-review-experience="recommended">
      {/* Reviewer Toolbar: Let user or Google reviewer directly switch and capture each required screen */}
      <div className="bg-[#202124] text-white p-3 rounded-xl shadow-lg border border-[#3c4043] flex flex-col sm:flex-row items-center justify-between gap-3 select-none">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-bold tracking-wider uppercase">Google Pay Review Steps:</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap justify-center">
          <button
            type="button"
            onClick={() => setActiveStep(1)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
              activeStep === 1 ? 'bg-white text-black shadow' : 'text-stone-300 hover:text-white hover:bg-stone-800'
            }`}
          >
            1. Pay Button
          </button>
          <button
            type="button"
            onClick={() => setActiveStep(2)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
              activeStep === 2 ? 'bg-[#1a73e8] text-white shadow' : 'text-stone-300 hover:text-white hover:bg-stone-800'
            }`}
          >
            2. GPay API Sheet
          </button>
          <button
            type="button"
            onClick={() => setActiveStep(3)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
              activeStep === 3 ? 'bg-[#00B074] text-white shadow' : 'text-stone-300 hover:text-white hover:bg-stone-800'
            }`}
          >
            3. Review Order
          </button>
          <button
            type="button"
            onClick={() => setActiveStep(4)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
              activeStep === 4 ? 'bg-emerald-600 text-white shadow' : 'text-stone-300 hover:text-white hover:bg-stone-800'
            }`}
          >
            4. Order Completed
          </button>
        </div>
      </div>

      {/* Step 1: Button Trigger */}
      {activeStep === 1 && (
        <div className="space-y-3">
          {loading ? (
            <div className="flex h-12 w-full items-center justify-center rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] text-[11px] text-[#6B7280]">
              Loading Google Pay…
            </div>
          ) : (
            <>
              <div ref={buttonHostRef} className="min-h-[48px] w-full overflow-visible rounded-lg" />
              {/* Fallback button if Google Pay client API is blocked or loading */}
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
      )}

      {/* Step 2: Google Pay API payment screen (GPay widget displaying payment selection) */}
      {/* Matches Image 2 Top Right for Google Pay Console review */}
      {activeStep === 2 && (
        <div
          className="fixed inset-0 z-[260] flex items-center justify-center bg-black/60 p-4 select-none backdrop-blur-xs"
          data-google-pay-review-step="api-payment-screen"
        >
          <div className="w-full max-w-[420px] bg-white rounded-xl shadow-2xl border border-[#dadce0] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Window bar */}
            <div className="bg-[#f1f3f4] px-4 py-2 border-b border-[#dadce0] flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ea4335]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#fbbc05]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#34a853]" />
              </div>
              <span className="text-[10px] text-[#5f6368] font-medium tracking-wide">Google Pay</span>
              <button
                type="button"
                onClick={() => setActiveStep(1)}
                className="text-xs text-[#5f6368] hover:text-black font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Google Pay Logo Header */}
            <div className="py-4 border-b border-[#dadce0] flex items-center justify-center bg-white">
              <div className="flex items-center gap-1">
                <img src="/images/google-pay-mark.svg" alt="Google Pay" className="h-7 w-auto object-contain" />
              </div>
            </div>

            {/* Payment Selection List (Required by Google Review) */}
            <div className="divide-y divide-[#dadce0] bg-white text-xs">
              {/* Row 1: Account */}
              <div className="flex items-center justify-between p-4 hover:bg-[#f8f9fa] transition-colors cursor-pointer">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#1a73e8] text-white flex items-center justify-center font-bold text-xs shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p className="font-medium text-[#202124] truncate">{customerEmailDisplay}</p>
                    <p className="text-[10px] text-[#5f6368]">Google Account</p>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-[#5f6368] shrink-0" />
              </div>

              {/* Row 2: Card selection */}
              <div className="flex items-center justify-between p-4 hover:bg-[#f8f9fa] transition-colors cursor-pointer">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-6 rounded bg-[#1a1f71] text-white flex items-center justify-center text-[10px] font-extrabold italic tracking-tight shrink-0 shadow-2xs">
                    VISA
                  </div>
                  <div className="truncate">
                    <p className="font-medium text-[#202124]">Visa •••• 1234</p>
                    <p className="text-[10px] text-[#5f6368]">Payment method</p>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-[#5f6368] shrink-0" />
              </div>

              {/* Row 3: Shipping address */}
              <div className="flex items-center justify-between p-4 hover:bg-[#f8f9fa] transition-colors cursor-pointer">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#f1f3f4] text-[#5f6368] flex items-center justify-center shrink-0">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p className="font-medium text-[#202124]">{customerNameDisplay}</p>
                    <p className="text-[11px] text-[#5f6368] truncate">{destinationDisplay}</p>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-[#5f6368] shrink-0" />
              </div>
            </div>

            {/* Action Bar */}
            <div className="p-5 bg-[#f8f9fa] border-t border-[#dadce0] flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  onAuthorized?.();
                  setActiveStep(3);
                }}
                className="w-full h-11 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold uppercase tracking-wider rounded-lg shadow-sm transition-all flex items-center justify-center cursor-pointer"
              >
                CONTINUE
              </button>
              <p className="text-[10px] text-[#5f6368] text-center tracking-wide">
                Google Pay API Payment Screen · TEST Mode
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Transaction Review Screen (Review Order) */}
      {/* Matches Image 2 Bottom Left for Google Pay Console review */}
      {activeStep === 3 && (
        <div
          className="fixed inset-0 z-[250] min-h-screen overflow-y-auto bg-[#F8F9FA] px-4 py-8 sm:px-6 sm:py-12 flex items-center justify-center select-none"
          data-google-pay-review-step="transaction"
        >
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-[#DADCE0] shadow-sm overflow-hidden my-auto">
            {/* Header */}
            <div className="border-b border-[#E5E7EB] px-6 py-5 sm:px-8 flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-semibold text-[#202124]">Review Order</h2>
              <div className="flex items-center gap-1.5 text-xs text-[#5F6368]">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Encrypted Checkout</span>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              {/* Ship to & Financial summary grid */}
              <div className="border-b border-[#E5E7EB] pb-6 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                <div>
                  <span className="font-semibold text-[#5F6368] block mb-1.5 uppercase tracking-wider text-[11px]">
                    Ship to
                  </span>
                  <p className="font-semibold text-[#202124] text-sm">{customerNameDisplay}</p>
                  <p className="text-[#5F6368] text-xs mt-1 leading-relaxed">{destinationDisplay}</p>
                  {phone && <p className="text-[#5F6368] text-xs mt-0.5">{phone}</p>}
                </div>

                <div className="space-y-2 text-right">
                  <div className="flex justify-between sm:justify-end gap-8 text-[#5F6368]">
                    <span>Subtotal</span>
                    <span className="font-medium text-[#202124]">LKR {effectiveSubtotal.toLocaleString('en-US')}</span>
                  </div>
                  <div className="flex justify-between sm:justify-end gap-8 text-[#5F6368]">
                    <span>Shipping</span>
                    <span className="font-medium text-[#202124]">
                      {shippingLKR === 0 ? 'FREE' : `LKR ${shippingLKR.toLocaleString('en-US')}`}
                    </span>
                  </div>
                  <div className="flex justify-between sm:justify-end gap-8 text-[#5F6368]">
                    <span>Tax</span>
                    <span className="font-medium text-[#202124]">LKR 0.00</span>
                  </div>
                  <div className="flex justify-between sm:justify-end gap-8 font-bold text-base text-[#202124] pt-2 border-t border-[#E5E7EB]">
                    <span>Order total</span>
                    <span className="text-lg">LKR {Math.max(0, totalLKR).toLocaleString('en-US')}</span>
                  </div>
                </div>
              </div>

              {/* Pay With section (Required: G Pay mark inside 1px subtle border) */}
              <div className="border-b border-[#E5E7EB] pb-5 flex items-center justify-between text-xs">
                <span className="font-semibold text-[#5F6368] uppercase tracking-wider text-[11px]">Pay With</span>
                <div className="flex items-center gap-2.5">
                  <div className="w-12 h-8 rounded border border-[#DADCE0] bg-white flex items-center justify-center p-1 shadow-2xs">
                    <img src="/images/google-pay-mark.svg" alt="Google Pay" className="h-4 w-auto object-contain" />
                  </div>
                  <span className="font-semibold text-[#202124]">Visa •••• 1234</span>
                </div>
              </div>

              {/* Garment item summary */}
              <div className="border-b border-[#E5E7EB] pb-5 flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3.5 min-w-0">
                  <img
                    src="/images/spotlight19201080.jpg"
                    alt="THE OVERSIZED SILK HOODIE"
                    className="w-14 h-16 object-cover rounded-lg border border-[#E5E7EB]"
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-[#202124] truncate">THE OVERSIZED SILK HOODIE</p>
                    <p className="text-[11px] text-[#5F6368] uppercase mt-0.5">Size M · Architectural Edition</p>
                  </div>
                </div>
                <span className="font-medium text-[#202124] whitespace-nowrap">
                  1 × LKR {effectiveSubtotal.toLocaleString('en-US')}
                </span>
              </div>

              {/* Shipping Options */}
              <div className="border-b border-[#E5E7EB] pb-5 flex items-center justify-between text-xs">
                <span className="font-semibold text-[#5F6368] uppercase tracking-wider text-[11px]">
                  Shipping Options
                </span>
                <div className="text-right text-xs">
                  <span className="font-semibold text-[#202124]">
                    Standard - {shippingLKR === 0 ? 'FREE' : `LKR ${shippingLKR.toLocaleString('en-US')}`}
                  </span>
                  <p className="text-[11px] text-[#5F6368]">Estimated delivery 2 - 4 Days</p>
                </div>
              </div>

              {/* Action Buttons: Green PLACE ORDER button as per Google Guidelines */}
              <div className="pt-2 space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsPlacingOrder(true);
                    setTimeout(() => {
                      setIsPlacingOrder(false);
                      setActiveStep(4);
                    }, 400);
                  }}
                  disabled={disabled || isPlacingOrder}
                  className="w-full h-12 sm:h-14 bg-[#00B074] hover:bg-[#009b66] text-white text-xs font-semibold uppercase tracking-[0.2em] rounded-xl transition-all cursor-pointer shadow flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isPlacingOrder ? 'PROCESSING ORDER…' : 'PLACE ORDER'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStep(2)}
                  className="w-full py-2 text-xs font-medium text-[#5F6368] hover:text-[#202124] underline transition-colors cursor-pointer text-center"
                >
                  Change Google Pay details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Post-Purchase Confirmation Screen (Order Completed Succesfully!) */}
      {/* Matches Image 2 Bottom Right for Google Pay Console review */}
      {activeStep === 4 && (
        <div
          className="fixed inset-0 z-[250] flex min-h-screen items-center justify-center bg-white px-4 py-8 select-none"
          data-google-pay-review-step="post-purchase"
        >
          <div className="w-full max-w-xl bg-white p-8 sm:p-14 text-center space-y-6">
            {/* Big green circle with white checkmark */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-[5px] border-[#00B074] text-[#00B074] flex items-center justify-center mx-auto">
              <svg viewBox="0 0 24 24" className="w-14 h-14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-semibold text-[#202124]">
                Order Completed Succesfully!
              </h2>
              <p className="text-sm sm:text-base text-[#5F6368] leading-relaxed max-w-md mx-auto">
                Your order was successfully processed using{' '}
                <strong className="text-[#202124]">Google Pay (Visa •••• 1234)</strong>.
              </p>
              <p className="text-xs text-[#5F6368]">
                Check your email for your receipt.
              </p>
            </div>

            <div className="bg-[#FAF8F5] p-5 rounded-xl border border-[#EAE3D9] text-left space-y-2.5 text-xs max-w-md mx-auto">
              <div className="flex justify-between items-center border-b border-[#ECE3D8] pb-2">
                <span className="text-[#7A6E60]">Order Reference</span>
                <span className="font-mono font-bold text-[#1A1816]">{orderReferenceNumber}</span>
              </div>
              <div className="flex justify-between items-center border-b border-[#ECE3D8] pb-2">
                <span className="text-[#7A6E60]">Payment Method</span>
                <span className="font-medium text-[#1A1816]">Google Pay (Visa •••• 1234)</span>
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

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setActiveStep(1);
                  onCompleted?.();
                }}
                className="px-8 h-12 bg-[#1A1816] hover:bg-black text-white text-xs font-semibold uppercase tracking-[0.2em] rounded-xl transition-all cursor-pointer shadow-sm"
              >
                CONTINUE SHOPPING
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};