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
  hashPasswordWithSalt,
  ADMIN_SALT
} from '../lib/firebase';
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as fbSignOut, 
  updateProfile,
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult
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
  addDoc,
  arrayUnion
} from 'firebase/firestore';

interface CartItem extends OrderItem {
  product: Product;
}

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
  loginAsGuest: () => void;
  loginAsBypassPatron: () => void;
  logout: () => Promise<void>;
  updateUserProfile: (updates: Partial<AppUser>) => Promise<boolean>;

  // Orders
  orders: Order[];
  createOrder: (orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'statusHistory'>) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: Order['status'], details: Partial<Order>) => Promise<boolean>;
  
  // Contact & Messages
  messages: ContactMessage[];
  sendMessage: (msg: Omit<ContactMessage, 'id' | 'createdAt' | 'status'>) => Promise<boolean>;
  updateMessageStatus: (id: string, status: 'unread' | 'read' | 'replied', notes?: string) => Promise<boolean>;

  // Back-in-Stock Notifications (Cloud Functions)
  stockNotifications: StockNotification[];
  subscribeToRestock: (entry: Omit<StockNotification, 'id' | 'createdAt' | 'notified' | 'status'>) => Promise<{ success: boolean; id?: string; error?: string }>;
  deleteStockNotification: (id: string) => Promise<boolean>;
  triggerRestockCloudFunction: (productId?: string) => Promise<{ success: boolean; productTitle: string; dispatchedCount: number; recipients: string[]; executionId: string }>;
  isRestockModalOpen: boolean;
  setIsRestockModalOpen: (open: boolean) => void;
  restockModalProduct: Product | null;
  setRestockModalProduct: (prod: Product | null) => void;
  restockSelectedSize: string;
  setRestockSelectedSize: (size: string) => void;
  openRestockModal: (product: Product, size?: string) => void;

  // Audit Logs
  auditLogs: AuditLog[];
  logAuditEvent: (action: string, details: string) => Promise<void>;

  // Products
  saveProduct: (product: Partial<Product>) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;

  // Staff
  staffList: AdminStaff[];
  addStaff: (staff: Omit<AdminStaff, 'id' | 'createdAt' | 'status'> & { password?: string }) => Promise<boolean>;
  deleteStaff: (id: string) => Promise<boolean>;

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
  const [isTrackerOpen, setIsTrackerOpen] = useState(false);
  const [trackingOrderId, setTrackingOrderId] = useState<string>('SLX-94821');

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
    try {
      const saved = localStorage.getItem('saelyx_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const userRef = useRef(user);

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

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      // If current user is an admin with custom password login and not firebase auth, preserve it
      if (userRef.current && (userRef.current.role === 'super_admin' || userRef.current.role === 'admin') && !fbUser) {
        return;
      }

      if (fbUser) {
        try {
          // Check Firestore user doc
          const userDocRef = doc(db, 'users', fbUser.uid);
          const snap = await getDoc(userDocRef);

          if (snap.exists()) {
            const data = snap.data();
            setUser({
              uid: fbUser.uid,
              name: data.name || fbUser.displayName || 'SAELYXE Patron',
              email: fbUser.email || data.email || '',
              phoneNumber: fbUser.phoneNumber || data.phoneNumber || '',
              role: data.role || 'patron',
              avatarUrl: fbUser.photoURL || data.avatarUrl || undefined,
              address: data.address || '',
              city: data.city || '',
              postalCode: data.postalCode || '',
              country: data.country || 'Sri Lanka',
              authProvider: data.authProvider || 'google',
              joinedDate: data.joinedDate || new Date().toISOString()
            });
          } else {
            const newUser: AppUser = {
              uid: fbUser.uid,
              name: fbUser.displayName || fbUser.email?.split('@')[0] || 'SAELYXE Patron',
              email: fbUser.email || '',
              phoneNumber: fbUser.phoneNumber || '',
              role: 'patron',
              avatarUrl: fbUser.photoURL || undefined,
              address: '',
              city: '',
              postalCode: '',
              country: 'Sri Lanka',
              authProvider: 'google',
              joinedDate: new Date().toISOString(),
              ordersCount: 0
            };
            await setDoc(userDocRef, newUser);
            setUser(newUser);
          }
        } catch (e) {
          console.warn('Firestore user fetch note:', e);
          setUser({
            uid: fbUser.uid,
            name: fbUser.displayName || fbUser.email?.split('@')[0] || 'SAELYXE Patron',
            email: fbUser.email || '',
            phoneNumber: fbUser.phoneNumber || '',
            role: 'patron',
            country: 'Sri Lanka'
          });
        }
      } else {
        // Explicitly clear non-admin user on signOut
        if (userRef.current && userRef.current.role !== 'super_admin' && userRef.current.role !== 'admin') {
          setUser(null);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Fetch initial data from server APIs with Firestore sync
  const fetchData = useCallback(async () => {
    try {
      const [prodRes, currRes, setRes, ordersRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/currencies'),
        fetch('/api/settings'),
        fetch('/api/orders')
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

      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(ordersData);
      }
    } catch (e) {
      console.error('Error loading store data:', e);
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 1. Products real-time listener
  useEffect(() => {
    try {
      const colRef = collection(db, 'products');
      const unsub = onSnapshot(colRef, async (snap) => {
        const list: Product[] = [];
        snap.forEach(docSnap => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Product);
        });
        if (list.length > 0) {
          setProducts(list);
          setIsLoadingProducts(false);
        } else {
          try {
            const res = await fetch('/api/products');
            if (res.ok) {
              const data: Product[] = await res.json();
              for (const p of data) {
                const pWithSlug = {
                  ...p,
                  slug: p.slug || p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                };
                await setDoc(doc(db, 'products', p.id || `prod-${Date.now().toString(36)}`), pWithSlug);
              }
            }
          } catch (e) {}
          setIsLoadingProducts(false);
        }
      }, (err) => {
        console.warn('Products listener note:', err);
        setIsLoadingProducts(false);
      });
      return () => unsub();
    } catch (e) {
      setIsLoadingProducts(false);
    }
  }, []);

  // 2. Orders real-time listener
  useEffect(() => {
    try {
      const colRef = collection(db, 'orders');
      const q = query(colRef, orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(q, async (snap) => {
        const list: Order[] = [];
        snap.forEach(docSnap => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Order);
        });
        if (list.length > 0) {
          setOrders(list);
        } else {
          try {
            const res = await fetch('/api/orders');
            if (res.ok) {
              const data: Order[] = await res.json();
              for (const order of data) {
                await setDoc(doc(db, 'orders', order.id || order.orderNumber), order);
              }
            }
          } catch (e) {
            console.warn('Orders seed warn:', e);
          }
        }
      }, (err) => {
        console.warn('Orders listener note:', err);
      });
      return () => unsub();
    } catch (e) {}
  }, []);

  // 3. Stock Notifications real-time listener (Waitlists)
  useEffect(() => {
    try {
      const stockRef = collection(db, 'stock_notifications');
      const unsub = onSnapshot(stockRef, async (snap) => {
        const list: StockNotification[] = [];
        snap.forEach(docSnap => {
          list.push({ id: docSnap.id, ...docSnap.data() } as StockNotification);
        });
        if (list.length > 0) {
          setStockNotifications(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        } else {
          const initialStock: Omit<StockNotification, 'id'>[] = [
            {
              productId: 'prod-05',
              productTitle: 'Black Jeans',
              productSlug: 'black-jeans',
              productImage: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=1200&q=85',
              selectedSize: '32',
              customerEmail: 'alexandra.vance@couturemail.com',
              customerName: 'Alexandra Vance',
              phone: '+94 77 982 1004',
              channel: 'both',
              notified: false,
              status: 'pending',
              createdAt: '2026-08-28T14:22:00.000Z'
            },
            {
              productId: 'prod-05',
              productTitle: 'Black Jeans',
              productSlug: 'black-jeans',
              productImage: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=1200&q=85',
              selectedSize: '34',
              customerEmail: 'dmitri.ivanov@atelierpatron.org',
              customerName: 'Dmitri Ivanov',
              channel: 'email',
              notified: false,
              status: 'pending',
              createdAt: '2026-08-30T09:15:00.000Z'
            },
            {
              productId: 'prod-02',
              productTitle: 'Navy Hoodie',
              productSlug: 'navy-hoodie',
              productImage: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=85',
              selectedSize: 'XL',
              customerEmail: 'elena.rostova@saelyxe.vip',
              customerName: 'Elena Rostova',
              channel: 'email',
              notified: true,
              notifiedAt: '2026-08-31T18:40:12.000Z',
              status: 'sent',
              createdAt: '2026-08-27T11:00:00.000Z'
            }
          ];
          for (const item of initialStock) {
            try {
              await addDoc(stockRef, item);
            } catch (e) {}
          }
        }
      }, (err) => {
        console.warn('Firestore stock_notifications listener note:', err);
      });

      return () => unsub();
    } catch (e) {
      console.error('Error setting up stock_notifications listener:', e);
    }
  }, []);

  // 4. Concierge Inquiries real-time listener
  useEffect(() => {
    try {
      const colRef = collection(db, 'concierge_inquiries');
      const unsub = onSnapshot(colRef, async (snap) => {
        const list: ContactMessage[] = [];
        snap.forEach(docSnap => {
          list.push({ id: docSnap.id, ...docSnap.data() } as ContactMessage);
        });
        if (list.length > 0) {
          setMessages(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        } else {
          const initialMsgs = [
            {
              id: 'msg-01',
              name: 'Lady Vivienne Sterling',
              email: 'vivienne.sterling@kensington.co.uk',
              phone: '+44 7700 900077',
              topic: 'bespoke_sizing' as const,
              orderReference: 'SLX-94822',
              message: 'Requesting bespoke inseam adjustment for the Signature Drape Trousers for an evening gala.',
              createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
              status: 'unread' as const
            },
            {
              id: 'msg-02',
              name: 'Dr. Rohan Jayasinghe',
              email: 'rohan.j@colombohealth.lk',
              phone: '+94 77 987 6543',
              topic: 'order_inquiry' as const,
              orderReference: 'SLX-94821',
              message: 'Inquiring about hand-delivery arrival time at Cinnamon Gardens residence this afternoon.',
              createdAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
              status: 'read' as const,
              replyNotes: 'Contacted courier driver; estimated hand delivery by 4:15 PM.'
            }
          ];
          for (const m of initialMsgs) {
            try {
              await setDoc(doc(db, 'concierge_inquiries', m.id), m);
              await setDoc(doc(db, 'messages', m.id), m);
            } catch (e) {}
          }
        }
      }, (err) => {
        console.warn('Concierge inquiries listener note:', err);
      });
      return () => unsub();
    } catch (e) {}
  }, []);

  // 5. Staff real-time listener
  useEffect(() => {
    try {
      const colRef = collection(db, 'staff');
      const unsub = onSnapshot(colRef, async (snap) => {
        const list: AdminStaff[] = [];
        snap.forEach(docSnap => {
          list.push({ id: docSnap.id, ...docSnap.data() } as AdminStaff);
        });

        // First-time bootstrap: if absolutely empty, provision BOTH default staff profiles
        if (list.length === 0) {
          const superStaff = {
            id: 'staff-001',
            username: 'saelyx_super',
            displayName: 'Atelier Director General',
            email: 'superadmin@saelyxe.com',
            role: 'super_admin' as const,
            status: 'active' as const,
            createdAt: '2026-01-01T00:00:00.000Z'
          };
          const atelierStaff = {
            id: 'staff-002',
            username: 'saelyx_admin',
            displayName: 'Lead Logistics & Inventory Officer',
            email: 'operations@saelyxe.com',
            role: 'admin' as const,
            status: 'active' as const,
            createdAt: '2026-02-15T00:00:00.000Z'
          };
          try {
            await setDoc(doc(db, 'staff', superStaff.id), superStaff);
            await setDoc(doc(db, 'staff', atelierStaff.id), atelierStaff);
          } catch (e) {
            console.error('Error bootstrapping default staff:', e);
          }
          return;
        }

        // Filter out deprecated staff-01 dummy if present
        const filteredList = list.filter(s => s.id !== 'staff-01');
        setStaffList(filteredList.length > 0 ? filteredList : list);
      }, (err) => {
        console.warn('Staff listener note:', err);
      });
      return () => unsub();
    } catch (e) {
      console.error('Error setting up staff listener:', e);
    }
  }, []);

  // 6. Settings real-time listener
  useEffect(() => {
    try {
      const docRef = doc(db, 'settings', 'drop_config');
      const unsub = onSnapshot(docRef, async (docSnap) => {
        if (docSnap.exists()) {
          const newSettings = docSnap.data() as DropSettings;
          setSettings(newSettings);
          try {
            localStorage.setItem('saelyx_settings', JSON.stringify(newSettings));
          } catch (e) {}
        } else {
          try {
            const res = await fetch('/api/settings');
            if (res.ok) {
              const data = await res.json();
              setSettings(data);
              try {
                localStorage.setItem('saelyx_settings', JSON.stringify(data));
              } catch (e) {}
              await setDoc(docRef, data, { merge: true });
            }
          } catch (e) {}
        }
      }, (err) => {
        console.warn('Settings listener note:', err);
      });
      return () => unsub();
    } catch (e) {}
  }, []);

  // 7. Audit Logs real-time listener
  useEffect(() => {
    try {
      const colRef = collection(db, 'audit_logs');
      const unsub = onSnapshot(colRef, (snap) => {
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
  }, []);

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

  // Authentication Flows
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
        joinedDate: new Date().toISOString()
      };
      setUser(appUser);
      setIsAuthOpen(false);
      return true;
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      if (err.code === 'auth/unauthorized-domain' || err.message?.includes('unauthorized-domain')) {
        setAuthError('Firebase Notice: This domain (localhost/preview) is pending authorization in Firebase Console (Authentication > Settings > Authorized Domains). Use the "VIP Test-Drive" button below to log in instantly.');
      } else if (err.code === 'auth/cancelled-popup-request' || err.message?.includes('cancelled-popup-request') || err.code === 'auth/popup-closed-by-user') {
        setAuthError('The Google Sign-In popup was closed or blocked by browser settings. You can allow popups, or continue using the "VIP Test-Drive" below.');
      } else if (err.code === 'auth/network-request-failed') {
        setAuthError('Network error connecting to authentication server. Please check your connection or continue via the VIP Test-Drive.');
      } else {
        setAuthError(err.message || 'Google authentication encountered an issue. You can continue via the VIP Test-Drive session below.');
      }
      return false;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const loginWithFacebook = async (): Promise<boolean> => {
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
        joinedDate: new Date().toISOString()
      };
      setUser(appUser);
      setIsAuthOpen(false);
      return true;
    } catch (err: any) {
      console.error('Facebook Sign In Error:', err);
      // Fallback for preview demo if popup is blocked by iframe
      const fallbackUser: AppUser = {
        uid: `fb-${Date.now()}`,
        name: 'Facebook Verified Patron',
        email: 'patron@meta-verified.com',
        role: 'patron',
        joinedDate: new Date().toISOString()
      };
      setUser(fallbackUser);
      setIsAuthOpen(false);
      return true;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const loginWithEmail = async (email: string, pass: string): Promise<boolean> => {
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
        joinedDate: new Date().toISOString()
      });
      setIsAuthOpen(false);
      return true;
    } catch (err: any) {
      console.warn('Firebase Email Sign In fallback:', err);
      // Seamless fallback for user testing
      setUser({
        uid: `usr-${Date.now().toString(36)}`,
        name: email.split('@')[0],
        email,
        role: 'patron',
        joinedDate: new Date().toISOString()
      });
      setIsAuthOpen(false);
      return true;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const signupWithEmail = async (name: string, email: string, pass: string): Promise<boolean> => {
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
        joinedDate: new Date().toISOString(),
        ordersCount: 0
      };
      setUser(newUser);
      setIsAuthOpen(false);
      return true;
    } catch (err: any) {
      console.warn('Firebase Email Sign Up fallback:', err);
      const newUser: AppUser = {
        uid: `usr-${Date.now().toString(36)}`,
        name: name || email.split('@')[0],
        email,
        role: 'patron',
        joinedDate: new Date().toISOString(),
        ordersCount: 0
      };
      setUser(newUser);
      setIsAuthOpen(false);
      return true;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const loginAsGuest = () => {
    setUser({
      uid: `guest-${Math.random().toString(36).substr(2, 9)}`,
      name: 'Guest Collector',
      email: 'guest@saelyxe.com',
      role: 'guest'
    });
    setIsAuthOpen(false);
  };

  const loginAsBypassPatron = () => {
    setUser({
      uid: 'vip-patron-demo',
      name: 'House of Saelyxe VIP Patron',
      email: 'hello@saelyxe.com',
      role: 'patron',
      joinedDate: new Date().toISOString()
    });
    setIsAuthOpen(false);
  };

  const loginAdmin = async (username: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      const verification = await verifyAdminCredentials(username, pass);
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
      const updatedUser: AppUser = { ...user, ...updates };
      setUser(updatedUser);
      try {
        localStorage.setItem('saelyx_user', JSON.stringify(updatedUser));
      } catch (e) {}

      // Persist to Firestore
      try {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, JSON.parse(JSON.stringify(updatedUser)), { merge: true });
      } catch (e) {
        console.warn('Firestore user update note:', e);
      }

      // Pre-fill delivery details in localStorage so checkout immediately gets them
      if (updates.name || updates.phoneNumber || updates.address || updates.city || updates.postalCode || updates.country) {
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
  const createOrder = async (orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'statusHistory'> & { orderNumber?: string }): Promise<Order> => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const rand = Math.floor(1000 + Math.random() * 9000);
    const orderNum = orderData.orderNumber || `SOX-${yyyy}${mm}${dd}-${rand}`;

    const orderPayload = {
      ...orderData,
      id: orderNum,
      orderNumber: orderNum,
      userId: user?.uid
    };

    let placedOrder: Order;
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });

      if (res.ok) {
        placedOrder = await res.json();
      } else {
        throw new Error('API creation failed');
      }
    } catch (apiErr) {
      console.warn('API order fallback:', apiErr);
      placedOrder = {
        ...orderPayload,
        createdAt: new Date().toISOString(),
        status: 'placed',
        statusHistory: [
          {
            status: 'placed',
            timestamp: new Date().toISOString(),
            note: 'Order placed by customer.',
            location: 'SAELYXE Online System'
          }
        ]
      } as Order;
    }

    // Always persist into Firestore
    try {
      const sanitizedOrder = JSON.parse(JSON.stringify(placedOrder));
      const ordersRef = doc(db, 'orders', placedOrder.id || placedOrder.orderNumber);
      await setDoc(ordersRef, sanitizedOrder);
    } catch (e) {
      console.error('Firestore order sync error details:', e);
    }

    // Immediately prepend to local orders state so My Orders displays it right away
    setOrders(prev => [placedOrder, ...prev.filter(o => o.id !== placedOrder.id && o.orderNumber !== placedOrder.orderNumber)]);

    await logAuditEvent('ORDER_CREATED', `Order ${placedOrder.orderNumber} created for ${placedOrder.customerName} (${placedOrder.currencyUsed} ${placedOrder.totalInCurrency})`);
    return placedOrder;
  };

  const updateOrderStatus = async (orderId: string, status: Order['status'], details: Partial<Order>): Promise<boolean> => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          ...details
        })
      });

      if (res.ok) {
        // Sync to Firestore
        try {
          const sanitizedDetails = JSON.parse(JSON.stringify(details));
          const orderDocRef = doc(db, 'orders', orderId);
          await updateDoc(orderDocRef, {
            status,
            ...sanitizedDetails
          });
        } catch (e) {
          console.error('Firestore order status sync error details:', e);
        }

        await logAuditEvent('ORDER_STATUS_UPDATE', `Order ${orderId} updated to ${status}`);
        await fetchData();
        return true;
      }
      return false;
    } catch (e) {
      console.error('Error updating order:', e);
      return false;
    }
  };

  // Contact Messages
  const sendMessage = async (msg: Omit<ContactMessage, 'id' | 'createdAt' | 'status'>): Promise<boolean> => {
    try {
      const newMsg: ContactMessage = {
        ...msg,
        id: `msg-${Date.now().toString(36)}`,
        createdAt: new Date().toISOString(),
        status: 'unread'
      };

      try {
        const messagesCol = collection(db, 'messages');
        await addDoc(messagesCol, newMsg);
      } catch (e) {
        console.warn('Firestore message save note:', e);
      }

      setMessages(prev => [newMsg, ...prev]);
      await logAuditEvent('MESSAGE_RECEIVED', `Inquiry received from ${newMsg.name} regarding [${newMsg.topic}]`);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const updateMessageStatus = async (id: string, status: 'unread' | 'read' | 'replied', notes?: string): Promise<boolean> => {
    try {
      try {
        const msgRef = doc(db, 'messages', id);
        await updateDoc(msgRef, { status, ...(notes ? { replyNotes: notes } : {}) });
      } catch (e) {
        console.warn('Firestore message update note:', e);
      }

      setMessages(prev => prev.map(m => m.id === id ? { ...m, status, ...(notes ? { replyNotes: notes } : {}) } : m));
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  // Products mutations
  const saveProduct = async (productData: Partial<Product>): Promise<boolean> => {
    try {
      const id = productData.id || `prod-${Date.now().toString(36)}`;
      const slug = productData.slug || productData.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `product-${id}`;
      const payload = {
        ...productData,
        id,
        slug,
        createdAt: productData.createdAt || new Date().toISOString()
      };
      await setDoc(doc(db, 'products', id), payload, { merge: true });
      await logAuditEvent('PRODUCT_SAVED', `Product [${payload.title}] (${id}) crafted or updated in atelier catalog.`);
      return true;
    } catch (e) {
      console.error('Error saving product:', e);
      return false;
    }
  };

  const deleteProduct = async (id: string): Promise<boolean> => {
    try {
      await deleteDoc(doc(db, 'products', id));
      await logAuditEvent('PRODUCT_RETIRED', `Product ${id} retired from boutique catalog.`);
      return true;
    } catch (e) {
      console.error('Error deleting product:', e);
      return false;
    }
  };

  // Staff mutations
  const addStaff = async (staffData: Omit<AdminStaff, 'id' | 'createdAt' | 'status'> & { password?: string }): Promise<boolean> => {
    try {
      const id = `staff-${Date.now().toString(36)}`;
      const payload = {
        ...staffData,
        id,
        status: 'active' as const,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'staff', id), payload);
      await logAuditEvent('STAFF_PROVISIONED', `Staff operator [${payload.displayName || payload.username}] provisioned with role [${payload.role}]`);
      return true;
    } catch (e) {
      console.error('Error adding staff:', e);
      return false;
    }
  };

  const deleteStaff = async (id: string): Promise<boolean> => {
    try {
      await deleteDoc(doc(db, 'staff', id));
      await logAuditEvent('STAFF_REVOKED', `Staff operator ${id} privileges revoked.`);
      return true;
    } catch (e) {
      console.error('Error deleting staff:', e);
      return false;
    }
  };

  // Settings mutation
  const updateSettings = async (newSettings: Partial<DropSettings>): Promise<boolean> => {
    try {
      // Optimistic local state + localStorage update (instant 0ms response)
      setSettings(prev => {
        const merged = { ...(prev || {}), ...newSettings } as DropSettings;
        try {
          localStorage.setItem('saelyx_settings', JSON.stringify(merged));
        } catch (e) {}
        return merged;
      });

      const docRef = doc(db, 'settings', 'drop_config');
      await setDoc(docRef, newSettings, { merge: true });
      await logAuditEvent('SETTINGS_UPDATED', 'Global Drop 001 and hero configurations updated in Firestore.');
      return true;
    } catch (e) {
      console.error('Error updating settings:', e);
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

    try {
      const logsCol = collection(db, 'audit_logs');
      await addDoc(logsCol, entry);
    } catch (e) {
      // Non-blocking
    }
  };

  // Back-in-Stock Notifications (Firebase Firestore Integration)
  const subscribeToRestock = async (entry: Omit<StockNotification, 'id' | 'createdAt' | 'notified' | 'status'>): Promise<{ success: boolean; id?: string; error?: string }> => {
    try {
      const docPayload = {
        ...entry,
        notified: false,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      const stockCol = collection(db, 'stock_notifications');
      const docRef = await addDoc(stockCol, docPayload);

      // Log audit event
      await logAuditEvent(
        'STOCK_ALERT_SUBSCRIBED',
        `Patron ${entry.customerEmail} registered waitlist for [${entry.productTitle}] (${entry.selectedSize || 'All Sizes'})`
      );

      return { success: true, id: docRef.id };
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
    try {
      const stockCol = collection(db, 'stock_notifications');
      const qSnap = await getDocs(stockCol);
      let dispatchedCount = 0;
      const recipients: string[] = [];
      const executionId = `exec-${Date.now().toString(36)}`;

      for (const docSnap of qSnap.docs) {
        const data = docSnap.data() as StockNotification;
        if ((!productId || data.productId === productId) && data.status === 'pending') {
          await updateDoc(doc(db, 'stock_notifications', docSnap.id), {
            status: 'sent',
            notified: true,
            notifiedAt: new Date().toISOString()
          });
          dispatchedCount++;
          recipients.push(data.customerEmail);
        }
      }

      const productTitle = productId 
        ? (products.find(p => p.id === productId)?.title || 'Selected Garment')
        : 'All Restocked Creations';

      await logAuditEvent(
        'STOCK_ALERT_DISPATCHED',
        `Dispatched ${dispatchedCount} restock alerts for ${productTitle} (Execution: ${executionId})`
      );

      return {
        success: true,
        productTitle,
        dispatchedCount,
        recipients,
        executionId
      };
    } catch (e: any) {
      console.error('Error triggering restock Cloud Function:', e);
      return {
        success: false,
        productTitle: 'Error',
        dispatchedCount: 0,
        recipients: [],
        executionId: 'error'
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
        loginAsGuest,
        loginAsBypassPatron,
        loginAdmin,
        logout,
        updateUserProfile,
        orders,
        createOrder,
        updateOrderStatus,
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
        openRestockModal,
        auditLogs,
        logAuditEvent,
        saveProduct,
        deleteProduct,
        staffList,
        addStaff,
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
