import React, { useState, useEffect } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export const SpotlightProduct: React.FC = () => {
  const { products, addToCart, settings } = useStore();

  const spotlightProduct = products.find(p => p.isSpotlight || p.id === 'prod-04') || products[0];

  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 12,
    minutes: 34,
    seconds: 56
  });

  const [selectedSize] = useState('M');
  const [isAdded, setIsAdded] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        if (prev.days > 0) return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleAdd = () => {
    if (spotlightProduct) {
      addToCart(spotlightProduct, selectedSize, 1);
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 2000);
    }
  };

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <section id="spotlight-section" className="relative w-full overflow-hidden bg-[#bfae98]">
      {/* Background Image Container - Height slightly extended for mobile */}
      <div className="relative w-full min-h-[680px] sm:min-h-[720px] md:min-h-[650px] lg:min-h-[750px] md:aspect-[16/9] flex items-center">
        <img
          src={settings?.spotlightBackgroundImage || '/images/spotlight19201080.avif'}
          alt="THE SIGNATURE COORDINATES SET"
          className="absolute inset-0 w-full h-full object-cover object-[65%_center] md:object-center"
          referrerPolicy="no-referrer"
        />

        {/* Subtle Overlay Gradient for Mobile Readability */}
        <div className="absolute inset-0 bg-black/20 md:bg-transparent pointer-events-none" />

        {/* Content Overlay */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-5 sm:px-10 md:px-16 lg:px-24 py-16 md:py-0">
          <div className="max-w-xl text-left space-y-5 sm:space-y-6 md:space-y-8">
            
            {/* Header Titles */}
            <div className="space-y-2 sm:space-y-3">
              <span className="block text-[11px] sm:text-xs md:text-sm uppercase tracking-[0.25em] sm:tracking-[0.3em] text-white/90 font-medium">
                {settings?.spotlightEyebrow || 'SAELYXE PREMIER KNITS'}
              </span>

              <h2 className="font-serif text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-light text-white tracking-wide leading-[1.08]">
                {settings?.spotlightTitle || (
                  <>
                    THE SIGNATURE<br />COORDINATES SET
                  </>
                )}
              </h2>
            </div>

            {/* Subtitle & Description */}
            <div className="space-y-1.5 sm:space-y-2 max-w-md">
              <h3 className="text-[11px] sm:text-xs md:text-sm font-semibold tracking-[0.2em] uppercase text-white/95">
                {settings?.spotlightSubhead || 'EXPERIENCE THE PRESENCE.'}
              </h3>
              <p className="text-xs sm:text-sm md:text-base text-white/85 font-light leading-relaxed">
                {settings?.spotlightDescription || (
                  <>
                    A curating of our most refined heavyweight textures.<br className="hidden sm:inline" /> Crafted for understated luxury.
                  </>
                )}
              </p>
            </div>

            {/* Timer Row */}
            <div className="pt-1 sm:pt-2">
              <div className="flex items-baseline gap-2 sm:gap-4 text-white">
                {/* Days */}
                <div className="flex flex-col items-center min-w-[32px] sm:min-w-[36px]">
                  <span className="text-lg sm:text-2xl md:text-3xl font-serif tracking-wider font-normal">
                    {pad(timeLeft.days)}
                  </span>
                  <span className="text-[8px] sm:text-[9px] md:text-[10px] tracking-[0.2em] text-white/80 uppercase mt-0.5 sm:mt-1">
                    DAYS
                  </span>
                </div>

                <span className="text-base sm:text-xl text-white/70">:</span>

                {/* Hours */}
                <div className="flex flex-col items-center min-w-[32px] sm:min-w-[36px]">
                  <span className="text-lg sm:text-2xl md:text-3xl font-serif tracking-wider font-normal">
                    {pad(timeLeft.hours)}
                  </span>
                  <span className="text-[8px] sm:text-[9px] md:text-[10px] tracking-[0.2em] text-white/80 uppercase mt-0.5 sm:mt-1">
                    HRS
                  </span>
                </div>

                <span className="text-base sm:text-xl text-white/70">:</span>

                {/* Minutes */}
                <div className="flex flex-col items-center min-w-[32px] sm:min-w-[36px]">
                  <span className="text-lg sm:text-2xl md:text-3xl font-serif tracking-wider font-normal">
                    {pad(timeLeft.minutes)}
                  </span>
                  <span className="text-[8px] sm:text-[9px] md:text-[10px] tracking-[0.2em] text-white/80 uppercase mt-0.5 sm:mt-1">
                    MIN
                  </span>
                </div>

                <span className="text-base sm:text-xl text-white/70">:</span>

                {/* Seconds */}
                <div className="flex flex-col items-center min-w-[32px] sm:min-w-[36px]">
                  <span className="text-lg sm:text-2xl md:text-3xl font-serif tracking-wider font-normal">
                    {pad(timeLeft.seconds)}
                  </span>
                  <span className="text-[8px] sm:text-[9px] md:text-[10px] tracking-[0.2em] text-white/80 uppercase mt-0.5 sm:mt-1">
                    SEC
                  </span>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <div className="pt-2 sm:pt-3">
              <button
                onClick={handleAdd}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-white hover:bg-stone-100 text-[#1A1816] px-7 sm:px-8 py-3 sm:py-3.5 rounded-full text-xs font-semibold uppercase tracking-[0.18em] transition-all duration-300 transform active:scale-95 cursor-pointer"
              >
                <span>{isAdded ? 'ADDED TO BAG' : 'ADD TO BAG'}</span>
                {isAdded ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <ArrowRight className="w-4 h-4 text-[#1A1816]" />
                )}
              </button>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};