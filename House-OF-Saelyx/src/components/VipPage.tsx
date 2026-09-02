import React from 'react';
import { Sparkles, ArrowLeft, Crown } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export const VipPage: React.FC = () => {
  const { navigateTo } = useStore();

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1816] pt-28 sm:pt-36 pb-32 px-5 sm:px-8">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        
        {/* Breadcrumb */}
        <div className="flex justify-center mb-6">
          <button
            onClick={() => navigateTo({ name: 'home' })}
            className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] font-medium text-[#7A6E60] hover:text-[#1A1816] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 stroke-[1.5]" />
            <span>Return to Boutique</span>
          </button>
        </div>

        {/* Minimal Luxury Icon */}
        <div className="w-20 h-20 rounded-full bg-[#1A1816] text-amber-200 border border-[#2E2A25] flex items-center justify-center mx-auto shadow-xl">
          <Crown className="w-8 h-8 stroke-[1.25]" />
        </div>

        {/* Headline */}
        <div className="space-y-3">
          <span className="text-[11px] uppercase tracking-[0.3em] font-semibold text-[#8C7A68] block">
            HOUSE OF SAELYX ATELIER
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl text-[#1A1816] font-normal tracking-tight">
            VIP ELIGIBLE
          </h1>
          <div className="inline-block px-4 py-1.5 rounded-full bg-[#EAE3D9] text-[#4A4036] text-[10px] uppercase tracking-[0.25em] font-semibold">
            COMING SOON
          </div>
        </div>

        {/* Editorial Text */}
        <p className="text-xs sm:text-sm text-[#7A6E60] leading-relaxed max-w-lg mx-auto font-serif italic">
          "The House of Saelyx Private Client Tier is reserved for distinguished patrons. Our bespoke salon and early runway access are currently in preparation."
        </p>

        <div className="pt-4">
          <button
            onClick={() => navigateTo({ name: 'home' })}
            className="px-8 h-12 bg-[#1A1816] hover:bg-black text-white text-[11px] uppercase tracking-[0.2em] font-medium rounded-full transition-all shadow-md cursor-pointer inline-flex items-center gap-2"
          >
            <span>DISCOVER DROP COLLECTIONS</span>
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
};
