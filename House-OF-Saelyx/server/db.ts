import fs from 'fs';
import path from 'path';
import { Product, Order, DropSettings, AdminStaff, StockNotification } from '../src/types.js';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'demo-project',
  appId: process.env.VITE_FIREBASE_APP_ID || 'demo-app-id',
  apiKey: process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || 'demo-project.firebaseapp.com',
  firestoreDatabaseId: process.env.VITE_FIREBASE_DATABASE_ID || '(default)',
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || 'demo-project.appspot.com',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '000000000000'
};

const firebaseApp = initializeApp(firebaseConfig, "server-db-app");
const fsDb = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId || "(default)");

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'saelyx_store.json');

interface StoreData {
  products: Product[];
  orders: Order[];
  settings: DropSettings;
  staff: AdminStaff[];
  messages: any[];
  auditLogs: any[];
  newsletterSubscribers: { email: string; date: string }[];
  stockNotifications?: StockNotification[];
}

const INITIAL_STOCK_NOTIFICATIONS: StockNotification[] = [
  {
    id: 'sn-001',
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
    id: 'sn-002',
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
    id: 'sn-003',
    productId: 'prod-02',
    productTitle: 'Navy Hoodie',
    productSlug: 'navy-hoodie',
    productImage: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=85',
    selectedSize: 'XL',
    customerEmail: 'elena.rostova@houseofsaelyx.vip',
    customerName: 'Elena Rostova',
    channel: 'email',
    notified: true,
    notifiedAt: '2026-08-31T18:40:12.000Z',
    status: 'sent',
    cloudFunctionExecutionId: 'fn-exec-mti900x',
    createdAt: '2026-08-25T11:00:00.000Z'
  }
];

