import React, { useEffect } from 'react';
import { useStore } from '../context/StoreContext';

export const SEOManager: React.FC = () => {
  const { currentRoute, getProductBySlug, selectedCurrency, formatRawPrice } = useStore();

  useEffect(() => {
    if (typeof document === 'undefined') return;

    let title = 'SAELYXE — Made for Presence | Luxury Streetwear & Ready-To-Wear';
    let description = 'Minimalist luxury streetwear and ready-to-wear drops crafted for understated presence. Handcrafted silhouettes, architectural tailoring, and exclusive limited drops.';
    let imageUrl = 'https://www.saelyxe.com/images/spotlight19201080.jpg';
    let canonicalPath = '/';
    let dynamicSchema: object | null = null;

    const routeName = currentRoute.name;

    if (routeName === 'product' && currentRoute.slug) {
      const product = getProductBySlug(currentRoute.slug);
      if (product) {
        title = `${product.title} | SAELYXE Atelier`;
        description = product.description 
          ? product.description.replace(/(<([^>]+)>)/gi, '').substring(0, 160)
          : `${product.title} - Handcrafted minimalist luxury streetwear by SAELYXE. Fabric: ${product.fabricDetails || 'Luxury blend'}.`;
        
        if (product.images && product.images.length > 0) {
          imageUrl = product.images[0].startsWith('http') ? product.images[0] : `https://www.saelyxe.com${product.images[0]}`;
        }
        canonicalPath = `/product/${product.slug || product.id}`;

        // Product Schema.org
        const priceInfo = formatRawPrice ? formatRawPrice(product.priceLKR) : { symbol: 'LKR', value: String(product.priceLKR), code: selectedCurrency?.code || 'LKR' };
        dynamicSchema = {
          "@context": "https://schema.org/",
          "@type": "Product",
          "name": product.title,
          "image": product.images || [imageUrl],
          "description": description,
          "sku": product.id,
          "mpn": product.id,
          "brand": {
            "@type": "Brand",
            "name": "SAELYXE"
          },
          "offers": {
            "@type": "Offer",
            "url": `https://www.saelyxe.com${canonicalPath}`,
            "priceCurrency": "LKR",
            "price": product.priceLKR,
            "priceValidUntil": "2027-12-31",
            "itemCondition": "https://schema.org/NewCondition",
            "availability": product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            "seller": {
              "@type": "Organization",
              "name": "SAELYXE"
            }
          }
        };
      }
    } else if (routeName === 'collection') {
      const category = currentRoute.category || 'all';
      const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
      title = `${categoryName} Collection | SAELYXE Luxury Streetwear`;
      description = `Explore the SAELYXE ${categoryName} luxury streetwear collection. Crafted with architectural silhouettes, heavyweight luxury cottons, and refined drops.`;
      canonicalPath = `/collections/${category}`;

      dynamicSchema = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": `${categoryName} Collection`,
        "url": `https://www.saelyxe.com/collections/${category}`,
        "description": description,
        "isPartOf": {
          "@type": "WebSite",
          "name": "SAELYXE",
          "url": "https://www.saelyxe.com/"
        }
      };
    } else if (routeName === 'vip') {
      title = 'VIP House Membership | SAELYXE Private Atelier Access';
      description = 'Join SAELYXE VIP House for exclusive tier benefits, priority drop access, bespoke concierge support, and private vault previews.';
      canonicalPath = '/vip';
    } else if (routeName === 'checkout') {
      title = 'Secure Checkout | SAELYXE Atelier';
      description = 'Complete your SAELYXE purchase with encrypted SSL checkout and worldwide insured express shipping.';
      canonicalPath = '/checkout';
    } else if (routeName === 'track-order' || routeName === 'track') {
      title = 'Track Order | SAELYXE Private Client Services';
      description = 'Track your SAELYXE luxury drop shipment in real time with global courier integration.';
      canonicalPath = '/track';
    } else if (routeName === 'legal-terms') {
      title = 'Terms of Service | SAELYXE';
      description = 'Official terms of service and client governance for SAELYXE House.';
      canonicalPath = '/legal/terms';
    } else if (routeName === 'legal-privacy') {
      title = 'Privacy Policy | SAELYXE Security & Data Care';
      description = 'SAELYXE privacy policy detailing client encryption, security protocols, and data rights.';
      canonicalPath = '/legal/privacy';
    } else if (routeName === 'legal-returns') {
      title = 'Returns & Exchanges | SAELYXE Concierge';
      description = 'Complimentary luxury return policy and client exchange instructions for SAELYXE garments.';
      canonicalPath = '/legal/returns';
    } else if (routeName === 'care-shipping') {
      title = 'Worldwide Delivery & Shipping | SAELYXE';
      description = 'Global express courier delivery, insured dispatch, and luxury custom packaging options.';
      canonicalPath = '/care/shipping';
    } else if (routeName === 'care-concierge') {
      title = 'Atelier Concierge | SAELYXE';
      description = 'Personal styling assistance, garment care advice, and private client service.';
      canonicalPath = '/care-concierge';
    } else if (routeName === 'care-size-guide') {
      title = 'Garment Fit & Size Guide | SAELYXE';
      description = 'Detailed measurement charts and drape guidance for SAELYXE architectural fits.';
      canonicalPath = '/care/size-guide';
    } else if (routeName === 'care-authenticity') {
      title = 'Authenticity & Craftsmanship | SAELYXE';
      description = 'Verification of custom weave fabrics, serial numbers, and genuine SAELYXE garment craft.';
      canonicalPath = '/care/authenticity';
    } else if (routeName === 'admin') {
      title = 'Admin Atelier | SAELYXE Console';
      description = 'Internal atelier administration and inventory management.';
      canonicalPath = '/admin';
    }

    // Update document title
    document.title = title;

    // Helper function to set meta tag content
    const setMetaContent = (nameOrProperty: string, value: string, isProperty = false) => {
      const selector = isProperty 
        ? `meta[property="${nameOrProperty}"]` 
        : `meta[name="${nameOrProperty}"]`;
      let element = document.head.querySelector(selector) as HTMLMetaElement | null;
      if (!element) {
        element = document.createElement('meta');
        if (isProperty) {
          element.setAttribute('property', nameOrProperty);
        } else {
          element.setAttribute('name', nameOrProperty);
        }
        document.head.appendChild(element);
      }
      element.setAttribute('content', value);
    };

    // Update standard meta tags
    setMetaContent('description', description);
    setMetaContent('og:title', title, true);
    setMetaContent('og:description', description, true);
    setMetaContent('og:image', imageUrl, true);
    setMetaContent('og:url', `https://www.saelyxe.com${canonicalPath}`, true);
    setMetaContent('twitter:title', title);
    setMetaContent('twitter:description', description);
    setMetaContent('twitter:image', imageUrl);

    const privateRouteNames = new Set(['admin', 'checkout', 'profile', 'orders', 'track-order', 'track']);
    setMetaContent('robots', privateRouteNames.has(routeName) ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');

    // Update canonical link
    let canonicalLink = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', `https://www.saelyxe.com${canonicalPath}`);

    // Dynamic JSON-LD script management
    const schemaScriptId = 'saelyxe-dynamic-jsonld';
    let scriptElement = document.getElementById(schemaScriptId) as HTMLScriptElement | null;
    if (dynamicSchema) {
      if (!scriptElement) {
        scriptElement = document.createElement('script');
        scriptElement.id = schemaScriptId;
        scriptElement.type = 'application/ld+json';
        document.head.appendChild(scriptElement);
      }
      scriptElement.text = JSON.stringify(dynamicSchema);
    } else if (scriptElement) {
      scriptElement.remove();
    }

  }, [currentRoute, getProductBySlug, selectedCurrency, formatRawPrice]);

  return null;
};
