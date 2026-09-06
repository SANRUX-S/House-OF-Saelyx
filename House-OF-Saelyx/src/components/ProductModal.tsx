import React, { useState } from 'react';
import { X, Check, ArrowRight, ShieldCheck, Sparkles, Ruler, Bell } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export const ProductModal: React.FC = () => {
  const { activeModalProduct, setActiveModalProduct, addToCart, formatPrice, openRestockModal } = useStore();
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  if (!activeModalProduct) return null;

  const currentSize = selectedSize || activeModalProduct.sizes[0] || 'M';
  const isOutOfStock = !activeModalProduct.inStock || (activeModalProduct.stockCount !== undefined && activeModalProduct.stockCount <= 0);

  const handleAdd = () => {
    addToCart(activeModalProduct, currentSize, quantity);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      setActiveModalProduct(null);
    }, 1200);
  };

  const handleRestockOpen = () => {
    const prod = activeModalProduct;
    setActiveModalProduct(null);
    openRestockModal(prod, currentSize);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto select-none">
      {/* Backdrop */}
      <div
        onClick={() => setActiveModalProduct(null)}
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity"
      />

      <div className="min-h-screen px-4 py-8 flex items-center justify-center">
        <div className="relative w-full max-w-4xl bg-[#FAF8F5] text-[#1A1816] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-[#E3D9CD] z-10 animate-in fade-in zoom-in-95 duration-200">
          
          {/* Close Button */}
          <button
            onClick={() => setActiveModalProduct(null)}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 w-11 h-11 rounded-full bg-white/90 hover:bg-white text-black flex items-center justify-center shadow-md transition-all cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2">
            
            {/* Left Column: Image Canvas & Thumbnails */}
            <div className="bg-[#EAE4DC] p-6 sm:p-8 flex flex-col justify-between">
              <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-[#DDD5CA] shadow-inner">
                <img
                  src={activeModalProduct.images[selectedImageIdx] || activeModalProduct.images[0]}
                  alt={activeModalProduct.title}
                  className="w-full h-full object-cover object-center"
                  referrerPolicy="no-referrer"
                />
                {activeModalProduct.badge && (
                  <div className="absolute top-3 left-3 bg-[#1A1816] text-white text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full shadow-md">
                    {activeModalProduct.badge}
                  </div>
                )}
              </div>

              {/* Gallery Thumbnails if multiple */}
              {activeModalProduct.images.length > 1 && (
                <div className="flex gap-3 mt-4 overflow-x-auto pb-1">
                  {activeModalProduct.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImageIdx(idx)}
                      className={`w-16 h-20 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${
                        selectedImageIdx === idx ? 'border-[#1A1816] scale-95 shadow-md' : 'border-transparent opacity-60'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Garment Specs & Purchase Controls */}
            <div className="p-6 sm:p-8 md:p-10 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.25em] text-[#857768] font-semibold">
                    {activeModalProduct.fit || 'SAELYXE DROP GARMENT'}
                  </div>
                  <h2 className="font-['Plus_Jakarta_Sans'] text-xl sm:text-2xl font-bold uppercase tracking-tight text-[#1A1816] mt-1">
                    {activeModalProduct.title}
                  </h2>
                  {activeModalProduct.subtitle && (
                    <p className="text-xs text-[#736657] mt-0.5 tracking-wide">
                      {activeModalProduct.subtitle}
                    </p>
                  )}
                </div>

                <div className="text-xl sm:text-2xl font-serif font-bold text-[#1A1816]">
                  {formatPrice(activeModalProduct.priceLKR)}
                </div>

                <div className="border-t border-b border-[#E5DDD2] py-4 space-y-3">
                  <p className="text-xs sm:text-sm text-[#4A4036] font-light leading-relaxed">
                    {activeModalProduct.description}
                  </p>
                  <div className="text-xs text-[#635546] bg-[#EFE9E0] p-3 rounded-xl border border-[#DFD5C7]">
                    <span className="font-semibold block uppercase text-[10px] tracking-wider text-[#3D3328] mb-0.5">
                      Fabric & Specification
                    </span>
                    {activeModalProduct.fabricDetails}
                  </div>
                </div>

                {/* Size Selector */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold uppercase tracking-wider text-[#1A1816]">
                      Select Size
                    </span>
                    <span className="text-[11px] text-[#7A6D5F] flex items-center gap-1 cursor-pointer hover:underline">
                      <Ruler className="w-3 h-3" /> Size Guide
                    </span>
                  </div>

                  <div className="flex gap-2">
                    {activeModalProduct.sizes.map(sz => (
                      <button
                        key={sz}
                        onClick={() => setSelectedSize(sz)}
                        className={`flex-1 py-2.5 sm:py-3 min-h-[44px] rounded-xl text-xs font-semibold tracking-wider transition-all border cursor-pointer ${
                          currentSize === sz
                            ? 'bg-[#1A1816] text-white border-[#1A1816] shadow-md'
                            : 'bg-white text-[#1A1816] border-[#DDD3C7] hover:border-[#1A1816]'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Controls */}
              <div className="space-y-3 pt-2">
                {isOutOfStock ? (
                  <div className="space-y-2">
                    <button
                      id="btn-modal-restock-trigger"
                      onClick={handleRestockOpen}
                      className="w-full py-3.5 sm:py-4 min-h-[48px] rounded-full text-xs uppercase font-semibold tracking-[0.2em] transition-all shadow-xl flex items-center justify-center gap-2 bg-[#181614] hover:bg-black text-white cursor-pointer"
                    >
                      <Bell className="w-4 h-4 text-amber-400" />
                      <span>EMAIL ME WHEN BACK IN STOCK</span>
                    </button>
                    <p className="text-[10px] text-neutral-500 text-center font-mono">
                      ⚡ Automated email notification via SAELYXE Resend dispatch on replenishment
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={handleAdd}
                    className={`w-full py-3.5 sm:py-4 min-h-[48px] rounded-full text-xs uppercase font-semibold tracking-[0.2em] transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer ${
                      added
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#181614] hover:bg-black text-white active:scale-95'
                    }`}
                  >
                    {added ? (
                      <>
                        <span>ADDED TO BAG</span>
                        <Check className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        <span>ADD TO BAG — {formatPrice(activeModalProduct.priceLKR * quantity)}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}

                <div className="flex items-center justify-center gap-2 text-[11px] text-[#7A6D5F] text-center">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Complimentary express delivery & 14-day exchange included.</span>
                </div>
              </div>

            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