const INITIAL_STAFF: AdminStaff[] = [
  {
    id: 'staff-001',
    username: 'saelyx_super',
    displayName: 'Atelier Director General',
    email: 'superadmin@houseofsaelyx.com',
    role: 'super_admin',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    lastLogin: new Date().toISOString()
  },
  {
    id: 'staff-002',
    username: 'saelyx_admin',
    displayName: 'Lead Logistics & Inventory Officer',
    email: 'operations@houseofsaelyx.com',
    role: 'admin',
    status: 'active',
    createdAt: '2026-02-15T00:00:00.000Z',
    lastLogin: new Date(Date.now() - 4 * 3600 * 1000).toISOString()
  }
];

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-01',
    slug: 'navy-baggy-sweatpants',
    title: 'Navy Baggy Sweatpants',
    subtitle: 'Structured Multi-Panel Wide Leg / 400 GSM Combed Cotton',
    priceLKR: 23300,
    category: 'new',
    subCategory: 'Bottoms',
    images: [
      'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1517445312882-bc9910d016b7?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?auto=format&fit=crop&w=1200&q=85'
    ],
    hoverImage: 'https://images.unsplash.com/photo-1517445312882-bc9910d016b7?auto=format&fit=crop&w=1200&q=85',
    completeTheSetProductId: 'prod-02',
    bulletDetails: [
      'Heavyweight 400 GSM cotton',
      'Structured, relaxed fit',
      'Wide-leg silhouette',
      'Multi-panel construction',
      'Embroidered detailing throughout',
      'Back pockets',
      'Straight leg finish'
    ],
    reviews: [
      {
        id: 'rev-1',
        author: 'Austin',
        rating: 5,
        date: '08/14/2026',
        verified: true,
        comment: 'Great quality, worth it. The 400 GSM weight sits perfectly over chunky sneakers.'
      },
      {
        id: 'rev-2',
        author: 'Brandon',
        rating: 5,
        date: '06/10/2026',
        verified: true,
        comment: 'Great quality! The embroidery along the side panel is extremely crisp.'
      },
      {
        id: 'rev-3',
        author: 'Yashpal',
        rating: 4,
        date: '08/31/2026',
        verified: true,
        comment: 'Loved the fabric and fit. Make sure to check size chart if between sizes.'
      }
    ],
    description: 'Constructed from custom-developed 400 GSM heavyweight combed cotton. Engineered with an architectural wide-leg drape, tonal cotton drawstrings, deep welt side pockets, and tonal embroidered micro-signature.',
    fabricDetails: '100% Organic Heavyweight Cotton. Pre-shrunk, garment-dyed for ultra-soft tactile finish.',
    sizes: ['S', 'M', 'L', 'XL'],
    inStock: true,
    stockCount: 42,
    badge: 'DROP 001',
    fit: 'Wide-Leg Silhouette',
    color: 'Midnight Navy'
  },
  {
    id: 'prod-02',
    slug: 'navy-hoodie',
    title: 'Navy Hoodie',
    subtitle: 'Double-Faced Knit Pullover / Heavyweight 450 GSM Fleece',
    priceLKR: 23300,
    category: 'new',
    subCategory: 'Knits',
    images: [
      'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1200&q=85'
    ],
    hoverImage: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1200&q=85',
    completeTheSetProductId: 'prod-01',
    bulletDetails: [
      'Heavyweight 450 GSM brushed cotton fleece',
      'Boxy drop-shoulder silhouette',
      'Seamless double-layer hood',
      'Custom tonal chest embroidery',
      'Kangaroo hand-warmer pocket with bar-tack reinforcement'
    ],
    reviews: [
      {
        id: 'rev-4',
        author: 'Kavinda S.',
        rating: 5,
        date: '08/20/2026',
        verified: true,
        comment: 'The weight of this hoodie is unbelievable. Best pullover in my collection.'
      }
    ],
    description: 'Sculpted pullover hoodie with reinforced cross-grain side panels and high-density ribbed cuffs that retain architectural structure.',
    fabricDetails: '450 GSM Organic Cotton Fleece.',
    sizes: ['S', 'M', 'L', 'XL'],
    inStock: true,
    stockCount: 38,
    badge: 'DROP 001',
    fit: 'Structured Boxy Fit',
    color: 'Midnight Navy'
  },
  {
    id: 'prod-03',
    slug: 'brown-hoodie',
    title: 'Brown Hoodie',
    subtitle: 'Earth Tone Heavy Fleece / 450 GSM Ring-Spun Cotton',
    priceLKR: 23300,
    category: 'new',
    subCategory: 'Knits',
    images: [
      'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85'
    ],
    hoverImage: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85',
    completeTheSetProductId: 'prod-04',
    bulletDetails: [
      '450 GSM Ring-Spun Cotton Fleece',
      'Double-stitched structural seams',
      'Tonal mocha embroidery',
      'Pre-washed for zero shrinkage'
    ],
    description: 'Rich earth-tone heavyweight pullover hoodie with dropped shoulders and ergonomic silhouette.',
    fabricDetails: '100% Ring-Spun Cotton Fleece in Earth Umber.',
    sizes: ['S', 'M', 'L', 'XL'],
    inStock: true,
    stockCount: 29,
    badge: 'DROP 001',
    fit: 'Boxy Oversized',
    color: 'Earth Brown'
  },
  {
    id: 'prod-04',
    slug: 'brown-baggy-sweatpants',
    title: 'Brown Baggy Sweatpants',
    subtitle: 'Wide Drape French Terry / Custom Earth Umber Dye',
    priceLKR: 23300,
    category: 'new',
    subCategory: 'Bottoms',
    images: [
      'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?auto=format&fit=crop&w=1200&q=85'
    ],
    hoverImage: 'https://images.unsplash.com/photo-1517445312882-bc9910d016b7?auto=format&fit=crop&w=1200&q=85',
    completeTheSetProductId: 'prod-03',
    bulletDetails: [
      '400 GSM loopback cotton',
      'Wide architectural drape',
      'Concealed zippered pocket lining',
      'Reinforced gusset for free mobility'
    ],
    description: 'Tailored wide-leg lounge sweatpants designed with fluid motion and substantial drape.',
    fabricDetails: '400 GSM Loopback French Terry.',
    sizes: ['S', 'M', 'L', 'XL'],
    inStock: true,
    stockCount: 24,
    badge: 'DROP 001',
    fit: 'Wide Leg Drape',
    color: 'Earth Brown'
  },
  {
    id: 'prod-05',
    slug: 'black-jeans',
    title: 'Black Jeans',
    subtitle: '14oz Japanese Selvedge Raw Denim / Sculpted Wide Cut',
    priceLKR: 26700,
    category: 'men',
    subCategory: 'Bottoms',
    images: [
      'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1582552938357-32b906df40cb?auto=format&fit=crop&w=1200&q=85'
    ],
    hoverImage: 'https://images.unsplash.com/photo-1582552938357-32b906df40cb?auto=format&fit=crop&w=1200&q=85',
    completeTheSetProductId: 'prod-02',
    bulletDetails: [
      '14oz Rigid Kurabo Selvedge Denim',
      'Washed vintage black patina',
      'Matte black branded hardware',
      'Wide straight-leg hem'
    ],
    description: 'Premium heavyweight selvedge denim sculpted with an exaggerated wide-leg break and signature black oxide hardware.',
    fabricDetails: '100% Long-Staple Cotton Selvedge Denim.',
    sizes: ['30', '32', '34', '36'],
    inStock: true,
    stockCount: 19,
    badge: 'LIMITED DROP',
    fit: 'Wide Straight Leg',
    color: 'Washed Black'
  },
  {
    id: 'prod-06',
    slug: 'sae-signature-oversized-tee-sand-khaki',
    title: 'SÆ Signature Oversized Tee',
    subtitle: 'Sand Khaki / 280 GSM Pure Combed Cotton',
    priceLKR: 8900,
    category: 'men',
    subCategory: 'Tops',
    images: [
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=1200&q=85'
    ],
    hoverImage: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=1200&q=85',
    completeTheSetProductId: 'prod-01',
    bulletDetails: [
      '280 GSM Heavyweight Combed Cotton',
      'Signature drop-shoulder drape',
      'High-density 1x1 ribbed neckband',
      'Tonal micro-embroidered emblem'
    ],
    description: 'Everyday understated luxury. Heavyweight single jersey with substantial hand-feel.',
    fabricDetails: '100% Organic Combed Cotton.',
    sizes: ['S', 'M', 'L', 'XL'],
    inStock: true,
    stockCount: 50,
    badge: 'NEW',
    fit: 'Drop Shoulder Relaxed',
    color: 'Sand Khaki'
  }
];

