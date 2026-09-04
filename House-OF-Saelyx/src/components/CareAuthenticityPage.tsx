import React from 'react';
import { ArrowLeft, ShieldCheck, Award, Sparkles, CheckCircle2 } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export const CareAuthenticityPage: React.FC = () => {
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
            HOUSE OF SAELYXE • ATELIER PROVENANCE
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#1A1816] font-normal tracking-tight">
            Certificate of Authenticity & Craft
          </h1>
          <p className="text-xs text-[#7A6E60]">
            Every garment carries an individual serialized certificate signed by our master cutter.
          </p>
        </div>

        {/* Certificate Mock Card */}
        <div className="bg-[#181614] text-white p-8 rounded-3xl border border-amber-500/30 shadow-2xl relative overflow-hidden space-y-6">
          <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex justify-between items-start border-b border-white/15 pb-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-amber-300 font-semibold">
                OFFICIAL SEAL OF PROVENANCE
              </div>
              <h3 className="font-serif text-xl tracking-wider text-white mt-1">
                HOUSE OF SAELYXE ATELIER
              </h3>
            </div>
            <Award className="w-8 h-8 text-amber-400" />
          </div>

          <p className="text-xs text-neutral-300 font-serif leading-relaxed italic">
            "This certificate verifies that this garment was individually cut, stitched, dyed, and hand-finished in our dedicated Colombo atelier using premium heavyweight organic yarn and bespoke tailored hardware."
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 border-t border-white/10 text-xs">
            <div>
              <span className="text-[9px] uppercase tracking-wider text-neutral-400 block">Drop Edition</span>
              <span className="font-mono text-amber-200">DROP 001 / SER. 2026</span>
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-wider text-neutral-400 block">Hardware Seal</span>
              <span className="font-mono text-amber-200">ENGRAVED BRASS</span>
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-wider text-neutral-400 block">Verification</span>
              <span className="font-mono text-emerald-400">CRYPTOGRAPHIC NFC</span>
            </div>
          </div>
        </div>

        {/* Pillars */}
        <div className="space-y-6 text-xs sm:text-sm text-[#4A4036] leading-relaxed font-light">
          <section className="space-y-2">
            <h3 className="font-serif text-base font-semibold text-[#1A1816]">1. Uncompromised Yarn Weight & GSM</h3>
            <p>
              We reject lightweight fast-fashion fabrics. Our tees are engineered with 280 GSM luxury combed cotton, our hoodies with 460 GSM looped French terry, and our knits with custom spun wool blends that retain their structure over decades.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-serif text-base font-semibold text-[#1A1816]">2. Hand-Dyeing & Stone Washes</h3>
            <p>
              Subtle tonal variations, mineral washes, and garment tinting are executed in small micro-batches of no more than 50 pieces per dye cycle, ensuring that no two pieces are completely identical.
            </p>
          </section>
        </div>

      </div>
    </div>
  );
};
