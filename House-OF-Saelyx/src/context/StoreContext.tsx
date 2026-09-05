import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { 
  Product, 
  CurrencyRate, 
  DropSettings, 
  OrderItem, 
  Order, 
  AppUser, 
  AppRoute, 
  ContactMessage, 
  AuditLog, 
  UserRole,
  StockNotification,
  AdminStaff
} from '../types';
import { 
  auth, 
  db, 
  googleProvider, 
  facebookProvider, 
  verifyAdminCredentials,
  getConfiguredAdminRole,
  isFirebaseConfigured,
  getAppCheckRequestHeaders,
} from '../lib/firebase';
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as fbSignOut, 
  updateProfile,
  onAuthStateChanged
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  where,
  limit,
  addDoc,
  arrayUnion
} from 'firebase/firestore';

interface CartItem extends OrderItem {
  product: Product;
}

type CreateOrderInput = Pick<
  Order,
  'customerName' | 'email' | 'phone' | 'address' | 'city' | 'postalCode' | 'country' | 'items' | 'currencyUsed' | 'paymentMethod' | 'notes'
> & {
  promoCode?: string;
  paymentProviderReference?: string;
  checkoutAttemptId?: string;
};

type AuthMode = 'signin' | 'signup';

interface StoreContextType {
  // Navigation & Routing
  currentRoute: AppRoute;
  navigateTo: (route: AppRoute) => void;
  navigateToUrl: (path: string) => void;

  // Products
  products: Product[];
  isLoadingProducts: boolean;
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  activeModalProduct: Product | null;
  setActiveModalProduct: (product: Product | null) => void;
  getProductBySlug: (slugOrId: string) => Product | undefined;

  // Cart
  cart: CartItem[];
  cartCount: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  addToCart: (product: Product, size?: string, quantity?: number) => void;
  removeFromCart: (productId: string, size: string) => void;
  updateQuantity: (productId: string, size: string, quantity: number) => void;
  clearCart: () => void;

  // Currencies
  currencies: CurrencyRate[];
  selectedCurrency: CurrencyRate;
  setCurrencyByCode: (code: string) => void;
  formatPrice: (priceLKR: number) => string;
  formatRawPrice: (priceLKR: number) => { symbol: string; value: string; code: string };

  // Settings & Countdown
  settings: DropSettings | null;

  // Modals
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  isAuthOpen: boolean;
  setIsAuthOpen: (open: boolean) => void;
  authMode: AuthMode;
  setAuthMode: (mode: AuthMode) => void;
  isTrackerOpen: boolean;
  setIsTrackerOpen: (open: boolean) => void;
  trackingOrderId: string;
  setTrackingOrderId: (id: string) => void;

