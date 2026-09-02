import React, { useState, useEffect } from 'react';
import { Search, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export const HeroSection: React.FC = () => {
  const { 
    products, 
    formatPrice, 
    addToCart, 
    setActiveModalProduct,
    setIsSearchOpen 
  } = useStore();

  const [scrollY, setScrollY] = useState(0);
  const [activeSlide, setActiveSlide] = useState(0);

  // Quick view featured products for floating card carousel
  const heroFeaturedItems = products.length > 0 
    ? products.slice(0, 3) 
    : [
        {
          id: 'prod-01',
          title: 'SÆ SIGNATURE TEE',
          subtitle: 'Sand Khaki',
          priceLKR: 7900,
          category: 'new' as const,
          images: ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80'],
          description: 'Constructed from custom-developed 280 GSM heavyweight combed cotton.',
          fabricDetails: '100% Heavyweight Cotton',
          sizes: ['S', 'M', 'L', 'XL'],
          inStock: true,
          stockCount: 40
        },
        {
          id: 'prod-02',
          title: 'SÆ SIGNATURE SHIRT',
          subtitle: 'Sand Khaki',
          priceLKR: 7900,
          category: 'new' as const,
          images: ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80'],
          description: 'Constructed from custom-developed 280 GSM heavyweight combed cotton.',
          fabricDetails: '100% Heavyweight Cotton',
          sizes: ['S', 'M', 'L', 'XL'],
          inStock: true,
          stockCount: 40
        }
      ];

  const currentFloatingProduct = heroFeaturedItems[activeSlide % heroFeaturedItems.length] || heroFeaturedItems[0];

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToDrops = () => {
    const el = document.getElementById('spotlight-section') || document.getElementById('collection-grid');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative w-full h-[100dvh] min-h-[660px] max-h-[1100px] overflow-hidden bg-[#181614] select-none">
      {/* 1. BOTTOM LAYER: Lifestyle Background */}
      <div
        className="absolute inset-0 w-full h-full transform transition-transform duration-75 ease-out scale-105"
        style={{
          transform: `translateY(${scrollY * 0.12}px) scale(1.05)`,
        }}
      >
        <img
          src="https://houseofsaelyx.vercel.app/images/hero19201080.avif"
          alt="SAELYX Editorial Lifestyle Collection"
          className="w-full h-full object-cover object-[55%_center] md:object-center filter brightness-[0.95]"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/30 pointer-events-none" />
      </div>

      {/* 2. MIDDLE LAYER: Luxury "SAELYX" Backdrop */}
      <div
        className="absolute inset-x-0 top-[18%] md:top-[12%] flex items-center justify-center pointer-events-none z-10"
        style={{
          transform: `translateY(${scrollY * -0.15}px)`,
        }}
      >
        <h1 className="font-serif text-[28vw] md:text-[22vw] font-normal tracking-[0.05em] text-white/[0.07] uppercase whitespace-nowrap select-none leading-none">
          SAELYX
        </h1>
      </div>

      {/* 3. FOREGROUND LAYER */}
      <div className="relative z-20 max-w-7xl mx-auto h-full px-4 sm:px-10 md:px-14 flex flex-col justify-between pt-16 md:pt-28 pb-6">
        
        {/* Mobile Search Bar */}
        <div className="w-full md:hidden mb-2 z-30">
          <div 
            onClick={() => setIsSearchOpen(true)}
            className="w-full bg-white/95 backdrop-blur-md rounded-full px-5 py-3 flex items-center gap-3 shadow-2xl border border-white/40 cursor-pointer active:scale-[0.99] transition-transform"
          >
            <Search className="w-4 h-4 text-neutral-600 flex-shrink-0" />
            <span className="w-full bg-transparent text-sm text-neutral-500 font-normal">
              Search
            </span>
          </div>
        </div>

        {/* --- DESKTOP LAYOUT --- */}
        <div className="hidden md:flex my-auto w-full flex-row items-end justify-between gap-6 pt-16">
          {/* Desktop Left Text Block */}
          <div className="w-[325px] text-left flex flex-col items-start md:-translate-x-[160px] md:translate-y-[60px] mt-[158px] -ml-[3px] transition-transform px-1">
            <span className="block text-[10px] font-medium tracking-[0.25em] text-white/90 uppercase mb-3">
              NEW COLLECTION
            </span>

            <h2 className="font-serif text-5xl lg:text-[52px] font-normal tracking-wide text-white uppercase leading-[1.15] drop-shadow-lg max-w-md mb-5">
              MADE FOR <br />
              PRESENCE
            </h2>

            <p className="text-white/90 text-xs sm:text-sm font-light tracking-wide max-w-xs leading-relaxed drop-shadow-md mb-7">
              Designed for those who enter a room before they speak.
            </p>

            <div>
              <button
                onClick={scrollToDrops}
                className="group inline-flex items-center gap-2.5 bg-white text-[#181614] hover:bg-white/90 px-7 py-2.5 rounded-full text-[11px] font-semibold uppercase tracking-[0.15em] shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <span>EXPLORE COLLECTION</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
            </div>
          </div>

          {/* Desktop Right Showcase Card */}
          {currentFloatingProduct && (
            <div className="w-auto flex flex-col items-end gap-2.5 transition-transform md:translate-x-[140px] md:translate-y-[45px]">
              <div
                onClick={() => setActiveModalProduct(currentFloatingProduct)}
                className="relative w-[280px] aspect-[16/10] rounded-2xl overflow-hidden shadow-2xl border border-white/20 cursor-pointer transition-all duration-300 active:scale-95 bg-neutral-900 group"
              >
                <img
                  src={currentFloatingProduct.images[0] || 'https://houseofsaelyx.vercel.app/images/hero19201080.avif'}
                  alt={currentFloatingProduct.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveSlide((prev) => (prev - 1 + heroFeaturedItems.length) % heroFeaturedItems.length);
                  }}
                  className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 text-white/90 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity hover:bg-black/80 active:scale-90 cursor-pointer z-10"
                  aria-label="Previous product"
                  title="Previous product"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveSlide((prev) => (prev + 1) % heroFeaturedItems.length);
                  }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 text-white/90 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity hover:bg-black/80 active:scale-90 cursor-pointer z-10"
                  aria-label="Next product"
                  title="Next product"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <div className="absolute inset-0 p-3.5 flex flex-col justify-end text-white text-left pointer-events-none">
                  <div className="flex items-end justify-between pointer-events-auto">
                    <div className="min-w-0 pr-2">
                      <h4 className="text-[10px] font-sans font-semibold tracking-[0.12em] uppercase truncate drop-shadow">
                        {currentFloatingProduct.title}
                      </h4>
                      <p className="text-[10px] font-mono text-white/90 drop-shadow mt-0.5">
                        {formatPrice ? formatPrice(currentFloatingProduct.priceLKR) : `LKR ${currentFloatingProduct.priceLKR?.toLocaleString()}`}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(currentFloatingProduct);
                      }}
                      className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center shadow-md transition-all active:scale-95 hover:bg-neutral-100 flex-shrink-0 cursor-pointer"
                      aria-label="Quick Add to Bag"
                      title="Quick Add to Bag"
                    >
                      <ArrowRight className="w-3.5 h-3.5 stroke-[2]" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Slider Controls */}
              <div className="flex items-center justify-between w-full max-w-[280px] px-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveSlide((prev) => (prev - 1 + heroFeaturedItems.length) % heroFeaturedItems.length);
                  }}
                  className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1.5 justify-center">
                  {heroFeaturedItems.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveSlide(idx);
                      }}
                      className={`h-[2.5px] transition-all duration-300 cursor-pointer rounded-full ${
                        activeSlide % heroFeaturedItems.length === idx
                          ? 'w-8 bg-white'
                          : 'w-4 bg-white/30 hover:bg-white/60'
                      }`}
                      aria-label={`Slide ${idx + 1}`}
                    />
                  ))}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveSlide((prev) => (prev + 1) % heroFeaturedItems.length);
                  }}
                  className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Next slide"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* --- MOBILE LAYOUT --- */}
        <div className="md:hidden">
          <div className="absolute top-[48%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center flex flex-col items-center space-y-2.5 px-4 z-20">
            <span className="block text-[10px] font-medium tracking-[0.25em] text-white/90 uppercase">
              NEW COLLECTION
            </span>

            <h2 className="font-serif text-3xl font-normal tracking-wide text-white uppercase leading-[1.12] drop-shadow-lg max-w-xs">
              MADE FOR <br />
              PRESENCE
            </h2>

            <p className="text-white/90 text-xs font-light tracking-wide max-w-[240px] leading-relaxed drop-shadow-md">
              Designed for those who enter a room before they speak.
            </p>

            <div className="pt-1.5">
              <button
                onClick={scrollToDrops}
                className="group inline-flex items-center gap-2 bg-white text-[#181614] hover:bg-white/90 px-6 py-2.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.15em] shadow-xl transition-all duration-300 active:scale-[0.98] cursor-pointer"
              >
                <span>EXPLORE COLLECTION</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
            </div>
          </div>

          {/* Mobile Product Strip */}
          {heroFeaturedItems.length > 0 && (
            <div className="absolute right-0 bottom-20 z-30 flex flex-col items-end gap-2">
              <div className="flex items-center gap-2.5 overflow-x-auto max-w-[40vw] no-scrollbar pr-3">
                {heroFeaturedItems.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => setActiveModalProduct(product)}
                    className="relative w-[125px] aspect-[4/5] rounded-xl overflow-hidden shadow-2xl border border-white/20 bg-neutral-900 group cursor-pointer flex-shrink-0 transition-transform active:scale-95"
                  >
                    <img
                      src={product.images[0]}
                      alt={product.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                    <div className="absolute inset-x-0 bottom-0 p-2 flex flex-col justify-end text-white text-left">
                      <h4 className="text-[9px] font-sans font-semibold tracking-wider uppercase truncate drop-shadow leading-tight">
                        {product.title}
                      </h4>
                      <p className="text-[8.5px] font-mono text-white/90 drop-shadow mt-0.5">
                        {formatPrice ? formatPrice(product.priceLKR) : `LKR ${product.priceLKR?.toLocaleString()}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-1 mr-3">
                {heroFeaturedItems.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveSlide(idx)}
                    className={`h-[2px] rounded-full transition-all duration-300 cursor-pointer ${
                      activeSlide % heroFeaturedItems.length === idx ? 'w-5 bg-white' : 'w-2.5 bg-white/40'
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Scroll Indicator */}
        <div className="w-full flex justify-center pb-1 z-20">
          <div
            onClick={scrollToDrops}
            className="cursor-pointer group flex flex-col items-center gap-1 text-white/70 hover:text-white transition-colors"
          >
            <div className="w-3.5 h-6 rounded-full border border-white/50 flex items-start justify-center p-1 group-hover:border-white transition-colors">
              <span className="w-0.5 h-1 rounded-full bg-white animate-bounce" />
            </div>
            <span className="text-[7.5px] uppercase tracking-[0.25em] font-medium text-white/70">
              SCROLL TO DISCOVER
            </span>
          </div>
        </div>

      </div>
    </section>
  );
};