const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord-1001',
    orderNumber: 'SLX-94821',
    customerName: 'Ashan Perera',
    email: 'ashan.perera@gmail.com',
    phone: '+94 77 123 4567',
    address: '42 Ward Place, Cinnamon Gardens',
    city: 'Colombo 07',
    postalCode: '00700',
    country: 'Sri Lanka',
    items: [
      {
        productId: 'prod-01',
        title: 'SÆ SIGNATURE OVERSIZED TEE',
        image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=400&q=80',
        priceLKR: 7900,
        size: 'L',
        quantity: 1
      },
      {
        productId: 'prod-02',
        title: 'SÆ LOUNGE PANTS',
        image: 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?auto=format&fit=crop&w=400&q=80',
        priceLKR: 7900,
        size: 'M',
        quantity: 1
      }
    ],
    subtotalLKR: 15800,
    shippingLKR: 0,
    totalLKR: 15800,
    currencyUsed: 'LKR',
    totalInCurrency: 15800,
    status: 'out_for_delivery',
    trackingNumber: 'SLX-EXP-88914',
    courierName: 'SAELYX White-Glove Dispatch',
    deliveryEta: 'Today by 4:30 PM (Direct Hand Delivery)',
    createdAt: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    statusHistory: [
      {
        status: 'placed',
        timestamp: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
        note: 'Order confirmed and verified via Card Checkout.',
        location: 'Colombo Central Hub'
      },
      {
        status: 'confirmed',
        timestamp: new Date(Date.now() - 30 * 3600 * 1000).toISOString(),
        note: 'Garments quality-checked and prepared with luxury silk dust bags.',
        location: 'SAELYX Atelier, Colombo'
      },
      {
        status: 'dispatched',
        timestamp: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
        note: 'Assigned to premium courier van.',
        location: 'Colombo 03 Dispatch Depot'
      },
      {
        status: 'out_for_delivery',
        timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        note: 'Courier is en route to Cinnamon Gardens for direct customer hand-delivery.',
        location: 'En route, Ward Place'
      }
    ]
  },
  {
    id: 'ord-1002',
    orderNumber: 'SLX-94822',
    customerName: 'Sarah Kingsley',
    email: 'sarah.k@fashionstudio.co.uk',
    phone: '+44 7911 123456',
    address: '14 Kensington Square',
    city: 'London',
    postalCode: 'W8 5HH',
    country: 'United Kingdom',
    items: [
      {
        productId: 'prod-04',
        title: 'THE SIGNATURE COORDINATES SET',
        image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=400&q=80',
        priceLKR: 15800,
        size: 'S',
        quantity: 1
      }
    ],
    subtotalLKR: 15800,
    shippingLKR: 4500,
    totalLKR: 20300,
    currencyUsed: 'GBP',
    totalInCurrency: 52.5,
    status: 'dispatched',
    trackingNumber: 'DHL-EXP-440192',
    courierName: 'DHL Express Worldwide',
    deliveryEta: 'Thursday, Sept 3',
    createdAt: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
    statusHistory: [
      {
        status: 'placed',
        timestamp: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
        note: 'International priority drop order placed.',
        location: 'Online Store'
      },
      {
        status: 'dispatched',
        timestamp: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
        note: 'Cleared customs transit at Bandaranaike Int. Airport cargo terminal.',
        location: 'CMB Air Freight Cargo Hub'
      }
    ]
  }
];

