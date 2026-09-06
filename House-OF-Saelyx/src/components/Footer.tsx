import React, { useState } from 'react';
import { ChevronRight, Instagram, Check } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { getAppCheckRequestHeaders } from '../lib/firebase';

const cardLogos = [
  { name: 'Visa', src: 'https://cdn.simpleicons.org/visa/1434CB' },
  { name: 'Mastercard', src: 'https://cdn.simpleicons.org/mastercard/EB001B' },
  { name: 'American Express', src: 'https://cdn.simpleicons.org/americanexpress/006FCF' },
  { name: 'Discover', src: 'https://cdn.simpleicons.org/discover/FF6000' },
  { name: 'Diners Club', src: 'https://cdn.simpleicons.org/dinersclub/0079BE' },
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
    <footer className="w-full bg-[#121110] text-[#E7E7E7] pt-16 pb-10 select-none border-t border-[#2A2928] font-sans [text-rendering:geometricPrecision]">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 space-y-16">

        {/* Newsletter */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-12 border-b border-[#2A2928]">
          <div>
            <span className="block text-[10px] tracking-[0.3em] text-[#C8C8C8] uppercase font-medium mb-2">
              NEWSLETTER ACCESS
            </span>
            <h3 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal tracking-wide text-white leading-tight">
              BE FIRST FOR THE NEXT DROP
            </h3>
            <p className="text-xs text-[#B5B5B5] mt-2 tracking-widest uppercase font-normal">
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
                className="w-full bg-transparent text-sm text-white placeholder:text-[#8F8F8F] focus:outline-none pr-8 font-normal"
              />
              <button
                type="submit"
                disabled={subscribed || loading}
                className="p-1 text-[#B5B5B5] hover:text-white transition-all duration-300 disabled:opacity-50 cursor-pointer hover:translate-x-0.5"
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
            <ul className="space-y-2.5 text-[13px] text-[#B5B5B5] font-normal">
              <li><button onClick={() => navigateTo({ name: 'legal-privacy' })} className="hover:text-white transition-colors text-left">Privacy Policy</button></li>
              <li><button onClick={() => navigateTo({ name: 'legal-terms' })} className="hover:text-white transition-colors text-left">Terms and Conditions</button></li>
              <li><button onClick={() => navigateTo({ name: 'legal-returns' })} className="hover:text-white transition-colors text-left">Returns & Exchanges</button></li>
              <li><button onClick={() => navigateTo({ name: 'care-authenticity' })} className="hover:text-white transition-colors text-left">Authenticity Certificate</button></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-xs tracking-[0.25em] text-white uppercase">SHOP</h4>
            <ul className="space-y-2.5 text-[13px] text-[#B5B5B5] font-normal">
              <li><button onClick={() => handleCategory('new')} className="hover:text-white transition-colors text-left">New Arrivals</button></li>
              <li><button onClick={() => handleCategory('men')} className="hover:text-white transition-colors text-left">Men's Collection</button></li>
              <li><button onClick={() => handleCategory('women')} className="hover:text-white transition-colors text-left">Women's Collection</button></li>
              <li><button onClick={() => handleCategory('knits')} className="hover:text-white transition-colors text-left">Coordinates & Knits</button></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-xs tracking-[0.25em] text-white uppercase">CUSTOMER CARE</h4>
            <ul className="space-y-2.5 text-[13px] text-[#B5B5B5] font-normal">
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
            <div className="flex items-center gap-4 text-[#B5B5B5] pt-1">
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
            <p className="text-xs text-[#B5B5B5] font-normal leading-relaxed pt-2">
              Online Store · Sri Lanka
            </p>
          </div>
        </div>

        {/* Compact Bottom Bar */}
        <div className="pt-8 border-t border-[#2A2928] flex flex-col lg:flex-row lg:items-end lg:justify-between gap-7">
          <div className="tracking-[0.14em] uppercase text-[10px] sm:text-[11px] text-[#BEBEBE] font-medium text-center lg:text-left whitespace-nowrap">
            © {copyrightYears} SAELYXE. ALL RIGHTS RESERVED.
          </div>

          <div className="flex flex-col items-center lg:items-end gap-3">
            <div className="flex items-center justify-center lg:justify-end flex-wrap gap-2.5">
              <a
                href="https://www.payhere.lk"
                target="_blank"
                rel="noopener noreferrer"
                title="PayHere"
                className="h-8 w-[124px] inline-flex items-center justify-center overflow-hidden rounded-[4px] bg-white"
              >
                <img
                  src="https://www.payhere.lk/downloads/images/payhere_short_banner.png"
                  alt="PayHere"
                  loading="eager"
                  decoding="async"
                  className="block w-[116px] h-auto max-w-none"
                />
              </a>

              {cardLogos.map((logo) => (
                <span
                  key={logo.name}
                  title={logo.name}
                  className="h-8 w-[46px] inline-flex items-center justify-center rounded-[4px] bg-white"
                >
                  <img
                    src={logo.src}
                    alt={logo.name}
                    loading="eager"
                    decoding="async"
                    className="block max-h-[18px] max-w-[34px] object-contain"
                  />
                </span>
              ))}

              <span
                title="Payzy"
                className="h-8 min-w-[58px] px-2 inline-flex items-center justify-center rounded-[4px] bg-white text-[#111111] text-[11px] font-bold tracking-[-0.02em]"
              >
                Payzy
              </span>

              <span
                title="PayPal"
                className="h-8 w-[46px] inline-flex items-center justify-center rounded-[4px] bg-white"
              >
                <img
                  src="https://cdn.simpleicons.org/paypal/003087"
                  alt="PayPal"
                  loading="eager"
                  decoding="async"
                  className="block max-h-[18px] max-w-[32px] object-contain"
                />
              </span>
            </div>

            <span className="group relative overflow-hidden inline-flex items-center text-[10px] font-medium tracking-[0.035em] text-[#9B9B9B]">
              Powered by&nbsp;
              <span className="text-[#DADADA] group-hover:text-white transition-colors duration-300">
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
