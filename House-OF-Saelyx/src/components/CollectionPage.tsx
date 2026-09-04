import React, { useState } from 'react';
import { ArrowLeft, Filter, ArrowUpDown, Sparkles, Eye, ShoppingBag } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Product } from '../types';

export const CollectionPage: React.FC<{ category: string }> = ({ category }) => {
  const { 
    products, 
    formatPrice, 
    addToCart, 
    navigateTo, 
    setActiveModalProduct 
  } = useStore();

  const [sortOption, setSortOption] = useState<'featured' | 'price-asc' | 'price-desc' | 'newest'>('featured');
  const [selectedSubCat, setSelectedSubCat] = useState<string>('all');

  const formattedCatTitle = 
    category === 'men' ? "Men's Atelier Drop"
    : category === 'women' ? "Women's Couturier"
    : category === 'new' ? "New Seasonal Drops"
    : category === 'knits' ? "Heavyweight Knits & Coordinates"
    : category === 'collections' ? "All Curated Collections"
    : `${category.toUpperCase()} Collection`;

  // Filter products
  let filtered = products.filter(p => {
    if (category === 'all' || category === 'collections') return true;
    if (category === 'new') return p.badge || p.dropNumber === 'DROP 001';
    if (category === 'knits') return p.category === 'knits' || p.title.toLowerCase().includes('knit') || p.title.toLowerCase().includes('set');
    return p.category === category;
  });

  if (selectedSubCat !== 'all') {
    filtered = filtered.filter(p => p.subCategory?.toLowerCase() === selectedSubCat.toLowerCase());
  }

  // Sort products
  filtered = [...filtered].sort((a, b) => {
    if (sortOption === 'price-asc') return a.priceLKR - b.priceLKR;
    if (sortOption === 'price-desc') return b.priceLKR - a.priceLKR;
    return 0;
  });

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1816] pt-24 pb-24 px-5 sm:px-8 md:px-12">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Header & Breadcrumb */}
        <div className="space-y-4 border-b border-[#ECE3D8] pb-6">
          <button
            onClick={() => navigateTo({ name: 'home' })}
            className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[#7A6E60] hover:text-black transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Boutique Overview</span>
          </button>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase tracking-[0.25em] text-[#857768] font-semibold">
                HOUSE OF SAELYXE • CURATED SILHOUETTES
              </span>
              <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl text-[#1A1816] font-normal tracking-tight mt-1">
                {formattedCatTitle}
              </h1>
            </div>

            {/* Category Filter Pills & Sort Bar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 bg-[#EAE2D5] p-1 rounded-full text-xs font-semibold">
                {['all', 'men', 'women', 'knits'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => navigateTo({ name: 'collection', category: cat })}
                    className={`px-3.5 py-1.5 rounded-full capitalize transition-all ${
                      category === cat
                        ? 'bg-[#1A1816] text-white shadow-sm'
                        : 'text-[#5A4E40] hover:text-black'
                    }`}
                  >
                    {cat === 'all' ? 'All Pieces' : cat}
                  </button>
                ))}
              </div>

              <select
                value={sortOption}
                onChange={e => setSortOption(e.target.value as any)}
                className="bg-white border border-[#D5C9B8] rounded-full px-4 py-2 text-xs text-[#1A1816] focus:outline-none focus:border-[#1A1816]"
              >
                <option value="featured">Featured Order</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filtered.map(product => (
            <div
              key={product.id}
              onClick={() => navigateTo({ name: 'product', slug: product.slug || product.id })}
              className="group cursor-pointer bg-[#F2EDE4] rounded-3xl overflow-hidden border border-[#E3D9CD] shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
            >
              <div className="relative aspect-[4/5] bg-[#E2DACF] overflow-hidden">
                <img
                  src={product.images[0]}
                  alt={product.title}
                  className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />

                {product.badge && (
                  <div className="absolute top-3 left-3 bg-[#1A1816] text-white text-[9px] uppercase font-bold tracking-widest px-3 py-1 rounded-full shadow-md">
                    {product.badge}
                  </div>
                )}

                {/* Hover Quick View overlay */}
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveModalProduct(product);
                    }}
                    className="px-4 py-2 bg-white/95 backdrop-blur text-black text-xs font-semibold uppercase tracking-wider rounded-full shadow-lg hover:bg-white flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Quick Inspect</span>
                  </button>
                </div>
              </div>

              <div className="p-5 sm:p-6 space-y-3">
                <div className="space-y-1">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-[#857768] font-semibold">
                    {product.fit || 'ATELIER TAILORING'}
                  </div>
                  <h3 className="font-['Plus_Jakarta_Sans'] text-sm sm:text-base font-bold uppercase tracking-wide text-[#1A1816] group-hover:text-amber-950 transition-colors">
                    {product.title}
                  </h3>
                  <p className="text-xs text-[#736657] line-clamp-1">{product.subtitle}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#E5DDD2]">
                  <div className="font-serif text-base sm:text-lg font-bold text-[#1A1816]">
                    {formatPrice(product.priceLKR)}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(product);
                    }}
                    className="p-2.5 rounded-full bg-[#1A1816] text-white hover:bg-black transition-all shadow-md active:scale-95"
                    title="Add to Bag"
                  >
                    <ShoppingBag className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};