const INITIAL_SETTINGS: DropSettings = {
  spotlightEyebrow: 'SAELYX PREMIER KNITS',
  spotlightTitle: 'THE SIGNATURE COORDINATES SET',
  spotlightSubhead: 'EXPERIENCE THE PRESENCE.',
  spotlightDescription: 'A curating of our most refined heavyweight textures. Crafted for understated luxury.',
  spotlightPriceLKR: 15800,
  spotlightImages: [
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85'
  ],
  countdownTarget: new Date(Date.now() + 12 * 3600 * 1000 + 34 * 60 * 1000 + 56 * 1000).toISOString(),
  announcementText: 'COMPLIMENTARY WHITE-GLOVE EXPRESS DELIVERY ON ALL ORDERS OVER LKR 15,000',
  freeShippingThresholdLKR: 15000,
  heroHeadline: 'MADE FOR PRESENCE',
  heroSubhead: 'Designed for those who enter a room before they speak.'
};

class StoreDB {
  private data: StoreData;

  constructor() {
    this.data = this.load();
    this.syncFromFirestore();
    this.syncSettingsFromFirestore();
    this.syncProductsFromFirestore();
  }

  async syncFromFirestore() {
    try {
      const ordersCol = collection(fsDb, 'orders');
      const snap = await getDocs(ordersCol);
      const fsOrders: Order[] = [];
      snap.forEach(docSnap => {
        fsOrders.push({ id: docSnap.id, ...docSnap.data() } as Order);
      });
      if (fsOrders.length > 0) {
        const existingMap = new Map(this.data.orders.map(o => [o.id, o]));
        fsOrders.forEach(o => {
          existingMap.set(o.id, o);
        });
        this.data.orders = Array.from(existingMap.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        this.saveData(this.data);
        console.log(`[StoreDB] Synced ${fsOrders.length} orders from Firestore successfully.`);
      }
    } catch (e) {
      console.error('[StoreDB] Firestore load sync failed:', e);
    }
  }

  async syncSettingsFromFirestore() {
    try {
      const docRef = doc(fsDb, 'settings', 'drop_config');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        this.data.settings = { ...this.data.settings, ...snap.data() };
        this.saveData(this.data);
        console.log('[StoreDB] Synced settings from Firestore successfully.');
      }
    } catch (e) {
      console.error('[StoreDB] Settings Firestore sync failed:', e);
    }
  }

