import React, { useState, useEffect, useRef } from 'react';

export const SocialProof: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const [count, setCount] = useState(1);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    let intervalId: number | null = null;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (prefersReducedMotion) {
              setCount(10);
              return;
            }

            setCount(1);
            let current = 1;
            if (intervalId) clearInterval(intervalId);
            intervalId = window.setInterval(() => {
              current += 1;
              if (current >= 10) {
                setCount(10);
                if (intervalId) clearInterval(intervalId);
              } else {
                setCount(current);
              }
            }, 35);
          } else {
            if (intervalId) clearInterval(intervalId);
            setCount(1);
          }
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return (
    <section ref={sectionRef} className="w-full bg-[#f6f6f6] text-[#000000] pt-16 pb-8 px-4 sm:px-6 font-sans">
      <div className="max-w-[880px] mx-auto space-y-12">
        {/* Section Title */}
        <div className="text-center">
          <h2 className="text-2xl sm:text-[28px] font-medium tracking-tight text-[#000000] font-sans">
            <span className="font-sans font-semibold tabular-nums text-[#000000] tracking-normal inline-block">
              {count}
            </span>
            + Customers
          </h2>
        </div>

      </div>
    </section>
  );
};