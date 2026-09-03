import React, { useState, useEffect } from 'react';

export const ScrollProgressBar: React.FC = () => {
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight <= 0) {
        setScrollProgress(0);
        return;
      }
      const currentScroll = window.scrollY;
      const progress = Math.min(100, Math.max(0, (currentScroll / totalHeight) * 100));
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial calculation

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div 
      className="fixed top-0 left-0 right-0 h-[2.5px] z-[9999] pointer-events-none bg-transparent"
      aria-hidden="true"
    >
      <div 
        className="h-full bg-gradient-to-r from-amber-700 via-amber-500 to-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.6)] transition-all duration-75 ease-out"
        style={{ width: `${scrollProgress}%` }}
      />
    </div>
  );
};
