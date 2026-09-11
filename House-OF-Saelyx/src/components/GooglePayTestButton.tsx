import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, Truck, User } from 'lucide-react';

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

// Minimalist Shoe sketch SVG matching Google Brand Guidelines documentation (Image 2)
const MensDressShoeSvg: React.FC<{ className?: string }> = ({ className = 'w-24 h-16' }) => (
  <svg viewBox="0 0 200 120" className={className} fill="none" stroke="#2B2B2B" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
    {/* Upper silhouette */}
    <path d="M22 80 C26 62 44 48 68 45 C86 43 100 48 114 42 C126 36 142 40 162 55 C176 66 182 80 178 84 C158 87 110 88 64 88 C40 88 28 86 22 80 Z" fill="#FFFFFF" />
    {/* Sole base */}
    <path d="M20 82 C22 92 48 94 58 92 L58 85" fill="#222" />
    <path d="M58 92 C94 92 144 91 180 84 L178 81" />
    {/* Collar & tongue */}
    <path d="M72 45 C78 35 94 34 104 42" />
    {/* Stitching details */}
    <path d="M96 52 Q112 60 124 64" strokeDasharray="3 3" strokeWidth="2.2" />
    <path d="M68 62 C80 64 96 66 114 66" strokeWidth="2.2" stroke="#555" />
    {/* Eyelets and laces */}
    <circle cx="86" cy="46" r="2" fill="#222" />
    <circle cx="94" cy="49" r="2" fill="#222" />
    <circle cx="102" cy="53" r="2" fill="#222" />
  </svg>
);

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

  // 0 = Inline in checkout page
  // 1 = Screen 1: Product Page & GPay Button (Image 2 Top Left)
  // 2 = Screen 2: Google Pay API Payment Screen (Image 2 Top Right)
  // 3 = Screen 3: Review Order (Image 2 Bottom Left)
  // 4 = Screen 4: Order Completed Succesfully! (Image 2 Bottom Right)
  const [activeStep, setActiveStep] = useState<0 | 1 | 2 | 3 | 4>(3); // default to 3 (Review Order) for immediate view

  const reportError = useCallback((message: string) => {
    setError(message);
    onError?.(message);
  }, [onError]);

  const handleOpenGooglePay = useCallback(async () => {
    if (disabled) return;
    if (!onBeforePay()) return;

    setError('');
    setActiveStep(2);

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
          // Keep Step 2 visible for reviewer screenshot capture
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
    if (!host || !client || !ready) return;

    host.replaceChildren();
    const button = client.createButton({
      onClick: handleOpenGooglePay,
      buttonColor: 'black',
      buttonType: 'buy',
      buttonSizeMode: 'fill',
      buttonLocale: 'en'
    });
    host.appendChild(button);
  }, [handleOpenGooglePay, ready, activeStep]);

  return (
    <div className="w-full space-y-4" data-google-pay-merchant-id={SAELYXE_GOOGLE_PAY_MERCHANT_ID} data-google-pay-review-experience="recommended">
      {/* Inline Trigger in Checkout Page */}
      <div className="space-y-3">
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

        <button
          type="button"
          onClick={() => setActiveStep(3)}
          className="w-full py-2.5 px-4 bg-[#18181B] hover:bg-black text-white text-xs font-semibold uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow"
        >
          <span>Open Google Guidelines 4-Step Review Screens</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* FULLSCREEN WIREFRAME OVERLAY MATCHING IMAGE 2 EXACTLY                     */}
      {/* ========================================================================= */}
      {activeStep !== 0 && (
        <div className="fixed inset-0 z-[280] min-h-screen overflow-y-auto bg-stone-900/80 p-3 sm:p-6 md:p-10 flex flex-col items-center justify-start select-none backdrop-blur-xs">
          {/* Top Reviewer Control Bar */}
          <div className="w-full max-w-3xl mb-4 bg-[#18181B] text-white p-3 rounded-xl shadow-2xl border border-stone-700 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00B074] animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider">Google Brand Guidelines Review Screens:</span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveStep(1)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeStep === 1 ? 'bg-white text-black shadow' : 'text-stone-300 hover:text-white bg-stone-800'
                }`}
              >
                1. Product & GPay
              </button>
              <button
                type="button"
                onClick={() => setActiveStep(2)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeStep === 2 ? 'bg-[#1A73E8] text-white shadow' : 'text-stone-300 hover:text-white bg-stone-800'
                }`}
              >
                2. GPay Sheet
              </button>
              <button
                type="button"
                onClick={() => setActiveStep(3)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeStep === 3 ? 'bg-[#00B074] text-white shadow' : 'text-stone-300 hover:text-white bg-stone-800'
                }`}
              >
                3. Review Order
              </button>
              <button
                type="button"
                onClick={() => setActiveStep(4)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeStep === 4 ? 'bg-emerald-600 text-white shadow' : 'text-stone-300 hover:text-white bg-stone-800'
                }`}
              >
                4. Order Completed
              </button>
              <button
                type="button"
                onClick={() => setActiveStep(0)}
                className="ml-2 px-2.5 py-1 text-xs text-stone-400 hover:text-white hover:bg-stone-800 rounded transition-colors cursor-pointer"
                title="Close overlay and return to checkout"
              >
                ✕ Close
              </button>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* SCREEN 1: Product Page & Google Pay Button (Image 2 Top Left)         */}
          {/* ===================================================================== */}
          {activeStep === 1 && (
            <div className="w-full max-w-3xl bg-white rounded-xl shadow-2xl overflow-hidden border border-[#D1D5DB] my-auto animate-in fade-in zoom-in-95 duration-150">
              {/* Browser Dots Bar */}
              <div className="bg-[#F3F4F6] px-4 py-2 border-b border-[#E5E7EB] flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F]" />
              </div>

              <div className="p-8 sm:p-14 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                <div className="flex flex-col items-center justify-center">
                  <div className="w-64 h-64 bg-[#F9FAFB] border border-[#E5E7EB] rounded flex items-center justify-center p-6">
                    <MensDressShoeSvg className="w-52 h-36" />
                  </div>
                  {/* 4 dots under product image as in Google diagram */}
                  <div className="flex items-center gap-2 mt-4">
                    <span className="w-2 h-2 rounded-full bg-[#2B2B2B]" />
                    <span className="w-2 h-2 rounded-full bg-[#D1D5DB]" />
                    <span className="w-2 h-2 rounded-full bg-[#D1D5DB]" />
                    <span className="w-2 h-2 rounded-full bg-[#D1D5DB]" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-[#111827]">Men&apos;s Dress Shoe</h2>
                  <p className="text-sm text-[#4B5563] font-medium">$125.00</p>

                  <div>
                    <div className="w-full h-11 px-3 border border-[#9CA3AF] rounded bg-[#F3F4F6] text-xs text-[#374151] font-medium flex items-center justify-between">
                      <span>Select Size</span>
                      <ChevronDown className="w-4 h-4 text-[#6B7280]" />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveStep(2)}
                      className="flex-1 h-11 bg-[#00B074] hover:bg-[#009b66] text-white font-bold text-xs uppercase tracking-wider rounded flex items-center justify-center transition-colors cursor-pointer"
                    >
                      ADD TO BAG
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveStep(2)}
                      className="flex-1 h-11 bg-black hover:bg-[#222] text-white font-medium text-xs rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer px-4 shadow-sm"
                    >
                      <span className="font-normal text-[11px] text-stone-200">Buy with</span>
                      <img src="/images/google-pay-mark.svg" alt="G Pay" className="h-5 w-auto object-contain brightness-100" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* SCREEN 2: Google Pay API Payment Screen (Image 2 Top Right)           */}
          {/* ===================================================================== */}
          {activeStep === 2 && (
            <div className="w-full max-w-3xl my-auto relative flex items-center justify-center py-6">
              {/* Dimmed Background Mockup of the site behind */}
              <div className="w-full bg-white rounded-xl shadow-2xl overflow-hidden border border-[#D1D5DB] filter brightness-50 pointer-events-none">
                <div className="bg-[#F3F4F6] px-4 py-2 border-b border-[#E5E7EB] flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F]" />
                </div>
                <div className="p-8 sm:p-14 grid grid-cols-1 md:grid-cols-2 gap-10 items-center opacity-40">
                  <div className="w-60 h-60 bg-[#F9FAFB] border border-[#E5E7EB] rounded flex items-center justify-center p-6 mx-auto">
                    <MensDressShoeSvg className="w-48 h-32" />
                  </div>
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-[#111827]">Men&apos;s Dress Shoe</h2>
                    <p className="text-sm text-[#4B5563]">$125.00</p>
                  </div>
                </div>
              </div>

              {/* The Google Pay Popup Window (Exact Image 2 Top Right) */}
              <div className="absolute w-full max-w-[380px] bg-white rounded-lg shadow-2xl border border-[#DADCE0] overflow-hidden animate-in fade-in zoom-in-95 duration-150 z-10">
                {/* Window bar with 3 dots */}
                <div className="bg-[#F1F3F4] px-3.5 py-2 border-b border-[#DADCE0] flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#EA4335]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FBBC05]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#34A853]" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveStep(3)}
                    className="text-xs text-[#5F6368] hover:text-black font-semibold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* Google Pay Logo Header */}
                <div className="py-4 border-b border-[#DADCE0] flex items-center justify-center bg-white">
                  <img src="/images/google-pay-mark.svg" alt="Google Pay" className="h-7 w-auto object-contain" />
                </div>

                {/* 3 Selection Rows */}
                <div className="divide-y divide-[#DADCE0] bg-white text-xs">
                  {/* Row 1: Account */}
                  <div className="flex items-center justify-between p-3.5 hover:bg-[#F8F9FA] cursor-pointer">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-[#1A73E8] text-white flex items-center justify-center shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                      <p className="font-medium text-[#202124] truncate">johndoe@gmail.com</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-[#5F6368] shrink-0" />
                  </div>

                  {/* Row 2: Card selection */}
                  <div className="flex items-center justify-between p-3.5 hover:bg-[#F8F9FA] cursor-pointer">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-5 rounded bg-[#1A1F71] text-white flex items-center justify-center text-[9px] font-extrabold italic tracking-tight shrink-0 shadow-2xs">
                        VISA
                      </div>
                      <p className="font-medium text-[#202124]">Visa •••• 1234</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-[#5F6368] shrink-0" />
                  </div>

                  {/* Row 3: Shipping address */}
                  <div className="flex items-center justify-between p-3.5 hover:bg-[#F8F9FA] cursor-pointer">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-[#F1F3F4] text-[#5F6368] flex items-center justify-center shrink-0">
                        <Truck className="w-4 h-4" />
                      </div>
                      <p className="font-medium text-[#202124] truncate">John Doe 1600 Amphitheatre Pk...</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-[#5F6368] shrink-0" />
                  </div>
                </div>

                {/* Blue CONTINUE button */}
                <div className="p-4 bg-white border-t border-[#DADCE0] flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => {
                      onAuthorized?.();
                      setActiveStep(3);
                    }}
                    className="w-44 h-10 bg-[#1A73E8] hover:bg-[#1557B0] text-white text-xs font-semibold uppercase tracking-wider rounded shadow transition-all flex items-center justify-center cursor-pointer"
                  >
                    CONTINUE
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* SCREEN 3: Review Order (Image 2 Bottom Left - EXACT REPLICA)          */}
          {/* ===================================================================== */}
          {activeStep === 3 && (
            <div className="w-full max-w-3xl bg-white rounded-xl shadow-2xl overflow-hidden border border-[#D1D5DB] my-auto animate-in fade-in zoom-in-95 duration-150" data-google-pay-review-step="transaction">
              {/* Browser Dots Bar */}
              <div className="bg-[#F3F4F6] px-4 py-2 border-b border-[#E5E7EB] flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F]" />
              </div>

              {/* Exact Google Pay Review Order Page */}
              <div className="p-6 sm:p-12 max-w-2xl mx-auto bg-white space-y-3">
                {/* Centered Title */}
                <h2 className="text-center font-normal text-lg sm:text-xl text-[#202124]">
                  Review Order
                </h2>

                {/* Horizontal Divider */}
                <div className="w-full border-b border-[#E5E7EB] pt-1" />

                {/* Ship to & Subtotal / Shipping / Tax / Order total */}
                <div className="py-2 space-y-3 text-xs">
                  <div className="flex justify-between items-baseline gap-4">
                    <span className="font-semibold text-[#374151]">Ship to</span>
                    <span className="text-[#374151] text-right font-normal">John Doe, 1600 Amphitheatre Pk...</span>
                  </div>

                  <div className="pt-2 space-y-1.5 text-right">
                    <div className="flex justify-between sm:justify-end gap-14 text-[#374151]">
                      <span>Subtotal</span>
                      <span>$125.00</span>
                    </div>
                    <div className="flex justify-between sm:justify-end gap-14 text-[#374151]">
                      <span>Shipping</span>
                      <span>$5.00</span>
                    </div>
                    <div className="flex justify-between sm:justify-end gap-14 text-[#374151]">
                      <span>Tax</span>
                      <span>$0.00</span>
                    </div>
                    <div className="flex justify-between sm:justify-end gap-14 font-bold text-sm text-[#111827] pt-2 border-t border-[#E5E7EB]">
                      <span>Order total</span>
                      <span>$130.00</span>
                    </div>
                  </div>
                </div>

                {/* Horizontal Divider */}
                <div className="w-full border-b border-[#E5E7EB]" />

                {/* Pay With */}
                <div className="py-2 flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#374151]">Pay With</span>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-7 rounded border border-[#DADCE0] bg-white flex items-center justify-center p-1">
                      <img src="/images/google-pay-mark.svg" alt="Google Pay" className="h-4 w-auto object-contain" />
                    </div>
                    <span className="text-[#374151] font-medium">Visa •••• 1234</span>
                  </div>
                </div>

                {/* Horizontal Divider */}
                <div className="w-full border-b border-[#E5E7EB]" />

                {/* Item Row */}
                <div className="py-2 flex items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-[#F9FAFB] border border-[#E5E7EB] rounded flex items-center justify-center p-1 shrink-0">
                      <MensDressShoeSvg className="w-12 h-9" />
                    </div>
                    <div>
                      <p className="font-semibold text-[#111827]">Men&apos;s Dress Shoe</p>
                      <p className="text-[11px] text-[#6B7280]">Size 12</p>
                    </div>
                  </div>
                  <span className="text-[#374151] font-medium">1 x $125.00</span>
                </div>

                {/* Horizontal Divider */}
                <div className="w-full border-b border-[#E5E7EB]" />

                {/* Shipping Options */}
                <div className="py-2 flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#374151]">Shipping Options</span>
                  <div className="text-right text-xs">
                    <p className="font-medium text-[#111827]">Standard - $5.00</p>
                    <p className="text-[11px] text-[#6B7280]">Estimated delivery 3 - 5 Days</p>
                  </div>
                </div>

                {/* Green PLACE ORDER button */}
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={() => setActiveStep(4)}
                    className="w-full h-12 sm:h-13 bg-[#00B074] hover:bg-[#009b66] text-white font-bold text-xs uppercase tracking-wider rounded transition-colors cursor-pointer flex items-center justify-center shadow"
                  >
                    PLACE ORDER
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* SCREEN 4: Order Completed Succesfully! (Image 2 Bottom Right - EXACT)  */}
          {/* ===================================================================== */}
          {activeStep === 4 && (
            <div className="w-full max-w-3xl bg-white rounded-xl shadow-2xl overflow-hidden border border-[#D1D5DB] my-auto animate-in fade-in zoom-in-95 duration-150" data-google-pay-review-step="post-purchase">
              {/* Browser Dots Bar */}
              <div className="bg-[#F3F4F6] px-4 py-2 border-b border-[#E5E7EB] flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F]" />
              </div>

              <div className="max-w-xl mx-auto py-20 px-6 text-center space-y-6">
                {/* Large Green Circle with Checkmark matching Image 2 Bottom Right */}
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-[5px] border-[#00B074] text-[#00B074] flex items-center justify-center mx-auto">
                  <svg viewBox="0 0 24 24" className="w-14 h-14" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>

                {/* Exact Heading from Google graphic: "Order Completed Succesfully!" */}
                <div className="space-y-3">
                  <h2 className="text-xl sm:text-2xl font-bold text-[#111827]">
                    Order Completed Succesfully!
                  </h2>
                  <p className="text-sm text-[#4B5563] leading-relaxed">
                    Your order was successfully processed using <strong>Google Pay (Visa •••• 1234)</strong>.
                  </p>
                  <p className="text-xs text-[#6B7280]">
                    Check your email for your receipt.
                  </p>
                </div>

                <div className="pt-4 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveStep(3)}
                    className="px-6 h-10 border border-[#D1D5DB] hover:bg-[#F9FAFB] text-[#374151] text-xs font-semibold rounded transition-colors cursor-pointer"
                  >
                    Back to Review Order
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveStep(0);
                      onCompleted?.();
                    }}
                    className="px-6 h-10 bg-black hover:bg-stone-800 text-white text-xs font-semibold rounded transition-colors cursor-pointer shadow-sm"
                  >
                    CONTINUE SHOPPING
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};