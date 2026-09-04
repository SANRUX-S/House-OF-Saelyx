import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Bell, 
  CheckCircle2, 
  Sparkles, 
  Mail, 
  Smartphone, 
  ShieldCheck, 
  Clock, 
  AlertCircle,
  Eye,
  Send
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Product } from '../types';

interface BackInStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  initialSize?: string;
}

export const BackInStockModal: React.FC<BackInStockModalProps> = ({
  isOpen,
  onClose,
  product,
  initialSize
}) => {
  const { user, subscribeToRestock, formatPrice } = useStore();

  const [selectedSize, setSelectedSize] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [channel, setChannel] = useState<'email' | 'app' | 'both'>('email');
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showEmailPreview, setShowEmailPreview] = useState(false);

  useEffect(() => {
    if (product) {
      setSelectedSize(initialSize || product.sizes?.[0] || 'Standard');
      setIsSubmitted(false);
      setErrorMessage(null);
      setShowEmailPreview(false);
    }
  }, [product, initialSize, isOpen]);

  useEffect(() => {
    if (user && user.email) {
      setEmail(user.email);
      if (user.name) setName(user.name);
    }
  }, [user]);

  if (!isOpen || !product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMessage('Please enter a valid luxury patron email address.');
      return;
    }

    if ((channel === 'app' || channel === 'both') && typeof window !== 'undefined' && typeof Notification !== 'undefined') {
      if (Notification.permission === 'default') {
        const result = await Notification.requestPermission();
        setNotificationPermission(result);
        if (result !== 'granted') {
          setErrorMessage('Please allow browser notifications to enable Live App Alerts.');
          return;
        }
      } else if (Notification.permission === 'denied') {
        setErrorMessage('Notifications are blocked by your browser. Please allow notifications in your browser settings.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const res = await subscribeToRestock({
        productId: product.id,
        productTitle: product.title,
        productSlug: product.slug || product.id,
        productImage: product.images?.[0] || '',
        selectedSize: selectedSize || 'Standard',
        customerEmail: cleanEmail,
        customerName: name.trim() || undefined,
        phone: undefined,
        channel: channel
      });

      if (res.success) {
        setIsSubmitted(true);
      } else {
        setErrorMessage(res.error || 'Unable to register restock request. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div 
        id="back-in-stock-overlay"
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          id="back-in-stock-modal"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-lg bg-[#111113] border border-neutral-800 text-neutral-100 rounded-none shadow-2xl overflow-hidden my-8"
        >
          {/* Top Bar Banner */}
          <div className="bg-neutral-900/80 px-6 py-4 border-b border-neutral-800/80 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-[11px] font-mono tracking-widest text-neutral-300 uppercase">
                Atelier Priority Restock Waitlist
              </span>
            </div>
            <button
              id="btn-close-restock-modal"
              onClick={onClose}
              className="text-neutral-400 hover:text-white p-1 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {!isSubmitted ? (
            <div className="p-4 sm:p-8 space-y-5 sm:space-y-6">
              {/* Product Brief Header */}
              <div className="flex space-x-3 sm:space-x-4 items-start pb-4 sm:pb-5 border-b border-neutral-800/60">
                <div className="w-16 h-20 sm:w-20 sm:h-24 bg-neutral-900 border border-neutral-800 flex-shrink-0 overflow-hidden relative">
                  <img
                    src={product.images?.[0]}
                    alt={product.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover grayscale contrast-125"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-1 left-1 bg-red-950/80 border border-red-800/60 text-red-300 text-[9px] font-mono px-1 py-0.5 tracking-wider uppercase">
                    Sold Out
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-mono text-neutral-400 tracking-wider uppercase mb-0.5 sm:mb-1">
                    {product.badge || 'Archival Edition'}
                  </div>
                  <h3 className="text-sm sm:text-lg font-serif font-light text-white tracking-wide truncate">
                    {product.title}
                  </h3>
                  <p className="text-xs text-neutral-400 font-mono mt-0.5 sm:mt-1">
                    {formatPrice(product.priceLKR)}
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-0.5 sm:mt-1 line-clamp-1">
                    {product.subtitle || product.fabricDetails}
                  </p>
                </div>
              </div>

              {/* Cloud Function Automation Guarantee Pill */}
              <div className="bg-neutral-900/60 border border-neutral-800 p-3 sm:p-3.5 flex items-start space-x-2.5 sm:space-x-3">
                <Sparkles className="w-4 h-4 text-amber-300 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-neutral-300 leading-relaxed">
                  <span className="text-amber-200 font-medium">Firebase Cloud Functions Integration:</span> You will receive an automated priority email dispatch the exact second our cutters replenishment batch is registered.
                </div>
              </div>

              {/* Error Message if any */}
              {errorMessage && (
                <div className="bg-red-950/50 border border-red-800/80 text-red-200 text-xs p-3 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Size Selector */}
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-widest text-neutral-400 mb-2">
                    Select Preferred Size:
                  </label>
                  <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                    {product.sizes && product.sizes.length > 0 ? (
                      product.sizes.map((s) => (
                        <button
                          key={s}
                          type="button"
                          id={`btn-select-restock-size-${s.toLowerCase()}`}
                          onClick={() => setSelectedSize(s)}
                          className={`py-2 text-xs font-mono tracking-wider transition-all border cursor-pointer min-h-[38px] ${
                            selectedSize === s
                              ? 'bg-neutral-100 text-black border-neutral-100 font-semibold'
                              : 'bg-neutral-900/50 text-neutral-300 border-neutral-800 hover:border-neutral-600'
                          }`}
                        >
                          {s}
                        </button>
                      ))
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedSize('Standard')}
                        className="col-span-5 py-2 text-xs font-mono bg-neutral-100 text-black border border-neutral-100"
                      >
                        Standard Size
                      </button>
                    )}
                    <button
                      type="button"
                      id="btn-select-restock-size-any"
                      onClick={() => setSelectedSize('Any Size')}
                      className={`py-2 text-xs font-mono tracking-wider transition-all border cursor-pointer min-h-[38px] ${
                        selectedSize === 'Any Size'
                          ? 'bg-neutral-100 text-black border-neutral-100 font-semibold'
                          : 'bg-neutral-900/50 text-neutral-400 border-neutral-800 hover:border-neutral-600'
                      }`}
                    >
                      Any
                    </button>
                  </div>
                </div>

                {/* Email Input */}
                <div>
                  <label 
                    htmlFor="restock-email-input"
                    className="block text-[11px] font-mono uppercase tracking-widest text-neutral-400 mb-1.5"
                  >
                    Patron Email Address <span className="text-amber-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input
                      id="restock-email-input"
                      type="email"
                      required
                      placeholder="patron@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-neutral-900/90 border border-neutral-800 text-neutral-100 text-base sm:text-xs font-mono focus:outline-none focus:border-amber-400/80 transition-colors placeholder:text-neutral-600"
                    />
                  </div>
                </div>

                {/* Optional Name */}
                <div>
                  <label 
                    htmlFor="restock-name-input"
                    className="block text-[11px] font-mono uppercase tracking-widest text-neutral-400 mb-1.5"
                  >
                    Patron Name (Optional)
                  </label>
                  <input
                    id="restock-name-input"
                    type="text"
                    placeholder="e.g. Lord Harrington"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2.5 bg-neutral-900/90 border border-neutral-800 text-neutral-100 text-base sm:text-xs font-mono focus:outline-none focus:border-neutral-600 transition-colors placeholder:text-neutral-600"
                  />
                </div>

                {/* Notification Channel */}
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-widest text-neutral-400 mb-2">
                    Dispatch Channel Preference:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      id="btn-channel-email"
                      onClick={() => setChannel('email')}
                      className={`flex items-center justify-center space-x-2 py-2 px-3 text-xs font-mono border transition-all cursor-pointer min-h-[38px] ${
                        channel === 'email'
                          ? 'bg-neutral-800 text-white border-neutral-600'
                          : 'bg-neutral-900/40 text-neutral-400 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Email Only</span>
                    </button>
                    <button
                      type="button"
                      id="btn-channel-both"
                      onClick={() => setChannel('both')}
                      className={`flex items-center justify-center space-x-2 py-2 px-3 text-xs font-mono border transition-all cursor-pointer min-h-[38px] ${
                        channel === 'both'
                          ? 'bg-neutral-800 text-white border-neutral-600'
                          : 'bg-neutral-900/40 text-neutral-400 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <Bell className="w-3.5 h-3.5 text-amber-400" />
                      <span>Email + App Alert</span>
                    </button>
                  </div>
                </div>

                {/* Web App Notification authorization status if app channel selected */}
                {(channel === 'app' || channel === 'both') && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1.5 pt-1"
                  >
                    <label className="block text-[11px] font-mono uppercase tracking-widest text-neutral-400">
                      Web App Notifications Authorization
                    </label>
                    <div className="p-3 bg-neutral-900/95 border border-neutral-800 rounded-lg space-y-2">
                      {notificationPermission === 'default' && (
                        <div className="space-y-2">
                          <p className="text-[10px] text-neutral-400 font-sans leading-relaxed">
                            To receive live, instantaneous Atelier restocking alerts directly on this device, please authorize browser notifications.
                          </p>
                          <button
                            type="button"
                            onClick={async () => {
                              if (typeof Notification !== 'undefined') {
                                const result = await Notification.requestPermission();
                                setNotificationPermission(result);
                              }
                            }}
                            className="w-full py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono text-[10px] uppercase tracking-wider transition-all cursor-pointer min-h-[32px] rounded"
                          >
                            Allow Web App Notifications
                          </button>
                        </div>
                      )}
                      {notificationPermission === 'denied' && (
                        <p className="text-[10px] text-rose-400 font-sans leading-relaxed">
                          ⚠️ Notifications are blocked by your browser. Please click the lock icon in your browser address bar to allow notifications for SAELYXE.
                        </p>
                      )}
                      {notificationPermission === 'granted' && (
                        <div className="flex items-center space-x-2 text-emerald-400 font-mono text-[10px]">
                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                          <span>✓ Live App Notifications Authorized on this Device</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Submit Action */}
                <div className="pt-2">
                  <button
                    type="submit"
                    id="btn-submit-restock-notification"
                    disabled={isSubmitting}
                    className="w-full py-3.5 bg-neutral-100 hover:bg-white text-neutral-950 font-mono text-xs uppercase tracking-widest font-medium transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer min-h-[44px]"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                        <span>Registering with Cloud Functions...</span>
                      </>
                    ) : (
                      <>
                        <Bell className="w-3.5 h-3.5 transition-transform group-hover:scale-110" />
                        <span>Email Me When Back in Stock</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-center space-x-2 text-[10px] text-neutral-500 font-mono pt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Zero spam guaranteed. One-time notification only.</span>
                </div>
              </form>
            </div>
          ) : (
            /* Success Confirmation Screen */
            <div className="p-6 sm:p-8 text-center space-y-6">
              <div className="w-16 h-16 bg-amber-950/40 border border-amber-500/40 text-amber-300 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <span className="text-[10px] font-mono tracking-widest text-amber-400 uppercase">
                  Waitlist Confirmed
                </span>
                <h3 className="text-xl font-serif font-light text-white mt-1">
                  Priority Restock Alert Registered
                </h3>
                <p className="text-xs text-neutral-400 font-sans mt-2 max-w-sm mx-auto leading-relaxed">
                  We have registered your alert for <span className="text-white font-medium">{product.title}</span> in size <span className="text-amber-200 font-mono">{selectedSize}</span>.
                </p>
              </div>

              {/* Receipt card */}
              <div className="bg-neutral-900/70 border border-neutral-800 p-4 text-left font-mono text-xs space-y-2">
                <div className="flex justify-between text-neutral-400 pb-1 border-b border-neutral-800">
                  <span>Dispatch Target:</span>
                  <span className="text-neutral-200">{email}</span>
                </div>
                <div className="flex justify-between text-neutral-400 pb-1 border-b border-neutral-800">
                  <span>Channel:</span>
                  <span className="text-neutral-200 uppercase">{channel === 'both' ? 'Email + App Alert' : 'Email'}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Backend Trigger:</span>
                  <span className="text-amber-300 text-[11px]">Firebase Cloud Functions (onStockReplenished)</span>
                </div>
              </div>

              {/* Email Template Preview Toggle */}
              <div>
                <button
                  type="button"
                  id="btn-toggle-email-preview"
                  onClick={() => setShowEmailPreview(!showEmailPreview)}
                  className="text-[11px] font-mono text-neutral-400 hover:text-white underline underline-offset-4 flex items-center justify-center space-x-1.5 mx-auto"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{showEmailPreview ? 'Hide Dispatch Template' : 'Preview Automated Restock Email'}</span>
                </button>

                {showEmailPreview && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 bg-black border border-neutral-800 text-left font-sans text-xs space-y-3 rounded"
                  >
                    <div className="border-b border-neutral-800 pb-2 flex items-center justify-between text-[11px] font-mono text-neutral-400">
                      <span>From: concierge@saelyxe.com</span>
                      <span className="text-amber-400">Automated Dispatch</span>
                    </div>
                    <div className="text-sm font-serif text-white">
                      Subject: Restock Notification: {product.title} is now available at the Atelier
                    </div>
                    <p className="text-neutral-300 text-xs leading-relaxed">
                      Dear {name || 'Valued Patron'},<br /><br />
                      The waitlist request you registered for <strong className="text-white">{product.title}</strong> (Size {selectedSize}) has just been fulfilled. Our cutters and tailors have completed a new limited replenishment batch.
                    </p>
                    <div className="bg-neutral-900 p-2.5 flex items-center space-x-3 border border-neutral-800">
                      <img 
                        src={product.images?.[0]} 
                        alt="Garment" 
                        referrerPolicy="no-referrer"
                        className="w-12 h-14 object-cover" 
                      />
                      <div>
                        <div className="font-serif text-white text-xs">{product.title}</div>
                        <div className="font-mono text-[11px] text-amber-300">{formatPrice(product.priceLKR)}</div>
                      </div>
                    </div>
                    <div className="pt-1">
                      <div className="w-full py-2 bg-white text-black text-center font-mono text-[11px] uppercase tracking-wider font-semibold">
                        Purchase Before General Release →
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  id="btn-close-restock-success"
                  onClick={onClose}
                  className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-mono text-xs uppercase tracking-widest transition-colors cursor-pointer"
                >
                  Return to Atelier Catalog
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
