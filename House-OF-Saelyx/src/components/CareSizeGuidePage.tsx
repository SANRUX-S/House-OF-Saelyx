import React, { useState } from 'react';
import { ArrowLeft, Ruler, Sparkles, Check } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export const CareSizeGuidePage: React.FC = () => {
  const { navigateTo } = useStore();
  const [unit, setUnit] = useState<'inches' | 'cm'>('inches');

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1816] pt-24 pb-20 px-5 sm:px-8">
      <div className="max-w-4xl mx-auto space-y-10">
        
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
            HOUSE OF SAELYX • SARTORIAL PROPORTIONS
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#1A1816] font-normal tracking-tight">
            Garment Sizing & Fit Architecture
          </h1>
          <p className="text-xs text-[#7A6E60]">
            Cut for tailored drape, dropped shoulders, and architectural presence.
          </p>
        </div>

        {/* Unit Toggle */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-[#7A6E60]">
            Measurements taken flat across garment.
          </div>
          <div className="flex items-center gap-1 bg-[#EAE2D5] p-1 rounded-full text-xs font-semibold">
            <button
              onClick={() => setUnit('inches')}
              className={`px-3 py-1 rounded-full transition-all ${
                unit === 'inches' ? 'bg-[#1A1816] text-white shadow-sm' : 'text-[#5A4E40]'
              }`}
            >
              Inches (IN)
            </button>
            <button
              onClick={() => setUnit('cm')}
              className={`px-3 py-1 rounded-full transition-all ${
                unit === 'cm' ? 'bg-[#1A1816] text-white shadow-sm' : 'text-[#5A4E40]'
              }`}
            >
              Centimeters (CM)
            </button>
          </div>
        </div>

        {/* Table 1: Tops, Heavyweight Tees & Knitwear */}
        <div className="bg-white rounded-2xl border border-[#E3D9CD] overflow-hidden shadow-sm">
          <div className="p-4 bg-[#EFE9E0] border-b border-[#E3D9CD] font-serif font-semibold text-sm">
            Tops, Oversized Tees & Heavyweight Knits
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F5] text-[10px] uppercase tracking-wider text-[#7A6E60] border-b border-[#ECE3D8]">
                <tr>
                  <th className="p-3.5 font-semibold">Size</th>
                  <th className="p-3.5 font-semibold">Chest / Bust</th>
                  <th className="p-3.5 font-semibold">Shoulder Width</th>
                  <th className="p-3.5 font-semibold">Garment Length</th>
                  <th className="p-3.5 font-semibold">Sleeve Length</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EAE1]">
                <tr>
                  <td className="p-3.5 font-bold">S</td>
                  <td className="p-3.5">{unit === 'inches' ? '42"' : '106 cm'}</td>
                  <td className="p-3.5">{unit === 'inches' ? '20.5"' : '52 cm'}</td>
                  <td className="p-3.5">{unit === 'inches' ? '28"' : '71 cm'}</td>
                  <td className="p-3.5">{unit === 'inches' ? '9.5"' : '24 cm'}</td>
                </tr>
                <tr className="bg-[#FAF8F5]/60">
                  <td className="p-3.5 font-bold">M</td>
                  <td className="p-3.5">{unit === 'inches' ? '45"' : '114 cm'}</td>
                  <td className="p-3.5">{unit === 'inches' ? '21.5"' : '55 cm'}</td>
                  <td className="p-3.5">{unit === 'inches' ? '29"' : '74 cm'}</td>
                  <td className="p-3.5">{unit === 'inches' ? '10"' : '25.5 cm'}</td>
                </tr>
                <tr>
                  <td className="p-3.5 font-bold">L</td>
                  <td className="p-3.5">{unit === 'inches' ? '48"' : '122 cm'}</td>
                  <td className="p-3.5">{unit === 'inches' ? '22.5"' : '57 cm'}</td>
                  <td className="p-3.5">{unit === 'inches' ? '30"' : '76 cm'}</td>
                  <td className="p-3.5">{unit === 'inches' ? '10.5"' : '27 cm'}</td>
                </tr>
                <tr className="bg-[#FAF8F5]/60">
                  <td className="p-3.5 font-bold">XL</td>
                  <td className="p-3.5">{unit === 'inches' ? '51"' : '130 cm'}</td>
                  <td className="p-3.5">{unit === 'inches' ? '23.5"' : '60 cm'}</td>
                  <td className="p-3.5">{unit === 'inches' ? '31"' : '79 cm'}</td>
                  <td className="p-3.5">{unit === 'inches' ? '11"' : '28 cm'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Fit Consultation Card */}
        <div className="bg-[#EFE9E0] p-6 rounded-2xl border border-[#DDD3C4] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="font-serif text-sm font-semibold text-[#1A1816] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-700" />
              Need Bespoke Sizing Guidance?
            </h4>
            <p className="text-xs text-[#7A6E60]">
              Our Colombo studio advisors can recommend the exact size based on your height and preferred silhouette style.
            </p>
          </div>
          <button
            onClick={() => navigateTo({ name: 'care-concierge' })}
            className="px-5 py-2.5 bg-[#1A1816] text-white text-xs font-semibold uppercase tracking-wider rounded-full hover:bg-black whitespace-nowrap"
          >
            Speak with Stylist
          </button>
        </div>

      </div>
    </div>
  );
};
