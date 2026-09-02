import React from 'react';
import { ArrowLeft, RefreshCw, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export const LegalReturnsPage: React.FC = () => {
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
            HOUSE OF SAELYX • COMPLIMENTARY EXCHANGES
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#1A1816] font-normal tracking-tight">
            14-Day Bespoke Exchange & Returns Policy
          </h1>
          <p className="text-xs text-[#7A6E60]">
            White-glove doorstep exchange available across Colombo & Island-wide
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-8 text-xs sm:text-sm text-[#4A4036] leading-relaxed font-light">
          
          <div className="bg-[#EFE9E0] p-6 rounded-2xl border border-[#DDD3C4] space-y-3">
            <h3 className="font-serif text-base font-semibold text-[#1A1816] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              The SAELYX Fit Assurance
            </h3>
            <p>
              We want your silhouette to sit with absolute presence. If the fit, drape, or sizing of any garment from Drop 001 is not completely satisfactory, we will dispatch an alternative size directly to your doorstep with complimentary courier collection.
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="font-serif text-lg text-[#1A1816] font-semibold tracking-wide">
              1. Exchange Eligibility Window
            </h2>
            <p>
              Patrons have fourteen (14) calendar days from the date of recorded hand-delivery to initiate a size or style exchange. Garments must remain unworn, unwashed, and in their original bespoke dust sleeve with security tags intact.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg text-[#1A1816] font-semibold tracking-wide">
              2. Seamless Step-by-Step Return Process
            </h2>
            <ul className="space-y-2 pl-4 list-disc marker:text-[#8E8070]">
              <li><strong>Step 1:</strong> Contact our Atelier Concierge on WhatsApp or via the online form with your order reference (e.g. SLX-94821).</li>
              <li><strong>Step 2:</strong> Our sartorial advisor will reserve your replacement size immediately from remaining drop inventory.</li>
              <li><strong>Step 3:</strong> A private courier van will deliver the fresh garment to your address and retrieve the original piece in one seamless exchange visit.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg text-[#1A1816] font-semibold tracking-wide">
              3. Refunds & Store Credit
            </h2>
            <p>
              Should you prefer a refund rather than an exchange, your payment will be credited back to your original payment method or issued as non-expiring House of Saelyx Private Store Credit within 3 to 5 business days.
            </p>
          </section>
        </div>

      </div>
    </div>
  );
};
