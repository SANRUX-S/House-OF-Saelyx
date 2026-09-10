import React from 'react';
import {
  ArrowLeft,
  Scale,
  UserCheck,
  CreditCard,
  ShieldCheck,
  Truck,
  ShoppingBag,
  Lock,
  AlertTriangle,
  Gavel,
  MessageSquare
} from 'lucide-react';
import { useStore } from '../context/StoreContext';

export const LegalTermsPage: React.FC = () => {
  const { navigateTo } = useStore();

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1816] pt-24 pb-24 px-5 sm:px-8">
      <div className="max-w-4xl mx-auto space-y-12">
        <button
          type="button"
          onClick={() => navigateTo({ name: 'home' })}
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#665A4E] hover:text-[#1A1816] transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Return to Boutique</span>
        </button>

        <div className="space-y-4 border-b border-[#E3D9CD] pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFE9E0] border border-[#DCD0C0] text-[11px] font-semibold uppercase tracking-[0.25em] text-[#665A4E]">
            <Scale className="w-3.5 h-3.5 text-[#857768]" />
            SAELYXE • TERMS OF SERVICE & CONDITIONS
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl text-[#1A1816] font-normal tracking-tight leading-tight">SAELYXE Terms & Conditions</h1>
          <p className="text-xs text-[#665A4E] uppercase tracking-widest">Last Updated: September 10, 2026</p>
          <p className="text-sm text-[#665A4E] max-w-3xl leading-relaxed">
            These Terms & Conditions govern use of the SAELYXE website, customer accounts, purchases, payments, delivery, returns, and related services.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#F3EDE4] border border-[#E2D8C9] p-4 rounded-xl space-y-1.5">
            <div className="w-8 h-8 rounded-full bg-[#E4D9C9] flex items-center justify-center"><UserCheck className="w-4 h-4" /></div>
            <h4 className="font-serif text-sm font-semibold">18+ Only</h4>
            <p className="text-[12px] text-[#665A4E]">Customers must be 18 years of age or older.</p>
          </div>
          <div className="bg-[#F3EDE4] border border-[#E2D8C9] p-4 rounded-xl space-y-1.5">
            <div className="w-8 h-8 rounded-full bg-[#E4D9C9] flex items-center justify-center"><Lock className="w-4 h-4" /></div>
            <h4 className="font-serif text-sm font-semibold">Guest Checkout</h4>
            <p className="text-[12px] text-[#665A4E]">Checkout is available to guests and signed-in SAELYXE customers.</p>
          </div>
          <div className="bg-[#F3EDE4] border border-[#E2D8C9] p-4 rounded-xl space-y-1.5">
            <div className="w-8 h-8 rounded-full bg-[#E4D9C9] flex items-center justify-center"><CreditCard className="w-4 h-4" /></div>
            <h4 className="font-serif text-sm font-semibold">Online Payments</h4>
            <p className="text-[12px] text-[#665A4E]">PayPal, Payzy, and Cash on Delivery are supported where available.</p>
          </div>
          <div className="bg-[#F3EDE4] border border-[#E2D8C9] p-4 rounded-xl space-y-1.5">
            <div className="w-8 h-8 rounded-full bg-[#E4D9C9] flex items-center justify-center"><Gavel className="w-4 h-4" /></div>
            <h4 className="font-serif text-sm font-semibold">Sri Lankan Law</h4>
            <p className="text-[12px] text-[#665A4E]">Applicable Sri Lankan law and consumer protections apply.</p>
          </div>
        </div>

        <div className="space-y-8 text-sm text-[#3A332C] leading-relaxed">
          <section className="bg-white border border-[#E6DCCF] p-6 sm:p-8 rounded-2xl shadow-sm space-y-6">
            <div className="space-y-3">
              <h3 className="font-serif text-lg font-semibold flex items-center gap-2"><UserCheck className="w-4 h-4" />Eligibility & Account</h3>
              <p>
                SAELYXE is intended for customers aged 18 or older. Guests may checkout without an account. Email/password account access requires email verification. You must provide accurate account and delivery information, keep credentials secure, and not impersonate another person or use false details.
              </p>
            </div>
            <div className="space-y-3 border-t border-[#F0E8DD] pt-6">
              <h3 className="font-serif text-lg font-semibold flex items-center gap-2"><ShieldCheck className="w-4 h-4" />Website Use</h3>
              <p>
                The website may only be used for lawful shopping and account activity. Fraud, malicious code, automated abuse, unauthorised access attempts, scraping intended to disrupt service, or misuse of promotions is prohibited.
              </p>
            </div>
          </section>

          <section className="bg-white border border-[#E6DCCF] p-6 sm:p-8 rounded-2xl shadow-sm space-y-6">
            <div className="space-y-3">
              <h3 className="font-serif text-lg font-semibold flex items-center gap-2"><ShoppingBag className="w-4 h-4" />Products, Stock & Pre-Orders</h3>
              <p>
                Product images, descriptions, colours, measurements, and availability are presented as accurately as reasonably possible. Stock is subject to change. Pre-order dispatch estimates may move because of production or logistics factors. If a system error accepts an unavailable item, SAELYXE may cancel and refund the affected order.
              </p>
            </div>
            <div className="space-y-3 border-t border-[#F0E8DD] pt-6">
              <h3 className="font-serif text-lg font-semibold flex items-center gap-2"><AlertTriangle className="w-4 h-4" />Pricing & Promotions</h3>
              <p>
                Prices may change before an order is completed. Obvious pricing or system errors may be corrected before acceptance. Promotions, vouchers, and discount codes can have eligibility, expiry, and usage limits and cannot be exchanged for cash.
              </p>
            </div>
          </section>

          <section className="bg-white border border-[#E6DCCF] p-6 sm:p-8 rounded-2xl shadow-sm space-y-6">
            <div className="space-y-3">
              <h3 className="font-serif text-lg font-semibold flex items-center gap-2"><CreditCard className="w-4 h-4" />Payments & Order Acceptance</h3>
              <p>
                SAELYXE currently accepts PayPal and Payzy where those services are available, plus Cash on Delivery for eligible Sri Lankan deliveries. PayPal and Payzy orders are confirmed only after the applicable payment has been successfully verified by SAELYXE server-side systems. Cash on Delivery remains unpaid until collection. A provider screen or browser redirect alone does not constitute confirmation.
              </p>
            </div>
            <div className="space-y-3 border-t border-[#F0E8DD] pt-6">
              <h3 className="font-serif text-lg font-semibold flex items-center gap-2"><Lock className="w-4 h-4" />Payment Security</h3>
              <p>
                Payment credentials are processed by the relevant payment provider. SAELYXE does not intentionally store full card credentials. Orders that cannot be verified may remain pending, be cancelled, or require support review to prevent duplicate payment.
              </p>
            </div>
          </section>

          <section className="bg-white border border-[#E6DCCF] p-6 sm:p-8 rounded-2xl shadow-sm space-y-6">
            <div className="space-y-3">
              <h3 className="font-serif text-lg font-semibold flex items-center gap-2"><Truck className="w-4 h-4" />Delivery</h3>
              <p>
                Delivery charges are shown at checkout. Courier names, tracking information, and estimated delivery times are shown only when available from the order record or delivery partner. SAELYXE does not guarantee a courier or delivery date that has not been assigned.
              </p>
            </div>
            <div className="space-y-3 border-t border-[#F0E8DD] pt-6">
              <h3 className="font-serif text-lg font-semibold flex items-center gap-2"><ShieldCheck className="w-4 h-4" />Returns & Refunds</h3>
              <p>
                Returns and refunds are governed by the SAELYXE Refund & Return Policy. Eligibility may depend on item condition, timing, exclusions, inspection, and the original payment method.
              </p>
              <button type="button" onClick={() => navigateTo({ name: 'legal-returns' })} className="text-xs font-semibold underline underline-offset-4">Read Refund & Return Policy</button>
            </div>
          </section>

          <section className="bg-white border border-[#E6DCCF] p-6 sm:p-8 rounded-2xl shadow-sm space-y-6">
            <div className="space-y-3">
              <h3 className="font-serif text-lg font-semibold flex items-center gap-2"><Gavel className="w-4 h-4" />Liability, Changes & Governing Law</h3>
              <p>
                To the extent permitted by law, SAELYXE is not responsible for indirect losses caused by third-party payment networks, couriers, internet outages, or events outside reasonable control. We may update these terms as services change. Applicable Sri Lankan law and non-excludable consumer rights remain unaffected.
              </p>
            </div>
          </section>
        </div>

        <div className="bg-[#1A1816] text-[#F7F1E8] p-6 sm:p-8 rounded-2xl flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between">
          <div>
            <h3 className="font-serif text-xl flex items-center gap-2"><MessageSquare className="w-4 h-4" />Questions about these terms?</h3>
            <p className="text-xs text-[#CFC4B6] mt-2">Use SAELYXE Contact Support for account, order, payment, or policy questions.</p>
          </div>
          <button type="button" onClick={() => navigateTo({ name: 'contact-support' })} className="rounded-full bg-white text-[#1A1816] px-5 py-2.5 text-[10px] uppercase tracking-[0.18em] font-semibold">Contact Support</button>
        </div>
      </div>
    </div>
  );
};
