import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Check, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles, 
  Ruler, 
  Truck, 
  RefreshCw, 
  Share2,
  Star,
  Plus,
  ShoppingBag,
  Layers,
  Bell,
  Mail,
  CheckCircle2,
  AlertCircle,
  Smartphone
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Product, ProductReview } from '../types';

export const ProductDetailPage: React.FC<{ slug: string }> = ({ slug }) => {
  const { 
    products, 
    formatPrice, 
    addToCart, 
    navigateTo,
    openRestockModal,
    subscribeToRestock,
    user
  } = useStore();

  const product = products.find(p => p.slug === slug || p.id === slug) || products[0];

  const isOutOfStock = !product || product.inStock === false || (product.stockCount !== undefined && product.stockCount <= 0);

  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'care' | 'shipping'>('details');

  // Inline Restock Form State
  const [inlineEmail, setInlineEmail] = useState('');
  const [inlineName, setInlineName] = useState('');
  const [inlinePhone, setInlinePhone] = useState('');
  const [inlineChannel, setInlineChannel] = useState<'email' | 'both'>('email');
  const [inlineNotificationPermission, setInlineNotificationPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [inlineSubmitting, setInlineSubmitting] = useState(false);
  const [inlineSubmitted, setInlineSubmitted] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.email) {
      setInlineEmail(user.email);
      if (user.name) setInlineName(user.name);
    }
  }, [user]);

  const handleInlineRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInlineError(null);

    const emailClean = inlineEmail.trim();
    if (!emailClean || !emailClean.includes('@') || !emailClean.includes('.')) {
      setInlineError('Please enter a valid patron email address.');
      return;
    }

    if (inlineChannel === 'both' && typeof window !== 'undefined' && typeof Notification !== 'undefined') {
      if (Notification.permission === 'default') {
        const result = await Notification.requestPermission();
        setInlineNotificationPermission(result);
        if (result !== 'granted') {
          setInlineError('Please allow browser notifications to enable Live App Alerts.');
          return;
        }
      } else if (Notification.permission === 'denied') {
        setInlineError('Notifications are blocked by your browser. Please allow notifications in your browser settings.');
        return;
      }
    }

    setInlineSubmitting(true);
    try {
      const res = await subscribeToRestock({
        productId: product.id,
        productTitle: product.title,
        productSlug: product.slug || product.id,
        productImage: product.images?.[0] || '',
        selectedSize: selectedSize || product.sizes?.[0] || 'Standard',
        customerEmail: emailClean,
        customerName: inlineName.trim() || undefined,
        phone: undefined,
        channel: inlineChannel
      });

      if (res.success) {
        setInlineSubmitted(true);
      } else {
        setInlineError(res.error || 'Failed to submit restock request.');
      }
    } catch (err: any) {
      setInlineError(err.message || 'An error occurred.');
    } finally {
      setInlineSubmitting(false);
    }
  };

  // Matching Complete the Set product
  const matchingSetProduct = product?.completeTheSetProductId 
    ? products.find(p => p.id === product.completeTheSetProductId || p.slug === product.completeTheSetProductId)
    : null;

  // New review form modal/state
  const [isReviewFormOpen, setIsReviewFormOpen] = useState(false);
  const [reviewsList, setReviewsList] = useState<ProductReview[]>([]);
  const [newReviewAuthor, setNewReviewAuthor] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Only reset viewport scroll, active image, and size when navigating to a new garment (slug change)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setSelectedImageIdx(0);
    setSelectedSize('');
  }, [slug]);

  // Sync reviews separately when product first loads or reviews array changes
  useEffect(() => {
    if (product?.reviews) {
      setReviewsList(product.reviews);
    } else {
      setReviewsList([
        {
          id: 'rev-default-1',
          author: 'Austin',
          rating: 5,
          date: '08/14/2026',
          verified: true,
          comment: 'Great quality, worth it. The 400 GSM weight sits perfectly over chunky sneakers.'
        },
        {
          id: 'rev-default-2',
          author: 'Brandon',
          rating: 5,
          date: '06/10/2026',
          verified: true,
          comment: 'Great quality! The embroidery along the side panel is extremely crisp.'
        }
      ]);
    }
  }, [product?.id]);

  if (!product) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] pt-36 pb-20 text-center px-4">
        <h2 className="font-serif text-2xl text-[#1A1816]">Garment Not Found</h2>
        <button
          onClick={() => navigateTo({ name: 'home' })}
          className="mt-4 px-6 py-2.5 bg-[#1A1816] text-white text-xs uppercase tracking-widest rounded-full"
        >
          Return to Boutique
        </button>
      </div>
    );
  }

  const currentSize = selectedSize || product.sizes[0] || 'M';

  const handleAdd = () => {
    addToCart(product, currentSize, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleAddMatchingSet = () => {
    if (matchingSetProduct) {
      addToCart(matchingSetProduct, matchingSetProduct.sizes[0] || 'M', 1);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product.title,
        text: product.description,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewAuthor.trim() || !newReviewComment.trim()) return;
    const rev: ProductReview = {
      id: `rev-${Date.now()}`,
      author: newReviewAuthor.trim(),
      rating: newReviewRating,
      date: new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
      verified: true,
      comment: newReviewComment.trim()
    };
    setReviewsList([rev, ...reviewsList]);
    setNewReviewAuthor('');
    setNewReviewComment('');
    setReviewSubmitted(true);
    setIsReviewFormOpen(false);
    setTimeout(() => setReviewSubmitted(false), 3000);
  };

  // Bullet point specifications (fallback to default tailored bullets if not in DB)
  const bullets = product.bulletDetails && product.bulletDetails.length > 0 
    ? product.bulletDetails 
    : [
        'Heavyweight 400 GSM custom combed cotton',
        'Structured, relaxed architectural fit',
        'Wide-leg silhouette with continuous drape',
        'Multi-panel construction with flatlock reinforced seams',
        'Tonal embroidered signature micro-emblem',
        'Deep welt side pockets and reinforced back pockets',
        'Clean straight leg hem designed to sit flush on sneakers'
      ];

  // Related products
  const relatedProducts = products.filter(p => p.id !== product.id && p.id !== matchingSetProduct?.id).slice(0, 3);

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1816] pt-24 sm:pt-36 md:pt-40 pb-20 px-4 sm:px-8 md:px-12">
      <div className="max-w-7xl mx-auto space-y-8 sm:space-y-12">
        
        {/* Navigation Breadcrumb & Back */}
        <div className="flex items-center justify-between border-b border-[#ECE3D8] pb-3 sm:pb-4">
          <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs uppercase tracking-widest text-[#7A6E60] overflow-hidden">
            <button
              onClick={() => navigateTo({ name: 'home' })}
              className="hover:text-black transition-colors flex-shrink-0 cursor-pointer"
            >
              HOME
            </button>
            <span>/</span>
            <span className="text-[#998978] hidden xs:inline flex-shrink-0">{product.badge || 'DROP 001'}</span>
            <span className="hidden xs:inline">/</span>
            <span className="text-[#1A1816] font-semibold truncate max-w-[140px] sm:max-w-none">
              {product.title}
            </span>
          </div>

          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 text-xs text-[#7A6E60] hover:text-black transition-colors cursor-pointer flex-shrink-0 p-1"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{copied ? 'Copied!' : 'Share'}</span>
          </button>
        </div>

        {/* Main Product Canvas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start">
          
          {/* Left Column: Gallery (7 Cols) */}
          <div className="lg:col-span-7 space-y-3 sm:space-y-4">
            <div className="relative aspect-[4/5] sm:aspect-[1/1] md:aspect-[4/5] rounded-2xl sm:rounded-3xl overflow-hidden bg-[#EAE4DC] border border-[#DDD3C7] shadow-lg sm:shadow-xl">
              <img
                src={product.images[selectedImageIdx] || product.images[0]}
                alt={product.title}
                className="w-full h-full object-cover object-center transition-all duration-500"
                referrerPolicy="no-referrer"
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
              {product.badge && (
                <div className="absolute top-3 left-3 sm:top-4 sm:left-4 bg-[#1A1816] text-white text-[9px] sm:text-[10px] uppercase font-bold tracking-widest px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full shadow-lg">
                  {product.badge}
                </div>
              )}
            </div>

            {/* Thumbnail Carousel */}
            {product.images.length > 1 && (
              <div className="flex gap-2.5 sm:gap-3 overflow-x-auto no-scrollbar pb-1">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIdx(idx)}
                    className={`w-16 h-20 sm:w-20 sm:h-24 rounded-xl sm:rounded-2xl overflow-hidden border-2 transition-all flex-shrink-0 cursor-pointer ${
                      selectedImageIdx === idx 
                        ? 'border-[#1A1816] scale-95 shadow-md ring-2 ring-[#1A1816]/10' 
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Garment Specs, Sizing & Add to Bag (5 Cols) */}
          <div className="lg:col-span-5 space-y-5 sm:space-y-6">
            
            <div className="space-y-2 border-b border-[#ECE3D8] pb-5 sm:pb-6">
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.25em] text-[#857768] font-semibold">
                  {product.badge || 'DROP 001'} • {product.category.toUpperCase()}
                </span>
              </div>

              <h1 className="font-['Plus_Jakarta_Sans'] text-xl sm:text-3xl font-bold uppercase tracking-tight text-[#1A1816]">
                {product.title}
              </h1>

              {product.subtitle && (
                <p className="text-xs sm:text-sm text-[#736657] tracking-wide">
                  {product.subtitle}
                </p>
              )}

              <div className="text-xl sm:text-3xl font-serif font-bold text-[#1A1816] pt-1">
                {formatPrice(product.priceLKR)}
              </div>
            </div>

            {/* Size Selection */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold uppercase tracking-wider text-[#1A1816]">
                  Select Proportion Size
                </span>
                <button
                  onClick={() => navigateTo({ name: 'care-size-guide' })}
                  className="text-[11px] text-[#7A6D5F] flex items-center gap-1 hover:text-black underline underline-offset-2 cursor-pointer"
                >
                  <Ruler className="w-3.5 h-3.5" /> Sizing Architecture
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {product.sizes.map(sz => (
                  <button
                    key={sz}
                    onClick={() => setSelectedSize(sz)}
                    className={`py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs font-semibold tracking-wider transition-all border cursor-pointer min-h-[42px] ${
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

            {/* Purchase or Back-in-Stock Notification Controls */}
            {isOutOfStock ? (
              <div className="space-y-4 pt-2">
                {/* Out of Stock Notice Pill */}
                <div className="bg-[#1A1816] text-[#FAF8F5] p-4 rounded-2xl border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono tracking-widest uppercase text-amber-400 font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      Archival Run Sold Out
                    </span>
                    <span className="text-[10px] font-mono text-neutral-400">Atelier Waitlist</span>
                  </div>
                  <p className="text-xs text-neutral-300 font-light leading-relaxed">
                    This silhouette is currently fully allocated. Register your email below to receive an automated notification via Firebase Cloud Functions the moment restock cutters release the next batch.
                  </p>
                </div>

                {!inlineSubmitted ? (
                  <form onSubmit={handleInlineRestockSubmit} className="bg-white p-4 sm:p-5 rounded-2xl border border-[#DDD3C7] shadow-sm space-y-3.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#1A1816] flex items-center gap-1.5">
                        <Bell className="w-4 h-4 text-amber-800" />
                        <span>Email Me When Back in Stock</span>
                      </label>
                      <span className="text-[11px] font-mono text-[#8C7E70]">Size: {currentSize}</span>
                    </div>

                    {inlineError && (
                      <div className="text-xs bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-xl flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{inlineError}</span>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C7E70]" />
                        <input
                          type="email"
                          required
                          placeholder="Enter your email address"
                          value={inlineEmail}
                          onChange={e => setInlineEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-[#FAF8F5] border border-[#DDD3C7] rounded-xl text-base sm:text-xs text-[#1A1816] focus:outline-none focus:border-[#1A1816]"
                        />
                      </div>

                       <div className="grid grid-cols-2 gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setInlineChannel('email')}
                          className={`py-2 px-3 rounded-xl border text-[11px] font-medium transition-all cursor-pointer ${
                            inlineChannel === 'email'
                              ? 'bg-[#1A1816] text-white border-[#1A1816]'
                              : 'bg-[#FAF8F5] text-[#5C5042] border-[#DDD3C7]'
                          }`}
                        >
                          Email Alert
                        </button>
                        <button
                          type="button"
                          onClick={() => setInlineChannel('both')}
                          className={`py-2 px-3 rounded-xl border text-[11px] font-medium transition-all cursor-pointer ${
                            inlineChannel === 'both'
                              ? 'bg-[#1A1816] text-white border-[#1A1816]'
                              : 'bg-[#FAF8F5] text-[#5C5042] border-[#DDD3C7]'
                          }`}
                        >
                          Email + App Alert
                        </button>
                      </div>

                      {inlineChannel === 'both' && (
                        <div className="p-3 bg-[#FAF8F5] border border-[#DDD3C7] rounded-xl space-y-2">
                          {inlineNotificationPermission === 'default' && (
                            <div className="space-y-1.5">
                              <p className="text-[10px] text-[#7A6E60] font-sans leading-relaxed">
                                Please authorize notifications in your browser to receive live, instantaneous Atelier restocking alerts on this device.
                              </p>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (typeof Notification !== 'undefined') {
                                    const result = await Notification.requestPermission();
                                    setInlineNotificationPermission(result);
                                  }
                                }}
                                className="w-full py-1.5 bg-[#1A1816] hover:bg-black text-white font-mono text-[9px] uppercase tracking-wider transition-all cursor-pointer rounded-lg"
                              >
                                Allow Web App Notifications
                              </button>
                            </div>
                          )}
                          {inlineNotificationPermission === 'denied' && (
                            <p className="text-[10px] text-rose-600 font-sans leading-relaxed">
                              ⚠️ Notifications are blocked. Please click the site icon in your browser's address bar and allow notifications for SAELYXE.
                            </p>
                          )}
                          {inlineNotificationPermission === 'granted' && (
                            <div className="flex items-center space-x-2 text-emerald-600 font-mono text-[10px]">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                              <span>✓ Live App Notifications Authorized</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      id="btn-inline-restock-submit"
                      disabled={inlineSubmitting}
                      className="w-full py-3.5 bg-[#181614] hover:bg-black text-white rounded-xl text-xs uppercase font-semibold tracking-[0.2em] transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 min-h-[44px]"
                    >
                      {inlineSubmitting ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Registering Waitlist...</span>
                        </>
                      ) : (
                        <>
                          <Bell className="w-3.5 h-3.5 text-amber-300" />
                          <span>Notify Me On Restock</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center justify-center gap-1.5 text-[10px] text-[#7A6D5F]">
                      <Sparkles className="w-3 h-3 text-amber-700" />
                      <span>Direct automated trigger via Firebase Cloud Functions</span>
                    </div>
                  </form>
                ) : (
                  <div className="bg-emerald-950 text-white p-5 rounded-2xl border border-emerald-800 space-y-3 text-center animate-in fade-in">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                    <div>
                      <h4 className="font-semibold text-sm">Restock Priority Confirmed</h4>
                      <p className="text-xs text-emerald-200 mt-1">
                        We'll alert <span className="underline font-mono">{inlineEmail}</span> the instant size <span className="font-mono">{currentSize}</span> is replenished.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setInlineSubmitted(false)}
                      className="text-[11px] text-emerald-300 underline underline-offset-2 hover:text-white cursor-pointer"
                    >
                      Register another email or size
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Standard Quantity & Add Button when in stock */
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex items-center bg-white border border-[#D5C9B8] rounded-full px-3 sm:px-4 py-2 text-xs">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="min-w-[24px] min-h-[24px] flex items-center justify-center hover:text-black text-[#7A6E60] font-bold cursor-pointer"
                      aria-label="Decrease quantity"
                    >
                      -
                    </button>
                    <span className="px-2 sm:px-4 font-mono font-semibold">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="min-w-[24px] min-h-[24px] flex items-center justify-center hover:text-black text-[#7A6E60] font-bold cursor-pointer"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>

                  <button
                    onClick={handleAdd}
                    className={`flex-1 py-3.5 sm:py-4 rounded-full text-xs uppercase font-semibold tracking-[0.15em] sm:tracking-[0.2em] transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer min-h-[44px] ${
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
                        <span>ADD TO BAG — {formatPrice(product.priceLKR * quantity)}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#7A6D5F] pt-1">
                  <button
                    onClick={() => openRestockModal(product, currentSize)}
                    className="flex items-center gap-1 hover:text-black transition-colors underline underline-offset-2 cursor-pointer text-left"
                  >
                    <Bell className="w-3 h-3 text-amber-700 flex-shrink-0" />
                    <span>Need a sold out size notification?</span>
                  </button>
                  <span className="font-mono text-[10px] text-emerald-800 font-semibold flex-shrink-0">● In Stock ({product.stockCount || 'Limited'})</span>
                </div>
              </div>
            )}

            {/* Bullet Point Specifications (Matching reference 1:1) */}
            <div className="bg-[#FAF6F0] p-5 rounded-2xl border border-[#E3D9CD] space-y-3">
              <span className="text-[11px] uppercase tracking-widest font-bold text-[#3D3328] block">
                Garment Specifications
              </span>
              <ul className="space-y-2 text-xs text-[#524638]">
                {bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1A1816] mt-1.5 flex-shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* COMPLETE THE SET Component (Matching reference 1:1) */}
            {matchingSetProduct && (
              <div className="p-5 rounded-2xl bg-[#F0EAE1] border border-[#DDD1C3] shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-900" />
                    <span className="text-xs uppercase tracking-[0.2em] font-bold text-[#1A1816]">
                      COMPLETE THE SET
                    </span>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-[#7A6D5F] font-semibold">
                    RECOMMENDED COMBO
                  </span>
                </div>

                <div className="flex items-center gap-4 bg-white p-3 rounded-xl border border-[#E5DCD0]">
                  <div 
                    onClick={() => navigateTo({ name: 'product', slug: matchingSetProduct.slug || matchingSetProduct.id })}
                    className="w-16 h-20 rounded-lg overflow-hidden bg-[#EAE4DC] cursor-pointer flex-shrink-0"
                  >
                    <img 
                      src={matchingSetProduct.images[0]} 
                      alt={matchingSetProduct.title} 
                      className="w-full h-full object-cover hover:scale-105 transition-transform"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 
                      onClick={() => navigateTo({ name: 'product', slug: matchingSetProduct.slug || matchingSetProduct.id })}
                      className="text-xs uppercase font-bold text-[#1A1816] truncate cursor-pointer hover:underline"
                    >
                      {matchingSetProduct.title}
                    </h4>
                    <p className="text-[11px] text-[#7A6E60] truncate">{matchingSetProduct.subtitle}</p>
                    <div className="text-xs font-serif font-bold text-[#1A1816] mt-1">
                      {formatPrice(matchingSetProduct.priceLKR)}
                    </div>
                  </div>

                  <button
                    onClick={handleAddMatchingSet}
                    className="px-3.5 py-2 bg-[#1A1816] hover:bg-black text-white text-[11px] font-semibold uppercase tracking-wider rounded-full flex items-center gap-1 shadow-md transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>ADD</span>
                  </button>
                </div>
              </div>
            )}

            {/* Service & Delivery Badges */}
            <div className="bg-[#FAF6F0] p-4 rounded-2xl border border-[#E3D9CD] space-y-2 text-[11px] text-[#7A6D5F]">
              <div className="flex items-center gap-2">
                <Truck className="w-3.5 h-3.5 text-emerald-700" />
                <span>Complimentary Express Courier hand-delivery on this commission.</span>
              </div>
              <div className="flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 text-amber-700" />
                <span>14-day direct size adjustment & exchange policy.</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-black" />
                <span>Certified Haute Couture garment with serial seal.</span>
              </div>
            </div>

          </div>

        </div>

        {/* CUSTOMER REVIEWS Section (Matching reference 1:1) */}
        <div className="pt-16 border-t border-[#ECE3D8] space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase tracking-[0.25em] text-[#857768] font-semibold">
                VERIFIED COMMISSION REVIEWS
              </span>
              <h3 className="font-serif text-2xl sm:text-3xl font-normal text-[#1A1816] mt-0.5">
                Customer Reviews ({reviewsList.length})
              </h3>
            </div>

            <button
              onClick={() => setIsReviewFormOpen(!isReviewFormOpen)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1A1816] text-white text-xs uppercase font-semibold tracking-wider hover:bg-black transition-colors self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Write a Review</span>
            </button>
          </div>

          {/* Write Review Form */}
          {isReviewFormOpen && (
            <form onSubmit={handleAddReview} className="bg-[#F2ECE3] p-6 rounded-2xl border border-[#E0D5C7] space-y-4 max-w-2xl">
              <h4 className="text-xs uppercase tracking-widest font-bold text-[#1A1816]">Leave Verified Feedback</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#635548] block mb-1">Your Name</label>
                  <input
                    type="text"
                    required
                    value={newReviewAuthor}
                    onChange={e => setNewReviewAuthor(e.target.value)}
                    placeholder="e.g. Austin K."
                    className="w-full bg-white border border-[#D5C9B8] rounded-xl px-3 py-2 text-xs text-[#1A1816] focus:outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#635548] block mb-1">Rating</label>
                  <div className="flex items-center gap-1.5 pt-1.5">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewReviewRating(star)}
                        className="text-amber-500 hover:scale-110 transition-transform"
                      >
                        <Star className={`w-5 h-5 ${star <= newReviewRating ? 'fill-amber-400 text-amber-400' : 'text-stone-300'}`} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#635548] block mb-1">Your Experience / Fit Feedback</label>
                <textarea
                  required
                  rows={3}
                  value={newReviewComment}
                  onChange={e => setNewReviewComment(e.target.value)}
                  placeholder="Share details regarding fabric weight, silhouette drape, and comfort..."
                  className="w-full bg-white border border-[#D5C9B8] rounded-xl px-3 py-2 text-xs text-[#1A1816] focus:outline-none focus:border-black"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#1A1816] text-white text-xs uppercase font-semibold tracking-wider hover:bg-black transition-colors"
                >
                  Submit Verified Review
                </button>
                <button
                  type="button"
                  onClick={() => setIsReviewFormOpen(false)}
                  className="px-4 py-2 text-xs uppercase tracking-wider text-[#7A6D5F] hover:text-black"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {reviewSubmitted && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Thank you! Your verified customer review has been added.</span>
            </div>
          )}

          {/* Reviews List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviewsList.map(rev => (
              <div key={rev.id} className="bg-white p-5 rounded-2xl border border-[#E8DFC2]/60 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-amber-500">
                    {[...Array(rev.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="text-[11px] font-mono text-[#8C7E6F]">{rev.date}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-[#1A1816]">{rev.author}</span>
                  {rev.verified && (
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                      <Check className="w-2.5 h-2.5" />
                      <span>Verified by shop</span>
                    </span>
                  )}
                </div>

                <p className="text-xs text-[#4A4035] leading-relaxed font-light">
                  "{rev.comment}"
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Related Silhouettes Section */}
        {relatedProducts.length > 0 && (
          <div className="pt-16 border-t border-[#ECE3D8] space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-[0.25em] text-[#857768] font-semibold">
                  CURATED RECOMMENDATIONS
                </span>
                <h3 className="font-serif text-2xl font-normal text-[#1A1816] mt-0.5">
                  Pairs With This Silhouette
                </h3>
              </div>
              <button
                onClick={() => navigateTo({ name: 'home' })}
                className="text-xs font-semibold uppercase tracking-wider text-[#1A1816] hover:underline"
              >
                View Full Drop →
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {relatedProducts.map(p => (
                <div
                  key={p.id}
                  onClick={() => navigateTo({ name: 'product', slug: p.slug || p.id })}
                  className="group cursor-pointer bg-[#F2EDE4] rounded-2xl overflow-hidden border border-[#E3D9CD] transition-all hover:shadow-lg"
                >
                  <div className="aspect-[4/5] overflow-hidden bg-[#E2DACF]">
                    <img
                      src={p.images[0]}
                      alt={p.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div className="p-4 space-y-1">
                    <h4 className="font-semibold text-xs uppercase tracking-wider text-[#1A1816] group-hover:text-amber-900 transition-colors">
                      {p.title}
                    </h4>
                    <p className="text-[11px] text-[#7A6E60] truncate">{p.subtitle}</p>
                    <div className="text-xs font-serif font-bold text-[#1A1816] pt-1">
                      {formatPrice(p.priceLKR)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
