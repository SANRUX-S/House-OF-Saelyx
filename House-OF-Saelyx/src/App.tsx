import React from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { SpotlightProduct } from './components/SpotlightProduct';
import { CollectionGrid } from './components/CollectionGrid';
import { SocialProof } from './components/SocialProof';
import { FaqSection } from './components/FaqSection';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { ProductModal } from './components/ProductModal';
import { SearchModal } from './components/SearchModal';
import { OrderTrackerModal } from './components/OrderTrackerModal';
import { AuthModal } from './components/AuthModal';
import { BackInStockModal } from './components/BackInStockModal';
import { AdminPanel } from './components/AdminPanel';
import { ProductDetailPage } from './components/ProductDetailPage';
import { CollectionPage } from './components/CollectionPage';
import { CheckoutPage } from './components/CheckoutPage';
import { LegalTermsPage } from './components/LegalTermsPage';
import { LegalPrivacyPage } from './components/LegalPrivacyPage';
import { LegalReturnsPage } from './components/LegalReturnsPage';
import { CareShippingPage } from './components/CareShippingPage';
import { CareConciergePage } from './components/CareConciergePage';
import { CareSizeGuidePage } from './components/CareSizeGuidePage';
import { CareAuthenticityPage } from './components/CareAuthenticityPage';
import { ProfilePage } from './components/ProfilePage';
import { OrdersPage } from './components/OrdersPage';
import { TrackOrderPage } from './components/TrackOrderPage';
import { VipPage } from './components/VipPage';
import { ContactSupportPage } from './components/ContactSupportPage';
import { ScrollToTop } from './components/ScrollToTop';
import { SEOManager } from './components/SEOManager';

const StoreContent: React.FC = () => {
  const { 
    currentRoute, 
    isRestockModalOpen, 
    closeRestockModal, 
    restockModalProduct, 
    restockModalSize,
    settings,
    refetchData
  } = useStore();

  // Smart, low-overhead sync (avoids 10s idle network spam & unnecessary re-renders)
  const isFetchingRef = React.useRef(false);
  const safeRefetch = React.useCallback(() => {
    if (isFetchingRef.current || (typeof document !== 'undefined' && document.visibilityState === 'hidden')) {
      return;
    }
    isFetchingRef.current = true;
    refetchData()
      .catch(err => console.warn('Database resync warning:', err))
      .finally(() => {
        isFetchingRef.current = false;
      });
  }, [refetchData]);

  React.useEffect(() => {
    window.addEventListener('focus', safeRefetch);
    // Faster sync for admin management (20s), relaxed cadence for consumer browsing (60s)
    const pollInterval = currentRoute.name === 'admin' ? 20000 : 60000;
    const interval = setInterval(safeRefetch, pollInterval);
    return () => {
      window.removeEventListener('focus', safeRefetch);
      clearInterval(interval);
    };
  }, [safeRefetch, currentRoute.name]);

  // Fix: Automatically scroll window to top whenever current route/page changes in SPA mode
  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [currentRoute.name, (currentRoute as any).slug, (currentRoute as any).category]);

  // If in Admin mode, render completely isolated full-screen Atelier interface without consumer navbar/footer
  if (currentRoute.name === 'admin') {
    return (
      <div className="min-h-screen bg-[#0C0B0A] text-stone-100 selection:bg-amber-400 selection:text-black font-sans antialiased">
        <SEOManager />
        <AdminPanel />
        <BackInStockModal 
          isOpen={isRestockModalOpen} 
          onClose={closeRestockModal} 
          product={restockModalProduct} 
          initialSize={restockModalSize} 
        />
        <ScrollToTop />
      </div>
    );
  }

  const renderRoute = () => {
    switch (currentRoute.name) {
      case 'product':
        return <ProductDetailPage slug={currentRoute.slug || ''} />;
      case 'collection':
        return <CollectionPage category={currentRoute.category || 'all'} />;
      case 'checkout':
        return <CheckoutPage />;
      case 'profile':
        return <ProfilePage />;
      case 'orders':
        return <OrdersPage />;
      case 'track-order':
      case 'track':
        return <TrackOrderPage initialOrderId={(currentRoute as any).orderId} />;
      case 'vip':
        return <VipPage />;
      case 'contact-support':
        return <ContactSupportPage />;
      case 'legal-terms':
        return <LegalTermsPage />;
      case 'legal-privacy':
        return <LegalPrivacyPage />;
      case 'legal-returns':
        return <LegalReturnsPage />;
      case 'care-shipping':
        return <CareShippingPage />;
      case 'care-concierge':
        return <CareConciergePage />;
      case 'care-size-guide':
        return <CareSizeGuidePage />;
      case 'care-authenticity':
        return <CareAuthenticityPage />;
      case 'home':
      default:
        return (
          <>
            {/* Section 1: Hero Section */}
            {settings?.showHeroSection !== false && <HeroSection />}

            {/* Section 2: Spotlight Hero Product */}
            {settings?.showSpotlightSection !== false && <SpotlightProduct />}

            {/* Section 3: Collection Grid */}
            {settings?.showCollectionSection !== false && <CollectionGrid />}

            {/* Section 4 & 5: Social Proof & FAQ */}
            {settings?.showSocialFAQSection !== false && (
              <>
                <SocialProof />
                <FaqSection />
              </>
            )}
          </>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F8F6F2] selection:bg-[#181614] selection:text-[#F8F6F2]">
      <SEOManager />
      {/* Top Luxury Navigation */}
      <Navbar />

      {/* Main Viewport Router with proper spacing */}
      <main className="flex-grow">
        {renderRoute()}
      </main>

      {/* Section 6: Minimalist Footer */}
      <Footer />

      {/* Scroll To Top floating action button */}
      <ScrollToTop />

      {/* Global Interactive Drawers & Modals */}
      <CartDrawer />
      <ProductModal />
      <SearchModal />
      <OrderTrackerModal />
      <AuthModal />
      <BackInStockModal 
        isOpen={isRestockModalOpen} 
        onClose={closeRestockModal} 
        product={restockModalProduct} 
        initialSize={restockModalSize} 
      />
    </div>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <StoreContent />
    </StoreProvider>
  );
}