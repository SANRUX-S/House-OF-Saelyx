import React, { useState } from 'react';
import { ChevronRight, Instagram, Check } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { getAppCheckRequestHeaders } from '../lib/firebase';

const paymentLogos = [
  { name: 'PayHere', src: 'https://www.payhere.lk/downloads/images/payhere_long_banner_dark.png', wide: true, objectClass: 'object-cover object-left' },
  { name: 'Visa', src: 'https://cdn.simpleicons.org/visa/1434CB' },
  { name: 'Mastercard', src: 'https://cdn.simpleicons.org/mastercard/EB001B' },
  { name: 'American Express', src: 'https://cdn.simpleicons.org/americanexpress/006FCF' },
  { name: 'Discover', src: 'https://cdn.simpleicons.org/discover/FF6000' },
  { name: 'Diners Club', src: 'https://cdn.simpleicons.org/dinersclub/0079BE' },
  { name: 'Payzy', src: 'https://payzy.lk/images/logo.png' },
  { name: 'PayPal', src: 'https://cdn.simpleicons.org/paypal/003087' },
];

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
    <footer className="w-full bg-[#121110] text-[#e5e5e5] pt-16 pb-10 select-none border-t border-white/10 font-sans">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 space-y-16">

        {/* Newsletter */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-12 border-b border-white/10">
          <div>
            <span className="block text-[10px] tracking-[0.3em] text-white/60 uppercase font-medium mb-2">
              NEWSLETTER ACCESS
            </span>
            <h3 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal tracking-wide text-white leading-tight">
              BE FIRST FOR THE NEXT DROP
            </h3>
            <p className="text-xs text-neutral-400 mt-2 tracking-widest uppercase font-light">
              Exclusive early access & numbered edition alerts.
            </p>
          </div>

          <form onSubmit={handleSubscribe} className="w-full md:w-80 lg:w-96">
            <div className="relative flex items-center border-b border-neutral-600 focus-within:border-white transition-colors pb-2">
              <input
                type="email"
                placeholder={subscribed ? "You're on the priority list!" : "Enter email"}
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={subscribed || loading}
                className="w-full bg-transparent text-sm text-white placeholder:text-neutral-500 focus:outline-none pr-8 font-light"
              />
              <button
                type="submit"
                disabled={subscribed || loading}
                className="p-1 text-neutral-400 hover:text-white transition-all duration-300 disabled:opacity-50 cursor-pointer hover:translate-x-0.5"
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

        {/* Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          <div className="space-y-4">
            <h4 className="font-semibold text-xs tracking-[0.25em] text-white uppercase">LEGAL</h4>
            <ul className="space-y-2.5 text-[13px] text-neutral-400 font-light">
              <li><button onClick={() => navigateTo({ name: 'legal-privacy' })} className="hover:text-white transition-colors text-left">Privacy Policy</button></li>
              <li><button onClick={() => navigateTo({ name: 'legal-terms' })} className="hover:text-white transition-colors text-left">Terms and Conditions</button></li>
              <li><button onClick={() => navigateTo({ name: 'legal-returns' })} className="hover:text-white transition-colors text-left">Returns & Exchanges</button></li>
              <li><button onClick={() => navigateTo({ name: 'care-authenticity' })} className="hover:text-white transition-colors text-left">Authenticity Certificate</button></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-xs tracking-[0.25em] text-white uppercase">SHOP</h4>
            <ul className="space-y-2.5 text-[13px] text-neutral-400 font-light">
              <li><button onClick={() => handleCategory('new')} className="hover:text-white transition-colors text-left">New Arrivals</button></li>
              <li><button onClick={() => handleCategory('men')} className="hover:text-white transition-colors text-left">Men's Collection</button></li>
              <li><button onClick={() => handleCategory('women')} className="hover:text-white transition-colors text-left">Women's Collection</button></li>
              <li><button onClick={() => handleCategory('knits')} className="hover:text-white transition-colors text-left">Coordinates & Knits</button></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-xs tracking-[0.25em] text-white uppercase">CUSTOMER CARE</h4>
            <ul className="space-y-2.5 text-[13px] text-neutral-400 font-light">
              <li>
                <button
                  onClick={() => setIsTrackerOpen(true)}
                  className="text-white hover:opacity-80 flex items-center gap-2 transition-opacity font-medium"
                >
                  <span>Track Delivery Status</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </button>
              </li>
              <li><button onClick={() => navigateTo({ name: 'care-shipping' })} className="hover:text-white transition-colors text-left">Shipping & Delivery</button></li>
              <li><button onClick={() => navigateTo({ name: 'care-size-guide' })} className="hover:text-white transition-colors text-left">Sizing Guide</button></li>
              <li><button onClick={() => navigateTo({ name: 'care-concierge' })} className="hover:text-white transition-colors text-left">Contact Us</button></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-xs tracking-[0.25em] text-white uppercase">SOCIAL MEDIA</h4>
            <div className="flex items-center gap-4 text-neutral-400 pt-1">
              <a
                href="https://www.instagram.com/houseofsaelyx/?hl=en"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
            </div>
            <p className="text-xs text-neutral-400 font-light leading-relaxed pt-2">
              Online Store · Sri Lanka
            </p>
          </div>
        </div>

        {/* Compact Bottom Bar */}
        <div className="pt-8 border-t border-white/10 grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-center gap-5 text-xs text-neutral-400 font-light">
          <div className="tracking-widest uppercase text-[10px] sm:text-[11px] text-center lg:text-left">
            © {copyrightYears} SAELYXE. ALL RIGHTS RESERVED.
          </div>

          <div className="flex items-center justify-center flex-wrap gap-2">
            {paymentLogos.map((logo) => (
              <span
                key={logo.name}
                title={logo.name}
                className={`h-7 ${logo.wide ? 'w-[74px]' : 'w-10'} inline-flex items-center justify-center overflow-hidden rounded-[4px] bg-white px-1.5 shadow-[0_0_0_1px_rgba(255,255,255,0.08)] transition-transform duration-200 hover:-translate-y-0.5`}
              >
                <img
                  src={logo.src}
                  alt={logo.name}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className={`${logo.wide ? 'h-full w-[118px] max-w-none' : 'max-h-4 max-w-full'} ${logo.objectClass || 'object-contain'}`}
                />
              </span>
            ))}
          </div>

          <div className="flex justify-center lg:justify-end">
            <span className="group relative overflow-hidden inline-flex items-center text-[10px] tracking-wide text-neutral-500">
              Powered by&nbsp;
              <span className="text-neutral-300 group-hover:text-white transition-colors duration-300">
                PENETIX Cyber Solutions
              </span>
              <span
                aria-hidden="true"
                className="absolute inset-y-0 -left-1/3 w-1/4 rotate-12 bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:translate-x-[500%] transition-transform duration-700 ease-out"
              />
            </span>
          </div>
        </div>

      </div>
    </footer>
  );
};
