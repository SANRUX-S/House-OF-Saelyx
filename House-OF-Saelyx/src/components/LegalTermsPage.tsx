import React from 'react';
import { ShieldCheck, ArrowLeft, Scale, Lock, FileText } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export const LegalTermsPage: React.FC = () => {
  const { navigateTo } = useStore();

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1816] pt-24 pb-20 px-5 sm:px-8">
      <div className="max-w-3xl mx-auto space-y-10">
        
        {/* Back Button */}
        <button
          onClick={() => navigateTo({ name: 'home' })}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[#7A6E60] hover:text-black transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Boutique</span>
        </button>

        {/* Title */}
        <div className="space-y-2 border-b border-[#E3D9CD] pb-6">
          <span className="text-[11px] uppercase tracking-[0.25em] text-[#857768] font-semibold">
            HOUSE OF SAELYX • LEGAL JURISDICTION
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#1A1816] font-normal tracking-tight">
            Terms of Service & Atelier Conditions
          </h1>
          <p className="text-xs text-[#7A6E60]">
            Effective Date: January 1, 2026 • Registered Private Haute Couture Entity
          </p>
        </div>

        {/* Legal Sections */}
        <div className="space-y-8 text-xs sm:text-sm text-[#4A4036] leading-relaxed font-light">
          <section className="space-y-3">
            <h2 className="font-serif text-lg text-[#1A1816] font-semibold tracking-wide">
              1. Exclusive Drop Acquisition & Fair Allocation
            </h2>
            <p>
              All garments produced by SAELYX are limited-run pieces crafted with bespoke fabrics. Placing an order constitutes a binding commission request. Due to the limited nature of our drops, we reserve the right to limit order quantities to three (3) pieces per silhouette per client account.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg text-[#1A1816] font-semibold tracking-wide">
              2. White-Glove Hand-Delivery & Acceptance
            </h2>
            <p>
              Colombo Metropolitan commissions are dispatched with dedicated White-Glove courier couriers. Signature and visual verification of garment seal integrity are required upon delivery. International consignments are insured and tracked via direct DHL Express luxury lanes.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg text-[#1A1816] font-semibold tracking-wide">
              3. Intellectual Property & Silhouette Copyright
            </h2>
            <p>
              All patterns, garment silhouettes, typography, photographs, and editorial materials published on this boutique are the exclusive intellectual property of SAELYX Atelier. Unauthorized reproduction, resale arbitrage, or design duplication is strictly prohibited.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg text-[#1A1816] font-semibold tracking-wide">
              4. Currency Conversion & Local Duties
            </h2>
            <p>
              All primary transactions are anchored in Sri Lankan Rupees (LKR). Displayed foreign currency prices (USD, GBP, EUR, AED, AUD, JPY) are synchronized against certified mid-market rates for patron convenience. International customs tariffs, where applicable, are settled through DDP (Delivered Duty Paid) protocols.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg text-[#1A1816] font-semibold tracking-wide">
              5. Governing Jurisdiction
            </h2>
            <p>
              These Atelier conditions shall be governed by and construed in accordance with the commercial laws of the Republic of Sri Lanka and international arbitration standards in London.
            </p>
          </section>
        </div>

        {/* Footer Contact Note */}
        <div className="bg-[#EFE9E0] p-6 rounded-2xl border border-[#DDD3C4] flex items-center justify-between">
          <div className="space-y-1">
            <h4 className="font-serif text-sm font-semibold text-[#1A1816]">Legal & Compliance Inquiries</h4>
            <p className="text-xs text-[#7A6E60]">Direct inquiries to our legal council at legal@houseofsaelyx.com</p>
          </div>
          <button
            onClick={() => navigateTo({ name: 'care-concierge' })}
            className="px-4 py-2 bg-[#1A1816] text-white text-xs font-semibold uppercase tracking-wider rounded-full hover:bg-black"
          >
            Contact Concierge
          </button>
        </div>

      </div>
    </div>
  );
};
