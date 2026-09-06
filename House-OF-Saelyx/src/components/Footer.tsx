import React, { useState } from 'react';
import { ChevronRight, Instagram, Check } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { getAppCheckRequestHeaders } from '../lib/firebase';

export const Footer: React.FC = () => {
  const { navigateTo, setIsTrackerOpen, setActiveCategory } = useStore();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

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
    <footer className="w-full bg-[#121110] text-white pt-16 pb-10 select-none border-t border-white/10 font-['Plus_Jakarta_Sans']">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 space-y-16">
        
        {/* Top Newsletter Row - Highlighting luxury editorial title inspired by SAELYXE Hero */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-12 border-b border-white/10">
          <div>
            <span className="block text-[10px] tracking-[0.3em] text-white uppercase font-semibold mb-2">
              NEWSLETTER ACCESS
            </span>
            <h3 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal tracking-wide text-white leading-tight">
              BE FIRST FOR THE NEXT DROP
            </h3>
            <p className="text-xs text-[#E6E6E6] mt-2 tracking-[0.14em] uppercase font-medium">
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
                className="w-full bg-transparent text-sm text-white placeholder:text-[#A8A8A8] focus:outline-none pr-8 font-medium"
              />
              <button
                type="submit"
                disabled={subscribed || loading}
                className="p-1 text-white hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
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
          
          {/* LEGAL */}
          <div className="space-y-4">
            <h4 className="font-semibold text-xs tracking-[0.25em] text-white uppercase">
              LEGAL
            </h4>
            <ul className="space-y-2.5 text-[13px] text-[#F1F1F1] font-medium">
              <li>
                <button 
                  onClick={() => navigateTo({ name: 'legal-privacy' })} 
                  className="text-[#F1F1F1] hover:text-white transition-colors text-left"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigateTo({ name: 'legal-terms' })} 
                  className="text-[#F1F1F1] hover:text-white transition-colors text-left"
                >
                  Terms and Conditions
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigateTo({ name: 'legal-returns' })} 
                  className="text-[#F1F1F1] hover:text-white transition-colors text-left"
                >
                  Returns & Exchanges
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigateTo({ name: 'care-authenticity' })} 
                  className="text-[#F1F1F1] hover:text-white transition-colors text-left"
                >
                  Authenticity Certificate
                </button>
              </li>
            </ul>
          </div>

          {/* SHOP */}
          <div className="space-y-4">
            <h4 className="font-semibold text-xs tracking-[0.25em] text-white uppercase">
              SHOP
            </h4>
            <ul className="space-y-2.5 text-[13px] text-[#F1F1F1] font-medium">
              <li>
                <button onClick={() => handleCategory('new')} className="text-[#F1F1F1] hover:text-white transition-colors text-left">
                  Drop 001
                </button>
              </li>
              <li>
                <button onClick={() => handleCategory('men')} className="text-[#F1F1F1] hover:text-white transition-colors text-left">
                  Men's Silhouettes
                </button>
              </li>
              <li>
                <button onClick={() => handleCategory('women')} className="text-[#F1F1F1] hover:text-white transition-colors text-left">
                  Women's Silhouettes
                </button>
              </li>
              <li>
                <button onClick={() => handleCategory('knits')} className="text-[#F1F1F1] hover:text-white transition-colors text-left">
                  Coordinates & Knits
                </button>
              </li>
            </ul>
          </div>

          {/* CUSTOMER CARE */}
          <div className="space-y-4">
            <h4 className="font-semibold text-xs tracking-[0.25em] text-white uppercase">
              CUSTOMER CARE
            </h4>
            <ul className="space-y-2.5 text-[13px] text-[#F1F1F1] font-medium">
              <li>
                <button
                  onClick={() => setIsTrackerOpen(true)}
                  className="text-white flex items-center gap-2 font-medium"
                >
                  <span>Track Delivery Status</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigateTo({ name: 'care-shipping' })} 
                  className="text-[#F1F1F1] hover:text-white transition-colors text-left"
                >
                  Shipping & Delivery
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigateTo({ name: 'care-size-guide' })} 
                  className="text-[#F1F1F1] hover:text-white transition-colors text-left"
                >
                  Sizing Guide
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigateTo({ name: 'care-concierge' })} 
                  className="text-[#F1F1F1] hover:text-white transition-colors text-left"
                >
                  Contact Us
                </button>
              </li>
            </ul>
          </div>

          {/* SOCIAL MEDIA */}
          <div className="space-y-4">
            <h4 className="font-semibold text-xs tracking-[0.25em] text-white uppercase">
              SOCIAL MEDIA
            </h4>
            <div className="flex items-center gap-4 text-[#F1F1F1] pt-1">
              <a 
                href="https://www.instagram.com/houseofsaelyx/?hl=en" 
                target="_blank"
                rel="noopener noreferrer" 
                className="hover:text-white transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4 stroke-[2]" />
              </a>
            </div>
            <p className="text-xs text-[#F1F1F1] font-medium leading-relaxed pt-2">
              Online Store · Sri Lanka
            </p>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#E2E2E2] font-medium">
          <div className="tracking-[0.14em] uppercase text-[11px] font-semibold">
            © {new Date().getFullYear()} HOUSE OF SAELYXE
          </div>

          {/* Payment Badges */}
          <div className="flex items-center flex-wrap gap-2 text-xs opacity-80">
            {['PayPal'].map((badge) => (
              <span 
                key={badge} 
                className="px-2 py-0.5 rounded bg-white/10 text-white text-[10px] font-semibold"
              >
                {badge}
              </span>
            ))}
          </div>
        </div>

      </div>
    </footer>
  );
};