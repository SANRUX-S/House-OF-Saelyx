import React from 'react';
import { ArrowLeft, Truck, Globe, PackageCheck } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export const CareShippingPage: React.FC = () => {
  const { navigateTo } = useStore();

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1816] pt-24 pb-20 px-5 sm:px-8">
      <div className="max-w-3xl mx-auto space-y-10">
        <button
          onClick={() => navigateTo({ name: 'home' })}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[#7A6E60] hover:text-black transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Boutique</span>
        </button>

        <div className="space-y-2 border-b border-[#E3D9CD] pb-6">
          <span className="text-[11px] uppercase tracking-[0.25em] text-[#857768] font-semibold">
            SAELYXE · DELIVERY
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#1A1816] font-normal tracking-tight">
            Shipping & Delivery
          </h1>
          <p className="text-xs text-[#7A6E60]">
            Delivery charges and order status are calculated from the current store configuration and your order record.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#EFE9E0] p-6 rounded-2xl border border-[#DDD3C4] space-y-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-[#1A1816]">
              <Truck className="w-4 h-4 text-emerald-700" />
              <span>Sri Lanka Delivery</span>
            </div>
            <div className="text-xl font-serif font-bold text-[#1A1816]">Order-Based Dispatch</div>
            <p className="text-xs text-[#574D42] leading-relaxed">
              Your checkout records the applicable delivery charge. Courier and tracking details are added when the order is dispatched.
            </p>
          </div>

          <div className="bg-[#EFE9E0] p-6 rounded-2xl border border-[#DDD3C4] space-y-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-[#1A1816]">
              <Globe className="w-4 h-4 text-amber-700" />
              <span>Other Destinations</span>
            </div>
            <div className="text-xl font-serif font-bold text-[#1A1816]">Availability Varies</div>
            <p className="text-xs text-[#574D42] leading-relaxed">
              Delivery availability, courier selection, timing, and destination-specific charges are confirmed against the order rather than promised as a fixed carrier or delivery window.
            </p>
          </div>
        </div>

        <div className="space-y-8 text-xs sm:text-sm text-[#4A4036] leading-relaxed font-light">
          <section className="space-y-3">
            <h2 className="font-serif text-lg text-[#1A1816] font-semibold tracking-wide flex items-center gap-2">
              <PackageCheck className="w-4 h-4" />
              Order Preparation
            </h2>
            <p>
              Orders move through the recorded stages Placed, Confirmed, Packed, Dispatched, Out for Delivery, and Delivered. The order timeline is the operational source of truth.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg text-[#1A1816] font-semibold tracking-wide">
              Order Status & Tracking
            </h2>
            <p>
              Once your order is dispatched, sign in with the same customer account used at checkout. The tracking page shows the courier and tracking number recorded for your order. It does not invent GPS or courier telemetry.
            </p>
            <div className="pt-2">
              <button
                onClick={() => navigateTo({ name: 'track' })}
                className="px-6 py-3 bg-[#1A1816] text-white text-xs uppercase font-semibold tracking-widest rounded-full hover:bg-black transition-all"
              >
                Track An Order →
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
