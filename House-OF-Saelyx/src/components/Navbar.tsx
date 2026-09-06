import React, { useState, useEffect } from 'react';
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
    user
  } = useStore();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const handleCategoryClick = (cat: string) => {
    setActiveCategory(cat);
    if (currentRoute.name !== 'home') {
      navigateTo({ name: 'home' });
    }
    const el = document.getElementById('collection-grid');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  const navCategories = [
    { label: 'NEW', value: 'new' },
    { label: 'MEN', value: 'men' },
    { label: 'WOMEN', value: 'women' },
    { label: 'ACCESSORIES', value: 'accessories' },
    { label: 'COLLECTIONS', value: 'collections' },
  ];

  const isDarkNav = scrolled || currentRoute.name !== 'home' || isMobileMenuOpen;

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      
      {/* ========================================================= */}
      {/* 1. MOBILE NAVBAR (< md)                                   */}
      {/* ========================================================= */}
      <nav
        className={`w-full lg:hidden transition-colors duration-300 px-5 py-4 flex items-center justify-between select-none relative z-50 ${
          isDarkNav
            ? 'bg-[#141210]/90 backdrop-blur-md border-b border-white/10 text-white'
            : 'bg-gradient-to-b from-black/60 via-black/20 to-transparent text-white'
        }`}
      >
        {/* Left: Hamburger Menu */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-1.5 text-white hover:text-white/80 transition-colors focus:outline-none cursor-pointer relative z-50"
          aria-label="Toggle menu"
        >
          <div className="w-6 h-4 flex flex-col justify-between items-start relative">
            <span
              className={`w-6 h-[2px] bg-white rounded-full transition-transform duration-300 ease-out transform-gpu origin-center ${
                isMobileMenuOpen 
                  ? 'translate-y-[7px] rotate-45' 
                  : 'translate-y-0 rotate-0'
              }`}
            />
            <span
              className={`w-6 h-[2px] bg-white rounded-full transition-opacity duration-200 ease-out transform-gpu ${
                isMobileMenuOpen 
                  ? 'opacity-0 scale-x-0' 
                  : 'opacity-100 scale-x-100'
              }`}
            />
            <span
              className={`w-6 h-[2px] bg-white rounded-full transition-transform duration-300 ease-out transform-gpu ${
                isMobileMenuOpen 
                  ? 'origin-center -translate-y-[7px] -rotate-45 scale-x-100' 
                  : 'origin-left translate-y-0 rotate-0 scale-x-[0.68]'
              }`}
            />
          </div>
        </button>

        {/* Center: Brand Logo */}
        <button
          onClick={() => {
            navigateTo({ name: 'home' });
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setIsMobileMenuOpen(false);
          }}
          className="group flex items-center cursor-pointer text-center"
        >
          <span className="font-serif text-2xl font-normal tracking-[0.3em] text-white uppercase transition-opacity group-hover:opacity-80">
            SAELYXE
          </span>
        </button>

        {/* Right: User & Shopping Bag Actions */}
        <div className="flex items-center gap-3.5 relative">
          {user ? (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAccountDropdownOpen((prev) => !prev);
                }}
                className="p-0.5 text-white/90 hover:text-white cursor-pointer flex items-center gap-1"
                aria-label="User account"
              >
                <div className="w-7 h-7 rounded-full bg-white/15 border border-white/20 flex items-center justify-center font-serif text-xs text-white">
                  {user.name ? user.name[0]?.toUpperCase() : 'S'}
                </div>
              </button>
              <AccountDropdown 
                isOpen={isAccountDropdownOpen} 
                onClose={() => setIsAccountDropdownOpen(false)} 
                user={user} 
              />
            </div>
          ) : (
            <button
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

          <button
            onClick={() => setIsCartOpen(true)}
            className="relative p-1 text-white/90 hover:text-white transition-transform active:scale-95 cursor-pointer"
            aria-label="Shopping Bag"
          >
            <ShoppingBag className="w-6 h-6 stroke-[2]" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center bg-white text-black text-[10px] font-bold rounded-full px-1 border border-black/10 shadow-md">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Fullscreen Drawer Overlay */}
      <div
        className={`lg:hidden fixed inset-0 top-0 h-screen w-screen bg-[#121110]/95 backdrop-blur-xl z-40 px-6 pt-24 pb-12 flex flex-col justify-between transition-[opacity,transform] duration-300 ease-out transform-gpu will-change-transform ${
          isMobileMenuOpen
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
      >
        <div className="space-y-8">
          <div className="text-[11px] uppercase tracking-[0.3em] text-neutral-400 font-semibold px-2">
            Drop Categories
          </div>
          <div className="flex flex-col space-y-3">
            {navCategories.map((cat, idx) => {
              const isActive = activeCategory === cat.value;
              return (
                <button
                  key={cat.value}
                  onClick={() => handleCategoryClick(cat.value)}
                  style={{
                    transitionDelay: isMobileMenuOpen ? `${idx * 40 + 60}ms` : '0ms',
                  }}
                  className={`text-left text-lg tracking-[0.2em] uppercase transition-[opacity,transform,background-color] duration-300 transform-gpu px-5 py-4 rounded-2xl flex items-center justify-between ${
                    isMobileMenuOpen
                      ? 'translate-y-0 opacity-100'
                      : 'translate-y-3 opacity-0'
                  } ${
                    isActive
                      ? 'bg-white text-black font-bold shadow-lg scale-[1.01]'
                      : 'text-neutral-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span>{cat.label}</span>
                  {isActive && <span className="w-2 h-2 rounded-full bg-black" />}
                </button>
              );
            })}
          </div>

          <div className="pt-8 border-t border-white/10 space-y-5 px-2">
            <button
              onClick={() => {
                navigateTo({ name: 'track' });
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-between text-sm tracking-[0.2em] uppercase text-neutral-300 hover:text-white transition-colors cursor-pointer py-1"
            >
              <span>Track Order</span>
              <span className="text-base">→</span>
            </button>
            <button
              onClick={() => {
                navigateTo({ name: 'care-concierge' });
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-between text-sm tracking-[0.2em] uppercase text-neutral-300 hover:text-white transition-colors cursor-pointer py-1"
            >
              <span>Concierge</span>
              <span className="text-base">→</span>
            </button>
          </div>
        </div>

        <div className="pt-6 border-t border-white/10 flex items-center justify-between px-2">
          <span className="text-[11px] text-neutral-400 tracking-[0.2em] uppercase">HOUSE OF SAELYXE</span>
          <div className="flex items-center gap-2 bg-white/5 px-3.5 py-2 rounded-full border border-white/10">
            <span className="text-sm">{selectedCurrency?.flag}</span>
            <span className="text-xs font-mono text-white tracking-widest">{selectedCurrency?.code}</span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. DESKTOP NAVBAR (>= md)                                 */}
      {/* ========================================================= */}
      {/* ========================================================= */}
      {/* 2. DESKTOP NAVBAR (>= md)                                 */}
      {/* ========================================================= */}
      <nav
        className={`hidden lg:flex w-full transition-colors duration-300 px-6 lg:px-10 py-3.5 items-center justify-between relative z-50 ${
          isDarkNav
            ? 'bg-[#141210]/95 border-b border-white/10 shadow-2xl text-white'
            : 'bg-gradient-to-b from-black/50 via-black/20 to-transparent text-white'
        }`}
      >
        {/* Left: Brand Logo */}
        <button
          onClick={() => {
            navigateTo({ name: 'home' });
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="group flex items-center cursor-pointer text-left"
        >
          <span className="font-serif text-xl lg:text-2xl font-normal tracking-[0.35em] text-white uppercase transition-opacity group-hover:opacity-80">
            SAELYXE
          </span>
        </button>

        {/* Center: Category Navigation Pill */}
        <div className="absolute inset-x-0 mx-auto w-max flex items-center bg-black/70 border border-white/20 rounded-full px-4 py-1.5 shadow-2xl pointer-events-auto">
          <div className="flex items-center gap-1 sm:gap-2 text-[11px] lg:text-[11.5px] font-semibold tracking-[0.2em] uppercase text-white">
            {navCategories.map((cat) => {
              const isActive = activeCategory === cat.value && (currentRoute.name === 'collection');
              return (
                <button
                  key={cat.value}
                  onClick={() => handleCategoryClick(cat.value)}
                  className={`transition-all duration-200 cursor-pointer rounded-full px-3 py-1 whitespace-nowrap ${
                    isActive
                      ? 'text-white bg-white/20 font-bold'
                      : 'text-white/95 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3.5 lg:gap-4.5">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="p-1 text-white hover:text-white transition-colors cursor-pointer"
            aria-label="Search garments"
          >
            <Search className="w-4.5 h-4.5 lg:w-5 lg:h-5 stroke-[2]" />
          </button>

          <div className="w-[1px] h-4 bg-white/20" />

          {user ? (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAccountDropdownOpen((prev) => !prev);
                }}
                className="flex items-center gap-2 text-[11px] lg:text-xs uppercase tracking-[0.18em] font-medium text-white hover:text-white px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 transition-all cursor-pointer shadow-sm"
              >
                <div className="w-4 h-4 rounded-full bg-white/20 text-[9px] flex items-center justify-center font-serif font-bold">
                  {user.name ? user.name[0]?.toUpperCase() : 'S'}
                </div>
                <span className="max-w-[110px] truncate">{user.name}</span>
                <span className="text-[8px] opacity-60">▼</span>
              </button>
              <AccountDropdown 
                isOpen={isAccountDropdownOpen} 
                onClose={() => setIsAccountDropdownOpen(false)} 
                user={user} 
              />
            </div>
          ) : (
            <div className="flex items-center gap-3.5 lg:gap-4">
              <button
                onClick={() => {
                  setAuthMode('signin');
                  setIsAuthOpen(true);
                }}
                className="text-[11px] lg:text-xs uppercase tracking-[0.2em] font-medium text-white hover:text-white transition-colors cursor-pointer"
              >
                LOGIN
              </button>

              <button
                onClick={() => {
                  setAuthMode('signup');
                  setIsAuthOpen(true);
                }}
                className="text-[10.5px] lg:text-[11px] uppercase tracking-[0.18em] font-semibold text-[#181614] bg-white hover:bg-white/90 px-4 lg:px-5 py-1.5 rounded-full shadow-md transition-all active:scale-95 cursor-pointer"
              >
                SIGN UP
              </button>
            </div>
          )}

          <button
            onClick={() => setIsCartOpen(true)}
            className="relative p-1 text-white/90 hover:text-white transition-transform active:scale-95 cursor-pointer transform-gpu"
            aria-label="Shopping Bag"
          >
            <ShoppingBag className="w-4.5 h-4.5 lg:w-5 lg:h-5 stroke-[2]" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] flex items-center justify-center bg-white text-black text-[9px] font-bold rounded-full px-1 shadow-md border border-black/10">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </nav>

    </header>
  );
};