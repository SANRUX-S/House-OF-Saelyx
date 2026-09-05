export interface ProductReview {
  id: string;
  author: string;
  rating: number;
  date: string;
  verified: boolean;
  comment: string;
}

export interface Product {
  id: string;
  slug?: string;
  title: string;
  subtitle: string;
  priceLKR: number;
  category: 'men' | 'women' | 'new' | 'collections' | 'knits' | 'sets' | 'accessories';
  subCategory?: string;
  images: string[];
  hoverImage?: string;
  completeTheSetProductId?: string;
  bulletDetails?: string[];
  reviews?: ProductReview[];
  description: string;
  fabricDetails: string;
  sizes: string[];
  inStock: boolean;
  stockCount: number;
  isSpotlight?: boolean;
  dropNumber?: string;
  badge?: string;
  fit?: string;
  color?: string;
  createdAt?: string;
}

export interface AdminStaff {
  id: string;
  username: string;
  displayName?: string;
  name?: string;
  email: string;
  role: 'super_admin' | 'admin';
  status: 'invited' | 'active' | 'suspended' | 'revoked';
  firebaseUid?: string;
  emailVerified?: boolean;
  invitedAt?: string;
  activatedAt?: string;
  revokedAt?: string;
  createdAt: string;
  lastLogin?: string;
}

export interface OrderItem {
  productId: string;
  title: string;
  image: string;
  priceLKR: number;
  size: string;
  quantity: number;
}

export type OrderStatus = 'placed' | 'confirmed' | 'packed' | 'dispatched' | 'out_for_delivery' | 'delivered' | 'cancelled';

export interface OrderStatusUpdate {
  status: OrderStatus;
  timestamp: string;
  note: string;
  location?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  email: string;
  customerEmail?: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  items: OrderItem[];
  subtotalLKR: number;
  shippingLKR: number;
  totalLKR: number;
  currencyUsed: string;
  totalInCurrency: number;
  status: OrderStatus;
  trackingNumber: string;
  courierName: string;
  deliveryEta: string;
  notes?: string;
  createdAt: string;
  statusHistory: OrderStatusUpdate[];
  userId?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  paymentProviderReference?: string;
  paymentCaptureId?: string;
  paymentCaptureAmount?: number;
  paymentCaptureCurrency?: string;
  refundId?: string;
  refundStatus?: string;
  refundedAt?: string;
  paymentVerificationSource?: string;
  paymentVerificationError?: string;
  paymentVerifiedAt?: string;
  paymentCaptureStartedAt?: string;
  paymentCaptureCompletedAt?: string;
  paymentCaptureState?: 'pending' | 'capturing' | 'needs_recovery' | 'completed';
  requiresManualReview?: boolean;
  inventoryException?: string;
  inventoryCommitted?: boolean;
  inventoryCommittedAt?: string;
  inventoryReserved?: boolean;
  inventoryReservedAt?: string;
  inventoryReservationReleasedAt?: string;
}

export interface DropSettings {
  spotlightEyebrow: string;
  spotlightTitle: string;
  spotlightSubhead: string;
  spotlightDescription: string;
  spotlightPriceLKR: number;
  spotlightImages: string[];
  spotlightBackgroundImage?: string;
  countdownTarget: string; // ISO String
  announcementText: string;
  freeShippingThresholdLKR: number;
  heroHeadline: string;
  heroSubhead: string;
  showHeroSection?: boolean;
  showSpotlightSection?: boolean;
  showCollectionSection?: boolean;
  showSocialFAQSection?: boolean;
}

export interface CurrencyRate {
  code: string;
  symbol: string;
  name: string;
  rateFromLKR: number; // 1 LKR = X target currency
  symbolPosition: 'before' | 'after';
  flag: string;
}

export type UserRole = 'super_admin' | 'admin' | 'patron' | 'guest';

export interface AppUser {
  uid: string;
  name: string;
  email: string;
  phoneNumber?: string;
  role: UserRole;
  avatarUrl?: string;
  joinedDate?: string;
  ordersCount?: number;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  authProvider?: string;
  savedAddresses?: Array<{
    title: string;
    street: string;
    city: string;
    country: string;
    postalCode: string;
  }>;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string;
  topic: 'order_inquiry' | 'bespoke_sizing' | 'concierge' | 'press' | 'authenticity' | 'other';
  orderReference?: string;
  message: string;
  createdAt: string;
  status: 'unread' | 'read' | 'replied';
  replyNotes?: string;
}

export interface StockNotification {
  id: string;
  productId: string;
  productTitle: string;
  productSlug?: string;
  productImage?: string;
  selectedSize?: string;
  customerEmail: string;
  customerName?: string;
  phone?: string;
  channel?: 'email' | 'app' | 'both';
  notified: boolean;
  notifiedAt?: string;
  status: 'pending' | 'sent' | 'cancelled' | 'dispatched';
  createdAt: string;
  cloudFunctionExecutionId?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  role: UserRole;
  action: string;
  details: string;
  ipAddress?: string;
}

export type AppRoute = 
  | { name: 'home' }
  | { name: 'product'; slug: string }
  | { name: 'collection'; category: string }
  | { name: 'cart' }
  | { name: 'checkout' }
  | { name: 'track'; orderId?: string }
  | { name: 'track-order'; orderId?: string }
  | { name: 'orders'; orderId?: string }
  | { name: 'profile' }
  | { name: 'vip' }
  | { name: 'contact-support' }
  | { name: 'admin'; tab?: 'overview' | 'products' | 'orders' | 'messages' | 'staff' | 'security' | 'settings' }
  | { name: 'legal-terms' }
  | { name: 'legal-privacy' }
  | { name: 'legal-returns' }
  | { name: 'care-shipping' }
  | { name: 'care-concierge' }
  | { name: 'care-size-guide' }
  | { name: 'care-authenticity' };