  async syncProductsFromFirestore() {
    try {
      const prodCol = collection(fsDb, 'products');
      const snap = await getDocs(prodCol);
      const fsProds: Product[] = [];
      snap.forEach(docSnap => {
        fsProds.push({ id: docSnap.id, ...docSnap.data() } as Product);
      });
      if (fsProds.length > 0) {
        const existingMap = new Map(this.data.products.map(p => [p.id, p]));
        fsProds.forEach(p => {
          existingMap.set(p.id, p);
        });
        this.data.products = Array.from(existingMap.values());
        this.saveData(this.data);
        console.log(`[StoreDB] Synced ${fsProds.length} products from Firestore successfully.`);
      } else {
        console.log(`[StoreDB] Initializing Firestore products collection with ${this.data.products.length} products...`);
        for (const p of this.data.products) {
          const docRef = doc(fsDb, 'products', p.id);
          await setDoc(docRef, JSON.parse(JSON.stringify(p)));
        }
      }
    } catch (e) {
      console.warn('[StoreDB] Firestore products sync warning (using local fallback):', e);
    }
  }

  async saveProductToFirestore(product: Product) {
    try {
      const prodDoc = doc(fsDb, 'products', product.id);
      await setDoc(prodDoc, JSON.parse(JSON.stringify(product)), { merge: true });
      console.log(`[StoreDB] Product ${product.id} saved to Firestore.`);
    } catch (e) {
      console.warn(`[StoreDB] Product ${product.id} Firestore save warning:`, e);
    }
  }

  async deleteProductFromFirestore(id: string) {
    try {
      const prodDoc = doc(fsDb, 'products', id);
      await deleteDoc(prodDoc);
      console.log(`[StoreDB] Product ${id} deleted from Firestore.`);
    } catch (e) {
      console.warn(`[StoreDB] Product ${id} Firestore delete warning:`, e);
    }
  }

  async createOrderInFirestore(order: Order) {
    try {
      const orderDoc = doc(fsDb, 'orders', order.id);
      await setDoc(orderDoc, JSON.parse(JSON.stringify(order)));
      console.log(`[StoreDB] Order ${order.id} saved to Firestore.`);
    } catch (e) {
      console.error('[StoreDB] Order save to Firestore failed:', e);
    }
  }

  async updateOrderStatusInFirestore(orderId: string, updates: Partial<Order>) {
    try {
      const orderDoc = doc(fsDb, 'orders', orderId);
      await setDoc(orderDoc, JSON.parse(JSON.stringify(updates)), { merge: true });
      console.log(`[StoreDB] Order ${orderId} updated in Firestore.`);
    } catch (e) {
      console.error('[StoreDB] Order update in Firestore failed:', e);
    }
  }

