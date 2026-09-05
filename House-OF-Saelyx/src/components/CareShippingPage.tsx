import React from 'react';
import { ArrowLeft, Truck, Clock, Shield, MapPin, Globe } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export const CareShippingPage: React.FC = () => {
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
            HOUSE OF SAELYXE • WHITE-GLOVE LOGISTICS
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#1A1816] font-normal tracking-tight">
            White-Glove Delivery & Express Dispatch
          </h1>
          <p className="text-xs text-[#7A6E60]">
            Dedicated courier vans in Colombo • Insured air express worldwide
          </p>
        </div>

        {/* Dispatch Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#EFE9E0] p-6 rounded-2xl border border-[#DDD3C4] space-y-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-[#1A1816]">
              <Truck className="w-4 h-4 text-emerald-700" />
              <span>Colombo Metropolitan</span>
            </div>
            <div className="text-2xl font-serif font-bold text-[#1A1816]">Same-Day & Next-Day</div>
            <p className="text-xs text-[#574D42] leading-relaxed">
              Orders placed before 2:00 PM are delivered directly to your doorstep in signature bespoke black matte packaging with real-time web app notifications and live tracking.
            </p>
          </div>

          <div className="bg-[#EFE9E0] p-6 rounded-2xl border border-[#DDD3C4] space-y-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-[#1A1816]">
              <Globe className="w-4 h-4 text-amber-700" />
              <span>Island-wide & Worldwide</span>
            </div>
            <div className="text-2xl font-serif font-bold text-[#1A1816]">2 - 5 Business Days</div>
            <p className="text-xs text-[#574D42] leading-relaxed">
              Express priority courier dispatch across Kandy, Galle, Jaffna, Negombo, plus international express DHL shipments worldwide with zero customs friction.
            </p>
          </div>
        </div>

        {/* Detailed Shipping Info */}
        <div className="space-y-8 text-xs sm:text-sm text-[#4A4036] leading-relaxed font-light">
          <section className="space-y-3">
            <h2 className="font-serif text-lg text-[#1A1816] font-semibold tracking-wide">
              Atelier Packaging Standard
            </h2>
            <p>
              Every garment is individually inspected by our atelier master, folded between acid-free silk paper, enclosed in a reusable branded garment sleeve, and secured inside a rigid archival box.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg text-[#1A1816] font-semibold tracking-wide">
              Real-Time Hand-Delivery Tracker
            </h2>
            <p>
              Once your commission is dispatched, sign in to the SAELYXE account used at checkout and enter your private order reference in the Delivery Tracker. Tracking details are restricted to the authenticated order owner.
            </p>
            <div className="pt-2">
              <button
                onClick={() => navigateTo({ name: 'track' })}
                className="px-6 py-3 bg-[#1A1816] text-white text-xs uppercase font-semibold tracking-widest rounded-full hover:bg-black transition-all"
              >
                Track An Order Now →
              </button>
            </div>
          </section>
        </div>

      </div>
    </div>
  );
};