  // Authentication & Users
  user: AppUser | null;
  isAuthLoading: boolean;
  authError: string | null;
  setAuthError: (err: string | null) => void;
  loginWithGoogle: () => Promise<boolean>;
  loginWithFacebook: () => Promise<boolean>;
  loginWithEmail: (email: string, pass: string) => Promise<boolean>;
  signupWithEmail: (name: string, email: string, pass: string) => Promise<boolean>;
  loginAdmin: (username: string, pass: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUserProfile: (updates: Partial<AppUser>) => Promise<boolean>;

  // Orders
  orders: Order[];
  createOrder: (orderData: CreateOrderInput) => Promise<Order>;
  createPayPalPayment: (orderId: string) => Promise<{ paypalOrderId: string; order: Order }>;
  capturePayPalPayment: (orderId: string, paypalOrderId: string) => Promise<Order>;
  cancelPayPalOrder: (orderId: string) => Promise<void>;
  updateOrderStatus: (orderId: string, status: Order['status'], details: Partial<Order>) => Promise<boolean>;
  hasMoreAdminOrders: boolean;
  loadOlderOrders: () => Promise<boolean>;
  
  // Contact & Messages
  messages: ContactMessage[];
  sendMessage: (msg: Omit<ContactMessage, 'id' | 'createdAt' | 'status'>) => Promise<boolean>;
  updateMessageStatus: (id: string, status: 'unread' | 'read' | 'replied', notes?: string) => Promise<boolean>;

  // Back-in-Stock Notifications (Cloud Functions)
  stockNotifications: StockNotification[];
  subscribeToRestock: (entry: Omit<StockNotification, 'id' | 'createdAt' | 'notified' | 'status'>) => Promise<{ success: boolean; id?: string; error?: string }>;
  deleteStockNotification: (id: string) => Promise<boolean>;
  triggerRestockCloudFunction: (productId?: string) => Promise<{ success: boolean; productTitle: string; dispatchedCount: number; processedCount?: number; recipients: string[]; executionId: string; error?: string }>;
  isRestockModalOpen: boolean;
  setIsRestockModalOpen: (open: boolean) => void;
  restockModalProduct: Product | null;
  setRestockModalProduct: (prod: Product | null) => void;
  restockSelectedSize: string;
  setRestockSelectedSize: (size: string) => void;
  restockModalSize: string;
  closeRestockModal: () => void;
  openRestockModal: (product: Product, size?: string) => void;
  triggerStockReplenishedFunction: (productId?: string) => Promise<{ success: boolean; productTitle: string; dispatchedCount: number; processedCount?: number; recipients: string[]; executionId: string; error?: string }>;

  // Audit Logs
  auditLogs: AuditLog[];
  logAuditEvent: (action: string, details: string) => Promise<void>;

  // Products
  saveProduct: (product: Partial<Product>) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;

  // Staff
  staffList: AdminStaff[];
  addStaff: (staff: Omit<AdminStaff, 'id' | 'createdAt' | 'status'>) => Promise<boolean>;
  activateStaff: (id: string) => Promise<{ success: boolean; error?: string }>;
  updateStaffRole: (id: string, role: 'admin' | 'super_admin') => Promise<{ success: boolean; error?: string }>;
  deleteStaff: (id: string) => Promise<{ success: boolean; error?: string }>;

  // Settings
  updateSettings: (newSettings: Partial<DropSettings>) => Promise<boolean>;

  // Data Refresh
  refetchData: () => Promise<void>;
}

const DEFAULT_CURRENCY: CurrencyRate = {
  code: 'LKR',
  symbol: 'LKR',
  name: 'Sri Lankan Rupee',
  rateFromLKR: 1,
  symbolPosition: 'before',
  flag: '🇱🇰'
};

const StoreContext = createContext<StoreContextType | undefined>(undefined);

function cryptoSafeClientId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// Helper to parse current window location into AppRoute
function parseRouteFromUrl(): AppRoute {
  try {
    const path = window.location.pathname;
    const search = new URLSearchParams(window.location.search);

    if (path.startsWith('/product/')) {
      const slug = path.replace('/product/', '').trim();
      if (slug) return { name: 'product', slug };
    }
    if (path.startsWith('/collections/')) {
      const category = path.replace('/collections/', '').trim();
      if (category) return { name: 'collection', category };
    }
    if (path === '/cart') return { name: 'cart' };
    if (path === '/checkout') return { name: 'checkout' };
    if (path === '/profile') return { name: 'profile' };
    if (path.startsWith('/orders')) {
      const orderId = search.get('id') || path.replace('/orders', '').replace('/', '').trim();
      return { name: 'orders', orderId: orderId || undefined };
    }
    if (path.startsWith('/track-order') || path.startsWith('/track')) {
      const orderId = search.get('id') || path.replace('/track-order', '').replace('/track', '').replace('/', '').trim();
      return { name: 'track-order', orderId: orderId || undefined };
    }
    if (path === '/vip') return { name: 'vip' };
    if (path === '/contact-support' || path === '/care/contact' || path === '/care/concierge') return { name: 'contact-support' };
    if (path.startsWith('/admin')) {
      const tab = search.get('tab') as any;
      return { name: 'admin', tab: tab || 'overview' };
    }
    if (path === '/legal/terms') return { name: 'legal-terms' };
    if (path === '/legal/privacy') return { name: 'legal-privacy' };
    if (path === '/legal/returns') return { name: 'legal-returns' };
    if (path === '/care/shipping') return { name: 'care-shipping' };
    if (path === '/care/size-guide') return { name: 'care-size-guide' };
    if (path === '/care/authenticity') return { name: 'care-authenticity' };
  } catch (e) {
    console.error('Error parsing route from URL:', e);
  }
  return { name: 'home' };
}

// Helper to convert AppRoute into a URL string
function routeToUrl(route: AppRoute): string {
  switch (route.name) {
    case 'home': return '/';
    case 'product': return `/product/${route.slug}`;
    case 'collection': return `/collections/${route.category}`;
    case 'cart': return '/cart';
    case 'checkout': return '/checkout';
    case 'profile': return '/profile';
    case 'orders': return route.orderId ? `/orders?id=${encodeURIComponent(route.orderId)}` : '/orders';
    case 'track-order': return route.orderId ? `/track-order?id=${encodeURIComponent(route.orderId)}` : '/track-order';
    case 'track': return route.orderId ? `/track-order?id=${encodeURIComponent(route.orderId)}` : '/track-order';
    case 'vip': return '/vip';
    case 'contact-support': return '/contact-support';
    case 'admin': return route.tab ? `/admin?tab=${route.tab}` : '/admin';
    case 'legal-terms': return '/legal/terms';
    case 'legal-privacy': return '/legal/privacy';
    case 'legal-returns': return '/legal/returns';
    case 'care-shipping': return '/care/shipping';
    case 'care-concierge': return '/contact-support';
    case 'care-size-guide': return '/care/size-guide';
    case 'care-authenticity': return '/care/authenticity';
    default: return '/';
  }
}

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // App routing state
  const [currentRoute, setCurrentRouteState] = useState<AppRoute>(() => parseRouteFromUrl());
  
  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [hasMoreAdminOrders, setHasMoreAdminOrders] = useState(true);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [staffList, setStaffList] = useState<AdminStaff[]>([]);
  const [settings, setSettings] = useState<DropSettings | null>(() => {
    try {
      const saved = localStorage.getItem('saelyx_settings');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Filter & Search states
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModalProduct, setActiveModalProduct] = useState<Product | null>(null);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('saelyx_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Modal visibility states
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [isTrackerOpen, setIsTrackerOpen] = useState(false);
  const [trackingOrderId, setTrackingOrderId] = useState<string>('');

  // Back-in-Stock Waitlist & Modal State
  const [stockNotifications, setStockNotifications] = useState<StockNotification[]>([]);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [restockModalProduct, setRestockModalProduct] = useState<Product | null>(null);
  const [restockSelectedSize, setRestockSelectedSize] = useState<string>('');

  const openRestockModal = useCallback((product: Product, size?: string) => {
    setRestockModalProduct(product);
    setRestockSelectedSize(size || product.sizes?.[0] || 'Standard');
    setIsRestockModalOpen(true);
  }, []);

  // Currencies state
  const [currencies, setCurrencies] = useState<CurrencyRate[]>([DEFAULT_CURRENCY]);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyRate>(DEFAULT_CURRENCY);

  // User state
  const [user, setUser] = useState<AppUser | null>(() => {
    return null;
  });
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const userRef = useRef(user);
  const paypalRecoveryInFlightRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Synchronize route changes with browser history & URL bar
  const navigateTo = useCallback((route: AppRoute) => {
    setCurrentRouteState(route);
    const url = routeToUrl(route);
    if (window.location.pathname + window.location.search !== url) {
      window.history.pushState({}, '', url);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const navigateToUrl = useCallback((path: string) => {
    window.history.pushState({}, '', path);
    setCurrentRouteState(parseRouteFromUrl());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Listen to browser Back/Forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentRouteState(parseRouteFromUrl());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('saelyx_cart', JSON.stringify(cart));
    } catch (e) {
      console.error(e);
    }
  }, [cart]);

  // Save user to localStorage
  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem('saelyx_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('saelyx_user');
      }
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  // Listen to Firebase Auth state. Privileged roles come only from trusted
  // Firebase custom claims, the protected admins collection, or the configured
  // administrator allowlist — never from the customer-editable users document.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setOrders([]);
        setMessages([]);
        setAuditLogs([]);
        setStaffList([]);
        setStockNotifications([]);
        setHasMoreAdminOrders(true);
        return;
      }

      try {
        const configuredAdminRole = getConfiguredAdminRole(fbUser.email, fbUser.emailVerified);
        const [userSnap, adminSnap] = await Promise.all([
          getDoc(doc(db, 'users', fbUser.uid)),
          getDoc(doc(db, 'admins', fbUser.uid))
        ]);

        const adminData = adminSnap.exists() ? adminSnap.data() : null;
        const email = fbUser.email?.toLowerCase() || '';
        const activeAdminRecord =
          fbUser.emailVerified &&
          adminData?.status === 'active' &&
          typeof adminData?.email === 'string' &&
          adminData.email.toLowerCase() === email;
        const adminDocRole: UserRole | undefined = activeAdminRecord
          ? adminData?.role === 'super_admin'
            ? 'super_admin'
            : adminData?.role === 'admin'
              ? 'admin'
              : undefined
          : undefined;
        const trustedRole: UserRole = configuredAdminRole || adminDocRole || 'patron';

        if (userSnap.exists()) {
          const data = userSnap.data();
          setUser({
            uid: fbUser.uid,
            name: data.name || fbUser.displayName || 'SAELYXE Patron',
            email: fbUser.email || data.email || '',
            phoneNumber: fbUser.phoneNumber || data.phoneNumber || '',
            role: trustedRole,
            avatarUrl: fbUser.photoURL || data.avatarUrl || undefined,
            address: data.address || '',
            city: data.city || '',
            postalCode: data.postalCode || '',
            country: data.country || 'Sri Lanka',
            authProvider: data.authProvider || 'google',
            joinedDate: data.joinedDate || new Date().toISOString()
          });
          return;
        }

        const profileRecord: AppUser = {
          uid: fbUser.uid,
          name: fbUser.displayName || fbUser.email?.split('@')[0] || 'SAELYXE Patron',
          email: fbUser.email || '',
          phoneNumber: fbUser.phoneNumber || '',
          role: 'patron',
          address: '',
          city: '',
          postalCode: '',
          country: 'Sri Lanka',
          authProvider: 'google',
          joinedDate: new Date().toISOString(),
          ordersCount: 0
        };
        if (fbUser.photoURL) profileRecord.avatarUrl = fbUser.photoURL;

        await setDoc(doc(db, 'users', fbUser.uid), profileRecord);
        setUser({ ...profileRecord, role: trustedRole });
      } catch (e) {
        console.warn('Firebase user session hydration note:', e);
        setUser({
          uid: fbUser.uid,
          name: fbUser.displayName || fbUser.email?.split('@')[0] || 'SAELYXE Patron',
          email: fbUser.email || '',
          phoneNumber: fbUser.phoneNumber || '',
          role: getConfiguredAdminRole(fbUser.email, fbUser.emailVerified) || 'patron',
          country: 'Sri Lanka'
        });
      }
    });

    return () => unsubscribe();
  }, []);

