import React, { useState } from 'react';
import { Search, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export const HeroSection: React.FC = () => {
  const {
    products,
    formatPrice,
    addToCart,
    setActiveModalProduct,
    setIsSearchOpen,
    settings,
  } = useStore();

  const [activeSlide, setActiveSlide] = useState(0);

  const heroFeaturedItems = products.slice(0, 3);
  const currentFloatingProduct = heroFeaturedItems.length > 0
    ? heroFeaturedItems[activeSlide % heroFeaturedItems.length]
    : null;

  const heroHeadline = (settings?.heroHeadline || 'MADE FOR PRESENCE').replace(/\bSAELYX\b/g, 'SAELYXE');
  const heroSubhead = settings?.heroSubhead || 'Designed for those who enter a room before they speak.';

  const scrollToDrops = () => {
    const element = document.getElementById('spotlight-section') || document.getElementById('collection-grid');
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section 
      className="relative w-full h-[100dvh] min-h-[600px] overflow-hidden select-none flex items-center justify-center bg-[#181614]"
    >
      {/* 100% Full-Screen Edge-to-Edge Hero Image */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <img
          src="/images/saelyxe-hero.png"
          alt="SAELYXE Editorial Lifestyle Collection"
          className="w-full h-full"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center 10%',
            display: 'block',
          }}
          referrerPolicy="no-referrer"
          fetchPriority="high"
          decoding="sync"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
        <div className="absolute inset-0 bg-black/5 pointer-events-none" />
      </div>

      <div className="relative z-20 w-full h-full px-4 sm:px-6 md:pl-4 md:pr-4 lg:pl-5 lg:pr-5 flex flex-col justify-between pt-16 md:pt-24 pb-2 md:pb-2.5">
        <div className="w-full md:hidden mb-2 z-30">
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="w-full bg-white/95 backdrop-blur-md rounded-full px-5 py-3 flex items-center gap-3 shadow-2xl border border-white/40 cursor-pointer active:scale-[0.99] transition-transform text-left"
          >
            <Search className="w-4 h-4 text-neutral-600 flex-shrink-0" />
            <span className="w-full bg-transparent text-sm text-neutral-500 font-normal">Search</span>
          </button>
        </div>

        <div className="hidden md:flex mt-auto mb-0 w-full flex-row items-end justify-between gap-8 z-20">
          <div className="max-w-md text-left flex flex-col items-start space-y-4 translate-y-1 lg:translate-y-2">
            <span className="block text-[10px] font-semibold tracking-[0.25em] text-white/90 uppercase">NEW COLLECTION</span>

            <h2 className="font-serif text-4xl lg:text-5xl xl:text-[52px] font-normal tracking-wide text-white uppercase leading-[1.12] drop-shadow-xl whitespace-pre-line">
              {heroHeadline}
            </h2>

            <p className="text-white/90 text-xs lg:text-sm font-normal tracking-wide max-w-sm leading-relaxed drop-shadow-md">{heroSubhead}</p>

            <div className="pt-2">
              <button
                type="button"
                onClick={scrollToDrops}
                className="group inline-flex items-center gap-2.5 bg-white text-[#181614] hover:bg-white/90 px-7 py-3 rounded-full text-[11px] font-semibold uppercase tracking-[0.18em] shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <span>EXPLORE COLLECTION</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
            </div>
          </div>

          {currentFloatingProduct && (
            <div className="w-auto flex flex-col items-end gap-2 z-20 translate-y-1 lg:translate-y-2 animate-luxury-float">
              <div
                onClick={() => setActiveModalProduct(currentFloatingProduct)}
                className="relative w-[230px] lg:w-[250px] aspect-[16/10.5] rounded-xl overflow-hidden shadow-2xl border border-white/20 cursor-pointer transition-all duration-300 hover:shadow-white/10 active:scale-95 bg-neutral-900 group"
              >
                <img
                  key={currentFloatingProduct.id}
                  src={currentFloatingProduct.images[0] || 'https://saelyxe.com/images/hero19201080.avif'}
                  alt={currentFloatingProduct.title}
                  className="w-full h-full object-cover animate-product-pan group-hover:[animation-play-state:paused] transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />

                <button
                  type="button"
                  onClick={event => {
                    event.stopPropagation();
                    setActiveSlide(previous => (previous - 1 + heroFeaturedItems.length) % heroFeaturedItems.length);
                  }}
                  className="absolute left-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/60 text-white/90 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity hover:bg-black/90 active:scale-90 cursor-pointer z-30"
                  aria-label="Previous product"
                  title="Previous product"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={event => {
                    event.stopPropagation();
                    setActiveSlide(previous => (previous + 1) % heroFeaturedItems.length);
                  }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/60 text-white/90 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity hover:bg-black/90 active:scale-90 cursor-pointer z-30"
                  aria-label="Next product"
                  title="Next product"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <div className="absolute inset-x-0 bottom-0 p-2.5 flex flex-col justify-end text-white text-left z-20 pointer-events-none">
                  <div className="flex items-end justify-between pointer-events-auto">
                    <div className="min-w-0 pr-2">
                      <h4 className="text-[10px] font-sans font-semibold tracking-[0.12em] uppercase truncate drop-shadow">{currentFloatingProduct.title}</h4>
                      <p className="text-[9.5px] font-sans text-white/90 drop-shadow mt-0.5">{formatPrice(currentFloatingProduct.priceLKR)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={event => {
                        event.stopPropagation();
                        addToCart(currentFloatingProduct);
                      }}
                      className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center shadow-md transition-all active:scale-95 hover:bg-neutral-100 flex-shrink-0 cursor-pointer"
                      aria-label="Quick Add to Bag"
                      title="Quick Add to Bag"
                    >
                      <ArrowRight className="w-3 h-3 stroke-[2]" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between w-full max-w-[230px] lg:max-w-[250px] px-1">
                <button
                  type="button"
                  onClick={() => setActiveSlide(previous => (previous - 1 + heroFeaturedItems.length) % heroFeaturedItems.length)}
                  className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <div className="flex items-center gap-1.5 justify-center">
                  {heroFeaturedItems.map((_, index) => (
                    <button
                      type="button"
                      key={index}
                      onClick={() => setActiveSlide(index)}
                      className={`h-[2px] transition-all duration-300 cursor-pointer rounded-full ${activeSlide % heroFeaturedItems.length === index ? 'w-6 bg-white' : 'w-3 bg-white/30 hover:bg-white/60'}`}
                      aria-label={`Slide ${index + 1}`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSlide(previous => (previous + 1) % heroFeaturedItems.length)}
                  className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Next slide"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* --- MOBILE LAYOUT --- */}
        <div className="md:hidden">
          <div className="absolute top-[48%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center flex flex-col items-center space-y-2.5 px-4 z-20">
            <span className="block text-[10px] font-medium tracking-[0.25em] text-white/90 uppercase">NEW COLLECTION</span>
            <h2 className="font-serif text-3xl font-normal tracking-wide text-white uppercase leading-[1.12] drop-shadow-lg max-w-xs whitespace-pre-line">{heroHeadline}</h2>
            <p className="text-white/90 text-xs font-normal tracking-wide max-w-[250px] leading-relaxed drop-shadow-md">{heroSubhead}</p>
            <div className="pt-2">
              <button
                type="button"
                onClick={scrollToDrops}
                className="group inline-flex items-center gap-2 bg-white text-[#181614] hover:bg-white/90 px-6 py-2.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.15em] shadow-xl transition-all duration-300 active:scale-[0.98] cursor-pointer"
              >
                <span>EXPLORE COLLECTION</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
            </div>
          </div>

          {heroFeaturedItems.length > 0 && currentFloatingProduct && (
            <div className="absolute right-3.5 bottom-16 z-30 flex flex-col items-end gap-1.5 animate-luxury-float">
              <div
                onClick={() => setActiveModalProduct(currentFloatingProduct)}
                className="relative w-[130px] aspect-[4/5] rounded-xl overflow-hidden shadow-2xl border border-white/20 bg-neutral-900 group cursor-pointer flex-shrink-0 transition-transform active:scale-95"
              >
                <img
                  key={currentFloatingProduct.id}
                  src={currentFloatingProduct.images[0]}
                  alt={currentFloatingProduct.title}
                  className="w-full h-full object-cover animate-product-pan transition-transform duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />
                <div className="absolute inset-x-0 bottom-0 p-2 flex flex-col justify-end text-white text-left z-20">
                  <h4 className="text-[9px] font-sans font-semibold tracking-wider uppercase truncate drop-shadow leading-tight">{currentFloatingProduct.title}</h4>
                  <p className="text-[8.5px] font-sans text-white/90 drop-shadow mt-0.5">{formatPrice(currentFloatingProduct.priceLKR)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 justify-center w-full pr-1">
                {heroFeaturedItems.map((_, index) => (
                  <button
                    type="button"
                    key={index}
                    onClick={() => setActiveSlide(index)}
                    className={`h-[2px] rounded-full transition-all duration-300 cursor-pointer ${activeSlide % heroFeaturedItems.length === index ? 'w-5 bg-white' : 'w-2.5 bg-white/40'}`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="w-full flex justify-center pb-1 z-20">
          <button type="button" onClick={scrollToDrops} className="cursor-pointer group flex flex-col items-center gap-1 text-white/70 hover:text-white transition-colors">
            <div className="w-3.5 h-6 rounded-full border border-white/50 flex items-start justify-center p-1 group-hover:border-white transition-colors">
              <span className="w-0.5 h-1 rounded-full bg-white animate-bounce" />
            </div>
            <span className="text-[7.5px] uppercase tracking-[0.25em] font-medium text-white/70">SCROLL TO DISCOVER</span>
          </button>
        </div>
      </div>
    </section>
  );
};
