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
  category: 'men' | 'women' | 'new' | 'collections' | 'knits';
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
  status: 'active' | 'suspended';
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

export type OrderStatus = 'placed' | 'confirmed' | 'packed' | 'dispatched' | 'out_for_delivery' | 'delivered';

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
}

export interface DropSettings {
  spotlightEyebrow: string;
  spotlightTitle: string;
  spotlightSubhead: string;
  spotlightDescription: string;
  spotlightPriceLKR: number;
  spotlightImages: string[];
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
  status: 'pending' | 'sent' | 'cancelled';
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
  | { name: 'admin'; tab?: 'overview' | 'products' | 'orders' | 'messages' | 'staff' | 'security' | 'settings' }
  | { name: 'legal-terms' }
  | { name: 'legal-privacy' }
  | { name: 'legal-returns' }
  | { name: 'care-shipping' }
  | { name: 'care-concierge' }
  | { name: 'care-size-guide' }
  | { name: 'care-authenticity' };