  // Fetch initial data from server APIs with Firestore sync
  const fetchData = useCallback(async () => {
    try {
      const [prodRes, currRes, setRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/currencies'),
        fetch('/api/settings')
      ]);

      if (prodRes.ok) {
        const prodData: Product[] = await prodRes.json();
        // Ensure all products have slug
        const withSlugs = prodData.map(p => ({
          ...p,
          slug: p.slug || p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        }));
        setProducts(withSlugs);
      }

      if (currRes.ok) {
        const currData: CurrencyRate[] = await currRes.json();
        setCurrencies(currData);

        // Auto-detect currency if not already saved
        const savedCode = localStorage.getItem('saelyx_currency');
        if (savedCode) {
          const match = currData.find(c => c.code === savedCode);
          if (match) setSelectedCurrency(match);
        } else {
          try {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            if (tz.includes('Colombo') || tz.includes('Sri_Lanka')) {
              setSelectedCurrency(currData.find(c => c.code === 'LKR') || DEFAULT_CURRENCY);
            } else if (tz.includes('London') || tz.includes('Europe/Belfast')) {
              setSelectedCurrency(currData.find(c => c.code === 'GBP') || DEFAULT_CURRENCY);
            } else if (tz.includes('Dubai') || tz.includes('Muscat')) {
              setSelectedCurrency(currData.find(c => c.code === 'AED') || DEFAULT_CURRENCY);
            } else if (tz.includes('Paris') || tz.includes('Berlin') || tz.includes('Rome')) {
              setSelectedCurrency(currData.find(c => c.code === 'EUR') || DEFAULT_CURRENCY);
            } else if (tz.includes('Sydney') || tz.includes('Melbourne')) {
              setSelectedCurrency(currData.find(c => c.code === 'AUD') || DEFAULT_CURRENCY);
            } else if (tz.includes('New_York') || tz.includes('Los_Angeles') || tz.includes('Chicago')) {
              setSelectedCurrency(currData.find(c => c.code === 'USD') || DEFAULT_CURRENCY);
            }
          } catch {
            // Keep default LKR
          }
        }
      }

      if (setRes.ok) {
        const setData = await setRes.json();
        setSettings(setData);
        try {
          localStorage.setItem('saelyx_settings', JSON.stringify(setData));
        } catch (e) {}
      }

    } catch (e) {
      console.error('Error loading store data:', e);
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  const fetchPublicApi = useCallback(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const headers = new Headers(init.headers);
    const appCheckHeaders = await getAppCheckRequestHeaders();
    Object.entries(appCheckHeaders).forEach(([key, value]) => headers.set(key, value));
    return fetch(input, { ...init, headers });
  }, []);

  const fetchAuthenticatedPublicApi = useCallback(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const currentUser = auth.currentUser;
    const token = currentUser ? await currentUser.getIdToken() : null;
    const headers = new Headers(init.headers);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const appCheckHeaders = await getAppCheckRequestHeaders();
    Object.entries(appCheckHeaders).forEach(([key, value]) => headers.set(key, value));
    return fetch(input, { ...init, headers });
  }, []);

