import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ArrowRight } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export const SearchModal: React.FC = () => {
  const {
    isSearchOpen,
    setIsSearchOpen,
    products,
    formatPrice,
    setActiveModalProduct,
    addToCart
  } = useStore();

  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSearchOpen(false);
    };

    if (isSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      window.addEventListener('keydown', handleKeyDown);
    } else {
      setQuery('');
    }

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, setIsSearchOpen]);

  if (!isSearchOpen) return null;

  const results = query.trim()
    ? products.filter(p =>
        p.title.toLowerCase().includes(query.toLowerCase()) ||
        p.subtitle?.toLowerCase().includes(query.toLowerCase()) ||
        p.description?.toLowerCase().includes(query.toLowerCase()) ||
        p.category?.toLowerCase().includes(query.toLowerCase())
      )
    : products.slice(0, 4);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto select-none">
      {/* Overlay */}
      <div
        onClick={() => setIsSearchOpen(false)}
        className="fixed inset-0 bg-black/85 backdrop-blur-xl transition-opacity animate-in fade-in duration-300"
      />

      <div className="min-h-screen px-4 pt-4 sm:pt-20 pb-10 flex flex-col items-center">
        <div className="relative w-full max-w-2xl z-10 animate-in fade-in slide-in-from-top-4 duration-300">
          
          {/* MOBILE SEARCH PILL */}
          <div className="sm:hidden mb-3">
            <div className="w-full bg-white/95 backdrop-blur-md rounded-full px-5 py-3 flex items-center gap-3 shadow-2xl border border-white/40">
              <Search className="w-4 h-4 text-neutral-600 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-neutral-900 placeholder:text-neutral-500 font-normal focus:outline-none"
              />
              {query ? (
                <button onClick={() => setQuery('')} className="p-1 text-neutral-500 hover:text-black">
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <button onClick={() => setIsSearchOpen(false)} className="p-1 text-neutral-500 hover:text-black">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* DESKTOP SEARCH BAR */}
          <div className="hidden sm:flex bg-[#181614] text-white rounded-t-3xl border border-white/15 p-5 items-center gap-3 border-b border-white/10">
            <Search className="w-5 h-5 text-neutral-400 ml-1" />
            <input
              type="text"
              placeholder="Search by garment, fabric, or collection..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full bg-transparent text-sm text-white placeholder:text-neutral-400 focus:outline-none"
            />
            {query && (
              <button onClick={() => setQuery('')} className="p-1 text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setIsSearchOpen(false)}
              className="text-[10px] uppercase tracking-widest text-neutral-400 hover:text-white px-2.5 py-1 rounded-md border border-white/10"
            >
              ESC
            </button>
          </div>

          {/* RESULTS */}
          <div className="bg-[#181614]/95 backdrop-blur-2xl text-white rounded-3xl sm:rounded-b-3xl sm:rounded-t-none border border-white/15 p-4 sm:p-6 max-h-[70vh] sm:max-h-[60vh] overflow-y-auto space-y-3 shadow-2xl">
            <div className="text-[10px] uppercase tracking-[0.25em] text-neutral-400 font-semibold mb-3 px-1">
              {query ? `Found ${results.length} Garments` : 'Trending In Drop 001'}
            </div>

            {results.length === 0 ? (
              <div className="py-12 text-center text-xs sm:text-sm text-neutral-400 font-serif">
                No garments found matching "{query}".
              </div>
            ) : (
              results.map(product => (
                <div
                  key={product.id}
                  onClick={() => {
                    setActiveModalProduct(product);
                    setIsSearchOpen(false);
                  }}
                  className="flex items-center justify-between p-2.5 sm:p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <img
                      src={product.images[0]}
                      alt={product.title}
                      className="w-12 h-14 sm:w-14 sm:h-16 object-cover rounded-xl bg-neutral-800 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-white truncate">
                        {product.title}
                      </h4>
                      <p className="text-[10px] sm:text-[11px] text-neutral-400 truncate">{product.subtitle}</p>
                      <div className="text-xs font-mono font-medium text-white/90 mt-0.5">
                        {formatPrice ? formatPrice(product.priceLKR) : `LKR ${product.priceLKR?.toLocaleString()}`}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(product);
                      setIsSearchOpen(false);
                    }}
                    className="p-2.5 rounded-full bg-white text-black hover:bg-neutral-200 flex-shrink-0 ml-2 shadow-md"
                  >
                    <ArrowRight className="w-3.5 h-3.5 stroke-[2]" />
                  </button>
                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  );
};