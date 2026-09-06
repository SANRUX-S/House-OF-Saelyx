import React, { useState } from 'react';
import { ChevronRight, Instagram, Check, ShieldCheck, CreditCard } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { getAppCheckRequestHeaders } from '../lib/firebase';

const livePaymentBadges = ['PayPal', 'VISA', 'Mastercard', 'AMEX'];
const plannedLocalBadges = ['PayHere', 'Payzy'];

export const Footer: React.FC = () => {
  const { navigateTo, setIsTrackerOpen, setActiveCategory } = useStore();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  const currentYear = new Date().getFullYear();
  const copyrightYears = currentYear > 2025 ? `2025–${currentYear}` : '2025';

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;

    setLoading(true);
    try {
      const appCheckHeaders = await getAppCheckRequestHeaders();
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...appCheckHeaders },
        body: JSON.stringify({ email })
      });
      if (res.ok) {
        setSubscribed(true);
        setEmail('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCategory = (cat: string) => {
    setActiveCategory(cat);
    navigateTo({ name: 'collection', category: cat });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="w-full overflow-hidden border-t border-white/[0.08] bg-[#0B0B0B] text-[#F4F1EA] select-none font-sans">
      <div className="max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-14">
        {/* Newsletter */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_0.65fr] gap-10 lg:gap-16 items-end py-16 sm:py-20 border-b border-white/[0.09]">
          <div className="max-w-4xl">
            <span className="block text-[10px] tracking-[0.34em] text-[#C8B48A] uppercase font-medium mb-3">
              NEWSLETTER ACCESS
            </span>
            <h3 className="font-serif text-[clamp(2.15rem,5vw,4.65rem)] font-normal tracking-[0.025em] text-[#F8F5EF] leading-[0.98]">
              BE FIRST FOR THE NEXT DROP
            </h3>
            <p className="text-[10px] sm:text-[11px] text-white/45 mt-5 tracking-[0.18em] uppercase font-light">
              Exclusive early access & numbered edition alerts.
            </p>
          </div>

          <form onSubmit={handleSubscribe} className="w-full lg:max-w-md lg:ml-auto">
            <label htmlFor="footer-email" className="sr-only">Email address</label>
            <div className="group relative flex items-center border-b border-white/25 focus-within:border-[#F4F1EA] transition-colors duration-500 pb-3">
              <input
                id="footer-email"
                type="email"
                placeholder={subscribed ? "You're on the priority list!" : 'Enter email'}
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={subscribed || loading}
                className="w-full bg-transparent text-[13px] text-[#F4F1EA] placeholder:text-white/35 focus:outline-none pr-10 font-light tracking-wide disabled:cursor-default"
              />
              <button
                type="submit"
                disabled={subscribed || loading}
                className="p-1 text-white/45 hover:text-white transition-all duration-300 disabled:opacity-50 cursor-pointer group-focus-within:translate-x-0.5"
                aria-label="Subscribe"
              >
                {subscribed ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Main links */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12 py-14 sm:py-16">
          <div className="space-y-5">
            <h4 className="font-semibold text-[10px] tracking-[0.28em] text-[#F4F1EA] uppercase">
              LEGAL
            </h4>
            <ul className="space-y-3 text-[12px] sm:text-[13px] text-white/48 font-light">
              <li><button onClick={() => navigateTo({ name: 'legal-privacy' })} className="hover:text-white transition-colors duration-300 text-left">Privacy Policy</button></li>
              <li><button onClick={() => navigateTo({ name: 'legal-terms' })} className="hover:text-white transition-colors duration-300 text-left">Terms and Conditions</button></li>
              <li><button onClick={() => navigateTo({ name: 'legal-returns' })} className="hover:text-white transition-colors duration-300 text-left">Returns & Exchanges</button></li>
              <li><button onClick={() => navigateTo({ name: 'care-authenticity' })} className="hover:text-white transition-colors duration-300 text-left">Authenticity Certificate</button></li>
            </ul>
          </div>

          <div className="space-y-5">
            <h4 className="font-semibold text-[10px] tracking-[0.28em] text-[#F4F1EA] uppercase">
              SHOP
            </h4>
            <ul className="space-y-3 text-[12px] sm:text-[13px] text-white/48 font-light">
              <li><button onClick={() => handleCategory('new')} className="hover:text-white transition-colors duration-300 text-left">New Arrivals</button></li>
              <li><button onClick={() => handleCategory('men')} className="hover:text-white transition-colors duration-300 text-left">Men's Collection</button></li>
              <li><button onClick={() => handleCategory('women')} className="hover:text-white transition-colors duration-300 text-left">Women's Collection</button></li>
              <li><button onClick={() => handleCategory('knits')} className="hover:text-white transition-colors duration-300 text-left">Coordinates & Knits</button></li>
            </ul>
          </div>

          <div className="space-y-5">
            <h4 className="font-semibold text-[10px] tracking-[0.28em] text-[#F4F1EA] uppercase">
              CUSTOMER CARE
            </h4>
            <ul className="space-y-3 text-[12px] sm:text-[13px] text-white/48 font-light">
              <li>
                <button
                  onClick={() => setIsTrackerOpen(true)}
                  className="text-[#F4F1EA] hover:text-white flex items-center gap-2.5 transition-colors duration-300 font-medium"
                >
                  <span>Track Delivery Status</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </button>
              </li>
              <li><button onClick={() => navigateTo({ name: 'care-shipping' })} className="hover:text-white transition-colors duration-300 text-left">Shipping & Delivery</button></li>
              <li><button onClick={() => navigateTo({ name: 'care-size-guide' })} className="hover:text-white transition-colors duration-300 text-left">Sizing Guide</button></li>
              <li><button onClick={() => navigateTo({ name: 'care-concierge' })} className="hover:text-white transition-colors duration-300 text-left">Contact Us</button></li>
            </ul>
          </div>

          <div className="space-y-5">
            <h4 className="font-semibold text-[10px] tracking-[0.28em] text-[#F4F1EA] uppercase">
              CONNECT
            </h4>
            <a
              href="https://www.instagram.com/houseofsaelyx/?hl=en"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-3 text-white/50 hover:text-white transition-colors duration-300"
              aria-label="SAELYXE on Instagram"
            >
              <span className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center group-hover:border-white/30 group-hover:bg-white/[0.04] transition-all duration-300">
                <Instagram className="w-3.5 h-3.5" />
              </span>
              <span className="text-[12px] tracking-[0.08em]">Instagram</span>
            </a>
            <p className="text-[11px] text-white/38 font-light leading-relaxed pt-1 tracking-wide">
              Online Store · Sri Lanka
            </p>
          </div>
        </div>

        {/* Ghost brand signature */}
        <div className="relative border-t border-white/[0.08] py-10 sm:py-14 overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none text-center font-serif text-[clamp(3rem,10.5vw,9.5rem)] leading-none tracking-[0.14em] sm:tracking-[0.18em] text-white/[0.035] whitespace-nowrap translate-x-[0.08em]"
          >
            SAELYXE
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.42em] text-white/35">
              Made for Presence
            </span>
          </div>
        </div>

        {/* Secure checkout strip */}
        <div className="border-y border-white/[0.08] py-6">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-full border border-white/10 bg-white/[0.025] flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-[#C8B48A]" />
              </span>
              <div>
                <p className="text-[9px] uppercase tracking-[0.28em] text-white/65 font-semibold">Secure Checkout</p>
                <p className="text-[10px] text-white/32 mt-1 tracking-wide">Payment options shown at checkout may vary by eligibility.</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
              <div className="flex items-center flex-wrap gap-2">
                <CreditCard className="w-3.5 h-3.5 text-white/30 mr-1" />
                {livePaymentBadges.map((badge) => (
                  <span
                    key={badge}
                    className="h-8 px-3 rounded-full border border-white/10 bg-white/[0.025] text-white/58 hover:text-white hover:border-white/25 hover:bg-white/[0.05] transition-all duration-300 inline-flex items-center text-[9px] sm:text-[10px] font-semibold tracking-[0.08em]"
                  >
                    {badge}
                  </span>
                ))}
              </div>

              <div className="hidden sm:block w-px h-7 bg-white/10" />

              <div className="flex items-center flex-wrap gap-2">
                <span className="text-[8px] uppercase tracking-[0.24em] text-white/28 mr-1">Local gateways</span>
                {plannedLocalBadges.map((badge) => (
                  <span
                    key={badge}
                    title="Prepared for future gateway integration"
                    className="h-8 px-3 rounded-full border border-dashed border-white/10 text-white/30 inline-flex items-center gap-2 text-[9px] sm:text-[10px] font-medium tracking-[0.06em]"
                  >
                    {badge}
                    <span className="text-[6px] uppercase tracking-[0.16em] text-[#C8B48A]/60">Soon</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom signature bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-5 py-8 sm:py-9 text-[9px] sm:text-[10px] text-white/38 font-light">
          <div className="tracking-[0.18em] uppercase text-center md:text-left">
            © {copyrightYears} SAELYXE. ALL RIGHTS RESERVED.
          </div>

          <div className="tracking-[0.38em] uppercase text-white/28 text-center">
            MADE FOR PRESENCE.
          </div>

          <div className="flex justify-center md:justify-end">
            <div className="group relative overflow-hidden rounded-full px-3 py-1.5 border border-transparent hover:border-white/[0.08] transition-colors duration-500">
              <span className="relative z-10 text-white/32 tracking-[0.08em]">
                Powered by <span className="text-white/62 group-hover:text-[#F4F1EA] transition-colors duration-500">PENETIX Cyber Solutions</span>
              </span>
              <span
                aria-hidden="true"
                className="absolute inset-y-0 -left-1/2 w-1/3 rotate-12 bg-gradient-to-r from-transparent via-white/[0.10] to-transparent translate-x-0 group-hover:translate-x-[520%] transition-transform duration-700 ease-out"
              />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
