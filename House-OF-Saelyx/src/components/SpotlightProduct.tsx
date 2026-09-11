import React, { useEffect, useMemo, useState } from 'react';

import { ArrowRight, Check, Lock } from 'lucide-react';
import { useStore } from '../context/StoreContext';

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
};

function getTimeLeft(target?: string | null): TimeLeft {
  const targetMs = target ? Date.parse(target) : Number.NaN;
  if (!Number.isFinite(targetMs)) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 };
  }

  const totalMs = Math.max(0, targetMs - Date.now());
  const totalSeconds = Math.floor(totalMs / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    totalMs,
  };
}

function NumberSlot({ value, height = 36 }: { value: number; height?: number }) {
  const formatted = Math.max(0, value).toString().padStart(2, '0');
  return (
    <div className="flex items-center justify-center tabular-nums font-serif leading-none" style={{ height }}>
      <span>{formatted}</span>
    </div>
  );
}

function normalizeBrandText(value: string) {
  return value.replace(/\bSAELYX\b/g, 'SAELYXE');
}

export const SpotlightProduct: React.FC = () => {
  const { products, addToCart, settings, formatPrice } = useStore();
  const spotlightProduct = products.find(product => product.isSpotlight) || products[0];
  const countdownTarget = settings?.countdownTarget || '';
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => getTimeLeft(countdownTarget));
  const [isAdded, setIsAdded] = useState(false);

  useEffect(() => {
    const update = () => setTimeLeft(getTimeLeft(countdownTarget));
    update();
    const intervalId = window.setInterval(update, 1000);
    return () => window.clearInterval(intervalId);
  }, [countdownTarget]);

  const isDropped = timeLeft.totalMs <= 0;
  const selectedSize = useMemo(() => {
    if (!spotlightProduct?.sizes?.length) return 'ONE SIZE';
    return spotlightProduct.sizes.includes('M') ? 'M' : spotlightProduct.sizes[0];
  }, [spotlightProduct]);

  // Product price has one source of truth: the catalog product itself.
  // Storefront settings must never be able to display a different amount from checkout.
  const displayPrice = Number(spotlightProduct?.priceLKR || 0);

  const handleAdd = () => {
    if (!spotlightProduct || !isDropped || !spotlightProduct.inStock) return;
    const added = addToCart(spotlightProduct, selectedSize, 1);
    if (added) {
      setIsAdded(true);
      window.setTimeout(() => setIsAdded(false), 2000);
    }
  };

  const TimerDisplay = ({ height = 36 }: { height?: number }) => (
    <div className="flex items-baseline justify-center md:justify-start gap-2 sm:gap-3.5 text-white" aria-label="Drop countdown">
      {([
        ['DAYS', timeLeft.days],
        ['HRS', timeLeft.hours],
        ['MIN', timeLeft.minutes],
        ['SEC', timeLeft.seconds],
      ] as const).map(([label, value], index) => (
        <React.Fragment key={label}>
          {index > 0 && <span className="text-base sm:text-xl text-white/40 font-light select-none leading-none mb-3">:</span>}
          <div className="flex flex-col items-center">
            <div className="text-xl sm:text-2xl md:text-3xl font-serif font-light text-white leading-none">
              <NumberSlot value={value} height={height} />
            </div>
            <span className="text-[7px] sm:text-[8px] md:text-[9px] tracking-[0.2em] text-white/70 uppercase mt-2">{label}</span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );

  const eyebrow = normalizeBrandText(settings?.spotlightEyebrow || 'SAELYXE PREMIER KNITS');
  const title = settings?.spotlightTitle || 'THE SIGNATURE COORDINATES SET';
  const subhead = settings?.spotlightSubhead || 'EXPERIENCE THE PRESENCE.';
  const description = settings?.spotlightDescription || 'A curation of our most refined heavyweight textures. Crafted for understated luxury.';

  return (
    <section id="spotlight-section" className="relative w-full overflow-hidden bg-[#1A1816] select-none">
      <div className="relative w-full min-h-[660px] sm:min-h-[720px] md:min-h-[780px] lg:min-h-[820px] flex items-center py-12 md:py-0">
        <img
          src={settings?.spotlightBackgroundImage || '/images/spotlight19201080.avif'}
          alt={title}
          onContextMenu={event => event.preventDefault()}
          draggable={false}
          className={`absolute inset-0 w-full h-full object-cover object-[68%_center] md:object-center pointer-events-none transition-opacity duration-300`}
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 z-0 bg-transparent" onContextMenu={event => event.preventDefault()} />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/35 md:from-black/50 md:via-transparent md:to-black/30 pointer-events-none" />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-5 sm:px-10 md:px-14 lg:px-20 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-6 lg:col-span-5 space-y-5 sm:space-y-6 text-left">
            <div className="space-y-2">
              <span className="block text-[11px] sm:text-xs md:text-sm uppercase tracking-[0.25em] text-white/90 font-medium">{eyebrow}</span>
              <h2 className="font-sans text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight uppercase leading-[1.04]">{title}</h2>
            </div>

            <div className="space-y-1.5 sm:space-y-2 max-w-md">
              <h3 className="text-[11px] sm:text-xs font-semibold tracking-[0.2em] uppercase text-white/90">{subhead}</h3>
              <p className="text-xs sm:text-sm text-white/80 font-normal leading-relaxed">{description}</p>
              {displayPrice > 0 && (
                <p className="pt-2 text-sm sm:text-base text-white font-semibold tracking-wide">{formatPrice(displayPrice)}</p>
              )}
            </div>

            {!isDropped && (
              <div className="block md:hidden pt-1">
                <div className="inline-block bg-black/35 border border-white/20 rounded-xl px-5 py-3.5 shadow-lg">
                  <span className="block text-[9px] uppercase tracking-[0.2em] text-white/70 font-medium mb-2">LIMITED OFFER STARTS IN</span>
                  <TimerDisplay height={28} />
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={handleAdd}
                disabled={!isDropped || !spotlightProduct?.inStock}
                className={`w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-3.5 rounded-full text-xs font-semibold uppercase tracking-[0.18em] transition-all duration-300 shadow-xl ${isDropped && spotlightProduct?.inStock ? 'bg-white hover:bg-stone-100 text-[#1A1816] cursor-pointer active:scale-95' : 'bg-white/20 text-white/70 cursor-not-allowed border border-white/15'}`}
              >
                <span>{!isDropped ? 'LOCKED UNTIL DROP' : !spotlightProduct?.inStock ? 'SOLD OUT' : isAdded ? 'ADDED TO BAG' : 'ADD TO BAG'}</span>
                {!isDropped ? <Lock className="w-3.5 h-3.5 text-white/70" /> : isAdded ? <Check className="w-4 h-4 text-emerald-600" /> : <ArrowRight className="w-4 h-4 text-[#1A1816]" />}
              </button>
            </div>
          </div>

          {!isDropped && (
            <div className="hidden md:flex md:col-span-6 lg:col-span-7 justify-end items-center">
              <div className="w-full max-w-xl lg:max-w-2xl h-[460px] lg:h-[520px] rounded-2xl bg-stone-900/40 border border-white/20 p-8 lg:p-12 flex flex-col justify-center items-center text-center shadow-2xl transition-all">
                <div className="space-y-7">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/15">
                    <Lock className="w-3.5 h-3.5 text-amber-200" />
                    <span className="text-[10px] uppercase tracking-[0.25em] text-white/90 font-medium">UNRELEASED DROP</span>
                  </div>
                  <div className="space-y-3">
                    <span className="block text-xs uppercase tracking-[0.22em] text-white/70 font-medium">LIMITED OFFER STARTS IN</span>
                    <TimerDisplay height={38} />
                  </div>
                  <p className="text-xs text-white/60 tracking-widest uppercase max-w-xs mx-auto font-light leading-relaxed">Exclusive Archive Release</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};