  const fetchAdminApi = useCallback(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const currentUser = auth.currentUser;
    const token = currentUser ? await currentUser.getIdToken() : null;
    const headers = new Headers(init.headers);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const appCheckHeaders = await getAppCheckRequestHeaders();
    Object.entries(appCheckHeaders).forEach(([key, value]) => headers.set(key, value));
    return fetch(input, { ...init, headers });
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 1. Products real-time listener
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    try {
      const colRef = collection(db, 'products');
      const unsub = onSnapshot(colRef, async (snap) => {
        const list: Product[] = [];
        snap.forEach(docSnap => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Product);
        });
        setProducts(list);
        setIsLoadingProducts(false);
      }, (err) => {
        console.warn('Products listener note:', err);
        setIsLoadingProducts(false);
      });
      return () => unsub();
    } catch (e) {
      setIsLoadingProducts(false);
    }
  }, []);

  // Settings real-time listener
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const settingsRef = doc(db, 'settings', 'drop_config');
    const unsub = onSnapshot(settingsRef, snap => {
      if (!snap.exists()) return;
      const nextSettings = snap.data() as DropSettings;
      setSettings(nextSettings);
      try {
        localStorage.setItem('saelyx_settings', JSON.stringify(nextSettings));
      } catch {
        // Storage is optional.
      }
    }, err => {
      console.warn('Settings listener note:', err);
    });
    return () => unsub();
  }, []);

  // 2. Orders real-time listener
  useEffect(() => {
    if (!isFirebaseConfigured || !user || user.role === 'guest') return;
    try {
      const colRef = collection(db, 'orders');
      const isAdminUser = user.role === 'admin' || user.role === 'super_admin';
      const ordersQuery = isAdminUser
        ? query(colRef, orderBy('createdAt', 'desc'), limit(250))
        : query(colRef, where('userId', '==', user.uid));

      const unsub = onSnapshot(ordersQuery, async (snap) => {
        const list: Order[] = [];
        snap.forEach(docSnap => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Order);
        });
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        if (isAdminUser) {
          setOrders(previous => {
            const merged = new Map(previous.map(order => [order.id, order]));
            list.forEach(order => merged.set(order.id, order));
            return Array.from(merged.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          });
          setHasMoreAdminOrders(list.length >= 250);
        } else {
          setOrders(list);
          setHasMoreAdminOrders(false);
        }

        for (const order of list) {
          const paypalOrderId = order.paymentProviderReference || '';
          const needsPayPalRecovery =
            order.paymentMethod === 'paypal' &&
            order.paymentStatus === 'pending_verification' &&
            order.inventoryReserved === true &&
            Boolean(paypalOrderId);

          if (!needsPayPalRecovery) continue;
          const recoveryKey = `${order.id}:${paypalOrderId}`;
          if (paypalRecoveryInFlightRef.current.has(recoveryKey)) continue;
          paypalRecoveryInFlightRef.current.add(recoveryKey);

          void (async () => {
            try {
              for (let attempt = 0; attempt < 3; attempt += 1) {
                try {
                  const response = await fetchAuthenticatedPublicApi(
                    `/api/payments/paypal/capture/${encodeURIComponent(order.id || order.orderNumber)}`,
                    {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ paypalOrderId })
                    }
                  );
                  const payload = await response.json().catch(() => ({}));
                  if (response.ok) {
                    const recovered = payload as Order;
                    setOrders(prev => prev.map(item => item.id === recovered.id ? recovered : item));
                    break;
                  }
                  if (response.status < 500) break;
                } catch {
                  // Retry transient network failures only.
                }
                if (attempt < 2) {
                  await new Promise(resolve => window.setTimeout(resolve, 1500 * (attempt + 1)));
                }
              }
            } finally {
              paypalRecoveryInFlightRef.current.delete(recoveryKey);
            }
          })();
        }

        if (isAdminUser && list.length === 0) {
          try {
            const res = await fetchAdminApi('/api/orders');
            if (res.ok) {
              const data: Order[] = await res.json();
              setOrders(data);
            }
          } catch (e) {
            console.warn('Orders load note:', e);
          }
        }
      }, (err) => {
        console.warn('Orders listener note:', err);
      });
      return () => unsub();
    } catch (e) {}
  }, [fetchAdminApi, fetchAuthenticatedPublicApi, user?.role, user?.uid]);

  // 3. Stock Notifications real-time listener (Waitlists)
  useEffect(() => {
    if (!isFirebaseConfigured || (user?.role !== 'admin' && user?.role !== 'super_admin')) return;
    try {
      const stockRef = collection(db, 'stock_notifications');
      const unsub = onSnapshot(query(stockRef, orderBy('createdAt', 'desc'), limit(250)), async (snap) => {
        const list: StockNotification[] = [];
        snap.forEach(docSnap => {
          list.push({ id: docSnap.id, ...docSnap.data() } as StockNotification);
        });
        setStockNotifications(
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        );
      }, (err) => {
        console.warn('Firestore stock_notifications listener note:', err);
      });

      return () => unsub();
    } catch (e) {
      console.error('Error setting up stock_notifications listener:', e);
    }
  }, [user?.role]);

  // 4. Concierge Inquiries real-time listener
  useEffect(() => {
    if (!isFirebaseConfigured || (user?.role !== 'admin' && user?.role !== 'super_admin')) return;
    try {
      const colRef = collection(db, 'concierge_inquiries');
      const unsub = onSnapshot(query(colRef, orderBy('createdAt', 'desc'), limit(250)), async (snap) => {
        const list: ContactMessage[] = [];
        snap.forEach(docSnap => {
          list.push({ id: docSnap.id, ...docSnap.data() } as ContactMessage);
        });
        setMessages(
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        );
      }, (err) => {
        console.warn('Concierge inquiries listener note:', err);
      });
      return () => unsub();
    } catch (e) {}
  }, [user?.role]);

  // 5. Staff real-time listener
  useEffect(() => {
    if (!isFirebaseConfigured || (user?.role !== 'admin' && user?.role !== 'super_admin')) return;
    try {
      const colRef = collection(db, 'staff');
      const unsub = onSnapshot(colRef, async (snap) => {
        const list: AdminStaff[] = [];
        snap.forEach(docSnap => {
          list.push({ id: docSnap.id, ...docSnap.data() } as AdminStaff);
        });


        setStaffList(list);
      }, (err) => {
        console.warn('Staff listener note:', err);
      });
      return () => unsub();
    } catch (e) {
      console.error('Error setting up staff listener:', e);
    }
  }, [user?.role]);

  // 7. Audit Logs real-time listener
  useEffect(() => {
    if (!isFirebaseConfigured || (user?.role !== 'admin' && user?.role !== 'super_admin')) return;
    try {
      const colRef = collection(db, 'audit_logs');
      const unsub = onSnapshot(query(colRef, orderBy('timestamp', 'desc'), limit(200)), (snap) => {
        const list: AuditLog[] = [];
        snap.forEach(docSnap => {
          list.push({ id: docSnap.id, ...docSnap.data() } as AuditLog);
        });
        if (list.length > 0) {
          setAuditLogs(list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        }
      }, (err) => {
        console.warn('Audit logs listener note:', err);
      });
      return () => unsub();
    } catch (e) {}
  }, [user?.role]);

  // Helpers
  const getProductBySlug = (slugOrId: string): Product | undefined => {
    return products.find(p => p.slug === slugOrId || p.id === slugOrId);
  };

  const setCurrencyByCode = (code: string) => {
    const found = currencies.find(c => c.code === code);
    if (found) {
      setSelectedCurrency(found);
      localStorage.setItem('saelyx_currency', code);
    }
  };

  const formatPrice = (priceLKR: number): string => {
    if (!selectedCurrency) return `LKR ${priceLKR.toLocaleString()}`;
    const converted = priceLKR * selectedCurrency.rateFromLKR;
    
    if (selectedCurrency.code === 'LKR') {
      return `LKR ${Math.round(priceLKR).toLocaleString()}`;
    }
    
    if (selectedCurrency.code === 'JPY') {
      return `¥${Math.round(converted).toLocaleString()}`;
    }

    return `${selectedCurrency.symbol}${converted.toFixed(2)}`;
  };

  const formatRawPrice = (priceLKR: number) => {
    const converted = priceLKR * (selectedCurrency?.rateFromLKR || 1);
    const val = selectedCurrency.code === 'LKR' 
      ? Math.round(priceLKR).toLocaleString()
      : selectedCurrency.code === 'JPY' 
      ? Math.round(converted).toLocaleString() 
      : converted.toFixed(2);
    return {
      symbol: selectedCurrency.symbol,
      value: val,
      code: selectedCurrency.code
    };
  };

  // Cart Management
  const addToCart = (product: Product, size?: string, quantity: number = 1) => {
    const chosenSize = size || product.sizes[0] || 'M';
    setCart(prev => {
      const existingIdx = prev.findIndex(item => item.productId === product.id && item.size === chosenSize);
      if (existingIdx > -1) {
        return prev.map((item, idx) =>
          idx === existingIdx
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        return [
          ...prev,
          {
            product,
            productId: product.id,
            title: product.title,
            image: product.images[0] || '',
            priceLKR: product.priceLKR,
            size: chosenSize,
            quantity
          }
        ];
      }
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (productId: string, size: string) => {
    setCart(prev => prev.filter(item => !(item.productId === productId && item.size === size)));
  };

  const updateQuantity = (productId: string, size: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId, size);
      return;
    }
    setCart(prev =>
      prev.map(item =>
        item.productId === productId && item.size === size
          ? { ...item, quantity }
          : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  // Authentication flows create a session only after Firebase returns a verified credential.
  const getCustomerAuthError = (error: unknown, flow: 'Google sign-in' | 'Facebook sign-in' | 'sign-in' | 'account creation') => {
    const code = typeof error === 'object' && error && 'code' in error
      ? String((error as { code?: string }).code || '')
      : '';

    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      return 'Sign-in was cancelled. Please try again when you are ready.';
    }
    if (code === 'auth/network-request-failed') {
      return 'We could not connect just now. Please check your connection and try again.';
    }
    if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
      return 'We could not verify those details. Please try again.';
    }
    if (code === 'auth/email-already-in-use') {
      return 'An account already exists for this email. Please sign in instead.';
    }
    if (code === 'auth/weak-password') {
      return 'Please choose a password with at least six characters.';
    }
    if (code === 'auth/invalid-email') {
      return 'Please enter a valid email address.';
    }
    if (code === 'auth/user-disabled') {
      return 'This account is unavailable. Please contact support for assistance.';
    }

    return `Unable to complete ${flow}. Please try again or choose another option.`;
  };

  // Authentication flows create a session only after Firebase returns a verified credential.
  const loginWithGoogle = async (): Promise<boolean> => {
    if (isAuthLoading) return false;
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      const appUser: AppUser = {
        uid: fbUser.uid,
        name: fbUser.displayName || 'SAELYXE VIP Member',
        email: fbUser.email || '',
        phoneNumber: fbUser.phoneNumber || '',
        role: 'patron',
        avatarUrl: fbUser.photoURL || undefined,
        authProvider: 'google',
        joinedDate: new Date().toISOString()
      };
      setUser(appUser);
      setIsAuthOpen(false);
      return true;
    } catch (err: unknown) {
      setAuthError(getCustomerAuthError(err, 'Google sign-in'));
      return false;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const loginWithFacebook = async (): Promise<boolean> => {
    if (isAuthLoading) return false;
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, facebookProvider);
      const fbUser = result.user;
      const appUser: AppUser = {
        uid: fbUser.uid,
        name: fbUser.displayName || 'SAELYXE VIP Member',
        email: fbUser.email || '',
        role: 'patron',
        avatarUrl: fbUser.photoURL || undefined,
        authProvider: 'facebook',
        joinedDate: new Date().toISOString()
      };
      setUser(appUser);
      setIsAuthOpen(false);
      return true;
    } catch (err: unknown) {
      setAuthError(getCustomerAuthError(err, 'Facebook sign-in'));
      return false;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const loginWithEmail = async (email: string, pass: string): Promise<boolean> => {
    if (isAuthLoading) return false;
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      const res = await signInWithEmailAndPassword(auth, email, pass);
      const fbUser = res.user;
      setUser({
        uid: fbUser.uid,
        name: fbUser.displayName || email.split('@')[0],
        email: fbUser.email || email,
        role: 'patron',
        authProvider: 'password',
        joinedDate: new Date().toISOString()
      });
      setIsAuthOpen(false);
      return true;
    } catch (err: unknown) {
      setAuthError(getCustomerAuthError(err, 'sign-in'));
      return false;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const signupWithEmail = async (name: string, email: string, pass: string): Promise<boolean> => {
    if (isAuthLoading) return false;
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(res.user, { displayName: name });
      const newUser: AppUser = {
        uid: res.user.uid,
        name,
        email,
        role: 'patron',
        authProvider: 'password',
        joinedDate: new Date().toISOString(),
        ordersCount: 0
      };
      setUser(newUser);
      setIsAuthOpen(false);
      return true;
    } catch (err: unknown) {
      setAuthError(getCustomerAuthError(err, 'account creation'));
      return false;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const closeRestockModal = () => setIsRestockModalOpen(false);

  const loginAdmin = async (username: string, pass: string, rememberMe = true): Promise<{ success: boolean; error?: string }> => {
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      const verification = await verifyAdminCredentials(username, pass, rememberMe);
      if (verification.valid && verification.user) {
        setUser(verification.user);
        await logAuditEvent('ADMIN_LOGIN', `Admin user [${verification.user.name}] logged in with role [${verification.user.role}]`);
        setIsAuthOpen(false);
        return { success: true };
      } else {
        setAuthError(verification.error || 'Authentication denied.');
        return { success: false, error: verification.error };
      }
    } catch (e: any) {
      setAuthError(e.message || 'Verification error.');
      return { success: false, error: e.message };
    } finally {
      setIsAuthLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      if (auth) {
        await fbSignOut(auth);
      }
    } catch (e) {
      console.warn('Firebase SignOut note:', e);
    } finally {
      setUser(null);
      setOrders([]);
      setMessages([]);
      setAuditLogs([]);
      setStaffList([]);
      setStockNotifications([]);
      setHasMoreAdminOrders(true);
      try {
        localStorage.removeItem('saelyx_user');
        localStorage.removeItem('saelyx_admin_user');
        sessionStorage.clear();
      } catch (e) {}
      setIsAuthOpen(false);
      navigateTo({ name: 'home' });
    }
  };

  const updateUserProfile = async (updates: Partial<AppUser>): Promise<boolean> => {
    if (!user) return false;
    try {
      // Never accept identity or authorization fields through the profile editor.
      const profileUpdates: Partial<AppUser> = {};
      for (const key of ['name', 'displayName', 'photoURL', 'avatarUrl', 'phoneNumber', 'address', 'city', 'postalCode', 'country', 'savedAddresses'] as const) {
        if (key in updates) {
          (profileUpdates as Record<string, unknown>)[key] = (updates as Record<string, unknown>)[key];
        }
      }

      const updatedUser: AppUser = { ...user, ...profileUpdates, uid: user.uid, email: user.email, role: user.role };
      setUser(updatedUser);
      try {
        localStorage.setItem('saelyx_user', JSON.stringify(updatedUser));
      } catch (e) {}

      try {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
          ...JSON.parse(JSON.stringify(profileUpdates)),
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (e) {
        console.warn('Firestore user update note:', e);
      }

      if (profileUpdates.name || profileUpdates.phoneNumber || profileUpdates.address || profileUpdates.city || profileUpdates.postalCode || profileUpdates.country) {
        const deliveryDetails = {
          customerName: updatedUser.name,
          email: updatedUser.email,
          phone: updatedUser.phoneNumber || '',
          address: updatedUser.address || '',
          city: updatedUser.city || '',
          postalCode: updatedUser.postalCode || '',
          country: updatedUser.country || 'Sri Lanka',
          notes: ''
        };
        try {
          localStorage.setItem('saelyx_saved_delivery_details', JSON.stringify(deliveryDetails));
        } catch (e) {}
      }

      await logAuditEvent('USER_PROFILE_UPDATED', `Profile updated for [${updatedUser.name || updatedUser.email}]`);
      return true;
    } catch (err) {
      console.error('Error updating profile:', err);
      return false;
    }
  };

  // Orders Management
  const createOrder = async (orderData: CreateOrderInput): Promise<Order> => {
    const orderPayload = {
      ...orderData,
      userId: user?.role === 'guest' ? undefined : user?.uid
    };

    const res = await fetchAuthenticatedPublicApi('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });

    if (!res.ok) {
      let message = 'Unable to create order.';
      try {
        const payload = await res.json();
        if (payload?.error) message = String(payload.error);
      } catch {
        // Keep safe generic message.
      }
      throw new Error(message);
    }

    const placedOrder = await res.json() as Order;

    // Server is the source of truth. Do not create a second client-side order document.
    setOrders(prev => [
      placedOrder,
      ...prev.filter(o => o.id !== placedOrder.id && o.orderNumber !== placedOrder.orderNumber)
    ]);

    await logAuditEvent(
      'ORDER_CREATED',
      `Order ${placedOrder.orderNumber} created for ${placedOrder.customerName} (${placedOrder.currencyUsed} ${placedOrder.totalInCurrency})`
    );
    return placedOrder;
  };

  const createPayPalPayment = async (orderId: string): Promise<{ paypalOrderId: string; order: Order }> => {
    const res = await fetchAuthenticatedPublicApi(`/api/payments/paypal/create/${encodeURIComponent(orderId)}`, {
      method: 'POST'
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(payload?.error || 'Unable to start PayPal payment.');
    const updated = payload?.order as Order;
    if (updated?.id) {
      setOrders(prev => prev.map(order => order.id === updated.id ? updated : order));
    }
    return {
      paypalOrderId: String(payload?.paypalOrderId || ''),
      order: updated
    };
  };

  const capturePayPalPayment = async (orderId: string, paypalOrderId: string): Promise<Order> => {
    const res = await fetchAuthenticatedPublicApi(`/api/payments/paypal/capture/${encodeURIComponent(orderId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paypalOrderId })
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(payload?.error || 'Unable to capture PayPal payment.');
    const updated = payload as Order;
    setOrders(prev => prev.map(order => order.id === updated.id ? updated : order));
    return updated;
  };

  const cancelPayPalOrder = async (orderId: string): Promise<void> => {
    const res = await fetchAuthenticatedPublicApi(`/api/payments/paypal/cancel/${encodeURIComponent(orderId)}`, {
      method: 'POST'
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(payload?.error || 'Unable to cancel PayPal checkout order.');
    const updated = payload as Order;
    setOrders(prev => prev.map(order => order.id === updated.id ? updated : order));
  };

  const updateOrderStatus = async (orderId: string, status: Order['status'], details: Partial<Order>): Promise<boolean> => {
    try {
      const currentOrder = orders.find(order => order.id === orderId || order.orderNumber === orderId);
      const needsPayPalRefund =
        status === 'cancelled' &&
        currentOrder?.paymentMethod === 'paypal' &&
        ['verified', 'refund_pending'].includes(currentOrder?.paymentStatus || '');

      const response = needsPayPalRefund
        ? await fetchAdminApi(`/api/admin/orders/${encodeURIComponent(orderId)}/refund`, { method: 'POST' })
        : await fetchAdminApi(`/api/orders/${encodeURIComponent(orderId)}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, ...details })
          });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.warn('Order status update rejected:', payload?.error || response.statusText);
        return false;
      }

      const updatedOrder = payload as Order;
      setOrders(prev => prev.map(order => order.id === updatedOrder.id ? updatedOrder : order));
      return true;
    } catch (error) {
      console.error('Error updating order:', error);
      return false;
    }
  };

  const loadOlderOrders = async (): Promise<boolean> => {
    if (user?.role !== 'admin' && user?.role !== 'super_admin') return false;
    const oldest = [...orders]
      .filter(order => Boolean(order.createdAt))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
    if (!oldest?.createdAt) return false;

    try {
      const response = await fetchAdminApi(
        `/api/admin/orders/page?limit=100&before=${encodeURIComponent(oldest.createdAt)}`
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !Array.isArray(payload?.items)) return false;
      setOrders(previous => {
        const merged = new Map(previous.map(order => [order.id, order]));
        (payload.items as Order[]).forEach(order => merged.set(order.id, order));
        return Array.from(merged.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      });
      setHasMoreAdminOrders(Boolean(payload.hasMore));
      return true;
    } catch (error) {
      console.error('Unable to load older orders:', error);
      return false;
    }
  };

  // Contact Messages
  const sendMessage = async (msg: Omit<ContactMessage, 'id' | 'createdAt' | 'status'>): Promise<boolean> => {
    try {
      const response = await fetchPublicApi('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg)
      });
      if (!response.ok) return false;

      const newMsg = await response.json() as ContactMessage;
      setMessages(prev => [newMsg, ...prev.filter(item => item.id !== newMsg.id)]);
      await logAuditEvent('MESSAGE_RECEIVED', `Inquiry received from ${newMsg.name} regarding [${newMsg.topic}]`);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const updateMessageStatus = async (id: string, status: 'unread' | 'read' | 'replied', notes?: string): Promise<boolean> => {
    try {
      const response = await fetchAdminApi(`/api/admin/messages/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, replyNotes: notes || '' })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error('Message update failed:', payload?.error || response.status);
        return false;
      }
      setMessages(prev => prev.map(message => message.id === id ? { ...message, ...payload } : message));
      return true;
    } catch (error) {
      console.error('Message update failed:', error);
      return false;
    }
  };

  // Products mutations use the trusted API for validation, authorization, and audit logging.
  const saveProduct = async (productData: Partial<Product>): Promise<boolean> => {
    try {
      const id = productData.id || `prod-${cryptoSafeClientId()}`;
      const slug = productData.slug || productData.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `product-${id}`;
      const response = await fetchAdminApi(`/api/admin/products/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...productData, id, slug })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error('Product save failed:', payload?.error || response.status);
        return false;
      }
      setProducts(prev => {
        const exists = prev.some(product => product.id === id);
        return exists ? prev.map(product => product.id === id ? payload as Product : product) : [payload as Product, ...prev];
      });
      return true;
    } catch (error) {
      console.error('Error saving product:', error);
      return false;
    }
  };

  const deleteProduct = async (id: string): Promise<boolean> => {
    try {
      const response = await fetchAdminApi(`/api/admin/products/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error('Product delete failed:', payload?.error || response.status);
        return false;
      }
      setProducts(prev => prev.filter(product => product.id !== id));
      return true;
    } catch (error) {
      console.error('Error deleting product:', error);
      return false;
    }
  };

  // Staff provisioning mutations. Firebase Auth and Firestore are changed together by trusted server APIs.
  const addStaff = async (staffData: Omit<AdminStaff, 'id' | 'createdAt' | 'status'>): Promise<boolean> => {
    try {
      const response = await fetchAdminApi('/api/admin/staff/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffData)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error('Staff invitation failed:', payload?.error || response.status);
        return false;
      }
      setStaffList(prev => [payload as AdminStaff, ...prev.filter(staff => staff.id !== payload.id)]);
      return true;
    } catch (error) {
      console.error('Error inviting staff:', error);
      return false;
    }
  };

  const activateStaff = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetchAdminApi(`/api/admin/staff/${encodeURIComponent(id)}/activate`, { method: 'POST' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) return { success: false, error: payload?.error || 'Unable to activate staff access.' };
      setStaffList(prev => prev.map(staff => staff.id === id ? { ...staff, ...payload } : staff));
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unable to activate staff access.' };
    }
  };

  const updateStaffRole = async (id: string, role: 'admin' | 'super_admin'): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetchAdminApi(`/api/admin/staff/${encodeURIComponent(id)}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) return { success: false, error: payload?.error || 'Unable to change staff role.' };
      setStaffList(prev => prev.map(staff => staff.id === id ? { ...staff, ...payload } : staff));
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unable to change staff role.' };
    }
  };

  const deleteStaff = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetchAdminApi(`/api/admin/staff/${encodeURIComponent(id)}/revoke`, { method: 'POST' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) return { success: false, error: payload?.error || 'Unable to revoke staff access.' };
      setStaffList(prev => prev.map(staff => staff.id === id ? { ...staff, ...payload } : staff));
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unable to revoke staff access.' };
    }
  };

  // Settings mutations are Super-Admin validated by the trusted API.
  const updateSettings = async (newSettings: Partial<DropSettings>): Promise<boolean> => {
    try {
      const response = await fetchAdminApi('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error('Settings update failed:', payload?.error || response.status);
        return false;
      }
      setSettings(payload as DropSettings);
      try { localStorage.setItem('saelyx_settings', JSON.stringify(payload)); } catch {}
      return true;
    } catch (error) {
      console.error('Error updating settings:', error);
      return false;
    }
  };

  // Audit Logs
  const logAuditEvent = async (action: string, details: string) => {
    const entry: AuditLog = {
      id: `audit-${Date.now().toString(36)}`,
      timestamp: new Date().toISOString(),
      actor: user?.name || 'Anonymous Visitor',
      role: user?.role || 'guest',
      action,
      details
    };
    setAuditLogs(prev => [entry, ...prev.slice(0, 49)]);

    if ((user?.role === 'admin' || user?.role === 'super_admin') &&
        ['ADMIN_LOGIN', 'ORDER_CSV_EXPORT', 'DATABASE_EXPORT'].includes(action)) {
      try {
        await fetchAdminApi('/api/admin/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, details })
        });
      } catch {
        // Operational actions must not fail only because audit transport is unavailable.
      }
    }
  };

  // Back-in-Stock Notifications (Firebase Firestore Integration)
  const subscribeToRestock = async (entry: Omit<StockNotification, 'id' | 'createdAt' | 'notified' | 'status'>): Promise<{ success: boolean; id?: string; error?: string }> => {
    try {
      const response = await fetchPublicApi('/api/restock/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { success: false, error: result?.error || 'Failed to submit notification request.' };
      }

      await logAuditEvent(
        'STOCK_ALERT_SUBSCRIBED',
        `Patron ${entry.customerEmail} registered waitlist for [${entry.productTitle}] (${entry.selectedSize || 'All Sizes'})`
      );

      return { success: true, id: result.id };
    } catch (e: any) {
      console.error('Error subscribing to restock notifications:', e);
      return { success: false, error: e.message || 'Failed to submit notification request.' };
    }
  };

  const deleteStockNotification = async (id: string): Promise<boolean> => {
    try {
      const docRef = doc(db, 'stock_notifications', id);
      await deleteDoc(docRef);
      return true;
    } catch (e) {
      console.error('Error deleting stock notification:', e);
      return false;
    }
  };

  const triggerRestockCloudFunction = async (productId?: string) => {
    const productTitle = productId
      ? (products.find(p => p.id === productId)?.title || 'Selected Garment')
      : 'Selected Garment';

    if (!productId) {
      return {
        success: false,
        productTitle,
        dispatchedCount: 0,
        processedCount: 0,
        recipients: [],
        executionId: 'error',
        error: 'Select a product before dispatching restock alerts.'
      };
    }

    try {
      const response = await fetchAdminApi('/api/restock/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Restock email dispatch failed.');
      }

      await logAuditEvent(
        'STOCK_ALERT_DISPATCHED',
        `Dispatched ${data.dispatchedCount} verified restock emails for ${data.productTitle} (Execution: ${data.executionId})`
      );

      return data;
    } catch (e: any) {
      console.error('Error triggering restock email dispatch:', e);
      return {
        success: false,
        productTitle,
        dispatchedCount: 0,
        processedCount: 0,
        recipients: [],
        executionId: 'error',
        error: e?.message || 'Restock email dispatch failed.'
      };
    }
  };

  return (
    <StoreContext.Provider
      value={{
        currentRoute,
        navigateTo,
        navigateToUrl,
        products,
        isLoadingProducts,
        activeCategory,
        setActiveCategory,
        searchQuery,
        setSearchQuery,
        activeModalProduct,
        setActiveModalProduct,
        getProductBySlug,
        cart,
        cartCount,
        isCartOpen,
        setIsCartOpen,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        currencies,
        selectedCurrency,
        setCurrencyByCode,
        formatPrice,
        formatRawPrice,
        settings,
        isSearchOpen,
        setIsSearchOpen,
        isAuthOpen,
        setIsAuthOpen,
        authMode,
        setAuthMode,
        isTrackerOpen,
        setIsTrackerOpen,
        trackingOrderId,
        setTrackingOrderId,
        user,
        isAuthLoading,
        authError,
        setAuthError,
        loginWithGoogle,
        loginWithFacebook,
        loginWithEmail,
        signupWithEmail,
        loginAdmin,
        logout,
        updateUserProfile,
        orders,
        createOrder,
            createPayPalPayment,
        capturePayPalPayment,
        cancelPayPalOrder,
        updateOrderStatus,
        hasMoreAdminOrders,
        loadOlderOrders,
        messages,
        sendMessage,
        updateMessageStatus,
        stockNotifications,
        subscribeToRestock,
        deleteStockNotification,
        triggerRestockCloudFunction,
        isRestockModalOpen,
        setIsRestockModalOpen,
        restockModalProduct,
        setRestockModalProduct,
        restockSelectedSize,
        setRestockSelectedSize,
        restockModalSize: restockSelectedSize,
        closeRestockModal,
        openRestockModal,
        triggerStockReplenishedFunction: triggerRestockCloudFunction,
        auditLogs,
        logAuditEvent,
        saveProduct,
        deleteProduct,
        staffList,
        addStaff,
        activateStaff,
        updateStaffRole,
        deleteStaff,
        updateSettings,
        refetchData: fetchData
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error('useStore must be used within StoreProvider');
  }
  return ctx;
};
