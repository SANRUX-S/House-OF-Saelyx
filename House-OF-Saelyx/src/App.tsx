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
const AdminPanel = React.lazy(() => import('./components/AdminPanel').then(module => ({ default: module.AdminPanel })));
const ProductDetailPage = React.lazy(() => import('./components/ProductDetailPage').then(module => ({ default: module.ProductDetailPage })));
const CollectionPage = React.lazy(() => import('./components/CollectionPage').then(module => ({ default: module.CollectionPage })));
const CheckoutPage = React.lazy(() => import('./components/CheckoutPage').then(module => ({ default: module.CheckoutPage })));
const LegalTermsPage = React.lazy(() => import('./components/LegalTermsPage').then(module => ({ default: module.LegalTermsPage })));
const LegalPrivacyPage = React.lazy(() => import('./components/LegalPrivacyPage').then(module => ({ default: module.LegalPrivacyPage })));
const LegalReturnsPage = React.lazy(() => import('./components/LegalReturnsPage').then(module => ({ default: module.LegalReturnsPage })));
const CareShippingPage = React.lazy(() => import('./components/CareShippingPage').then(module => ({ default: module.CareShippingPage })));
const CareConciergePage = React.lazy(() => import('./components/CareConciergePage').then(module => ({ default: module.CareConciergePage })));
const CareSizeGuidePage = React.lazy(() => import('./components/CareSizeGuidePage').then(module => ({ default: module.CareSizeGuidePage })));
const CareAuthenticityPage = React.lazy(() => import('./components/CareAuthenticityPage').then(module => ({ default: module.CareAuthenticityPage })));
const ProfilePage = React.lazy(() => import('./components/ProfilePage').then(module => ({ default: module.ProfilePage })));
const OrdersPage = React.lazy(() => import('./components/OrdersPage').then(module => ({ default: module.OrdersPage })));
const TrackOrderPage = React.lazy(() => import('./components/TrackOrderPage').then(module => ({ default: module.TrackOrderPage })));
const VipPage = React.lazy(() => import('./components/VipPage').then(module => ({ default: module.VipPage })));
const ContactSupportPage = React.lazy(() => import('./components/ContactSupportPage').then(module => ({ default: module.ContactSupportPage })));

const RouteLoading: React.FC = () => (
  <div className="min-h-[55vh] flex items-center justify-center bg-[#F8F6F2] px-6">
    <div className="text-center">
      <div className="mx-auto h-7 w-7 rounded-full border border-[#B9AC9E] border-t-[#1A1816] animate-spin" />
      <p className="mt-4 text-[10px] uppercase tracking-[0.24em] text-[#7A6E60]">Loading SAELYXE</p>
    </div>
  </div>
);
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
    // Firestore listeners provide live updates. A focus refresh covers stale tabs without background polling.
    window.addEventListener('focus', safeRefetch);
    return () => {
      window.removeEventListener('focus', safeRefetch);
    };
  }, [safeRefetch]);

  // Fix: Automatically scroll window to top whenever current route/page changes in SPA mode
  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [currentRoute.name, (currentRoute as any).slug, (currentRoute as any).category]);

  // If in Admin mode, render completely isolated full-screen Atelier interface without consumer navbar/footer
  if (currentRoute.name === 'admin') {
    return (
      <div className="min-h-screen bg-[#F4F6F5] text-stone-900 selection:bg-[#B4F105] selection:text-black font-sans antialiased">
        <SEOManager />
        <React.Suspense fallback={<RouteLoading />}>
          <AdminPanel />
        </React.Suspense>
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
        <React.Suspense fallback={<RouteLoading />}>
          {renderRoute()}
        </React.Suspense>
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