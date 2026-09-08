import React, { useState, useEffect } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { ArrowRight, Check, Lock } from 'lucide-react';
import { useStore } from '../context/StoreContext';

// Single digit renderer driven by continuous Framer Motion spring physics
function NumberItem({ mv, number, height }: { mv: any; number: number; height: number }) {
  const y = useTransform(mv, (latest: number) => {
    // Normalize spring value to 0-9 range
    const placeValue = ((latest % 10) + 10) % 10;
    let offset = (10 + number - placeValue) % 10;
    let memo = offset * height;

    // Wrap numbers taking the shortest spatial path
    if (offset > 5) {
      memo -= 10 * height;
    }
    return memo;
  });

  return (
    <motion.span
      className="absolute inset-0 flex items-center justify-center font-serif leading-none"
      style={{ y }}
    >
      {number}
    </motion.span>
  );
}

// Spring Digit container
function SpringDigit({ value, height }: { value: number; height: number }) {
  const animatedValue = useSpring(value, {
    stiffness: 200,
    damping: 25,
    mass: 0.8,
  });

  useEffect(() => {
    animatedValue.set(value);
  }, [animatedValue, value]);

  return (
    <div
      className="relative inline-block overflow-hidden tabular-nums font-serif select-none"
      style={{ height, width: '0.6em' }}
    >
      {Array.from({ length: 10 }, (_, i) => (
        <NumberItem key={i} mv={animatedValue} number={i} height={height} />
      ))}
    </div>
  );
}

// Two-digit group slot
function NumberSlot({ value, height = 36 }: { value: number; height?: number }) {
  const formatted = value.toString().padStart(2, '0');
  const d1 = parseInt(formatted[0], 10);
  const d2 = parseInt(formatted[1], 10);

  return (
    <div className="flex items-center justify-center leading-none" style={{ height }}>
      <SpringDigit value={d1} height={height} />
      <SpringDigit value={d2} height={height} />
    </div>
  );
}

