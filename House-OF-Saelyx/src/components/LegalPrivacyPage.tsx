import React from 'react';
import { ArrowLeft, Lock, Shield, Key, Eye } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export const LegalPrivacyPage: React.FC = () => {
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
            HOUSE OF SAELYX • PRIVACY & CONFIDENTIALITY
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#1A1816] font-normal tracking-tight">
            Patron Privacy & Cryptographic Security
          </h1>
          <p className="text-xs text-[#7A6E60]">
            Last Updated: January 2026 • Tier-1 Cloud Firestore Encryption
          </p>
        </div>

        {/* Privacy Sections */}
        <div className="space-y-8 text-xs sm:text-sm text-[#4A4036] leading-relaxed font-light">
          <section className="space-y-3">
            <h2 className="font-serif text-lg text-[#1A1816] font-semibold tracking-wide">
              1. Our Stance on Patron Discretion
            </h2>
            <p>
              At SAELYX, we view client privacy as an indelible facet of luxury. We never sell, lease, or monetize patron contact details, sizing data, or purchase histories with third-party advertising networks.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg text-[#1A1816] font-semibold tracking-wide">
              2. Data Collection & Cryptographic Salting
            </h2>
            <p>
              Information gathered during checkout (recipient name, address, direct telephone, and email) is stored in Google Cloud Firestore with end-to-end TLS 1.3 encryption and salted SHA-256 token hashing for account keys.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg text-[#1A1816] font-semibold tracking-wide">
              3. Courier Dispatch Transmission
            </h2>
            <p>
              Only strictly essential logistical parameters (physical destination and hand-delivery contact) are securely provisioned to our bonded white-glove couriers solely during active transit.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg text-[#1A1816] font-semibold tracking-wide">
              4. The Right to Total Erasure (GDPR / CCPA)
            </h2>
            <p>
              Patrons maintain full sovereign ownership over their profile. You may request permanent purging of your atelier transaction history and account profile at any moment by contacting privacy@houseofsaelyx.com.
            </p>
          </section>
        </div>

      </div>
    </div>
  );
};
