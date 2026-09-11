import React, { useEffect, useState } from 'react';
import { Search, ShoppingBag, User } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { AccountDropdown } from './AccountDropdown';

export const Navbar: React.FC = () => {
  const {
    cartCount,
    setIsCartOpen,
    setIsSearchOpen,
    setIsAuthOpen,
    setAuthMode,
    activeCategory,
    setActiveCategory,
    selectedCurrency,
    currentRoute,
    navigateTo,
    user,
    settings
  } = useStore();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  // Announcement bar removed per user instruction. Kept settings?.announcementText for store schema compatibility.
  const announcementText = false && Boolean(settings?.announcementText);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const handleCategoryClick = (category: string) => {
    setActiveCategory(category);
    if (currentRoute.name !== 'home') navigateTo({ name: 'home' });
    window.setTimeout(() => document.getElementById('collection-grid')?.scrollIntoView({ behavior: 'smooth' }), 0);
    setIsMobileMenuOpen(false);
  };

  const navCategories = [
    { label: 'NEW', value: 'new' },
    { label: 'MEN', value: 'men' },
    { label: 'WOMEN', value: 'women' },
    { label: 'ACCESSORIES', value: 'accessories' },
    { label: 'COLLECTIONS', value: 'collections' }
  ];

  const isDarkNav = scrolled || currentRoute.name !== 'home' || isMobileMenuOpen;

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      {announcementText && (
        <div className="relative z-[60] w-full bg-[#181614] px-4 py-2 text-center text-[9px] sm:text-[10px] font-medium uppercase tracking-[0.18em] text-white border-b border-white/10">
          {announcementText}
        </div>
      )}

      <nav
        className={`w-full lg:hidden transition-colors duration-300 px-5 py-4 flex items-center justify-between select-none relative z-50 ${
          isDarkNav
            ? 'bg-[#141210]/90 backdrop-blur-md border-b border-white/10 text-white'
            : 'bg-gradient-to-b from-black/60 via-black/20 to-transparent text-white'
        }`}
      >
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(previous => !previous)}
          className="p-1.5 text-white hover:text-white/80 transition-colors focus:outline-none cursor-pointer relative z-50"
          aria-label="Toggle menu"
        >
          <div className="w-6 h-4 flex flex-col justify-between items-start relative">
            <span className={`w-6 h-[2px] bg-white rounded-full transition-transform duration-300 origin-center ${isMobileMenuOpen ? 'translate-y-[7px] rotate-45' : ''}`} />
            <span className={`w-6 h-[2px] bg-white rounded-full transition-opacity duration-200 ${isMobileMenuOpen ? 'opacity-0' : 'opacity-100'}`} />
            <span className={`w-6 h-[2px] bg-white rounded-full transition-transform duration-300 ${isMobileMenuOpen ? 'origin-center -translate-y-[7px] -rotate-45 scale-x-100' : 'origin-left scale-x-[0.68]'}`} />
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            navigateTo({ name: 'home' });
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setIsMobileMenuOpen(false);
          }}
          className="group flex items-center cursor-pointer text-center"
        >
          <span className="font-serif text-2xl font-normal tracking-[0.3em] text-white uppercase transition-opacity group-hover:opacity-80">SAELYXE</span>
        </button>

        <div className="flex items-center gap-2.5 sm:gap-3.5 relative">
          <button type="button" onClick={() => setIsSearchOpen(true)} className="p-1 text-white/90 hover:text-white cursor-pointer" aria-label="Search garments">
            <Search className="w-5 h-5 stroke-[2]" />
          </button>

          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={event => {
                  event.stopPropagation();
                  setIsAccountDropdownOpen(previous => !previous);
                }}
                className="p-0.5 text-white/90 hover:text-white cursor-pointer flex items-center gap-1"
                aria-label="User account"
              >
                <div className="w-7 h-7 rounded-full bg-white/15 border border-white/20 flex items-center justify-center font-serif text-xs text-white">{user.name ? user.name[0]?.toUpperCase() : 'S'}</div>
              </button>
              <AccountDropdown isOpen={isAccountDropdownOpen} onClose={() => setIsAccountDropdownOpen(false)} user={user} />
            </div>
          ) : (
            <button
              id="btn-nav-login-mobile"
              type="button"
              onClick={() => {
                setAuthMode('signin');
                setIsAuthOpen(true);
              }}
              className="p-1 text-white/90 hover:text-white cursor-pointer"
              aria-label="User account"
            >
              <User className="w-6 h-6 stroke-[2]" />
            </button>
          )}

          <button type="button" onClick={() => setIsCartOpen(true)} className="relative p-1 text-white/90 hover:text-white transition-transform active:scale-95 cursor-pointer" aria-label="Shopping Bag">
            <ShoppingBag className="w-6 h-6 stroke-[2]" />
            {cartCount > 0 && <span className="absolute -top-1 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center bg-white text-black text-[10px] font-bold rounded-full px-1 border border-black/10 shadow-md">{cartCount}</span>}
          </button>
        </div>
      </nav>

      <div
        className={`lg:hidden fixed inset-x-0 bottom-0 ${announcementText ? 'top-[98px]' : 'top-[66px]'} bg-[#121110]/95 backdrop-blur-xl z-40 px-6 pt-8 pb-12 flex flex-col justify-between transition-[opacity,transform] duration-300 ease-out ${
          isMobileMenuOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
      >
        <div className="space-y-8 overflow-y-auto">
          <div className="text-[11px] uppercase tracking-[0.3em] text-neutral-400 font-semibold px-2">Drop Categories</div>
          <div className="flex flex-col space-y-3">
            {navCategories.map(category => {
              const active = activeCategory === category.value;
              return (
                <button
                  type="button"
                  key={category.value}
                  onClick={() => handleCategoryClick(category.value)}
                  className={`text-left text-lg tracking-[0.2em] uppercase transition-all duration-200 px-5 py-4 rounded-2xl flex items-center justify-between ${active ? 'bg-white text-black font-bold shadow-lg' : 'text-neutral-300 hover:text-white hover:bg-white/10'}`}
                >
                  <span>{category.label}</span>
                  {active && <span className="w-2 h-2 rounded-full bg-black" />}
                </button>
              );
            })}
          </div>

          <div className="pt-8 border-t border-white/10 space-y-5 px-2">
            <button type="button" onClick={() => { navigateTo({ name: 'track' }); setIsMobileMenuOpen(false); }} className="w-full flex items-center justify-between text-sm tracking-[0.2em] uppercase text-neutral-300 hover:text-white py-1"><span>Track Order</span><span>→</span></button>
            <button type="button" onClick={() => { navigateTo({ name: 'care-concierge' }); setIsMobileMenuOpen(false); }} className="w-full flex items-center justify-between text-sm tracking-[0.2em] uppercase text-neutral-300 hover:text-white py-1"><span>Concierge</span><span>→</span></button>
          </div>
        </div>

        <div className="pt-6 border-t border-white/10 flex items-center justify-between px-2">
          <span className="text-[11px] text-neutral-400 tracking-[0.2em] uppercase">SAELYXE</span>
          <div className="flex items-center gap-2 bg-white/5 px-3.5 py-2 rounded-full border border-white/10">
            <span className="text-sm">{selectedCurrency?.flag}</span>
            <span className="text-xs font-mono text-white tracking-widest">{selectedCurrency?.code}</span>
          </div>
        </div>
      </div>

      <nav
        className={`hidden lg:flex w-full transition-colors duration-300 px-6 lg:px-10 py-3.5 items-center justify-between relative z-50 ${
          isDarkNav ? 'bg-[#141210]/95 border-b border-white/10 shadow-2xl text-white' : 'bg-gradient-to-b from-black/50 via-black/20 to-transparent text-white'
        }`}
      >
        <button type="button" onClick={() => { navigateTo({ name: 'home' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="group flex items-center cursor-pointer text-left">
          <span className="font-serif text-xl lg:text-2xl font-normal tracking-[0.35em] text-white uppercase transition-opacity group-hover:opacity-80">SAELYXE</span>
        </button>

        <div className="absolute inset-x-0 mx-auto w-max flex items-center bg-white/15 border border-white/20 rounded-full px-4 py-1 shadow-2xl pointer-events-auto">
          <div className="flex items-center gap-1 sm:gap-2 text-[11px] lg:text-[11.5px] font-semibold tracking-[0.2em] uppercase text-white">
            {navCategories.map(category => {
              const active = activeCategory === category.value && (currentRoute.name === 'home' || currentRoute.name === 'collection');
              return (
                <button type="button" key={category.value} onClick={() => handleCategoryClick(category.value)} className={`transition-all duration-200 cursor-pointer rounded-full px-3 py-1 whitespace-nowrap ${active ? 'text-white bg-white/20 font-bold' : 'text-white/95 hover:text-white hover:bg-white/10'}`}>{category.label}</button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3.5 lg:gap-4.5">
          <button type="button" onClick={() => setIsSearchOpen(true)} className="p-1 text-white hover:text-white cursor-pointer" aria-label="Search garments"><Search className="w-4.5 h-4.5 lg:w-5 lg:h-5 stroke-[2]" /></button>
          <div className="w-[1px] h-4 bg-white/20" />

          {user ? (
            <div className="relative">
              <button type="button" onClick={event => { event.stopPropagation(); setIsAccountDropdownOpen(previous => !previous); }} className="flex items-center gap-2 text-[11px] lg:text-xs uppercase tracking-[0.18em] font-medium text-white px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 cursor-pointer shadow-sm">
                <div className="w-4 h-4 rounded-full bg-white/20 text-[9px] flex items-center justify-center font-serif font-bold">{user.name ? user.name[0]?.toUpperCase() : 'S'}</div>
                <span className="max-w-[110px] truncate">{user.name}</span><span className="text-[8px] opacity-60">▼</span>
              </button>
              <AccountDropdown isOpen={isAccountDropdownOpen} onClose={() => setIsAccountDropdownOpen(false)} user={user} />
            </div>
          ) : (
            <div className="flex items-center gap-3.5 lg:gap-4">
              <button id="btn-nav-login-desktop" type="button" aria-label="User account" onClick={() => { setAuthMode('signin'); setIsAuthOpen(true); }} className="text-[11px] lg:text-xs uppercase tracking-[0.2em] font-medium text-white cursor-pointer">LOGIN</button>
              <button type="button" onClick={() => { setAuthMode('signup'); setIsAuthOpen(true); }} className="text-[10.5px] lg:text-[11px] uppercase tracking-[0.18em] font-semibold text-[#181614] bg-white hover:bg-white/90 px-4 lg:px-5 py-1.5 rounded-full shadow-md active:scale-95 cursor-pointer">SIGN UP</button>
            </div>
          )}

          <button type="button" onClick={() => setIsCartOpen(true)} className="relative p-1 text-white/90 hover:text-white transition-transform active:scale-95 cursor-pointer" aria-label="Shopping Bag">
            <ShoppingBag className="w-4.5 h-4.5 lg:w-5 lg:h-5 stroke-[2]" />
            {cartCount > 0 && <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] flex items-center justify-center bg-white text-black text-[9px] font-bold rounded-full px-1 shadow-md border border-black/10">{cartCount}</span>}
          </button>
        </div>
      </nav>
    </header>
  );
};