export const SpotlightProduct: React.FC = () => {
  const { products, addToCart, settings } = useStore();

  const spotlightProduct = products.find(p => p.isSpotlight || p.id === 'prod-04') || products[0];

  const isDropped = false;

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
    if (spotlightProduct && isDropped) {
      addToCart(spotlightProduct, selectedSize, 1);
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 2000);
    }
  };

  const TimerDisplay = ({ height = 36 }: { height?: number }) => (
    <div className="flex items-baseline justify-center md:justify-start gap-2 sm:gap-3.5 text-white">
      <div className="flex flex-col items-center">
        <div className="text-xl sm:text-2xl md:text-3xl font-serif font-light text-white leading-none">
          <NumberSlot value={timeLeft.days} height={height} />
        </div>
        <span className="text-[7px] sm:text-[8px] md:text-[9px] tracking-[0.2em] text-white/70 uppercase mt-2">
          DAYS
        </span>
      </div>

      <span className="text-base sm:text-xl text-white/40 font-light select-none leading-none mb-3">:</span>

      <div className="flex flex-col items-center">
        <div className="text-xl sm:text-2xl md:text-3xl font-serif font-light text-white leading-none">
          <NumberSlot value={timeLeft.hours} height={height} />
        </div>
        <span className="text-[7px] sm:text-[8px] md:text-[9px] tracking-[0.2em] text-white/70 uppercase mt-2">
          HRS
        </span>
      </div>

      <span className="text-base sm:text-xl text-white/40 font-light select-none leading-none mb-3">:</span>

      <div className="flex flex-col items-center">
        <div className="text-xl sm:text-2xl md:text-3xl font-serif font-light text-white leading-none">
          <NumberSlot value={timeLeft.minutes} height={height} />
        </div>
        <span className="text-[7px] sm:text-[8px] md:text-[9px] tracking-[0.2em] text-white/70 uppercase mt-2">
          MIN
        </span>
      </div>

      <span className="text-base sm:text-xl text-white/40 font-light select-none leading-none mb-3">:</span>

      <div className="flex flex-col items-center">
        <div className="text-xl sm:text-2xl md:text-3xl font-serif font-light text-white leading-none">
          <NumberSlot value={timeLeft.seconds} height={height} />
        </div>
        <span className="text-[7px] sm:text-[8px] md:text-[9px] tracking-[0.2em] text-white/70 uppercase mt-2">
          SEC
        </span>
      </div>
    </div>
  );

  return (
    <section id="spotlight-section" className="relative w-full overflow-hidden bg-[#1A1816] select-none">
      <div className="relative w-full min-h-[660px] sm:min-h-[720px] md:min-h-[780px] lg:min-h-[820px] flex items-center py-12 md:py-0">
        
        {/* Background Pedestal Product Image with Mobile-Blur Protection */}
        <img
          src={settings?.spotlightBackgroundImage || '/images/spotlight19201080.avif'}
          alt="THE SIGNATURE COORDINATES SET"
          onContextMenu={(e) => e.preventDefault()}
          draggable={false}
          className={`absolute inset-0 w-full h-full object-cover object-[68%_center] md:object-center pointer-events-none transition-all duration-700 ${
            !isDropped ? 'blur-md scale-105 md:blur-none md:scale-100' : ''
          }`}
          referrerPolicy="no-referrer"
        />

        {/* Protection Shield Overlay Div */}
        <div 
          className="absolute inset-0 z-0 bg-transparent" 
          onContextMenu={(e) => e.preventDefault()} 
        />

        {/* Ambient Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/35 md:from-black/50 md:via-transparent md:to-black/30 pointer-events-none" />

        {/* Main Section Content Grid */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-5 sm:px-10 md:px-14 lg:px-20 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          
          {/* LEFT COLUMN: Product Info & CTA */}
          <div className="md:col-span-6 lg:col-span-5 space-y-5 sm:space-y-6 text-left">
            <div className="space-y-2">
              <span className="block text-[11px] sm:text-xs md:text-sm uppercase tracking-[0.25em] text-white/90 font-medium">
                {settings?.spotlightEyebrow || 'SAELYXE PREMIER KNITS'}
              </span>

              <h2 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-light text-white tracking-wide leading-[1.08]">
                {settings?.spotlightTitle || (
                  <>
                    THE SIGNATURE<br />COORDINATES SET
                  </>
                )}
              </h2>
            </div>

            <div className="space-y-1.5 sm:space-y-2 max-w-md">
              <h3 className="text-[11px] sm:text-xs font-semibold tracking-[0.2em] uppercase text-white/90">
                {settings?.spotlightSubhead || 'EXPERIENCE THE PRESENCE.'}
              </h3>
              <p className="text-xs sm:text-sm text-white/80 font-normal leading-relaxed">
                {settings?.spotlightDescription || (
                  <>
                    A curating of our most refined heavyweight textures. Crafted for understated luxury.
                  </>
                )}
              </p>
            </div>

            {/* MOBILE ONLY: Inline Refined Timer Box */}
            {!isDropped && (
              <div className="block md:hidden pt-1">
                <div className="inline-block bg-black/35 backdrop-blur-md border border-white/20 rounded-xl px-5 py-3.5 shadow-lg">
                  <span className="block text-[9px] uppercase tracking-[0.2em] text-white/70 font-medium mb-2">
                    LIMITED OFFER STARTS IN
                  </span>
                  <TimerDisplay height={28} />
                </div>
              </div>
            )}

            {/* CTA Button */}
            <div className="pt-2">
              <button
                onClick={handleAdd}
                disabled={!isDropped}
                className={`w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-3.5 rounded-full text-xs font-semibold uppercase tracking-[0.18em] transition-all duration-300 shadow-xl ${
                  isDropped 
                    ? 'bg-white hover:bg-stone-100 text-[#1A1816] cursor-pointer active:scale-95' 
                    : 'bg-white/20 backdrop-blur-md text-white/70 cursor-not-allowed border border-white/15'
                }`}
              >
                <span>{isDropped ? (isAdded ? 'ADDED TO BAG' : 'ADD TO BAG') : 'LOCKED UNTIL DROP'}</span>
                {!isDropped ? (
                  <Lock className="w-3.5 h-3.5 text-white/70" />
                ) : isAdded ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <ArrowRight className="w-4 h-4 text-[#1A1816]" />
                )}
              </button>
            </div>
          </div>

          {/* DESKTOP ONLY: Larger Frosted Glass Concealer Container over Pedestal */}
          {!isDropped && (
            <div className="hidden md:flex md:col-span-6 lg:col-span-7 justify-end items-center">
              <div className="w-full max-w-xl lg:max-w-2xl h-[460px] lg:h-[520px] rounded-2xl bg-stone-900/40 backdrop-blur-3xl border border-white/20 p-8 lg:p-12 flex flex-col justify-center items-center text-center shadow-2xl transition-all">
                
                <div className="space-y-7">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md">
                    <Lock className="w-3.5 h-3.5 text-amber-200" />
                    <span className="text-[10px] uppercase tracking-[0.25em] text-white/90 font-medium">
                      UNRELEASED DROP
                    </span>
                  </div>

                  <div className="space-y-3">
                    <span className="block text-xs uppercase tracking-[0.22em] text-white/70 font-medium">
                      LIMITED OFFER STARTS IN
                    </span>
                    <TimerDisplay height={38} />
                  </div>

                  <p className="text-xs text-white/60 tracking-widest uppercase max-w-xs mx-auto font-light leading-relaxed">
                    Exclusive Archive Release
                  </p>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>
    </section>
  );
};