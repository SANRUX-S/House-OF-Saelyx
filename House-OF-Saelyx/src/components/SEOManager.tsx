import React, { useEffect } from 'react';
import { useStore } from '../context/StoreContext';

export const SEOManager: React.FC = () => {
  const { currentRoute, getProductBySlug, selectedCurrency, formatRawPrice } = useStore();

  useEffect(() => {
    if (typeof document === 'undefined') return;

    let title = 'SAELYX — Made for Presence | Luxury Streetwear & Ready-To-Wear';
    let description = 'Minimalist luxury streetwear and ready-to-wear drops crafted for understated presence. Handcrafted silhouettes, architectural tailoring, and exclusive limited drops.';
    let imageUrl = 'https://saelyx.com/images/spotlight19201080.jpg';
    let canonicalPath = '/';
    let dynamicSchema: object | null = null;

    const routeName = currentRoute.name;

    if (routeName === 'product' && currentRoute.slug) {
      const product = getProductBySlug(currentRoute.slug);
      if (product) {
        title = `${product.title} | SAELYX Atelier`;
        description = product.description 
          ? product.description.replace(/(<([^>]+)>)/gi, '').substring(0, 160)
          : `${product.title} - Handcrafted minimalist luxury streetwear by SAELYX. Fabric: ${product.fabricDetails || 'Luxury blend'}.`;
        
        if (product.images && product.images.length > 0) {
          imageUrl = product.images[0].startsWith('http') ? product.images[0] : `https://saelyx.com${product.images[0]}`;
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
            "name": "SAELYX"
          },
          "offers": {
            "@type": "Offer",
            "url": `https://saelyx.com${canonicalPath}`,
            "priceCurrency": priceInfo.code || "LKR",
            "price": product.priceLKR,
            "priceValidUntil": "2027-12-31",
            "itemCondition": "https://schema.org/NewCondition",
            "availability": product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            "seller": {
              "@type": "Organization",
              "name": "SAELYX"
            }
          }
        };
      }
    } else if (routeName === 'collection') {
      const category = currentRoute.category || 'all';
      const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
      title = `${categoryName} Collection | SAELYX Luxury Streetwear`;
      description = `Explore the SAELYX ${categoryName} luxury streetwear collection. Crafted with architectural silhouettes, heavyweight luxury cottons, and refined drops.`;
      canonicalPath = `/collection/${category}`;

      dynamicSchema = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": `${categoryName} Collection`,
        "url": `https://saelyx.com/collection/${category}`,
        "description": description,
        "isPartOf": {
          "@type": "WebSite",
          "name": "SAELYX",
          "url": "https://saelyx.com/"
        }
      };
    } else if (routeName === 'vip') {
      title = 'VIP House Membership | SAELYX Private Atelier Access';
      description = 'Join SAELYX VIP House for exclusive tier benefits, priority drop access, bespoke concierge support, and private vault previews.';
      canonicalPath = '/vip';
    } else if (routeName === 'checkout') {
      title = 'Secure Checkout | SAELYX Atelier';
      description = 'Complete your SAELYX purchase with encrypted SSL checkout and worldwide insured express shipping.';
      canonicalPath = '/checkout';
    } else if (routeName === 'track-order' || routeName === 'track') {
      title = 'Track Order | SAELYX Private Client Services';
      description = 'Track your SAELYX luxury drop shipment in real time with global courier integration.';
      canonicalPath = '/track';
    } else if (routeName === 'legal-terms') {
      title = 'Terms of Service | SAELYX';
      description = 'Official terms of service and client governance for SAELYX House.';
      canonicalPath = '/legal-terms';
    } else if (routeName === 'legal-privacy') {
      title = 'Privacy Policy | SAELYX Security & Data Care';
      description = 'SAELYX privacy policy detailing client encryption, security protocols, and data rights.';
      canonicalPath = '/legal-privacy';
    } else if (routeName === 'legal-returns') {
      title = 'Returns & Exchanges | SAELYX Concierge';
      description = 'Complimentary luxury return policy and client exchange instructions for SAELYX garments.';
      canonicalPath = '/legal-returns';
    } else if (routeName === 'care-shipping') {
      title = 'Worldwide Delivery & Shipping | SAELYX';
      description = 'Global express courier delivery, insured dispatch, and luxury custom packaging options.';
      canonicalPath = '/care-shipping';
    } else if (routeName === 'care-concierge') {
      title = 'Atelier Concierge | SAELYX';
      description = 'Personal styling assistance, garment care advice, and private client service.';
      canonicalPath = '/care-concierge';
    } else if (routeName === 'care-size-guide') {
      title = 'Garment Fit & Size Guide | SAELYX';
      description = 'Detailed measurement charts and drape guidance for SAELYX architectural fits.';
      canonicalPath = '/care-size-guide';
    } else if (routeName === 'care-authenticity') {
      title = 'Authenticity & Craftsmanship | SAELYX';
      description = 'Verification of custom weave fabrics, serial numbers, and genuine SAELYX garment craft.';
      canonicalPath = '/care-authenticity';
    } else if (routeName === 'admin') {
      title = 'Admin Atelier | SAELYX Console';
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
    setMetaContent('og:url', `https://saelyx.com${canonicalPath}`, true);
    setMetaContent('twitter:title', title);
    setMetaContent('twitter:description', description);
    setMetaContent('twitter:image', imageUrl);

    // Update canonical link
    let canonicalLink = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', `https://saelyx.com${canonicalPath}`);

    // Dynamic JSON-LD script management
    const schemaScriptId = 'saelyx-dynamic-jsonld';
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