  private load(): StoreData {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Error reading store database:', e);
    }
    const initial: StoreData = {
      products: INITIAL_PRODUCTS,
      orders: INITIAL_ORDERS,
      settings: INITIAL_SETTINGS,
      staff: INITIAL_STAFF,
      messages: [
        {
          id: 'msg-001',
          name: 'Lady Eleanor Vance',
          email: 'vance.e@mayfair-couture.co.uk',
          phone: '+44 20 7946 0192',
          topic: 'bespoke_sizing',
          message: 'Inquiring regarding custom tailoring and sleeve length for the Drop 001 Navy Hoodie.',
          createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
          status: 'unread'
        },
        {
          id: 'msg-002',
          name: 'Dinuka Senanayake',
          email: 'dinuka.s@colombo-capital.lk',
          phone: '+94 77 988 1234',
          topic: 'order_inquiry',
          orderReference: 'SLX-94821',
          message: 'Confirming if the courier can hand deliver today at 4:30 PM.',
          createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
          status: 'read'
        }
      ],
      auditLogs: [
        {
          id: 'aud-001',
          timestamp: new Date().toISOString(),
          actor: 'saelyx_super',
          role: 'super_admin',
          action: 'SECURITY_KERNEL_BOOT',
          details: 'Atelier security and Firestore synchronization established with zero vulnerabilities.',
          ipAddress: '127.0.0.1'
        }
      ],
      newsletterSubscribers: [
        { email: 'sarah.k@fashionstudio.co.uk', date: new Date().toISOString() }
      ]
    };
    this.saveData(initial);
    return initial;
  }

  private saveData(data: StoreData) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving store data:', e);
    }
  }

  getProducts(): Product[] {
    return this.data.products;
  }

  getProductById(id: string): Product | undefined {
    return this.data.products.find(p => p.id === id);
  }

  addProduct(product: Omit<Product, 'id'>): Product {
    const newProduct: Product = {
      ...product,
      id: `prod-${Date.now().toString(36)}`
    };
    this.data.products.unshift(newProduct);
    this.saveData(this.data);
    this.saveProductToFirestore(newProduct);
    return newProduct;
  }

  updateProduct(id: string, updates: Partial<Product>): Product | null {
    const idx = this.data.products.findIndex(p => p.id === id);
    if (idx === -1) return null;
    const prev = { ...this.data.products[idx] };
    const updated = { ...this.data.products[idx], ...updates };
    this.data.products[idx] = updated;
    this.saveData(this.data);
    this.saveProductToFirestore(updated);

    // Auto-trigger Cloud Function logic if garment is restocked
    const wasOutOfStock = !prev.inStock || (prev.stockCount || 0) <= 0;
    const isNowInStock = updated.inStock === true && (updated.stockCount || 0) > 0;
    if (wasOutOfStock && isNowInStock) {
      this.triggerRestockCloudFunction(id);
    }

    return this.data.products[idx];
  }

  deleteProduct(id: string): boolean {
    const initLen = this.data.products.length;
    this.data.products = this.data.products.filter(p => p.id !== id);
    if (this.data.products.length !== initLen) {
      this.saveData(this.data);
      this.deleteProductFromFirestore(id);
      return true;
    }
    return false;
  }

  getOrders(): Order[] {
    return this.data.orders;
  }

  getOrderById(id: string): Order | undefined {
    return this.data.orders.find(o => o.id === id || o.orderNumber.toLowerCase() === id.toLowerCase() || o.phone.replace(/\s+/g, '') === id.replace(/\s+/g, ''));
  }

  createOrder(orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'statusHistory'> & { orderNumber?: string }): Order {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const rand = Math.floor(1000 + Math.random() * 9000);
    const orderNum = orderData.orderNumber || `SOX-${yyyy}${mm}${dd}-${rand}`;
    const newOrder: Order = {
      ...orderData,
      id: orderNum,
      orderNumber: orderNum,
      createdAt: new Date().toISOString(),
      status: 'placed',
      trackingNumber: orderData.trackingNumber || `SOX-TRK-${Math.floor(100000 + Math.random() * 900000)}`,
      courierName: orderData.courierName || 'SAELYX Direct White-Glove Courier',
      deliveryEta: orderData.deliveryEta || 'Estimated in 1-2 Business Days',
      statusHistory: [
        {
          status: 'placed',
          timestamp: new Date().toISOString(),
          note: 'Order successfully placed by customer.',
          location: 'SAELYX Online System'
        }
      ]
    };
    this.data.orders.unshift(newOrder);
    this.saveData(this.data);
    this.createOrderInFirestore(newOrder);
    return newOrder;
  }

  updateOrderStatus(
    orderId: string,
    status: Order['status'],
    note?: string,
    location?: string,
    trackingNumber?: string,
    courierName?: string,
    deliveryEta?: string
  ): Order | null {
    const order = this.data.orders.find(o => o.id === orderId || o.orderNumber === orderId);
    if (!order) return null;
    
    order.status = status;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (courierName) order.courierName = courierName;
    if (deliveryEta) order.deliveryEta = deliveryEta;

    order.statusHistory.push({
      status,
      timestamp: new Date().toISOString(),
      note: note || `Order updated to ${status.replace('_', ' ').toUpperCase()}`,
      location: location || 'SAELYX Fulfillment Center'
    });

    this.saveData(this.data);
    this.updateOrderStatusInFirestore(order.id, {
      status,
      trackingNumber: order.trackingNumber,
      courierName: order.courierName,
      deliveryEta: order.deliveryEta,
      statusHistory: order.statusHistory
    });
    return order;
  }

  getSettings(): DropSettings {
    return this.data.settings;
  }

  updateSettings(updates: Partial<DropSettings>): DropSettings {
    this.data.settings = { ...this.data.settings, ...updates };
    this.saveData(this.data);
    return this.data.settings;
  }

  subscribeNewsletter(email: string): { success: boolean; message: string } {
    if (!email || !email.includes('@')) {
      return { success: false, message: 'Invalid email address' };
    }
    const exists = this.data.newsletterSubscribers.some(s => s.email.toLowerCase() === email.toLowerCase());
    if (!exists) {
      this.data.newsletterSubscribers.push({ email, date: new Date().toISOString() });
      this.saveData(this.data);
    }
    return { success: true, message: 'Thank you for subscribing to SAELYX drops.' };
  }

  getSubscribers() {
    return this.data.newsletterSubscribers;
  }

  // Staff Management (Super Admin Exclusive Control)
  getStaff(): AdminStaff[] {
    return this.data.staff || INITIAL_STAFF;
  }

  addStaff(staffMember: Omit<AdminStaff, 'id' | 'createdAt'>): AdminStaff {
    const newStaff: AdminStaff = {
      ...staffMember,
      id: `staff-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString()
    };
    if (!this.data.staff) this.data.staff = [];
    this.data.staff.push(newStaff);
    this.saveData(this.data);
    return newStaff;
  }

  updateStaff(id: string, updates: Partial<AdminStaff>): AdminStaff | null {
    if (!this.data.staff) this.data.staff = INITIAL_STAFF;
    const idx = this.data.staff.findIndex(s => s.id === id || s.username === id);
    if (idx === -1) return null;
    this.data.staff[idx] = { ...this.data.staff[idx], ...updates };
    this.saveData(this.data);
    return this.data.staff[idx];
  }

  deleteStaff(id: string): boolean {
    if (!this.data.staff) return false;
    const initLen = this.data.staff.length;
    this.data.staff = this.data.staff.filter(s => s.id !== id && s.username !== id);
    if (this.data.staff.length !== initLen) {
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  // Messages & Concierge Inquiries
  getMessages(): any[] {
    return this.data.messages || [];
  }

  addMessage(msg: any): any {
    const newMsg = {
      ...msg,
      id: `msg-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
      status: 'unread'
    };
    if (!this.data.messages) this.data.messages = [];
    this.data.messages.unshift(newMsg);
    this.saveData(this.data);
    return newMsg;
  }

  updateMessageStatus(id: string, status: string, notes?: string): any {
    if (!this.data.messages) return null;
    const msg = this.data.messages.find(m => m.id === id);
    if (!msg) return null;
    msg.status = status;
    if (notes) msg.replyNotes = notes;
    this.saveData(this.data);
    return msg;
  }

  // Security Audit Logs
  getAuditLogs(): any[] {
    return this.data.auditLogs || [];
  }

  addAuditLog(entry: { actor: string; role: string; action: string; details: string; ipAddress?: string }): any {
    const log = {
      id: `aud-${Date.now().toString(36)}`,
      timestamp: new Date().toISOString(),
      ...entry
    };
    if (!this.data.auditLogs) this.data.auditLogs = [];
    this.data.auditLogs.unshift(log);
    // Keep max 200 logs
    if (this.data.auditLogs.length > 200) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 200);
    }
    this.saveData(this.data);
    return log;
  }
  // Back-In-Stock Notifications & Cloud Functions Operations
  getStockNotifications(): StockNotification[] {
    if (!this.data.stockNotifications) {
      this.data.stockNotifications = INITIAL_STOCK_NOTIFICATIONS;
      this.saveData(this.data);
    }
    return this.data.stockNotifications;
  }

  addStockNotification(entry: Omit<StockNotification, 'id' | 'createdAt' | 'notified' | 'status'>): StockNotification {
    if (!this.data.stockNotifications) {
      this.data.stockNotifications = [...INITIAL_STOCK_NOTIFICATIONS];
    }
    const newNotification: StockNotification = {
      ...entry,
      id: `sn-${Date.now().toString(36)}`,
      notified: false,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    this.data.stockNotifications.unshift(newNotification);
    this.saveData(this.data);

    this.addAuditLog({
      actor: entry.customerName || entry.customerEmail,
      role: 'patron',
      action: 'STOCK_ALERT_SUBSCRIBED',
      details: `Registered waitlist for [${entry.productTitle}] (${entry.selectedSize || 'All Sizes'}) via ${entry.channel || 'email'}`
    });

    return newNotification;
  }

  deleteStockNotification(id: string): boolean {
    if (!this.data.stockNotifications) return false;
    const initLen = this.data.stockNotifications.length;
    this.data.stockNotifications = this.data.stockNotifications.filter(n => n.id !== id);
    if (this.data.stockNotifications.length !== initLen) {
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  triggerRestockCloudFunction(productId?: string): {
    success: boolean;
    productTitle: string;
    dispatchedCount: number;
    recipients: string[];
    executionId: string;
  } {
    if (!this.data.stockNotifications) {
      this.data.stockNotifications = [...INITIAL_STOCK_NOTIFICATIONS];
    }

    const executionId = `fn-exec-${Date.now().toString(36)}`;
    let targetProductTitle = 'All Restocked Garments';
    if (productId) {
      const prod = this.getProductById(productId);
      if (prod) targetProductTitle = prod.title;
    }

    const matchingPending = this.data.stockNotifications.filter(n => {
      if (n.status !== 'pending') return false;
      if (productId && n.productId !== productId) return false;
      return true;
    });

    const recipients: string[] = [];

    matchingPending.forEach(item => {
      item.status = 'sent';
      item.notified = true;
      item.notifiedAt = new Date().toISOString();
      item.cloudFunctionExecutionId = executionId;
      recipients.push(`${item.customerEmail} (${item.selectedSize || 'Std'})`);
    });

    this.saveData(this.data);

    if (matchingPending.length > 0) {
      this.addAuditLog({
        actor: 'Firebase Cloud Functions (onStockReplenished)',
        role: 'super_admin',
        action: 'CLOUD_FUNCTION_RESTOCK_DISPATCH',
        details: `Dispatched ${matchingPending.length} automated alerts for [${targetProductTitle}] to: ${recipients.join(', ')}`
      });
    }

    return {
      success: true,
      productTitle: targetProductTitle,
      dispatchedCount: matchingPending.length,
      recipients,
      executionId
    };
  }
}

export const db = new StoreDB();
