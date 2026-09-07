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
    <footer className="w-full bg-[#121110] text-white pt-16 pb-10 select-none border-t border-white/10 font-sans">
      <div className="w-full px-6 sm:px-10 lg:px-12 space-y-16">
        
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

          <form onSubmit={handleSubscribe} className="w-full md:w-80 lg:w-96 shrink-0">
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
                  className="footer-link text-[#F1F1F1] text-left"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigateTo({ name: 'legal-terms' })} 
                  className="footer-link text-[#F1F1F1] text-left"
                >
                  Terms and Conditions
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigateTo({ name: 'legal-returns' })} 
                  className="footer-link text-[#F1F1F1] text-left"
                >
                  Returns & Exchanges
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigateTo({ name: 'care-authenticity' })} 
                  className="footer-link text-[#F1F1F1] text-left"
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
                <button onClick={() => handleCategory('new')} className="footer-link text-[#F1F1F1] text-left">
                  Drop 001
                </button>
              </li>
              <li>
                <button onClick={() => handleCategory('men')} className="footer-link text-[#F1F1F1] text-left">
                  Men's Silhouettes
                </button>
              </li>
              <li>
                <button onClick={() => handleCategory('women')} className="footer-link text-[#F1F1F1] text-left">
                  Women's Silhouettes
                </button>
              </li>
              <li>
                <button onClick={() => handleCategory('knits')} className="footer-link text-[#F1F1F1] text-left">
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
                  className="footer-link text-white inline-flex items-center gap-2 font-medium"
                >
                  <span>Track Delivery Status</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigateTo({ name: 'care-shipping' })} 
                  className="footer-link text-[#F1F1F1] text-left"
                >
                  Shipping & Delivery
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigateTo({ name: 'care-size-guide' })} 
                  className="footer-link text-[#F1F1F1] text-left"
                >
                  Sizing Guide
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigateTo({ name: 'care-concierge' })} 
                  className="footer-link text-[#F1F1F1] text-left"
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
                href="https://www.instagram.com/saelyxe/?hl=en" 
                target="_blank"
                rel="noopener noreferrer" 
                className="footer-social flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-[#FCAF45] via-[#DD2A7B] to-[#8134AF] text-white"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5 stroke-[2]" />
              </a>
              <a
                href="https://www.tiktok.com/@saelyxe"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-social flex h-9 w-9 items-center justify-center rounded-lg bg-black ring-1 ring-white/20"
                aria-label="TikTok"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                  <path fill="#25F4EE" transform="translate(-0.8 0.6)" d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 1 1-2.89-2.89c.28 0 .55.04.81.12V9.4a6.33 6.33 0 1 0 5.53 6.27V8.69a8.25 8.25 0 0 0 4.83 1.56V6.8c-.36 0-.71-.04-1.06-.11Z" />
                  <path fill="#FE2C55" transform="translate(0.8 -0.6)" d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 1 1-2.89-2.89c.28 0 .55.04.81.12V9.4a6.33 6.33 0 1 0 5.53 6.27V8.69a8.25 8.25 0 0 0 4.83 1.56V6.8c-.36 0-.71-.04-1.06-.11Z" />
                  <path fill="white" d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 1 1-2.89-2.89c.28 0 .55.04.81.12V9.4a6.33 6.33 0 1 0 5.53 6.27V8.69a8.25 8.25 0 0 0 4.83 1.56V6.8c-.36 0-.71-.04-1.06-.11Z" />
                </svg>
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=61593852620093&ref=PROFILE_EDIT_xav_ig_profile_page_web#"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-social flex h-9 w-9 items-center justify-center rounded-lg bg-[#1877F2] text-white"
                aria-label="Facebook"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                  <path d="M13.5 22v-9h3l.5-3.5h-3.5V7.25c0-1 .3-1.75 1.75-1.75H17V2.3c-.3-.05-1.35-.15-2.6-.15-2.6 0-4.4 1.6-4.4 4.55V9.5H7V13h3v9h3.5Z" />
                </svg>
              </a>
            </div>
            <p className="text-xs text-[#F1F1F1] font-medium leading-relaxed pt-2">
              Online Store · Sri Lanka
            </p>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#E2E2E2] font-medium">
          <div className="tracking-[0.14em] uppercase text-[11px] font-semibold text-white/90">
            © 2025–2026 SAELYXE. ALL RIGHTS RESERVED.
          </div>

          <div className="flex flex-col items-center sm:items-end gap-2.5">
            {/* 9 Payment Icons Lineup */}
            <div className="flex flex-wrap items-center justify-center lg:justify-end gap-2" aria-label="Payment methods">
              <span className="rounded border border-white/20 px-3 py-1.5 text-xs text-white">PayPal</span>
              <span className="rounded border border-white/20 px-3 py-1.5 text-xs text-white">Cash on Delivery</span>
            </div>

            <span className="group relative overflow-hidden inline-flex items-center text-[10px] font-medium tracking-[0.035em] text-[#9B9B9B]">
              Powered by&nbsp;<span className="text-[#DADADA] group-hover:text-white transition-colors duration-300">PENETIX Cyber Solutions</span>
              <span aria-hidden="true" className="absolute inset-y-0 -left-1/3 w-1/4 rotate-12 bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:translate-x-[500%] transition-transform duration-700 ease-out"></span>
            </span>
          </div>
        </div>

      </div>
    </footer>
  );
};

