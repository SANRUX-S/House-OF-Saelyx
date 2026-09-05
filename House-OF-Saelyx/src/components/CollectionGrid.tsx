import React, { useState, useRef, useEffect } from 'react';
import { ShoppingBag, Eye, Check, SlidersHorizontal, Bell, ChevronDown } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Product } from '../types';

export const CollectionGrid: React.FC = () => {
  const {
    products,
    isLoadingProducts,
    formatPrice,
    addToCart,
    navigateTo,
    activeCategory,
    setActiveCategory,
    searchQuery,
    openRestockModal
  } = useStore();

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<{ [key: string]: boolean }>({});
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'tops' | 'bottoms' | 'knits' | 'sets'>('all');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc'>('featured');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filterTabs = [
    { label: 'ALL RELEASES', value: 'all' },
    { label: 'TOPS & TEES', value: 'tops' },
    { label: 'BOTTOMS', value: 'bottoms' },
    { label: 'KNITS & HOODIES', value: 'knits' },
    { label: 'COORDINATES', value: 'sets' },
  ];

  const sortOptions = [
    { label: 'Featured First', value: 'featured' },
    { label: 'Price: Low to High', value: 'price-asc' },
    { label: 'Price: High to Low', value: 'price-desc' },
  ] as const;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleQuickAdd = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    addToCart(product);
    setAddedIds(prev => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedIds(prev => ({ ...prev, [product.id]: false }));
    }, 1800);
  };

  let filtered = products.filter(p => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        p.title.toLowerCase().includes(q) ||
        p.subtitle.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q);
      if (!match) return false;
    }

    if (activeCategory !== 'all') {
      if (activeCategory === 'new' && !(p.category === 'new' || p.badge?.includes('DROP'))) {
        return false;
      }
      if ((activeCategory === 'men' || activeCategory === 'mens') && p.category !== 'men' && p.category !== 'new' && p.category !== 'collections') {
        return false;
      }
      if ((activeCategory === 'women' || activeCategory === 'womens') && p.category !== 'women' && p.category !== 'new' && p.category !== 'collections') {
        return false;
      }
      if (activeCategory === 'accessories' && (p.category as string) !== 'accessories' && p.subCategory !== 'Accessories') {
        return false;
      }
      if (activeCategory === 'collections' && p.category !== 'collections' && !p.isSpotlight) {
        return false;
      }
    }

    if (selectedFilter === 'tops') return p.subCategory === 'Tops';
    if (selectedFilter === 'bottoms') return p.subCategory === 'Bottoms';
    if (selectedFilter === 'knits') return p.subCategory === 'Knits';
    if (selectedFilter === 'sets') return p.subCategory === 'Sets' || p.isSpotlight;

    return true;
  });

  if (sortBy === 'price-asc') {
    filtered.sort((a, b) => a.priceLKR - b.priceLKR);
  } else if (sortBy === 'price-desc') {
    filtered.sort((a, b) => b.priceLKR - a.priceLKR);
  }

  const activeSortLabel = sortOptions.find(o => o.value === sortBy)?.label || 'Featured First';

  return (
    <section id="collection-grid" className="w-full py-20 sm:py-28 bg-[#FAF8F5] text-[#1A1816]">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-12">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6 pb-6 sm:pb-10 border-b border-[#E5DFD7]">
          <div>
            <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.3em] text-[#8C7E70] font-semibold mb-1 sm:mb-2">
              Ready-to-Wear Drops
            </div>
            <h2 className="font-['Plus_Jakarta_Sans'] text-xl sm:text-3xl md:text-5xl font-bold tracking-tight text-[#1A1816] uppercase">
              NEW RELEASES <span className="font-light text-[#A89C8F]">|</span> 001
            </h2>
          </div>

          {/* Filter and Sorting Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden bg-[#ECE6DD] rounded-full p-1 border border-[#DFD7CC] max-w-full">
              {filterTabs.map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setSelectedFilter(tab.value as any)}
                  className={`px-3 sm:px-3.5 py-1.5 rounded-full text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase transition-all whitespace-nowrap flex-shrink-0 cursor-pointer ${
                    selectedFilter === tab.value
                      ? 'bg-[#1A1816] text-white shadow-sm'
                      : 'text-[#6B5F52] hover:text-[#1A1816]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-auto" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full sm:w-auto flex items-center justify-between gap-3 bg-[#ECE6DD] hover:bg-[#e2dacd] px-4 py-2.5 sm:py-2 rounded-full border border-[#DFD7CC] text-xs font-medium text-[#1A1816] transition-colors whitespace-nowrap cursor-pointer"
              >
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#7A6D5E] flex-shrink-0" />
                  <span className="whitespace-nowrap">Sort: {activeSortLabel}</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-[#7A6D5E] flex-shrink-0 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDropdownOpen && (
                <div className="absolute left-0 right-0 sm:left-auto sm:right-0 mt-2 min-w-full sm:w-56 bg-[#FAF8F5] border border-[#E5DFD7] rounded-2xl shadow-xl z-50 p-1.5 space-y-1">
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSortBy(option.value);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 text-xs rounded-xl font-medium transition-colors whitespace-nowrap cursor-pointer ${
                        sortBy === option.value
                          ? 'bg-[#1A1816] text-white'
                          : 'text-[#1A1816] hover:bg-[#ECE6DD]'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Product Cards Grid */}
        {isLoadingProducts ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8 lg:gap-10 pt-8 sm:pt-12">
            {[1, 2, 3, 4, 5, 6].map(n => (
              <div key={n} className="animate-pulse space-y-3">
                <div className="aspect-[4/5] bg-[#ECE6DD] rounded-2xl w-full" />
                <div className="h-4 bg-[#ECE6DD] rounded w-3/4" />
                <div className="h-4 bg-[#ECE6DD] rounded w-1/4" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center space-y-4">
            <p className="text-lg font-serif text-[#6B5F52]">No drop garments match your selection.</p>
            <button
              onClick={() => {
                setActiveCategory('all');
                setSelectedFilter('all');
              }}
              className="text-xs uppercase tracking-widest font-semibold text-black underline underline-offset-4 cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-8 lg:gap-10 pt-6 sm:pt-12">
            {filtered.map(product => {
              const isHovered = hoveredId === product.id;
              const isRecentlyAdded = addedIds[product.id];
              const isOutOfStock = product.inStock === false || (product.stockCount !== undefined && product.stockCount <= 0);

              return (
                <div
                  key={product.id}
                  onMouseEnter={() => setHoveredId(product.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => navigateTo({ name: 'product', slug: product.slug || product.id })}
                  className="group cursor-pointer flex flex-col justify-between"
                >
                  <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#E7DFD5] border border-[#DDD3C7] shadow-sm transition-all duration-500 group-hover:shadow-xl group-hover:border-[#C5B7A6]">
                    <img
                      src={isHovered && product.hoverImage ? product.hoverImage : product.images[0]}
                      alt={product.title}
                      className="w-full h-full object-cover object-center transition-all duration-700 ease-out group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                    {product.badge ? (
                      <div className="absolute top-2.5 left-2.5 sm:top-3.5 sm:left-3.5 bg-white/90 backdrop-blur-md px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-semibold tracking-widest text-[#1A1816] uppercase shadow-sm">
                        {product.badge}
                      </div>
                    ) : isOutOfStock ? (
                      <div className="absolute top-2.5 left-2.5 sm:top-3.5 sm:left-3.5 bg-red-950/90 text-red-200 border border-red-800/80 backdrop-blur-md px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-mono tracking-widest uppercase shadow-sm">
                        Sold Out
                      </div>
                    ) : null}

                    {/* Action button overlay - hidden on mobile screens */}
                    <div className="hidden sm:inline-flex absolute bottom-2.5 right-2.5 sm:bottom-3.5 sm:right-3.5 z-20">
                      {isOutOfStock ? (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            openRestockModal(product);
                          }}
                          className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-full text-[9px] sm:text-[11px] font-semibold tracking-wider uppercase transition-all duration-300 shadow-xl bg-amber-950/95 hover:bg-amber-900 text-amber-200 border border-amber-700/60 active:scale-95 cursor-pointer min-h-[32px]"
                        >
                          <Bell className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-300 animate-pulse" />
                          <span>NOTIFY ME</span>
                        </button>
                      ) : (
                        <button
                          onClick={e => handleQuickAdd(e, product)}
                          className={`inline-flex items-center gap-1 sm:gap-2 px-2.5 py-2.5 sm:px-2 sm:py-2 rounded-full text-[9px] sm:text-[11px] font-semibold tracking-wider uppercase transition-all duration-300 shadow-xl min-h-[32px] cursor-pointer ${
                            isRecentlyAdded
                              ? 'bg-emerald-600 text-white scale-105'
                              : 'bg-[#181614] hover:bg-black text-white active:scale-95'
                          }`}
                        >
                          {isRecentlyAdded ? (
                            <>
                              <span>ADDED</span>
                              <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            </>
                          ) : (
                            <>
                              <ShoppingBag className="w-3 h-3 sm:w-3.5 sm:h-3.5 transition-transform group-hover:scale-110" />
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    <div className="hidden sm:flex absolute top-3.5 right-3.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-black shadow-md hover:bg-white">
                        <Eye className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2.5 sm:pt-4 space-y-0.5 sm:space-y-1">
                    <h3 className="text-xs sm:text-sm font-semibold tracking-[0.08em] sm:tracking-[0.12em] text-[#1A1816] uppercase font-['Plus_Jakarta_Sans'] group-hover:text-neutral-700 transition-colors truncate">
                      {product.title}
                    </h3>
                    
                    {product.subtitle && (
                      <p className="text-[10px] sm:text-[11px] text-[#786C5E] tracking-wide truncate">
                        {product.subtitle}
                      </p>
                    )}

                    <div className="text-xs sm:text-sm font-bold text-[#1A1816] tracking-wider pt-0.5">
                      {formatPrice(product.priceLKR)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </section>
  );
};