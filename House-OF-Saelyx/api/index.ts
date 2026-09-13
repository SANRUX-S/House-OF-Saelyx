import express, { type Request } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import { getAppCheck } from 'firebase-admin/app-check';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import {
  PAYZY_REQUEST_SIGNED_FIELDS,
  type PayzySignedData,
  getPayzyConfig,
  buildPayzySignedData,
  requestPayzyCheckout,
  verifyPayzyReturnSignature,
  stripInternalPayzyOrderFields,
  markPayzyLiveVerified,
  markPayzySandboxVerified
} from './payzy.js';

const app = express();
app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  // API responses may contain authenticated account, order, payment, or admin data.
  // Never allow browsers, shared proxies, or edge caches to retain API payloads.
  res.setHeader('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});
app.use('/api/media/upload', express.json({ limit: '4mb' }));
app.use(express.json({ limit: '64kb' }));

const DATABASE_ID = process.env.VITE_FIREBASE_DATABASE_ID || 'ai-studio-saelyxmadeforpre-9fd90c38-837e-435e-b027-e53891c99a41';
const ADMIN_EMAIL_ROLES = new Map<string, 'admin' | 'super_admin'>([
  ['saelyxe.co@gmail.com', 'super_admin']
]);
const ADMIN_EMAILS = new Set(ADMIN_EMAIL_ROLES.keys());
const ROOT_ADMIN_EMAILS = new Set(['saelyxe.co@gmail.com']);

const LEGACY_TEST_PRODUCT_IDS = new Set([
  'prod-mtogg0qy',
  'prod-mtiy4opf',
  'prod-mtogbgv5',
  'prod-mtogl585',
  'prod-mtogck9y',
  'prod-mtogokor',
  'prod-mtj5ymhb',
  'prod-mtmk3gor'
]);
const LEGACY_TEST_PRODUCTS_PURGE_MARKER = 'legacy-test-products-purge-20260906-v1';
const CURRENCIES = [
  { code: 'LKR', symbol: 'Rs', name: 'Sri Lankan Rupee', rateFromLKR: 1, symbolPosition: 'before', flag: 'LK' },
  { code: 'USD', symbol: '$', name: 'US Dollar', rateFromLKR: 0.0033, symbolPosition: 'before', flag: 'US' },
  { code: 'EUR', symbol: 'EUR', name: 'Euro', rateFromLKR: 0.0031, symbolPosition: 'before', flag: 'EU' },
  { code: 'GBP', symbol: 'GBP', name: 'British Pound', rateFromLKR: 0.0026, symbolPosition: 'before', flag: 'GB' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham', rateFromLKR: 0.0121, symbolPosition: 'before', flag: 'AE' }
] as const;

const ORDER_STATUSES = new Set(['placed', 'confirmed', 'packed', 'dispatched', 'out_for_delivery', 'delivered', 'cancelled']);

const ACTIVE_ORDER_STATUSES = new Set(['placed', 'confirmed', 'packed', 'dispatched', 'out_for_delivery', 'delivered']);
const INVENTORY_COMMIT_STATUSES = new Set(['confirmed', 'packed', 'dispatched', 'out_for_delivery', 'delivered']);

function canTransitionOrderStatus(current: string, next: string) {
  if (current === next) return true;
  if (!ORDER_STATUSES.has(next)) return false;
  // Admins may jump directly between active operational stages. A cancelled
  // order remains terminal so refunded/cancelled payment records are not
  // accidentally reopened as fulfillment orders.
  if (current === 'cancelled') return false;
  return ACTIVE_ORDER_STATUSES.has(current) || current === 'placed';
}

function getAdminDb() {
  if (!getApps().length) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    if (!projectId || !clientEmail || !privateKey || privateKey.startsWith('replace-with-')) return null;
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  }
  return getFirestore(DATABASE_ID);
}

function safeString(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasOnlyKeys(value: unknown, allowedKeys: readonly string[]) {
  if (!isPlainObject(value)) return false;
  const allowed = new Set(allowedKeys);
  return Object.keys(value).every(key => allowed.has(key));
}

const FALLBACK_STORE_CATALOG = {
  products: [
    {
      id: 'prod-01',
      subCategory: 'Tops',
      fabricDetails: '100% Organic Heavyweight Cotton. Pre-shrunk, garment-dyed for ultra-soft tactile finish.',
      badge: 'DROP 001',
      priceLKR: 79000,
      inStock: true,
      description: 'Constructed from custom-developed 280 GSM heavyweight combed cotton. Features a relaxed drop-shoulder silhouette with micro-embroidered SÆ chest signature.',
      hoverImage: '',
      category: 'new',
      bulletDetails: [],
      subtitle: 'Heavyweight Sand Khaki / 280 GSM Pure Combed Cotton',
      stockCount: 42,
      title: 'SÆ SIGNATURE OVERSIZED TEE',
      color: 'Sand Khaki',
      slug: 's-signature-oversized-tee',
      images: [
        'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=85',
        'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=1200&q=85'
      ],
      sizes: ['S', 'M', 'L', 'XL'],
      completeTheSetProductId: 'prod-02',
      fit: 'Relaxed Oversized Fit',
      createdAt: '2026-09-02T06:07:48.408Z'
    },
    {
      id: 'prod-02',
      description: 'Designed for effortless movement with an architectural straight-leg drape, tonal woven drawstring, and deep concealed side welt pockets.',
      category: 'new',
      subtitle: 'Relaxed Wide Drape / French Terry Weave',
      stockCount: 38,
      subCategory: 'Bottoms',
      priceLKR: 7900,
      fabricDetails: '420 GSM Loopback French Terry. Custom dyed in organic desert sandstone.',
      slug: 's-lounge-pants',
      badge: 'DROP 001',
      sizes: ['S', 'M', 'L', 'XL'],
      color: 'Sandstone',
      fit: 'Fluid Straight Leg',
      inStock: true,
      title: 'SÆ LOUNGE PANTS',
      images: [
        'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?auto=format&fit=crop&w=1200&q=85',
        'https://images.unsplash.com/photo-1517445312882-bc9910d016b7?auto=format&fit=crop&w=1200&q=85'
      ]
    },
    {
      id: 'prod-03',
      color: 'Oatmeal Heather',
      inStock: true,
      sizes: ['S', 'M', 'L', 'XL'],
      title: 'SÆ KNIT ZIP HOODIE',
      stockCount: 29,
      category: 'new',
      description: 'Heavyweight knit zip hoodie crafted with double-faced ribbing and dual-direction matte metal zipper. Minimalist warmth engineered for trans-seasonal presence.',
      slug: 's-knit-zip-hoodie',
      subtitle: 'Double-Weave Thermal Knit / Custom Matte Hardware',
      fabricDetails: '500 GSM Double-knit Cotton Blend with brushed interior fleece.',
      subCategory: 'Knits',
      badge: 'DROP 001',
      fit: 'Boxy Structured Fit',
      images: [
        'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=85',
        'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1200&q=85'
      ],
      priceLKR: 7900
    },
    {
      id: 'prod-04',
      sizes: ['S', 'M', 'L', 'XL'],
      color: 'Desert Sand',
      fit: 'Coordinated Oversized',
      stockCount: 19,
      inStock: true,
      title: 'THE SIGNATURE COORDINATES SET',
      subCategory: 'Sets',
      subtitle: 'Signature Oversized Tee + Lounge Pants Duo',
      images: [
        'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85',
        'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=85'
      ],
      category: 'collections',
      fabricDetails: 'Heavyweight Combed Cotton & Luxury Loopback Terry.',
      description: 'The definitive SAELYXE ensemble. Combines our signature 280 GSM heavyweight tee with tailored 420 GSM French Terry drape trousers.',
      isSpotlight: true,
      slug: 'the-signature-coordinates-set',
      priceLKR: 15800,
      badge: 'LIMITED DROP'
    },
    {
      id: 'prod-05',
      badge: 'ESSENTIAL',
      stockCount: 24,
      category: 'men',
      subtitle: 'Monochrome Drop-Shoulder / 450 GSM Fleece',
      slug: 's-heavyweight-crewneck',
      fit: 'Boxy Classic',
      priceLKR: 8400,
      inStock: true,
      subCategory: 'Tops',
      title: 'SÆ HEAVYWEIGHT CREWNECK',
      description: 'Sculpted crewneck with reinforced cross-grain side panels and high-density ribbed collar that maintains shape wear after wear.',
      images: [
        'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=1200&q=85'
      ],
      fabricDetails: '100% Ring-Spun Heavyweight Cotton Fleece.',
      sizes: ['S', 'M', 'L', 'XL'],
      color: 'Chalk Beige'
    },
    {
      id: 'prod-06',
      subtitle: 'Seamless Form Weave / Minimalist Embroidered Logo',
      description: 'High-neck cropped tank with engineered micro-ribbing for sculpted support and zero chafing. Subtle tonal SÆ logo at center back neckline.',
      category: 'women',
      subCategory: 'Tops',
      fabricDetails: '95% Modal Cotton, 5% Elastane.',
      images: [
        'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1200&q=85'
      ],
      slug: 's-ribbed-cropped-tank',
      priceLKR: 5900,
      badge: 'NEW',
      inStock: true,
      fit: 'Fitted Contour',
      sizes: ['XS', 'S', 'M', 'L'],
      color: 'Vanilla Cream',
      stockCount: 35,
      title: 'SÆ RIBBED CROPPED TANK'
    },
    {
      id: 'prod-07',
      stockCount: 31,
      sizes: ['S', 'M', 'L', 'XL'],
      inStock: true,
      fabricDetails: '380 GSM Organic French Terry.',
      color: 'Sandstone',
      title: 'SÆ TAILORED SWEATSHORTS',
      description: 'Mid-thigh casual luxury sweatshorts with deep slash pockets, heavy cotton cords, and custom matte eyelets.',
      subCategory: 'Bottoms',
      images: [
        'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?auto=format&fit=crop&w=1200&q=85'
      ],
      category: 'men',
      fit: 'Relaxed 6.5" Inseam',
      subtitle: 'Relaxed Inseam / Raw-Edge Hemming',
      slug: 's-tailored-sweatshorts',
      badge: 'NEW',
      priceLKR: 6900
    },
    {
      id: 'prod-08',
      hoverImage: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1200&q=85',
      completeTheSetProductId: '',
      title: 'SÆ MINIMALIST DUFFLE BAG',
      bulletDetails: [],
      sizes: ['ONE SIZE'],
      fabricDetails: 'Heavyweight Waxed Canvas & Vegetable Tanned Leather.',
      color: 'Matte Dune',
      slug: 's-minimalist-duffle-bag',
      fit: '35L Capacity',
      stockCount: 14,
      category: 'collections',
      badge: 'LIMITED',
      subtitle: 'Water-Resistant Cotton Canvas / Tuscan Leather Accents',
      priceLKR: 14500,
      subCategory: 'Accessories',
      images: [
        'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1200&q=85'
      ],
      description: 'Understated travel essential. High-density woven canvas with brushed stainless hardware and magnetic quick-access pockets.',
      inStock: true
    }
  ],
  orders: [],
  settings: {
    spotlightEyebrow: 'SAELYXE PREMIER KNITS',
    spotlightTitle: 'THE SIGNATURE COORDINATES SET',
    spotlightSubhead: 'EXPERIENCE THE PRESENCE.',
    spotlightDescription: 'A curating of our most refined heavyweight textures. Crafted for understated luxury.',
    spotlightPriceLKR: 15800,
    spotlightImages: [
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85'
    ],
    countdownTarget: '2026-09-02T05:36:59.975Z',
    announcementText: 'COMPLIMENTARY WHITE-GLOVE EXPRESS DELIVERY ON ALL ORDERS OVER LKR 15,000',
    freeShippingThresholdLKR: 15000,
    heroHeadline: 'MADE FOR PRESENCE',
    heroSubhead: 'Designed for those who enter a room before they speak.',
    showCollectionSection: true,
    showSpotlightSection: true,
    showHeroSection: true,
    showSocialFAQSection: true
  },
  staff: [],
  messages: [],
  auditLogs: [],
  newsletterSubscribers: [],
  stockNotifications: []
};

function readStore() {
  try {
    const moduleDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();
    const storePaths = [
      path.join(process.cwd(), 'data', 'saelyx_store.json'),
      path.join(moduleDir, '..', 'data', 'saelyx_store.json'),
      path.join(moduleDir, 'data', 'saelyx_store.json')
    ];
    const storePath = storePaths.find(candidate => fs.existsSync(candidate));
    if (storePath) {
      const raw = fs.readFileSync(storePath, 'utf8');
      return JSON.parse(raw) as { products: any[]; settings: Record<string, unknown> };
    }
  } catch (err) {
    console.warn('readStore file read note:', err);
  }
  return FALLBACK_STORE_CATALOG as { products: any[]; settings: Record<string, unknown> };
}

async function readBearerToken(req: Request): Promise<DecodedIdToken | null> {
  const authorization = req.headers.authorization || '';
  if (!authorization.startsWith('Bearer ')) return null;
  const idToken = authorization.slice(7).trim();
  if (!idToken) return null;
  if (!getAdminDb()) return null;
  try {
    return await getAuth().verifyIdToken(idToken);
  } catch {
    return null;
  }
}

async function getAdminRole(token: DecodedIdToken | null): Promise<'admin' | 'super_admin' | null> {
  if (!token) return null;
  const email = typeof token.email === 'string' ? token.email.toLowerCase() : '';

  // The single bootstrap root is authenticated by Firebase email/password plus
  // the exact allowlisted address. All other administrators still require a
  // verified Firebase email before any privileged authorization decision.
  if (ROOT_ADMIN_EMAILS.has(email)) return 'super_admin';
  if (token.email_verified !== true) return null;

  const configuredRole = ADMIN_EMAIL_ROLES.get(email);
  if (configuredRole) return configuredRole;

  const adminDb = getAdminDb();
  if (!adminDb) return null;
  const adminSnap = await adminDb.collection('admins').doc(token.uid).get();
  if (!adminSnap.exists) return null;

  const adminData: any = adminSnap.data() || {};
  const recordEmail = safeString(adminData.email, 254).toLowerCase();
  const recordRole = safeString(adminData.role, 30);
  const status = safeString(adminData.status, 30);
  if (status !== 'active' || !recordEmail || recordEmail !== email) return null;
  return recordRole === 'super_admin' ? 'super_admin' : recordRole === 'admin' ? 'admin' : null;
}

async function isAdminToken(token: DecodedIdToken | null) {
  return (await getAdminRole(token)) !== null;
}

async function isSuperAdminToken(token: DecodedIdToken | null) {
  return (await getAdminRole(token)) === 'super_admin';
}

async function writeAdminAudit(
  adminDb: NonNullable<ReturnType<typeof getAdminDb>>,
  token: DecodedIdToken,
  action: string,
  details: string
) {
  const role = await getAdminRole(token);
  await adminDb.collection('audit_logs').add({
    timestamp: new Date().toISOString(),
    actor: typeof token.email === 'string' ? token.email : token.uid,
    actorUid: token.uid,
    role: role || 'admin',
    action: safeString(action, 80),
    details: safeString(details, 1000)
  });
}

function hasRecentAuthentication(token: DecodedIdToken, maxAgeSeconds = 10 * 60) {
  const authTime = Number(token.auth_time);
  if (!Number.isFinite(authTime) || authTime <= 0) return false;
  return Math.floor(Date.now() / 1000) - authTime <= maxAgeSeconds;
}

function isAppCheckEnforced() {
  return false;
}

async function hasValidAppCheck(req: Request) {
  const token = safeString(req.header('X-Firebase-AppCheck'), 4096);
  if (!token) return true;
  if (!getAdminDb()) return true;
  try {
    await getAppCheck().verifyToken(token);
    return true;
  } catch {
    return false;
  }
}

function getClientAddress(req: Request) {
  const forwarded = safeString(req.headers['x-forwarded-for'], 500);
  if (forwarded) return forwarded.split(',')[0].trim();
  return safeString(req.ip, 120) || 'unknown';
}

async function enforceRateLimit(
  adminDb: NonNullable<ReturnType<typeof getAdminDb>>,
  key: string,
  limit: number,
  windowMs: number
) {
  const id = crypto.createHash('sha256').update(key).digest('hex');
  const ref = adminDb.collection('security_rate_limits').doc(id);
  const now = Date.now();

  return adminDb.runTransaction(async transaction => {
    const snap = await transaction.get(ref);
    const current: any = snap.exists ? snap.data() || {} : {};
    const windowStartedAt = Number(current.windowStartedAtMs) || 0;
    const count = Number(current.count) || 0;

    if (!windowStartedAt || now - windowStartedAt >= windowMs) {
      transaction.set(ref, {
        count: 1,
        windowStartedAtMs: now,
        expiresAtMs: now + windowMs,
        expiresAt: Timestamp.fromMillis(now + windowMs),
        updatedAt: FieldValue.serverTimestamp()
      });
      return true;
    }

    if (count >= limit) return false;

    transaction.set(ref, {
      count: count + 1,
      windowStartedAtMs: windowStartedAt,
      expiresAtMs: windowStartedAt + windowMs,
      expiresAt: Timestamp.fromMillis(windowStartedAt + windowMs),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    return true;
  });
}

async function cleanupExpiredSecurityDocs(adminDb: NonNullable<ReturnType<typeof getAdminDb>>) {
  const now = Date.now();
  for (const collectionName of ['security_rate_limits', 'order_idempotency', 'guest_order_access']) {
    const snapshot = await adminDb.collection(collectionName)
      .where('expiresAtMs', '<', now)
      .limit(50)
      .get();
    if (snapshot.empty) continue;
    const batch = adminDb.batch();
    snapshot.docs.forEach(docSnap => batch.delete(docSnap.ref));
    await batch.commit();
  }
}

const GUEST_ORDER_ACCESS_HEADER = 'x-saelyxe-guest-order-token';
const GUEST_ORDER_ACCESS_TTL_MS = 45 * 24 * 60 * 60_000;

function hashGuestOrderAccessToken(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

async function issueGuestOrderAccess(
  adminDb: NonNullable<ReturnType<typeof getAdminDb>>,
  orderId: string,
  email: string
) {
  const accessToken = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashGuestOrderAccessToken(accessToken);
  const nowMs = Date.now();
  const expiresAtMs = nowMs + GUEST_ORDER_ACCESS_TTL_MS;
  await adminDb.collection('guest_order_access').doc(orderId).set({
    orderId,
    tokenHash,
    emailHash: crypto.createHash('sha256').update(email.toLowerCase()).digest('hex'),
    createdAtMs: nowMs,
    expiresAtMs,
    expiresAt: Timestamp.fromMillis(expiresAtMs),
    serverCreatedAt: FieldValue.serverTimestamp()
  });
  return {
    guestAccessToken: accessToken,
    guestAccessExpiresAt: new Date(expiresAtMs).toISOString()
  };
}

type CustomerOrderAccess =
  | { kind: 'admin'; uid: string; rateKey: string }
  | { kind: 'user'; uid: string; rateKey: string }
  | { kind: 'guest'; rateKey: string };

async function authorizeCustomerOrderAccess(
  req: Request,
  adminDb: NonNullable<ReturnType<typeof getAdminDb>>,
  order: any
): Promise<CustomerOrderAccess | null> {
  const authToken = await readBearerToken(req);
  if (authToken) {
    const role = await getAdminRole(authToken);
    if (role) {
      return { kind: 'admin', uid: authToken.uid, rateKey: `admin:${authToken.uid}` };
    }
    if (safeString(order?.userId, 160) === authToken.uid) {
      return { kind: 'user', uid: authToken.uid, rateKey: `user:${authToken.uid}` };
    }
  }

  if (order?.guestCheckout !== true) return null;
  const presented = safeString(req.header(GUEST_ORDER_ACCESS_HEADER), 500);
  if (!presented) return null;

  const accessSnap = await adminDb.collection('guest_order_access').doc(safeString(order.id, 120)).get();
  if (!accessSnap.exists) return null;
  const accessData: any = accessSnap.data() || {};
  if (Number(accessData.expiresAtMs) <= Date.now()) return null;

  const expectedHash = safeString(accessData.tokenHash, 64);
  const actualHash = hashGuestOrderAccessToken(presented);
  if (!/^[a-f0-9]{64}$/i.test(expectedHash) || !/^[a-f0-9]{64}$/i.test(actualHash)) return null;

  const expected = Buffer.from(expectedHash, 'hex');
  const actual = Buffer.from(actualHash, 'hex');
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null;

  return {
    kind: 'guest',
    rateKey: `guest:${safeString(order.id, 120)}:${actualHash.slice(0, 16)}`
  };
}

function customerOrderAccessStillMatches(order: any, access: CustomerOrderAccess) {
  if (access.kind === 'admin') return true;
  if (access.kind === 'user') return safeString(order?.userId, 160) === access.uid;
  return order?.guestCheckout === true;
}

function calculateDiscount(codeRaw: unknown, subtotalLKR: number) {
  const code = safeString(codeRaw, 40).toUpperCase();
  if (!code) return { code: '', discountLKR: 0 };
  if (code === 'SAELYXVIP' || code === 'VIP15') {
    return { code, discountLKR: Math.round(subtotalLKR * 0.15) };
  }
  if (code === 'DROP10' || code === 'WELCOME10') {
    return { code, discountLKR: Math.round(subtotalLKR * 0.10) };
  }
  if (code === 'PRESENCE') {
    return { code, discountLKR: Math.min(5000, subtotalLKR) };
  }
  return { code: '', discountLKR: 0 };
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


async function getPayPalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  const baseUrl = process.env.PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  if (!response.ok) return null;
  const payload: any = await response.json();
  return payload?.access_token ? { token: String(payload.access_token), baseUrl } : null;
}

function getPayPalSettlementCurrency(orderCurrency: string) {
  const normalized = safeString(orderCurrency, 10).toUpperCase();
  return ['USD', 'EUR', 'GBP'].includes(normalized) ? normalized : 'USD';
}

function getExpectedPayPalPayment(order: any) {
  const usd = CURRENCIES.find(item => item.code === 'USD')!;
  const currency = getPayPalSettlementCurrency(order.currencyUsed);
  const amount = currency === order.currencyUsed
    ? Number(Number(order.totalInCurrency).toFixed(2))
    : Number((Number(order.totalLKR) * usd.rateFromLKR).toFixed(2));
  return { currency, amount };
}

function getPayPalRequestId(prefix: string, value: string) {
  const digest = crypto.createHash('sha256').update(value).digest('hex').slice(0, 64);
  return `saelyxe-${prefix}-${digest}`;
}

async function createPayPalProviderOrder(order: any) {
  const access = await getPayPalAccessToken();
  if (!access) throw new Error('PayPal is not configured.');
  const orderNumber = safeString(order.orderNumber || order.id, 120);
  const expected = getExpectedPayPalPayment(order);
  if (!orderNumber || !Number.isFinite(expected.amount) || expected.amount <= 0) {
    throw new Error('PayPal order amount is invalid.');
  }

  const response = await fetch(`${access.baseUrl}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${access.token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': getPayPalRequestId('create', orderNumber),
      Prefer: 'return=representation'
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: orderNumber,
        custom_id: orderNumber,
        invoice_id: orderNumber,
        description: `SAELYXE Order ${orderNumber}`,
        amount: {
          currency_code: expected.currency,
          value: expected.amount.toFixed(2)
        }
      }]
    })
  });

  const payload: any = await response.json().catch(() => ({}));
  const paypalOrderId = safeString(payload?.id, 160);
  if (!response.ok || !paypalOrderId) {
    throw new Error(safeString(payload?.message, 240) || 'PayPal order creation failed.');
  }
  return { paypalOrderId, providerStatus: safeString(payload?.status, 30), expected };
}

async function capturePayPalProviderOrder(paypalOrderId: string) {
  const access = await getPayPalAccessToken();
  if (!access) throw new Error('PayPal is not configured.');
  const response = await fetch(`${access.baseUrl}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${access.token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': getPayPalRequestId('capture', paypalOrderId),
      Prefer: 'return=representation'
    },
    body: '{}'
  });
  const payload: any = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, payload };
}

async function refundPayPalCapture(captureId: string, orderId: string) {
  const access = await getPayPalAccessToken();
  if (!access) throw new Error('PayPal is not configured.');
  const response = await fetch(`${access.baseUrl}/v2/payments/captures/${encodeURIComponent(captureId)}/refund`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${access.token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': getPayPalRequestId('refund', `${orderId}:${captureId}`),
      Prefer: 'return=representation'
    },
    body: JSON.stringify({ note_to_payer: `Refund for SAELYXE order ${orderId}` })
  });
  const payload: any = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error(safeString(payload?.message, 240) || 'PayPal refund request failed.'), { statusCode: response.status });
  }
  return {
    id: safeString(payload?.id, 160),
    status: safeString(payload?.status, 30).toUpperCase()
  };
}

async function getPayPalRefund(refundId: string) {
  const access = await getPayPalAccessToken();
  if (!access) throw new Error('PayPal is not configured.');
  const response = await fetch(`${access.baseUrl}/v2/payments/refunds/${encodeURIComponent(refundId)}`, {
    headers: { Authorization: `Bearer ${access.token}`, 'Content-Type': 'application/json' }
  });
  const payload: any = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error('PayPal refund status could not be verified.');
  return {
    id: safeString(payload?.id, 160),
    status: safeString(payload?.status, 30).toUpperCase()
  };
}

async function reservePayPalInventory(adminDb: any, orderId: string, paypalOrderId: string) {
  const orderRef = adminDb.collection('orders').doc(orderId);
  const now = new Date().toISOString();

  await adminDb.runTransaction(async (transaction: any) => {
    const orderSnap = await transaction.get(orderRef);
    if (!orderSnap.exists) throw Object.assign(new Error('Order not found.'), { statusCode: 404 });
    const order: any = { id: orderSnap.id, ...orderSnap.data() };

    if (order.paymentMethod !== 'paypal') {
      throw Object.assign(new Error('This order is not a PayPal order.'), { statusCode: 400 });
    }
    if (safeString(order.paymentProviderReference, 160) !== paypalOrderId) {
      throw Object.assign(new Error('PayPal order reference does not match the linked SAELYXE checkout.'), { statusCode: 409 });
    }
    if (order.status !== 'placed') {
      throw Object.assign(new Error('This order is no longer eligible for PayPal capture.'), { statusCode: 409 });
    }
    if (order.paymentStatus === 'verified' || order.inventoryCommitted === true) {
      return;
    }
    if (order.inventoryReserved === true) {
      transaction.update(orderRef, {
        paymentCaptureState: 'capturing',
        paymentCaptureStartedAt: order.paymentCaptureStartedAt || now,
        paymentUpdatedAt: now
      });
      return;
    }

    const items = Array.isArray(order.items) ? order.items : [];
    const quantityByProduct = new Map<string, number>();
    for (const item of items) {
      const productId = safeString(item?.productId, 100);
      const quantity = Number(item?.quantity);
      if (!productId || !Number.isInteger(quantity) || quantity < 1) {
        throw Object.assign(new Error('Order inventory data is invalid.'), { statusCode: 409 });
      }
      quantityByProduct.set(productId, (quantityByProduct.get(productId) || 0) + quantity);
    }

    const productSnapshots = new Map<string, { ref: any; data: any }>();
    const productsToSeed = new Map<any, any>();
    for (const productId of quantityByProduct.keys()) {
      const productRef = adminDb.collection('products').doc(productId);
      const productSnap = await transaction.get(productRef);
      if (productSnap.exists) {
        productSnapshots.set(productId, { ref: productRef, data: productSnap.data() || {} });
      } else {
        const fallbackProduct = (readStore().products || []).find((p: any) => p.id === productId);
        if (!fallbackProduct) {
          throw Object.assign(new Error('A product in this order is no longer available.'), { statusCode: 409 });
        }
        const seededProduct = {
          ...fallbackProduct,
          id: fallbackProduct.id,
          inStock: fallbackProduct.inStock !== false,
          stockCount: Number(fallbackProduct.stockCount) || 50,
          priceLKR: Number(fallbackProduct.priceLKR) || 0
        };
        productsToSeed.set(productRef, seededProduct);
        productSnapshots.set(productId, { ref: productRef, data: seededProduct });
      }
    }

    for (const [productId, quantity] of quantityByProduct.entries()) {
      const cached = productSnapshots.get(productId);
      if (!cached) throw Object.assign(new Error('Order inventory could not be reserved.'), { statusCode: 409 });
      const stockCount = Number(cached.data.stockCount);
      if (!Number.isFinite(stockCount) || stockCount < quantity) {
        throw Object.assign(new Error(`${cached.data.title || 'A product'} is no longer available in the requested quantity.`), { statusCode: 409 });
      }
    }

    for (const [productRef, seededProduct] of productsToSeed.entries()) {
      transaction.set(productRef, seededProduct);
    }

    for (const [productId, quantity] of quantityByProduct.entries()) {
      const cached = productSnapshots.get(productId)!;
      const nextStock = Number(cached.data.stockCount) - quantity;
      transaction.update(cached.ref, {
        stockCount: nextStock,
        inStock: nextStock > 0,
        updatedAt: now
      });
    }

    transaction.update(orderRef, {
      inventoryReserved: true,
      inventoryReservedAt: now,
      paymentCaptureState: 'capturing',
      paymentCaptureStartedAt: order.paymentCaptureStartedAt || now,
      paymentUpdatedAt: now
    });
  });
}

async function markPayPalOrderVerified(adminDb: any, orderId: string, paypalOrderId: string, verification?: any) {
  const ref = adminDb.collection('orders').doc(orderId);
  const now = new Date().toISOString();

  await adminDb.runTransaction(async (transaction: any) => {
    const snap = await transaction.get(ref);
    if (!snap.exists) throw new Error('Order not found.');
    const current: any = { id: snap.id, ...snap.data() };
    if (current.paymentMethod !== 'paypal') throw new Error('This order is not a PayPal order.');
    if (safeString(current.paymentProviderReference, 160) !== paypalOrderId) {
      throw new Error('PayPal order reference does not match the linked SAELYXE checkout.');
    }

    const update: Record<string, unknown> = {
      paymentStatus: 'verified',
      paymentVerificationSource: 'paypal_orders_api',
      paymentVerificationError: FieldValue.delete(),
      paymentVerifiedAt: current.paymentVerifiedAt || now,
      paymentCaptureState: 'completed',
      paymentCaptureCompletedAt: current.paymentCaptureCompletedAt || now,
      paymentCaptureId: safeString(verification?.captureId, 160) || current.paymentCaptureId || '',
      paymentCaptureAmount: Number.isFinite(Number(verification?.actualCaptureAmount)) ? Number(verification.actualCaptureAmount) : current.paymentCaptureAmount || null,
      paymentCaptureCurrency: safeString(verification?.actualCaptureCurrency, 10) || current.paymentCaptureCurrency || '',
      paymentUpdatedAt: now
    };

    if (current.inventoryReserved === true) {
      update.inventoryReserved = false;
      update.inventoryCommitted = true;
      update.inventoryCommittedAt = current.inventoryCommittedAt || now;
      update.requiresManualReview = false;
      update.inventoryException = FieldValue.delete();
    } else if (current.inventoryCommitted !== true) {
      const items = Array.isArray(current.items) ? current.items : [];
      const quantityByProduct = new Map<string, number>();
      let inventoryDataValid = items.length > 0;

      for (const item of items) {
        const productId = safeString(item?.productId, 100);
        const quantity = Number(item?.quantity);
        if (!productId || !Number.isInteger(quantity) || quantity < 1) {
          inventoryDataValid = false;
          break;
        }
        quantityByProduct.set(productId, (quantityByProduct.get(productId) || 0) + quantity);
      }

      const productSnapshots = new Map<string, { ref: any; data: any }>();
      if (inventoryDataValid) {
        for (const productId of quantityByProduct.keys()) {
          const productRef = adminDb.collection('products').doc(productId);
          const productSnap = await transaction.get(productRef);
          if (!productSnap.exists) {
            inventoryDataValid = false;
            break;
          }
          productSnapshots.set(productId, { ref: productRef, data: productSnap.data() || {} });
        }
      }

      let inventoryAvailable = inventoryDataValid;
      if (inventoryAvailable) {
        for (const [productId, quantity] of quantityByProduct.entries()) {
          const cached = productSnapshots.get(productId);
          const stockCount = Number(cached?.data?.stockCount);
          if (!cached || !Number.isFinite(stockCount) || stockCount < quantity) {
            inventoryAvailable = false;
            break;
          }
        }
      }

      if (inventoryAvailable) {
        for (const [productId, quantity] of quantityByProduct.entries()) {
          const cached = productSnapshots.get(productId)!;
          const nextStock = Number(cached.data.stockCount) - quantity;
          transaction.update(cached.ref, {
            stockCount: nextStock,
            inStock: nextStock > 0,
            updatedAt: now
          });
        }
        update.inventoryCommitted = true;
        update.inventoryCommittedAt = now;
        update.requiresManualReview = false;
        update.inventoryException = FieldValue.delete();
      } else {
        update.inventoryCommitted = false;
        update.requiresManualReview = true;
        update.inventoryException = 'paid_without_available_inventory';
      }
    }

    if (current.status === 'cancelled') {
      update.status = 'placed';
      update.updatedAt = now;
      update.statusHistory = [
        ...(Array.isArray(current.statusHistory) ? current.statusHistory : []),
        {
          status: 'placed',
          timestamp: now,
          note: current.inventoryReserved === true || update.inventoryCommitted === true
            ? 'PayPal payment completed after a checkout cancellation request; order restored for fulfilment.'
            : 'PayPal payment completed after cancellation, but inventory requires manual fulfilment or refund review.',
          location: 'SAELYXE Payment Verification'
        }
      ];
    }

    transaction.update(ref, update);
  });

  const updated = await ref.get();
  return { id: updated.id, ...updated.data() };
}

async function markPayPalVerificationPending(
  adminDb: any,
  orderId: string,
  paypalOrderId: string,
  reason: string
) {
  const ref = adminDb.collection('orders').doc(orderId);
  const now = new Date().toISOString();
  await adminDb.runTransaction(async (transaction: any) => {
    const snap = await transaction.get(ref);
    if (!snap.exists) return;
    const current: any = { id: snap.id, ...snap.data() };
    if (current.paymentStatus === 'verified') return;
    if (safeString(current.paymentProviderReference, 160) !== paypalOrderId) return;
    if (current.status === 'cancelled' && current.inventoryReserved !== true) return;

    transaction.update(ref, {
      paymentStatus: 'pending_verification',
      paymentVerificationSource: 'paypal_orders_api',
      paymentVerificationError: reason,
      paymentCaptureState: current.inventoryReserved === true ? 'needs_recovery' : (current.paymentCaptureState || 'pending'),
      paymentUpdatedAt: now
    });
  });
}

async function verifyPayPalOrder(order: any, paypalOrderId: string) {
  const access = await getPayPalAccessToken();
  if (!access || !paypalOrderId) return { verified: false, reason: 'paypal_not_configured' };

  const response = await fetch(`${access.baseUrl}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`, {
    headers: { Authorization: `Bearer ${access.token}` }
  });
  if (!response.ok) return { verified: false, reason: 'paypal_lookup_failed' };

  const payload: any = await response.json();
  const purchaseUnit = Array.isArray(payload?.purchase_units) ? payload.purchase_units[0] : null;
  const amount = purchaseUnit?.amount;
  const expected = getExpectedPayPalPayment(order);
  const expectedCurrency = expected.currency;
  const expectedAmount = expected.amount;

  const actualAmount = Number(amount?.value);
  const currencyMatches = safeString(amount?.currency_code, 10).toUpperCase() === expectedCurrency;
  const amountMatches = Number.isFinite(actualAmount) && Math.abs(actualAmount - expectedAmount) < 0.01;
  const statusMatches = safeString(payload?.status, 30).toUpperCase() === 'COMPLETED';

  const captures = Array.isArray(purchaseUnit?.payments?.captures) ? purchaseUnit.payments.captures : [];
  const completedCapture = captures.find((capture: any) => safeString(capture?.status, 30).toUpperCase() === 'COMPLETED') || null;
  const captureStatusMatches = Boolean(completedCapture);
  const captureAmount = completedCapture?.amount;
  const actualCaptureAmount = Number(captureAmount?.value);
  const captureCurrencyMatches = safeString(captureAmount?.currency_code, 10).toUpperCase() === expectedCurrency;
  const captureAmountMatches = Number.isFinite(actualCaptureAmount) && Math.abs(actualCaptureAmount - expectedAmount) < 0.01;

  const expectedOrderNumber = safeString(order.orderNumber || order.id, 120);
  const customId = safeString(purchaseUnit?.custom_id, 120);
  const invoiceId = safeString(purchaseUnit?.invoice_id, 120);
  const orderBindingMatches = Boolean(
    expectedOrderNumber &&
    customId === expectedOrderNumber &&
    invoiceId === expectedOrderNumber
  );

  return {
    verified:
      statusMatches &&
      currencyMatches &&
      amountMatches &&
      orderBindingMatches &&
      captureStatusMatches &&
      captureCurrencyMatches &&
      captureAmountMatches,
    reason: !statusMatches
      ? 'not_completed'
      : !orderBindingMatches
        ? 'order_binding_mismatch'
        : !currencyMatches || !amountMatches
          ? 'amount_mismatch'
          : !captureStatusMatches
            ? 'capture_not_completed'
            : !captureCurrencyMatches || !captureAmountMatches
              ? 'capture_amount_mismatch'
              : 'verified',
    providerStatus: safeString(payload?.status, 30),
    captureStatus: safeString(completedCapture?.status, 30),
    expectedCurrency,
    expectedAmount,
    actualCurrency: safeString(amount?.currency_code, 10),
    actualAmount,
    actualCaptureCurrency: safeString(captureAmount?.currency_code, 10),
    actualCaptureAmount,
    captureId: safeString(completedCapture?.id, 160),
    orderBindingMatches
  };
}

type EmailDeliveryResult = {
  sent: boolean;
  id?: string;
  error?: string;
};

function formatLkrEmail(value: unknown) {
  const amount = Number(value);
  return `LKR ${(Number.isFinite(amount) ? amount : 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function formatOrderPaymentMethod(order: any) {
  if (order?.paymentMethod === 'cod') return 'Cash on Delivery';
  if (order?.paymentMethod === 'paypal') return 'PayPal';
  if (order?.paymentMethod === 'payzy') return 'Payzy';
  return safeString(order?.paymentMethod, 40) || 'Payment method pending';
}

function formatOrderPaymentStatus(order: any) {
  const status = safeString(order?.paymentStatus, 60);
  if (order?.paymentMethod === 'cod') {
    if (status === 'cancelled') return 'Cancelled';
    if (status === 'cod_collected') return 'Collected on delivery';
    return 'Pay on delivery';
  }
  if (status === 'verified') return 'Payment verified';
  if (status === 'refunded') return 'Refund completed';
  if (status === 'refund_pending') return 'Refund processing';
  return status ? status.replace(/_/g, ' ') : 'Pending verification';
}

function buildOrderItemRows(order: any) {
  const items = Array.isArray(order?.items) ? order.items : [];
  if (items.length === 0) {
    return '<tr><td style="padding:14px 0;color:#8a7e73;font-size:12px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif">No item details available.</td></tr>';
  }

  return items.map((item: any) => {
    const quantity = Math.max(1, Number(item?.quantity) || 1);
    const price = Number(item?.priceLKR) || 0;
    const image = safeString(item?.image, 1000);
    const imageCell = image
      ? `<img src="${escapeHtml(image)}" width="48" height="58" alt="" style="display:block;width:48px;height:58px;object-fit:cover;border-radius:6px;background:#f8f5f0;border:1px solid #eae2d5">`
      : '<div style="width:48px;height:58px;border-radius:6px;background:#f8f5f0;border:1px solid #eae2d5"></div>';

    return [
      '<tr>',
      '<td style="padding:10px 0;border-bottom:1px solid #f2ece3">',
      '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="table-layout:fixed;width:100%"><tr>',
      `<td width="56" valign="top" style="width:56px">${imageCell}</td>`,
      '<td valign="top" style="padding:1px 10px 0;word-break:break-word;overflow-wrap:anywhere">',
      `<div style="font-size:12.5px;line-height:1.35;font-weight:600;color:#1c1916;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif">${escapeHtml(item?.title || 'SAELYXE item')}</div>`,
      `<div style="margin-top:2px;font-size:11px;color:#8a7e73;font-weight:400;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif">Size: ${escapeHtml(item?.size || '—')} &nbsp;·&nbsp; Qty: ${quantity}</div>`,
      '</td>',
      `<td width="96" valign="top" align="right" style="width:96px;padding-top:1px;font-size:12.5px;font-weight:700;color:#1c1916;white-space:nowrap;text-align:right;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif">${formatLkrEmail(price * quantity)}</td>`,
      '</tr></table>',
      '</td>',
      '</tr>'
    ].join('');
  }).join('');
}

function buildOrderTotals(order: any) {
  const subtotal = Number(order?.subtotalLKR) || 0;
  const shipping = Number(order?.shippingLKR) || 0;
  const discount = Number(order?.discountLKR) || 0;
  const total = Number(order?.totalLKR) || 0;

  return [
    '<div style="background:#faf7f2;border:1px solid #eae2d5;border-radius:10px;padding:12px 14px;margin-top:14px;box-sizing:border-box">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:12px;color:#6e645a;table-layout:fixed;width:100%;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif">',
    order?.promoCode
      ? `<tr><td style="padding:4px 0;width:55%">Promo code</td><td align="right" style="padding:4px 0;width:45%;font-weight:600;color:#1c1916;font-family:monospace">${escapeHtml(order.promoCode)}</td></tr>`
      : '',
    `<tr><td style="padding:4px 0;width:55%">Subtotal</td><td align="right" style="padding:4px 0;width:45%;color:#1c1916;font-weight:500">${formatLkrEmail(subtotal)}</td></tr>`,
    discount > 0
      ? `<tr><td style="padding:4px 0;width:55%;color:#2d6a4f;font-weight:500">Savings applied</td><td align="right" style="padding:4px 0;width:45%;color:#2d6a4f;font-weight:700">-${formatLkrEmail(discount)}</td></tr>`
      : '',
    `<tr><td style="padding:4px 0;width:55%">Delivery</td><td align="right" style="padding:4px 0;width:45%;color:#2d6a4f;font-weight:500">${shipping === 0 ? 'Complimentary' : formatLkrEmail(shipping)}</td></tr>`,
    '<tr><td colspan="2" style="padding-top:6px;border-bottom:1px solid #eae2d5"></td></tr>',
    '<tr>',
    '<td style="padding-top:8px;font-size:13px;font-weight:700;color:#1c1916;width:50%">Total</td>',
    `<td align="right" style="padding-top:8px;font-size:15px;font-weight:800;color:#1c1916;width:50%;white-space:nowrap">`,
    discount > 0
      ? `<span style="font-size:12px;color:#a09589;text-decoration:line-through;margin-right:6px;font-weight:400">${formatLkrEmail(subtotal + shipping)}</span>`
      : '',
    formatLkrEmail(total),
    '</td>',
    '</tr>',
    '</table>',
    '</div>'
  ].join('');
}

function buildSaelyxeOrderEmail(params: {
  order: any;
  eyebrow?: string;
  heading: string;
  intro: string;
  logistics?: string;
}) {
  const order = params.order;
  const orderNumber = safeString(order?.orderNumber || order?.id, 120);
  const createdAt = safeString(order?.createdAt, 100);
  const dateLabel = createdAt && Number.isFinite(Date.parse(createdAt))
    ? new Date(createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'September 13, 2026';
  const orderUrl = `https://www.saelyxe.com/orders?id=${encodeURIComponent(orderNumber)}`;
  const customerName = safeString(order?.customerName, 120) || 'Customer';
  const customerEmail = safeString(order?.email || order?.customerEmail, 254).toLowerCase();

  const destinationParts = [
    safeString(order?.city, 100),
    safeString(order?.country, 100)
  ].filter(Boolean);
  const destination = destinationParts.join(', ') || 'Colombo, Sri Lanka';

  const total = Number(order?.totalLKR) || 0;
  const trackingNumber = safeString(order?.trackingNumber, 160);
  const courierName = safeString(order?.courierName, 160);
  const deliveryEta = safeString(order?.deliveryEta, 160);
  const isGoldLogo = order?.logoVariant === 'gold';
  const logoUrl = (order?._isEmailPreview === true || !process.env.VERCEL)
    ? (isGoldLogo ? '/images/saelyxe-wordmark-gold.png' : '/images/saelyxe-wordmark-noir.png')
    : (isGoldLogo ? 'https://www.saelyxe.com/images/saelyxe-wordmark-gold.png' : 'https://www.saelyxe.com/images/saelyxe-wordmark-noir.png');

  const headerBgVariant = order?.headerBgVariant || 'wall'; // 'wall' | 'champagne'
  const isLocalOrPreview = (order?._isEmailPreview === true || !process.env.VERCEL);
  const iconBase = isLocalOrPreview ? '' : 'https://www.saelyxe.com';

  const iconVariant = order?.iconVariant || 'gold'; // 'gold' (raw standalone) | 'plaque' | 'seal' | 'none'
  const iconUrl = iconVariant === 'seal'
    ? `${iconBase}/images/saelyxe-icon-gold-seal.png`
    : (iconVariant === 'plaque'
      ? `${iconBase}/images/saelyxe-icon-gold-plaque.png`
      : `${iconBase}/images/saelyxe-icon-gold.png`);

  const wallBgUrl = `${iconBase}/images/saelyxe-header-wall-bg.jpg`;
  const headerBgStyle = headerBgVariant === 'wall'
    ? `background:#dac4ac url('${escapeHtml(wallBgUrl)}') no-repeat center center;background-size:cover;border-bottom:1px solid #c8b49c;`
    : `background:#faf6f0;border-bottom:1px solid #e2d7c7;`;

  const taglineColor = headerBgVariant === 'wall' ? '#5a4220' : '#9e7d4e';
  const badgeStyle = headerBgVariant === 'wall'
    ? 'display:inline-block;padding:4px 8px;background:rgba(255,255,255,0.92);border:1px solid #c4b097;border-radius:9999px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;font-size:8px;font-weight:700;letter-spacing:0.12em;color:#5a4220;text-transform:uppercase;box-shadow:0 1px 4px rgba(40,30,20,0.06)'
    : 'display:inline-block;padding:4px 8px;background:#ffffff;border:1px solid #d8ccbd;border-radius:9999px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;font-size:8px;font-weight:700;letter-spacing:0.12em;color:#8a7457;text-transform:uppercase';

  return [
    '<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><meta http-equiv="X-UA-Compatible" content="IE=edge"/><meta name="format-detection" content="telephone=no,date=no,address=no,email=no"/><title>SAELYXE Receipt</title>',
    '<style>',
    'html, body { margin:0 !important; padding:0 !important; width:100% !important; min-width:100% !important; }',
    '* { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; box-sizing:border-box !important; }',
    'table, td { mso-table-lspace:0pt !important; mso-table-rspace:0pt !important; border-collapse:collapse !important; }',
    'img { -ms-interpolation-mode:bicubic; border:0; outline:none; text-decoration:none; display:block; max-width:100%; }',
    'table { border-spacing:0 !important; }',
    '@media only screen and (max-width: 599px) {',
    '  .email-wrap-td { padding: 10px 6px !important; }',
    '  .email-main-card { width: 100% !important; max-width: 100% !important; border-radius: 10px !important; }',
    '  .email-pad-header { padding: 14px 14px !important; }',
    '  .email-pad-body { padding-left: 14px !important; padding-right: 14px !important; }',
    '  .email-btn-block { display: block !important; width: 100% !important; max-width: 100% !important; box-sizing: border-box !important; text-align: center !important; margin-left: 0 !important; margin-right: 0 !important; }',
    '}',
    '</style>',
    '</head><body style="margin:0;padding:0;background:#f7f5f0;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;color:#1c1916;-webkit-font-smoothing:antialiased">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background:#f7f5f0;padding:16px 8px;margin:0" class="email-wrap-td"><tr><td align="center">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="email-main-card" style="width:100%;max-width:580px;margin:0 auto;background:#ffffff;border:1px solid #eae2d5;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(40,30,20,0.04);table-layout:fixed">',
    
    // Top Metallic Gold Accent Stripe (3px)
    '<tr><td style="height:3px;background:#c5a059;line-height:3px;font-size:1px">&nbsp;</td></tr>',

    // Top Bar Header with Native Luxury Emblem + Wordmark
    `<tr><td class="email-pad-header" style="${headerBgStyle}padding:16px 18px">`,
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="table-layout:fixed;width:100%"><tr>',
    '<td valign="middle" align="left">',
    iconVariant !== 'none'
      ? [
          '<table role="presentation" cellspacing="0" cellpadding="0"><tr>',
          '<td valign="middle" width="38" style="width:38px;padding-right:10px">',
          `<img src="${escapeHtml(iconUrl)}" alt="SAELYXE Emblem" width="32" height="32" style="display:block;width:32px;height:32px;border:0;outline:none;background:transparent;${iconVariant === 'plaque' ? 'border-radius:7px;box-shadow:0 2px 6px rgba(40,30,20,0.12)' : (iconVariant === 'seal' ? 'border-radius:9999px;box-shadow:0 2px 6px rgba(40,30,20,0.12)' : '')}">`,
          '</td>',
          '<td valign="middle">',
          `<img src="${escapeHtml(logoUrl)}" alt="SAELYXE" width="118" height="27" style="display:block;width:118px;height:auto;border:0;outline:none;background:transparent">`,
          `<div style="margin-top:3px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:7.5px;font-weight:700;letter-spacing:0.22em;color:${taglineColor};text-transform:uppercase;white-space:nowrap">MADE FOR PRESENCE</div>`,
          '</td>',
          '</tr></table>'
        ].join('')
      : [
          `<img src="${escapeHtml(logoUrl)}" alt="SAELYXE" width="125" height="28" style="display:block;width:125px;height:auto;border:0;outline:none;background:transparent">`,
          `<div style="margin-top:3px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:7.5px;font-weight:700;letter-spacing:0.24em;color:${taglineColor};text-transform:uppercase;white-space:nowrap">MADE FOR PRESENCE</div>`
        ].join(''),
    '</td>',
    '<td align="right" valign="middle" style="width:95px;text-align:right">',
    `<span style="${badgeStyle};white-space:nowrap">RECEIPT</span>`,
    '</td>',
    '</tr></table>',
    '</td></tr>',

    // Main Card Body
    '<tr><td class="email-pad-body" style="padding:20px 18px 8px">',
    `<div style="font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#8a7e73;word-break:break-all">Order #${escapeHtml(orderNumber)} &nbsp;·&nbsp; ${escapeHtml(dateLabel)}</div>`,
    `<h1 style="margin:12px 0 8px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;font-size:22px;line-height:1.25;font-weight:700;letter-spacing:-0.015em;color:#1c1916">${escapeHtml(params.heading || 'Order summary')}</h1>`,
    `<p style="margin:0 0 4px;font-size:13px;line-height:1.45;font-weight:600;color:#1c1916">Hi ${escapeHtml(customerName)},</p>`,
    `<p style="margin:0;font-size:12px;line-height:1.55;color:#665e55;font-weight:400">${escapeHtml(params.intro)}</p>`,
    '</td></tr>',

    // Section 1: Order Details
    '<tr><td class="email-pad-body" style="padding:14px 18px 0">',
    '<div style="font-size:12px;font-weight:700;color:#1c1916;padding-bottom:6px;border-bottom:1px solid #eae2d5;letter-spacing:0.02em">Order details</div>',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:12px;margin-top:6px;table-layout:fixed;width:100%">',
    `<tr><td width="105" style="width:105px;padding:5px 0;color:#8a7e73;font-size:12px;font-weight:400;vertical-align:top">Transaction ID</td><td style="padding:5px 0 5px 6px;font-family:monospace;font-size:12px;font-weight:600;color:#1c1916;word-break:break-all;vertical-align:top">#${escapeHtml(orderNumber)}</td></tr>`,
    customerEmail ? `<tr><td width="105" style="width:105px;padding:5px 0;color:#8a7e73;font-size:12px;font-weight:400;vertical-align:top">Email</td><td style="padding:5px 0 5px 6px;color:#1c1916;font-size:12px;font-weight:400;word-break:break-all;vertical-align:top">${escapeHtml(customerEmail)}</td></tr>` : '',
    `<tr><td width="105" style="width:105px;padding:5px 0;color:#8a7e73;font-size:12px;font-weight:400;vertical-align:top">Destination</td><td style="padding:5px 0 5px 6px;color:#1c1916;font-size:12px;font-weight:400;word-break:break-word;vertical-align:top">${escapeHtml(destination)}</td></tr>`,
    '</table>',
    '</td></tr>',

    // Section 2: Payment Details
    '<tr><td class="email-pad-body" style="padding:14px 18px 0">',
    '<div style="font-size:12px;font-weight:700;color:#1c1916;padding-bottom:6px;border-bottom:1px solid #eae2d5;letter-spacing:0.02em">Payment details</div>',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:12px;margin-top:6px;table-layout:fixed;width:100%">',
    `<tr><td width="105" style="width:105px;padding:5px 0;color:#8a7e73;font-size:12px;font-weight:400;vertical-align:top">Payment source</td><td style="padding:5px 0 5px 6px;color:#1c1916;font-size:12px;font-weight:400;word-break:break-word;vertical-align:top">${escapeHtml(formatOrderPaymentMethod(order))}</td></tr>`,
    `<tr><td width="105" style="width:105px;padding:5px 0;color:#8a7e73;font-size:12px;font-weight:400;vertical-align:top">Payment status</td><td style="padding:5px 0 5px 6px;color:#1c1916;font-size:12px;font-weight:400;word-break:break-word;vertical-align:top">${escapeHtml(formatOrderPaymentStatus(order))}</td></tr>`,
    `<tr><td width="105" style="width:105px;padding:5px 0;color:#8a7e73;font-size:12px;font-weight:400;vertical-align:top">Initial charge</td><td style="padding:5px 0 5px 6px;color:#665e55;font-size:12px;font-weight:400;vertical-align:top">${formatLkrEmail(total)}</td></tr>`,
    `<tr><td width="105" style="width:105px;padding:5px 0;color:#8a7e73;font-size:12px;font-weight:400;vertical-align:top">Final cost</td><td style="padding:5px 0 5px 6px;color:#1c1916;font-size:12px;font-weight:600;vertical-align:top">${formatLkrEmail(total)}</td></tr>`,
    '</table>',
    '</td></tr>',

    // Section 3: Your Items
    '<tr><td class="email-pad-body" style="padding:14px 18px 0">',
    '<div style="font-size:12px;font-weight:700;color:#1c1916;padding-bottom:6px;border-bottom:1px solid #eae2d5;letter-spacing:0.02em">Your items</div>',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:2px;table-layout:fixed;width:100%">',
    buildOrderItemRows(order),
    '</table>',
    '</td></tr>',

    // Section 4: Totals Box
    '<tr><td class="email-pad-body" style="padding:2px 18px 0">',
    buildOrderTotals(order),
    '</td></tr>',

    // Section 5: Action Button (Responsive Luxury Pill Button)
    '<tr><td class="email-pad-body" style="padding:18px 18px 0">',
    `<a href="${escapeHtml(orderUrl)}" class="email-btn-block" style="display:block;width:100%;max-width:300px;margin:0 auto;background:#b88e3e;background-image:linear-gradient(135deg,#c5a059 0%,#b38738 100%);color:#ffffff;border:1px solid #a87d30;text-decoration:none;padding:11px 20px;border-radius:9999px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;text-align:center;box-sizing:border-box;box-shadow:0 3px 10px rgba(184,142,62,0.22)">View Order &amp; Receipt</a>`,
    '</td></tr>',

    // Section 6: Additional Details
    '<tr><td class="email-pad-body" style="padding:20px 18px 22px">',
    '<div style="border-top:1px solid #eae2d5;padding-top:16px">',
    '<div style="font-size:12px;font-weight:700;color:#1c1916;margin-bottom:10px;letter-spacing:0.02em">Additional details</div>',
    
    (trackingNumber || courierName)
      ? [
          '<div style="margin-bottom:10px">',
          '<div style="font-size:11.5px;font-weight:600;color:#2c2621">Delivery &amp; Tracking</div>',
          `<div style="margin-top:2px;font-size:11px;line-height:1.5;color:#665e55">Handed to <strong>${escapeHtml(courierName || 'Courier')}</strong> with tracking code <span style="display:inline-block;font-family:monospace;font-weight:600;background:#faf7f2;border:1px solid #eae2d5;padding:1px 5px;border-radius:4px;color:#1c1916">${escapeHtml(trackingNumber || 'Pending')}</span>.${deliveryEta ? ` Estimated delivery: ${escapeHtml(deliveryEta)}.` : ''}</div>`,
          '</div>'
        ].join('')
      : [
          '<div style="margin-bottom:10px">',
          '<div style="font-size:11.5px;font-weight:600;color:#2c2621">Delivery &amp; Dispatch</div>',
          '<div style="margin-top:2px;font-size:11px;line-height:1.5;color:#665e55">Your order is recorded securely. You will receive live courier tracking as soon as it departs our atelier.</div>',
          '</div>'
        ].join(''),

    '<div style="margin-bottom:10px">',
    '<div style="font-size:11.5px;font-weight:600;color:#2c2621">Authenticity &amp; Archival Care</div>',
    '<div style="margin-top:2px;font-size:11px;line-height:1.5;color:#665e55">Every SAELYXE piece is cut from custom heavyweight textiles and sealed in white-glove archival packaging.</div>',
    '</div>',

    '<div>',
    '<div style="font-size:11.5px;font-weight:600;color:#2c2621">Concierge Assistance</div>',
    '<div style="margin-top:2px;font-size:11px;line-height:1.5;color:#665e55">Reach our concierge anytime at <a href="mailto:support@saelyxe.com" style="color:#1c1916;font-weight:600;text-decoration:underline">support@saelyxe.com</a>.</div>',
    '</div>',

    '</div>',
    '</td></tr>',

    // Card Footer
    '<tr><td class="email-pad-body" style="background:#faf7f2;border-top:1px solid #eae2d5;padding:14px 18px;text-align:center">',
    '<div style="font-size:9px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#8a7e73">SAELYXE &nbsp;·&nbsp; MADE FOR PRESENCE &nbsp;·&nbsp; SRI LANKA</div>',
    '<p style="margin:3px 0 0;font-size:9.5px;line-height:1.4;color:#a09589">This is an automated transactional order confirmation. Keep your order number for reference.</p>',
    '</td></tr>',

    '</table>',
    '</td></tr></table>',
    '</body></html>'
  ].join('');
}

async function deliverTransactionalEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
  idempotencyKey?: string;
}): Promise<EmailDeliveryResult> {
  const rawList = Array.isArray(params.to) ? params.to : [params.to];
  const recipients = rawList
    .map(e => safeString(e, 254).toLowerCase().trim())
    .filter(e => isEmail(e));

  if (recipients.length === 0) {
    return { sent: false, error: 'invalid_customer_email' };
  }

  // 1. Check Resend Transport
  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM_EMAIL || 'SAELYXE Concierge <orders@saelyxe.com>';
  if (resendApiKey) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
          ...(params.idempotencyKey ? { 'Idempotency-Key': params.idempotencyKey } : {})
        },
        body: JSON.stringify({
          from: resendFrom,
          to: recipients,
          subject: params.subject,
          html: params.html
        })
      });

      const payload: any = await response.json().catch(() => ({}));
      if (response.ok) {
        return {
          sent: true,
          id: safeString(payload?.id, 160) || undefined
        };
      }
      const error = safeString(payload?.message, 240) || `resend_http_${response.status}`;
      console.error('Resend transactional email failed:', params.subject, response.status, error);
    } catch (error: any) {
      console.error('Resend transport error:', params.subject, error?.message || error);
    }
  }

  // 2. Check SMTP / Nodemailer Transport (Gmail App Password or Custom SMTP)
  const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
  if (smtpUser && smtpPass) {
    try {
      const host = process.env.SMTP_HOST || 'smtp.gmail.com';
      const port = Number(process.env.SMTP_PORT) || 465;
      const secure = port === 465;
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });

      const fromAddr = process.env.SMTP_FROM || `SAELYXE Atelier <${smtpUser}>`;
      const info = await transporter.sendMail({
        from: fromAddr,
        to: recipients.join(', '),
        subject: params.subject,
        html: params.html
      });

      return {
        sent: true,
        id: info.messageId
      };
    } catch (error: any) {
      console.error('SMTP email transport error:', params.subject, error?.message || error);
    }
  }

  // 3. Fallback dev logger when neither transport credentials are set
  console.log(`[TRANSACTIONAL EMAIL] To: ${recipients.join(', ')} | Subject: "${params.subject}" (Configure RESEND_API_KEY or SMTP_USER/SMTP_PASS in .env for live dispatch)`);
  return { sent: false, error: 'transactional_email_not_configured' };
}

function buildSaelyxeAdminNewOrderEmail(order: any) {
  const orderNumber = safeString(order?.orderNumber || order?.id, 120);
  const createdAt = safeString(order?.createdAt, 100);
  const dateLabel = createdAt && Number.isFinite(Date.parse(createdAt))
    ? new Date(createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Just Now';
  const customerName = safeString(order?.customerName, 120) || 'Client';
  const customerEmail = safeString(order?.email || order?.customerEmail, 254).toLowerCase();
  const customerPhone = safeString(order?.phone || order?.phoneNumber || order?.shippingAddress?.phone, 50);

  const street = safeString(order?.address || order?.shippingAddress?.street, 150);
  const city = safeString(order?.city || order?.shippingAddress?.city, 100);
  const postalCode = safeString(order?.postalCode || order?.shippingAddress?.postalCode, 30);
  const country = safeString(order?.country || order?.shippingAddress?.country, 60) || 'Sri Lanka';
  const fullAddress = [street, city, postalCode, country].filter(Boolean).join(', ') || 'Address not specified';

  const total = Number(order?.totalLKR) || 0;
  const isCod = order?.paymentMethod === 'cod';
  const paymentLabel = isCod ? '💵 Cash on Delivery' : '💳 Online Payment (PayPal / Card)';
  const paymentStatus = order?.paymentStatus === 'verified' ? '✅ Paid & Verified' : (isCod ? '⏳ Collect Upon Handover' : '⏳ Pending');

  // Direct WhatsApp chat link for customer
  const cleanPhone = customerPhone.replace(/[^0-9]/g, '');
  let waNumber = cleanPhone;
  if (waNumber.startsWith('0') && waNumber.length === 10) {
    waNumber = '94' + waNumber.slice(1);
  } else if (!waNumber.startsWith('94') && waNumber.length === 9) {
    waNumber = '94' + waNumber;
  }
  const waLink = waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent(`Hello ${customerName}, this is SAELYXE Atelier regarding your order #${orderNumber}.`)}` : '';

  return [
    '<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><meta http-equiv="X-UA-Compatible" content="IE=edge"/><meta name="format-detection" content="telephone=no,date=no,address=no,email=no"/><title>New Order Alert</title>',
    '<style>',
    'html, body { margin:0 !important; padding:0 !important; width:100% !important; min-width:100% !important; }',
    '* { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; box-sizing:border-box !important; }',
    'table, td { mso-table-lspace:0pt !important; mso-table-rspace:0pt !important; border-collapse:collapse !important; }',
    'img { -ms-interpolation-mode:bicubic; border:0; outline:none; text-decoration:none; display:block; max-width:100%; }',
    'table { border-spacing:0 !important; }',
    '@media only screen and (max-width: 599px) {',
    '  .admin-wrap-td { padding: 10px 6px !important; }',
    '  .admin-main-card { width: 100% !important; max-width: 100% !important; border-radius: 10px !important; }',
    '  .admin-pad-header { padding: 14px 14px !important; }',
    '  .admin-pad-body { padding-left: 14px !important; padding-right: 14px !important; }',
    '  .admin-btn-block { display: block !important; width: 100% !important; max-width: 100% !important; box-sizing: border-box !important; text-align: center !important; margin-left: 0 !important; margin-right: 0 !important; margin-bottom: 8px !important; }',
    '}',
    '</style>',
    '</head><body style="margin:0;padding:0;background:#12100e;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;color:#1c1916;-webkit-font-smoothing:antialiased">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background:#12100e;padding:16px 8px;margin:0" class="admin-wrap-td"><tr><td align="center">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="admin-main-card" style="width:100%;max-width:580px;margin:0 auto;background:#ffffff;border:1px solid #332d27;border-radius:12px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.35);table-layout:fixed">',
    
    // Top Gold Accent Stripe
    '<tr><td style="height:4px;background:#d4af37;line-height:4px;font-size:1px">&nbsp;</td></tr>',

    // Alert Header Bar
    '<tr><td class="admin-pad-header" style="background:#1c1916;padding:18px 20px;border-bottom:1px solid #2e2822">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="table-layout:fixed;width:100%"><tr><td>',
    '<div style="display:inline-block;padding:3px 9px;background:#d4af37;color:#141210;font-size:9px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;border-radius:9999px">🚨 ATELIER ORDER ALERT</div>',
    `<div style="margin-top:8px;font-size:18px;font-weight:700;color:#f5eedf;letter-spacing:-0.01em;word-break:break-all;line-height:1.25">Order #${escapeHtml(orderNumber)}</div>`,
    `<div style="font-size:11.5px;color:#a89985;margin-top:3px">${escapeHtml(dateLabel)}</div>`,
    
    // Revenue Banner (Full width within header - clean & uncroppable)
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:12px;background:rgba(212,175,55,0.09);border:1px solid rgba(212,175,55,0.25);border-radius:8px;table-layout:fixed;width:100%">',
    '<tr>',
    '<td style="padding:10px 14px;font-size:11px;color:#d8ccbd;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;vertical-align:middle">Total Order Revenue</td>',
    `<td align="right" style="padding:10px 14px;font-size:18px;font-weight:800;color:#d4af37;letter-spacing:-0.01em;white-space:nowrap;vertical-align:middle;text-align:right">${formatLkrEmail(total)}</td>`,
    '</tr>',
    '</table>',
    
    '</td></tr></table>',
    '</td></tr>',

    // Quick Action Bar (Thumb-friendly full width stacked buttons)
    '<tr><td class="admin-pad-header" style="background:#faf7f2;padding:12px 18px;border-bottom:1px solid #eae2d5">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="table-layout:fixed;width:100%">',
    '<tr><td style="padding-bottom:8px">',
    `<a href="https://www.saelyxe.com/admin/orders" target="_blank" class="admin-btn-block" style="display:block;width:100%;box-sizing:border-box;padding:11px 16px;background:#1c1916;color:#ffffff;text-decoration:none;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;border-radius:8px;text-align:center">Open in Admin Panel &rarr;</a>`,
    '</td></tr>',
    waLink ? [
      '<tr><td>',
      `<a href="${escapeHtml(waLink)}" target="_blank" class="admin-btn-block" style="display:block;width:100%;box-sizing:border-box;padding:11px 16px;background:#128C7E;color:#ffffff;text-decoration:none;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;border-radius:8px;text-align:center">💬 Chat with Client on WhatsApp</a>`,
      '</td></tr>'
    ].join('') : '',
    '</table>',
    '</td></tr>',

    // Customer & Shipping Info Card
    '<tr><td class="admin-pad-body" style="padding:16px 18px 6px">',
    '<div style="font-size:11.5px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#8a7e73;padding-bottom:6px;border-bottom:1px solid #eae2d5">Customer &amp; Delivery Details</div>',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:12px;margin-top:6px;table-layout:fixed;width:100%">',
    `<tr><td width="105" style="width:105px;padding:5px 0;color:#706558;font-weight:500;vertical-align:top">Client Name</td><td style="padding:5px 0 5px 6px;color:#1c1916;font-weight:700;word-break:break-word;vertical-align:top">${escapeHtml(customerName)}</td></tr>`,
    `<tr><td width="105" style="width:105px;padding:5px 0;color:#706558;font-weight:500;vertical-align:top">Client Email</td><td style="padding:5px 0 5px 6px;color:#1c1916;font-weight:600;word-break:break-all;vertical-align:top"><a href="mailto:${escapeHtml(customerEmail)}" style="color:#1c1916;text-decoration:underline">${escapeHtml(customerEmail)}</a></td></tr>`,
    customerPhone ? `<tr><td width="105" style="width:105px;padding:5px 0;color:#706558;font-weight:500;vertical-align:top">Client Phone</td><td style="padding:5px 0 5px 6px;color:#1c1916;font-weight:700;font-family:monospace;vertical-align:top">${escapeHtml(customerPhone)}</td></tr>` : '',
    `<tr><td width="105" style="width:105px;padding:5px 0;color:#706558;font-weight:500;vertical-align:top">Delivery Address</td><td style="padding:5px 0 5px 6px;color:#1c1916;font-weight:600;word-break:break-word;vertical-align:top">${escapeHtml(fullAddress)}</td></tr>`,
    `<tr><td width="105" style="width:105px;padding:5px 0;color:#706558;font-weight:500;vertical-align:top">Payment Method</td><td style="padding:5px 0 5px 6px;color:#1c1916;font-weight:700;word-break:break-word;vertical-align:top">${escapeHtml(paymentLabel)} &nbsp;<span style="font-weight:500;color:#665e55">(${escapeHtml(paymentStatus)})</span></td></tr>`,
    '</table>',
    '</td></tr>',

    // Garments to Dispatch Pick List
    '<tr><td class="admin-pad-body" style="padding:12px 18px 0">',
    '<div style="font-size:11.5px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#8a7e73;padding-bottom:6px;border-bottom:1px solid #eae2d5">Garments to Pack (Pick List)</div>',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:6px;table-layout:fixed;width:100%">',
    buildOrderItemRows(order),
    '</table>',
    '</td></tr>',

    // Totals
    '<tr><td class="admin-pad-body" style="padding:0 18px 18px">',
    buildOrderTotals(order),
    '</td></tr>',

    // Footer
    '<tr><td class="admin-pad-body" style="background:#faf7f2;border-top:1px solid #eae2d5;padding:14px 18px;text-align:center">',
    '<div style="font-size:9px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#8a7e73">SAELYXE ATELIER AUTOMATED DISPATCH SYSTEM</div>',
    '<p style="margin:3px 0 0;font-size:10px;color:#a09589;line-height:1.4">This alert was generated automatically upon order placement. Pack with signature archival presentation and update courier tracking.</p>',
    '</td></tr>',

    '</table>',
    '</td></tr></table>',
    '</body></html>'
  ].join('');
}

async function sendOrderConfirmationEmail(order: any): Promise<EmailDeliveryResult> {
  const orderNumber = safeString(order?.orderNumber || order?.id, 120);
  const email = safeString(order?.email || order?.customerEmail, 254).toLowerCase();
  const isCod = order?.paymentMethod === 'cod';

  const html = buildSaelyxeOrderEmail({
    order,
    eyebrow: 'Order received',
    heading: 'Order summary',
    intro: isCod
      ? 'Thank you for choosing SAELYXE. Your order has been recorded and payment will be collected on delivery.'
      : 'Thank you for choosing SAELYXE. Your order has been recorded securely. Payment verification is handled separately by the payment provider.'
  });

  const idempotency = crypto.createHash('sha256').update(`created|${orderNumber}`).digest('hex').slice(0, 40);
  return deliverTransactionalEmail({
    to: email,
    subject: `SAELYXE Order ${orderNumber} — Order Summary`,
    html,
    idempotencyKey: `saelyxe-order-created-${idempotency}`
  });
}

async function sendAdminNewOrderAlertEmail(order: any): Promise<EmailDeliveryResult> {
  const orderNumber = safeString(order?.orderNumber || order?.id, 120);
  const totalLKR = Number(order?.totalLKR) || 0;
  const customerName = safeString(order?.customerName, 120) || 'Client';

  const adminEmailsRaw = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.OWNER_EMAIL || 'saelyxe.co@gmail.com';
  const adminEmails = adminEmailsRaw
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(e => isEmail(e));

  if (adminEmails.length === 0) {
    adminEmails.push('saelyxe.co@gmail.com');
  }

  const html = buildSaelyxeAdminNewOrderEmail(order);
  const idempotency = crypto.createHash('sha256').update(`admin-alert|${orderNumber}`).digest('hex').slice(0, 40);

  return deliverTransactionalEmail({
    to: adminEmails,
    subject: `🚨 [NEW ORDER] #${orderNumber} — LKR ${totalLKR.toLocaleString()} (${customerName})`,
    html,
    idempotencyKey: `saelyxe-admin-alert-${idempotency}`
  });
}

async function ensureOrderConfirmationEmail(adminDb: any, order: any): Promise<any> {
  if (!order || !order.id) return order;
  // If payment or order is cancelled or failed, do not send confirmation email
  if (order.status === 'cancelled' || order.paymentStatus === 'cancelled' || order.paymentStatus === 'failed') {
    return order;
  }
  // For PayPal orders, payment must be verified before final payment confirmation email is sent
  if (order.paymentMethod === 'paypal' && order.paymentStatus !== 'verified') {
    return order;
  }

  const orderRef = adminDb.collection('orders').doc(order.id);
  const emailTime = new Date().toISOString();

  // 1. Deliver Customer Confirmation Email (idempotent)
  if (order.confirmationEmailStatus !== 'sent') {
    const customerResult: EmailDeliveryResult = await sendOrderConfirmationEmail(order).catch(error => ({
      sent: false,
      error: safeString(error instanceof Error ? error.message : error, 240) || 'order_confirmation_email_error'
    }));

    await orderRef.set({
      confirmationEmailStatus: customerResult.sent ? 'sent' : 'failed',
      confirmationEmailId: customerResult.id || null,
      confirmationEmailError: customerResult.sent ? null : customerResult.error || 'unknown_error',
      confirmationEmailSentAt: customerResult.sent ? emailTime : null,
      confirmationEmailAttemptedAt: emailTime
    }, { merge: true }).catch(err => console.error('Confirmation email delivery record error:', err));

    order.confirmationEmailStatus = customerResult.sent ? 'sent' : 'failed';
    if (customerResult.id) order.confirmationEmailId = customerResult.id;
  }

  // 2. Deliver Admin New Order Alert Email (idempotent)
  if (order.adminAlertEmailStatus !== 'sent') {
    const adminResult: EmailDeliveryResult = await sendAdminNewOrderAlertEmail(order).catch(error => ({
      sent: false,
      error: safeString(error instanceof Error ? error.message : error, 240) || 'admin_alert_email_error'
    }));

    await orderRef.set({
      adminAlertEmailStatus: adminResult.sent ? 'sent' : 'failed',
      adminAlertEmailId: adminResult.id || null,
      adminAlertEmailError: adminResult.sent ? null : adminResult.error || 'unknown_error',
      adminAlertEmailSentAt: adminResult.sent ? emailTime : null,
      adminAlertEmailAttemptedAt: emailTime
    }, { merge: true }).catch(err => console.error('Admin alert email delivery record error:', err));

    order.adminAlertEmailStatus = adminResult.sent ? 'sent' : 'failed';
    if (adminResult.id) order.adminAlertEmailId = adminResult.id;
  }

  return order;
}

async function sendOrderStatusEmail(order: any, previousStatus?: string): Promise<EmailDeliveryResult> {
  const email = safeString(order?.email || order?.customerEmail, 254).toLowerCase();
  const status = safeString(order?.status, 40);
  if (!status || status === previousStatus) return { sent: false, error: 'status_unchanged' };

  const orderNumber = safeString(order?.orderNumber || order?.id, 120);
  const isCod = order?.paymentMethod === 'cod';
  const copy: Record<string, { subject: string; heading: string; message: string }> = {
    confirmed: {
      subject: `SAELYXE Order ${orderNumber} Confirmed`,
      heading: 'Order confirmed',
      message: isCod
        ? 'Your order has been confirmed. Payment will be collected on delivery, and our team is preparing your pieces.'
        : 'Your payment and order have been confirmed. Our team is preparing your pieces.'
    },
    packed: {
      subject: `SAELYXE Order ${orderNumber} Is Packed`,
      heading: 'Order packed',
      message: 'Your order has been packed and is ready for dispatch.'
    },
    dispatched: {
      subject: `SAELYXE Order ${orderNumber} Has Been Dispatched`,
      heading: 'Order dispatched',
      message: 'Your order has been handed to the courier. Your real courier and tracking details are included below.'
    },
    out_for_delivery: {
      subject: `SAELYXE Order ${orderNumber} Is Out for Delivery`,
      heading: 'Out for delivery',
      message: 'Your order is with the delivery team and is heading to your delivery destination.'
    },
    delivered: {
      subject: `SAELYXE Order ${orderNumber} Delivered`,
      heading: 'Order delivered',
      message: 'Your SAELYXE order has been marked as delivered. Thank you for choosing SAELYXE.'
    },
    cancelled: {
      subject: order?.paymentStatus === 'refunded'
        ? `SAELYXE Refund Completed — ${orderNumber}`
        : `SAELYXE Order ${orderNumber} Cancelled`,
      heading: order?.paymentStatus === 'refunded' ? 'Refund completed' : 'Order cancelled',
      message: order?.paymentStatus === 'refunded'
        ? 'Your PayPal refund has been completed and the order is cancelled.'
        : 'Your order has been cancelled. If a payment review is required, SAELYXE will process it through the original payment workflow.'
    }
  };

  const selected = copy[status];
  if (!selected) return { sent: false, error: 'unsupported_status_email' };

  const trackingNumber = safeString(order?.trackingNumber, 160);
  const courierName = safeString(order?.courierName, 160);
  const deliveryEta = safeString(order?.deliveryEta, 160);
  const history = Array.isArray(order?.statusHistory) ? order.statusHistory : [];
  const eventTimestamp = safeString(history[history.length - 1]?.timestamp || order?.updatedAt || new Date().toISOString(), 100);
  const idempotency = crypto.createHash('sha256').update(`${orderNumber}|${status}|${eventTimestamp}`).digest('hex').slice(0, 40);

  const logistics = (trackingNumber || courierName || deliveryEta)
    ? [
        '<tr><td style="padding:24px 34px 0">',
        '<div style="padding-bottom:10px;border-bottom:1px solid #ded7ce;font-size:11px;letter-spacing:.16em;text-transform:uppercase;font-weight:800;color:#1b1815">Delivery details</div>',
        '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:10px;font-size:13px">',
        courierName ? `<tr><td style="padding:5px 0;color:#8a7f73">Courier</td><td align="right" style="padding:5px 0;font-weight:700;color:#1b1815">${escapeHtml(courierName)}</td></tr>` : '',
        trackingNumber ? `<tr><td style="padding:5px 0;color:#8a7f73">Tracking number</td><td align="right" style="padding:5px 0;font-family:monospace;font-weight:700;color:#1b1815">${escapeHtml(trackingNumber)}</td></tr>` : '',
        deliveryEta ? `<tr><td style="padding:5px 0;color:#8a7f73">Estimated delivery</td><td align="right" style="padding:5px 0;font-weight:700;color:#1b1815">${escapeHtml(deliveryEta)}</td></tr>` : '',
        '</table>',
        '</td></tr>'
      ].join('')
    : '';

  const html = buildSaelyxeOrderEmail({
    order,
    eyebrow: 'Order update',
    heading: selected.heading,
    intro: selected.message,
    logistics
  });

  return deliverTransactionalEmail({
    to: email,
    subject: selected.subject,
    html,
    idempotencyKey: `saelyxe-order-status-${idempotency}`
  });
}

async function sendStaffInvitationEmail(params: {
  email: string;
  name: string;
  role: 'admin' | 'super_admin';
  verifyLink?: string;
  passwordLink: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) throw new Error('Transactional email is not configured.');

  const verifySection = params.verifyLink
    ? `<p><a href="${escapeHtml(params.verifyLink)}">1. Verify your email address</a></p>`
    : '<p>1. Your Firebase email address is already verified.</p>';

  const html = [
    '<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#181614">',
    '<h2>SAELYXE Administrator Invitation</h2>',
    `<p>Hello ${escapeHtml(params.name)}, you have been invited as <strong>${escapeHtml(params.role)}</strong>.</p>`,
    '<p>Administrator access remains disabled until your email is verified and a SAELYXE Super Admin activates the invitation.</p>',
    verifySection,
    `<p><a href="${escapeHtml(params.passwordLink)}">2. Set or reset your Firebase password</a></p>`,
    '<p>3. After completing the steps above, ask the Super Admin to activate your access from the SAELYXE Admin Staff panel.</p>',
    '<p>If you did not expect this invitation, do not use these links.</p>',
    '</div>'
  ].join('');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: [params.email],
      subject: 'SAELYXE Administrator Invitation',
      html
    })
  });
  if (!response.ok) throw new Error('Administrator invitation email could not be delivered.');
}

function isTrustedAdminLoginOrigin(req: Request) {
  const origin = safeString(req.header('Origin'), 300);
  if (!origin) return true;
  return origin === 'https://saelyxe.com' || origin === 'https://www.saelyxe.com';
}

app.post('/api/admin/auth/login', async (req, res) => {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) return res.status(503).json({ error: 'Administrator service is not configured.' });
    if (!isTrustedAdminLoginOrigin(req)) return res.status(403).json({ error: 'Administrator sign-in request was rejected.' });
    if (!hasOnlyKeys(req.body, ['email', 'password'])) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const email = safeString(req.body?.email, 254).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!isEmail(email) || password.length < 6 || password.length > 256) {
      return res.status(400).json({ error: 'Email or password is incorrect.' });
    }

    const address = getClientAddress(req);
    const emailKey = crypto.createHash('sha256').update(email).digest('hex').slice(0, 24);
    const [ipAllowed, accountAllowed] = await Promise.all([
      enforceRateLimit(adminDb, `admin-login-ip:${address}`, 20, 15 * 60_000),
      enforceRateLimit(adminDb, `admin-login-account:${address}:${emailKey}`, 8, 15 * 60_000)
    ]);
    if (!ipAllowed || !accountAllowed) {
      return res.status(429).json({ error: 'Too many sign-in attempts. Wait a few minutes and try again.' });
    }

    const firebaseWebApiKey = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || '';
    if (!firebaseWebApiKey) {
      console.error('Server-side admin login fallback unavailable: Firebase Web API key is not configured.');
      return res.status(503).json({ error: 'Administrator authentication is temporarily unavailable.' });
    }

    let providerResponse: Response;
    try {
      providerResponse = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(firebaseWebApiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            returnSecureToken: true
          })
        }
      );
    } catch (error: any) {
      console.error('Firebase server-side admin login transport note:', safeString(error?.message, 160));
      return res.status(502).json({ error: 'Administrator authentication service could not be reached.' });
    }

    const providerPayload: any = await providerResponse.json().catch(() => ({}));
    if (!providerResponse.ok) {
      const providerCode = safeString(providerPayload?.error?.message, 120);
      if (providerCode.includes('TOO_MANY_ATTEMPTS')) {
        return res.status(429).json({ error: 'Too many sign-in attempts. Wait a few minutes and try again.' });
      }
      if (
        providerCode.includes('INVALID_LOGIN_CREDENTIALS') ||
        providerCode.includes('INVALID_PASSWORD') ||
        providerCode.includes('EMAIL_NOT_FOUND') ||
        providerCode.includes('INVALID_EMAIL')
      ) {
        return res.status(401).json({ error: 'Email or password is incorrect.' });
      }
      if (providerCode.includes('USER_DISABLED')) {
        return res.status(403).json({ error: 'This Firebase administrator account is disabled.' });
      }
      console.error('Firebase server-side admin login provider note:', providerCode || providerResponse.status);
      return res.status(503).json({ error: 'Administrator authentication is temporarily unavailable.' });
    }

    const idToken = safeString(providerPayload?.idToken, 5000);
    if (!idToken || !getAdminDb()) {
      return res.status(503).json({ error: 'Administrator authentication is temporarily unavailable.' });
    }

    let decoded: DecodedIdToken;
    try {
      decoded = await getAuth().verifyIdToken(idToken);
    } catch {
      return res.status(401).json({ error: 'Email or password is incorrect.' });
    }

    const role = await getAdminRole(decoded);
    if (!role) {
      return res.status(403).json({ error: 'This Firebase account does not have active SAELYXE administrator access.' });
    }

    const tokenEmail = typeof decoded.email === 'string' ? decoded.email.toLowerCase() : '';
    if (!tokenEmail || tokenEmail !== email) {
      return res.status(403).json({ error: 'Administrator identity verification failed.' });
    }

    const user = {
      uid: decoded.uid,
      name: safeString(providerPayload?.displayName, 120) || email.split('@')[0] || 'Administrator',
      email,
      role,
      authProvider: 'password',
      joinedDate: new Date().toISOString().slice(0, 10)
    };

    await writeAdminAudit(adminDb, decoded, 'ADMIN_LOGIN_SERVER_FALLBACK', `Administrator ${email} signed in through the same-origin Firebase fallback.`);

    return res.status(200).json({
      success: true,
      user,
      idToken,
      expiresIn: Math.max(60, Math.min(Number(providerPayload?.expiresIn) || 3600, 3600))
    });
  } catch (error: any) {
    console.error('Server-side administrator login error:', safeString(error?.message, 240));
    return res.status(500).json({ error: 'Administrator sign-in could not be completed.' });
  }
});

app.get('/api/admin/auth/session', async (req, res) => {
  try {
    const token = await readBearerToken(req);
    const role = await getAdminRole(token);
    if (!token || !role) return res.status(401).json({ error: 'Administrator session expired.' });

    const email = typeof token.email === 'string' ? token.email.toLowerCase() : '';
    return res.status(200).json({
      user: {
        uid: token.uid,
        name: typeof token.name === 'string' && token.name.trim() ? token.name.trim() : email.split('@')[0] || 'Administrator',
        email,
        role,
        authProvider: 'password',
        joinedDate: new Date().toISOString().slice(0, 10)
      }
    });
  } catch {
    return res.status(401).json({ error: 'Administrator session expired.' });
  }
});

app.post('/api/admin/password-reset', async (req, res) => {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) return res.status(503).json({ error: 'Administrator service is not configured.' });
    if (!(await hasValidAppCheck(req))) return res.status(401).json({ error: 'App integrity check failed.' });
    if (!(await enforceRateLimit(adminDb, `admin-password-reset:${getClientAddress(req)}`, 5, 60 * 60_000))) {
      return res.status(429).json({ error: 'Too many password reset requests. Please wait before trying again.' });
    }

    const email = safeString(req.body?.email, 254).trim().toLowerCase();
    if (!isEmail(email)) return res.status(400).json({ error: 'Enter a valid administrator email address.' });

    // Always use the same public success response so account existence is never disclosed.
    const genericSuccess = () => res.status(202).json({
      success: true,
      message: 'If this email belongs to an active SAELYXE administrator, a password reset email will be sent.'
    });

    let eligible = ADMIN_EMAILS.has(email);
    if (!eligible) {
      const snapshot = await adminDb.collection('admins').where('email', '==', email).limit(1).get();
      eligible = snapshot.docs.some(docSnap => docSnap.data()?.status === 'active');
    }
    if (!eligible) return genericSuccess();

    const resendApiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    const firebaseWebApiKey = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || '';

    const sendFirebaseNativeReset = async () => {
      if (!firebaseWebApiKey) {
        console.error('Admin password reset fallback unavailable: Firebase Web API key is not configured.');
        return false;
      }

      try {
        const response = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${encodeURIComponent(firebaseWebApiKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              requestType: 'PASSWORD_RESET',
              email,
              continueUrl: 'https://www.saelyxe.com/congsoleadmintechbypenetix'
            })
          }
        );

        if (!response.ok) {
          const payload: any = await response.json().catch(() => ({}));
          const providerCode = safeString(payload?.error?.message || response.status, 120);
          // Keep the public response generic; this log is only for server diagnostics.
          console.error('Firebase native admin password reset note:', providerCode);
          return false;
        }

        return true;
      } catch (error: any) {
        console.error('Firebase native admin password reset transport note:', safeString(error?.message, 160));
        return false;
      }
    };

    try {
      const authAdmin = getAuth();
      const userRecord = await authAdmin.getUserByEmail(email);
      if (!userRecord.emailVerified && !ROOT_ADMIN_EMAILS.has(email)) return genericSuccess();

      if (!resendApiKey || !from) {
        await sendFirebaseNativeReset();
        return genericSuccess();
      }

      const resetLink = await authAdmin.generatePasswordResetLink(email, {
        url: 'https://www.saelyxe.com/congsoleadmintechbypenetix',
        handleCodeInApp: false
      });

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `saelyxe-admin-reset-${crypto.createHash('sha256').update(email).digest('hex').slice(0, 32)}-${Math.floor(Date.now() / 600000)}`
        },
        body: JSON.stringify({
          from,
          to: [email],
          subject: 'Reset your SAELYXE administrator password',
          html: [
            '<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#181614">',
            '<h2>SAELYXE Administrator Password Reset</h2>',
            '<p>A password reset was requested for your administrator account.</p>',
            `<p><a href="${escapeHtml(resetLink)}">Reset administrator password</a></p>`,
            '<p>This link is generated by Firebase Authentication. If you did not request it, you can ignore this email.</p>',
            '</div>'
          ].join('')
        })
      });

      if (!response.ok) {
        console.error('Admin password reset email failed:', response.status);
        await sendFirebaseNativeReset();
      }
    } catch (error: any) {
      // The deployed service account can be intentionally scoped away from
      // Firebase Authentication administration. In that case, fall back to
      // Firebase's public password-reset delivery endpoint using the web API key.
      console.error('Admin password reset delivery note:', safeString(error?.code || error?.message, 160));
      await sendFirebaseNativeReset();
    }

    return genericSuccess();
  } catch {
    return res.status(500).json({ error: 'Unable to process password reset request.' });
  }
});

app.post('/api/admin/staff/invite', async (req, res) => {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) return res.status(503).json({ error: 'Administrator service is not configured.' });
    const token = await readBearerToken(req);
    if (!token || !(await isSuperAdminToken(token))) return res.status(403).json({ error: 'Super Admin access required.' });
    if (!(await hasValidAppCheck(req))) return res.status(401).json({ error: 'App integrity check failed.' });
    if (!hasRecentAuthentication(token)) {
      return res.status(428).json({ error: 'Recent administrator authentication required. Sign out and sign in again before changing staff access.' });
    }
    if (!(await enforceRateLimit(adminDb, `admin-staff-invite:${token.uid}`, 10, 60 * 60_000))) {
      return res.status(429).json({ error: 'Too many administrator privilege changes. Please wait and try again.' });
    }

    const name = safeString(req.body?.name, 120);
    const username = safeString(req.body?.username, 60).toLowerCase();
    const email = safeString(req.body?.email, 254).toLowerCase();
    const role = safeString(req.body?.role, 30) as 'admin' | 'super_admin';
    if (!name || !/^[a-z0-9._-]{3,60}$/.test(username) || !isEmail(email) || !['admin', 'super_admin'].includes(role)) {
      return res.status(400).json({ error: 'Valid name, username, email, and administrator role are required.' });
    }
    if (ADMIN_EMAILS.has(email)) {
      return res.status(409).json({ error: 'Configured bootstrap administrator emails are managed outside staff invitations.' });
    }
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
      return res.status(503).json({ error: 'Transactional email must be configured before inviting staff.' });
    }

    const authAdmin = getAuth();
    let userRecord: any;
    try {
      userRecord = await authAdmin.getUserByEmail(email);
    } catch (error: any) {
      if (error?.code !== 'auth/user-not-found') throw error;
      userRecord = await authAdmin.createUser({
        email,
        displayName: name,
        disabled: false
      });
    }

    const existingAdmin = await adminDb.collection('admins').doc(userRecord.uid).get();
    const existingData: any = existingAdmin.exists ? existingAdmin.data() || {} : {};
    if (existingData.status === 'active') {
      return res.status(409).json({ error: 'This Firebase account already has active administrator access.' });
    }

    const now = new Date().toISOString();
    const actionSettings = { url: 'https://www.saelyxe.com/congsoleadmintechbypenetix', handleCodeInApp: false };
    const passwordLink = await authAdmin.generatePasswordResetLink(email, actionSettings);
    const verifyLink = userRecord.emailVerified
      ? undefined
      : await authAdmin.generateEmailVerificationLink(email, actionSettings);

    const adminRecord = {
      uid: userRecord.uid,
      firebaseUid: userRecord.uid,
      email,
      name,
      username,
      role,
      status: 'invited',
      emailVerified: Boolean(userRecord.emailVerified),
      invitedAt: existingData.invitedAt || now,
      updatedAt: now,
      invitedBy: token.uid
    };
    const staffRecord = {
      id: userRecord.uid,
      firebaseUid: userRecord.uid,
      username,
      name,
      email,
      role,
      status: 'invited',
      emailVerified: Boolean(userRecord.emailVerified),
      createdAt: existingData.invitedAt || now,
      invitedAt: existingData.invitedAt || now
    };

    const batch = adminDb.batch();
    batch.set(adminDb.collection('admins').doc(userRecord.uid), adminRecord, { merge: true });
    batch.set(adminDb.collection('staff').doc(userRecord.uid), staffRecord, { merge: true });
    await batch.commit();

    try {
      await sendStaffInvitationEmail({ email, name, role, verifyLink, passwordLink });
      await adminDb.collection('admins').doc(userRecord.uid).set({ inviteDeliveryStatus: 'sent', inviteSentAt: now }, { merge: true });
    } catch (error) {
      await adminDb.collection('admins').doc(userRecord.uid).set({ inviteDeliveryStatus: 'failed', updatedAt: now }, { merge: true });
      throw error;
    }

    await writeAdminAudit(adminDb, token, 'STAFF_INVITED', `Invited ${email} as ${role} (${userRecord.uid}).`);
    return res.status(201).json(staffRecord);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to invite administrator.';
    return res.status(message.includes('delivered') ? 502 : 500).json({ error: message });
  }
});

app.post('/api/admin/staff/:uid/activate', async (req, res) => {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) return res.status(503).json({ error: 'Administrator service is not configured.' });
    const token = await readBearerToken(req);
    if (!token || !(await isSuperAdminToken(token))) return res.status(403).json({ error: 'Super Admin access required.' });
    if (!(await hasValidAppCheck(req))) return res.status(401).json({ error: 'App integrity check failed.' });
    if (!hasRecentAuthentication(token)) {
      return res.status(428).json({ error: 'Recent administrator authentication required. Sign out and sign in again before changing staff access.' });
    }
    if (!(await enforceRateLimit(adminDb, `admin-staff-activate:${token.uid}`, 20, 60 * 60_000))) {
      return res.status(429).json({ error: 'Too many administrator privilege changes. Please wait and try again.' });
    }

    const uid = safeString(req.params.uid, 160);
    const adminRef = adminDb.collection('admins').doc(uid);
    const adminSnap = await adminRef.get();
    if (!adminSnap.exists) return res.status(404).json({ error: 'Staff invitation was not found.' });
    const record: any = adminSnap.data() || {};
    const role = safeString(record.role, 30);
    if (!['admin', 'super_admin'].includes(role)) return res.status(409).json({ error: 'Staff role is invalid.' });

    const userRecord = await getAuth().getUser(uid);
    if (!userRecord.emailVerified) {
      return res.status(409).json({ error: 'The staff member must verify their Firebase email before activation.' });
    }

    const currentClaims = { ...(userRecord.customClaims || {}) };
    await getAuth().setCustomUserClaims(uid, { ...currentClaims, admin: true, role });
    const now = new Date().toISOString();
    const batch = adminDb.batch();
    batch.set(adminRef, { status: 'active', emailVerified: true, activatedAt: now, updatedAt: now, activatedBy: token.uid }, { merge: true });
    batch.set(adminDb.collection('staff').doc(uid), { status: 'active', emailVerified: true, activatedAt: now }, { merge: true });
    await batch.commit();

    await writeAdminAudit(adminDb, token, 'STAFF_ACTIVATED', `Activated ${record.email || uid} as ${role}.`);
    const updated = await adminDb.collection('staff').doc(uid).get();
    return res.json({ id: updated.id, ...updated.data() });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to activate administrator.' });
  }
});

app.put('/api/admin/staff/:uid/role', async (req, res) => {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) return res.status(503).json({ error: 'Administrator service is not configured.' });
    const token = await readBearerToken(req);
    if (!token || !(await isSuperAdminToken(token))) return res.status(403).json({ error: 'Super Admin access required.' });
    if (!(await hasValidAppCheck(req))) return res.status(401).json({ error: 'App integrity check failed.' });
    if (!hasRecentAuthentication(token)) {
      return res.status(428).json({ error: 'Recent administrator authentication required. Sign out and sign in again before changing staff access.' });
    }
    if (!(await enforceRateLimit(adminDb, `admin-staff-role:${token.uid}`, 20, 60 * 60_000))) {
      return res.status(429).json({ error: 'Too many administrator privilege changes. Please wait and try again.' });
    }

    const uid = safeString(req.params.uid, 160);
    const role = safeString(req.body?.role, 30) as 'admin' | 'super_admin';
    if (!['admin', 'super_admin'].includes(role)) return res.status(400).json({ error: 'Invalid administrator role.' });

    const userRecord = await getAuth().getUser(uid);
    const email = userRecord.email?.toLowerCase() || '';
    if (ROOT_ADMIN_EMAILS.has(email)) return res.status(409).json({ error: 'Bootstrap Super Admin role cannot be changed here.' });

    const adminRef = adminDb.collection('admins').doc(uid);
    const snap = await adminRef.get();
    if (!snap.exists) return res.status(404).json({ error: 'Administrator record not found.' });
    const record: any = snap.data() || {};
    const now = new Date().toISOString();

    if (record.status === 'active') {
      const currentClaims = { ...(userRecord.customClaims || {}) };
      await getAuth().setCustomUserClaims(uid, { ...currentClaims, admin: true, role });
    }

    const batch = adminDb.batch();
    batch.set(adminRef, { role, updatedAt: now }, { merge: true });
    batch.set(adminDb.collection('staff').doc(uid), { role }, { merge: true });
    await batch.commit();

    await writeAdminAudit(adminDb, token, 'STAFF_ROLE_CHANGED', `Changed ${email || uid} role to ${role}.`);
    const updated = await adminDb.collection('staff').doc(uid).get();
    return res.json({ id: updated.id, ...updated.data() });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to update staff role.' });
  }
});

app.post('/api/admin/staff/:uid/revoke', async (req, res) => {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) return res.status(503).json({ error: 'Administrator service is not configured.' });
    const token = await readBearerToken(req);
    if (!token || !(await isSuperAdminToken(token))) return res.status(403).json({ error: 'Super Admin access required.' });
    if (!(await hasValidAppCheck(req))) return res.status(401).json({ error: 'App integrity check failed.' });
    if (!hasRecentAuthentication(token)) {
      return res.status(428).json({ error: 'Recent administrator authentication required. Sign out and sign in again before changing staff access.' });
    }
    if (!(await enforceRateLimit(adminDb, `admin-staff-revoke:${token.uid}`, 20, 60 * 60_000))) {
      return res.status(429).json({ error: 'Too many administrator privilege changes. Please wait and try again.' });
    }

    const uid = safeString(req.params.uid, 160);
    if (uid === token.uid) return res.status(409).json({ error: 'You cannot revoke your own active Super Admin session.' });
    const userRecord = await getAuth().getUser(uid);
    const email = userRecord.email?.toLowerCase() || '';
    if (ROOT_ADMIN_EMAILS.has(email)) return res.status(409).json({ error: 'Bootstrap Super Admin access cannot be revoked here.' });

    const claims = { ...(userRecord.customClaims || {}) } as Record<string, unknown>;
    delete claims.admin;
    delete claims.role;
    await getAuth().setCustomUserClaims(uid, claims);
    await getAuth().revokeRefreshTokens(uid);

    const now = new Date().toISOString();
    const batch = adminDb.batch();
    batch.set(adminDb.collection('admins').doc(uid), { status: 'revoked', revokedAt: now, updatedAt: now, revokedBy: token.uid }, { merge: true });
    batch.set(adminDb.collection('staff').doc(uid), { status: 'revoked', revokedAt: now }, { merge: true });
    await batch.commit();

    await writeAdminAudit(adminDb, token, 'STAFF_ACCESS_REVOKED', `Revoked administrator access for ${email || uid}.`);
    const updated = await adminDb.collection('staff').doc(uid).get();
    return res.json({ id: updated.id, ...updated.data() });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to revoke administrator access.' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'saelyxe-api' });
});

app.get('/api/admin/export', async (req, res) => {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) return res.status(503).json({ error: 'Administrator service is not configured.' });
    const token = await readBearerToken(req);
    if (!token || !(await isSuperAdminToken(token))) return res.status(403).json({ error: 'Super Admin access required.' });
    if (!(await hasValidAppCheck(req))) return res.status(401).json({ error: 'App integrity check failed.' });
    if (!hasRecentAuthentication(token)) {
      return res.status(428).json({ error: 'Recent administrator authentication required. Sign out and sign in again before exporting.' });
    }
    if (!(await enforceRateLimit(adminDb, `admin-export:${token.uid}`, 3, 60 * 60_000))) {
      return res.status(429).json({ error: 'Too many backup exports. Please wait before exporting again.' });
    }

    const collectionNames = [
      'products',
      'settings',
      'orders',
      'reviews',
      'staff',
      'admins',
      'messages',
      'concierge_inquiries',
      'audit_logs',
      'subscribers',
      'stock_notifications'
    ] as const;

    const entries = await Promise.all(collectionNames.map(async name => {
      const snapshot = await adminDb.collection(name).get();
      return [
        name,
        snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
      ] as const;
    }));

    const backup = Object.fromEntries(entries);
    await writeAdminAudit(adminDb, token, 'DATABASE_EXPORT', 'Exported protected administrator database snapshot.');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="saelyxe-backup-${new Date().toISOString().slice(0, 10)}.json"`);
    res.setHeader('Cache-Control', 'no-store');
    return res.json({
      exportedAt: new Date().toISOString(),
      exportedBy: token.uid,
      schemaVersion: 1,
      data: backup
    });
  } catch {
    return res.status(500).json({ error: 'Unable to export administrator backup.' });
  }
});


const OPERATIONAL_RESET_COLLECTIONS = [
  'messages',
  'concierge_inquiries',
  'stock_notifications',
  'restock_dispatch_locks',
  'order_idempotency',
  'paypal_order_links',
  'orders'
] as const;
const OPERATIONAL_RESET_MARKER = 'operational-reset-20260906';

async function getOperationalResetCounts(adminDb: any) {
  const entries = await Promise.all(OPERATIONAL_RESET_COLLECTIONS.map(async collectionName => {
    const snapshot = await adminDb.collection(collectionName).get();
    return [collectionName, snapshot.size] as const;
  }));
  const counts = Object.fromEntries(entries) as Record<(typeof OPERATIONAL_RESET_COLLECTIONS)[number], number>;
  const total = Object.values(counts).reduce((sum, count) => sum + Number(count || 0), 0);
  return { counts, total };
}

async function deleteCollectionInBatches(adminDb: any, collectionName: string) {
  let deleted = 0;
  while (true) {
    const snapshot = await adminDb.collection(collectionName).limit(400).get();
    if (snapshot.empty) break;
    const batch = adminDb.batch();
    snapshot.docs.forEach((docSnap: any) => batch.delete(docSnap.ref));
    await batch.commit();
    deleted += snapshot.size;
    if (snapshot.size < 400) break;
  }
  return deleted;
}

app.get('/api/admin/maintenance/operational-data', async (req, res) => {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) return res.status(503).json({ error: 'Administrator service is not configured.' });
    const token = await readBearerToken(req);
    if (!token || !(await isSuperAdminToken(token))) return res.status(403).json({ error: 'Super Admin access required.' });
    if (!(await hasValidAppCheck(req))) return res.status(401).json({ error: 'App integrity check failed.' });

    const markerRef = adminDb.collection('maintenance').doc(OPERATIONAL_RESET_MARKER);
    const legacyMarkerRef = adminDb.collection('maintenance').doc(LEGACY_DEMO_PURGE_MARKER);
    const testProductsMarkerRef = adminDb.collection('maintenance').doc(LEGACY_TEST_PRODUCTS_PURGE_MARKER);
    const [markerSnap, legacyMarkerSnap, testProductsMarkerSnap, snapshot] = await Promise.all([
      markerRef.get(),
      legacyMarkerRef.get(),
      testProductsMarkerRef.get(),
      getOperationalResetCounts(adminDb)
    ]);
    const markerData = markerSnap.exists ? markerSnap.data() || {} : {};
    const legacyMarkerData = legacyMarkerSnap.exists ? legacyMarkerSnap.data() || {} : {};
    const testProductsMarkerData = testProductsMarkerSnap.exists ? testProductsMarkerSnap.data() || {} : {};
    const resetCompleted =
      markerData.status === 'completed' ||
      legacyMarkerData.status === 'completed';
    return res.json({
      ...snapshot,
      resetCompleted,
      completedAt: markerData.completedAt || legacyMarkerData.completedAt || null,
      cleanupMode: legacyMarkerData.status === 'completed' ? 'legacy-demo-purge' : markerData.status === 'completed' ? 'operational-reset' : null,
      legacyDemoCleanupCompleted: legacyMarkerData.status === 'completed',
      legacyDemoDeletedTotal: Number(legacyMarkerData.deletedTotal || 0),
      legacyTestProductCleanupCompleted: testProductsMarkerData.status === 'completed',
      legacyTestProductDeletedCount: Number(testProductsMarkerData.deletedCount || 0)
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to inspect operational data.' });
  }
});

app.post('/api/admin/maintenance/reset-operational-data', async (req, res) => {
  let adminDb: any = null;
  let markerRef: any = null;
  let token: any = null;
  try {
    adminDb = getAdminDb();
    if (!adminDb) return res.status(503).json({ error: 'Administrator service is not configured.' });
    token = await readBearerToken(req);
    if (!token || !(await isSuperAdminToken(token))) return res.status(403).json({ error: 'Super Admin access required.' });
    if (!(await hasValidAppCheck(req))) return res.status(401).json({ error: 'App integrity check failed.' });
    if (!hasRecentAuthentication(token)) {
      return res.status(428).json({ error: 'Recent administrator authentication required. Sign out and sign in again before resetting test data.' });
    }
    if (!(await enforceRateLimit(adminDb, 'operational-reset:' + token.uid, 2, 60 * 60_000))) {
      return res.status(429).json({ error: 'Operational reset is rate limited. Please wait before retrying.' });
    }

    const confirmation = safeString(req.body?.confirmation, 80);
    if (confirmation !== 'RESET_OPERATIONS') {
      return res.status(400).json({ error: 'Exact reset confirmation is required.' });
    }

    markerRef = adminDb.collection('maintenance').doc(OPERATIONAL_RESET_MARKER);
    await adminDb.runTransaction(async (transaction: any) => {
      const markerSnap = await transaction.get(markerRef);
      const markerData = markerSnap.exists ? markerSnap.data() || {} : {};
      if (markerData.status === 'completed') {
        throw Object.assign(new Error('The one-time operational reset has already been completed. Future customer data is protected.'), { statusCode: 409 });
      }
      if (markerData.status === 'in_progress') {
        throw Object.assign(new Error('An operational reset is already in progress.'), { statusCode: 409 });
      }
      transaction.set(markerRef, {
        status: 'in_progress',
        startedAt: new Date().toISOString(),
        startedBy: token.uid
      }, { merge: true });
    });

    const deleted: Record<string, number> = {};
    for (const collectionName of OPERATIONAL_RESET_COLLECTIONS) {
      deleted[collectionName] = await deleteCollectionInBatches(adminDb, collectionName);
    }
    const deletedTotal = Object.values(deleted).reduce((sum, count) => sum + Number(count || 0), 0);
    const completedAt = new Date().toISOString();

    await markerRef.set({
      status: 'completed',
      completedAt,
      completedBy: token.uid,
      deleted,
      deletedTotal
    }, { merge: true });

    await writeAdminAudit(
      adminDb,
      token,
      'OPERATIONAL_TEST_DATA_RESET',
      'One-time production reset removed ' + deletedTotal + ' current order/support/restock and checkout-artifact records. Products, settings, users, staff, subscribers, and audit history were preserved.'
    );

    return res.json({
      success: true,
      resetCompleted: true,
      completedAt,
      deleted,
      deletedTotal
    });
  } catch (error: any) {
    if (markerRef && adminDb && Number(error?.statusCode) !== 409) {
      await markerRef.set({
        status: 'failed',
        failedAt: new Date().toISOString(),
        failedBy: token?.uid || null,
        error: safeString(error?.message, 240)
      }, { merge: true }).catch(() => undefined);
    }
    const status = Number(error?.statusCode) || 500;
    return res.status(status).json({
      error: safeString(error?.message, 240) || 'Unable to reset operational test data.'
    });
  }
});


const LEGACY_DEMO_PURGE_MARKER = 'legacy-demo-purge-20260906-v1';
const LEGACY_DEMO_CUTOFF_MS = Date.parse('2026-09-06T08:00:00.000Z');
const LEGACY_DEMO_ORDER_IDS = new Set([
  'SOX-20260904-8740',
  'SOX-20260903-3813',
  'SOX-20260903-7964',
  'SLX-85885',
  'SLX-56850',
  'SLX-79015',
  'ord-mtj0jv8w',
  'ord-mtizi1lr',
  'ord-1002',
  'ord-1001'
]);
const LEGACY_DEMO_ORDER_NUMBERS = new Set([
  'SOX-20260904-8740',
  'SOX-20260903-3813',
  'SOX-20260903-7964',
  'SLX-85885',
  'SLX-56850',
  'SLX-79015',
  'SLX-64984',
  'SLX-97200',
  'SLX-94822',
  'SLX-94821'
]);

function isLegacyDemoTimestamp(value: unknown) {
  // Unknown timestamps are never deleted by the legacy migration.
  if (!value) return false;
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) && parsed <= LEGACY_DEMO_CUTOFF_MS;
}

async function purgeLegacyDemoFixtures(adminDb: any, token: any) {
  const markerRef = adminDb.collection('maintenance').doc(LEGACY_DEMO_PURGE_MARKER);
  const markerSnap = await markerRef.get();
  const existing = markerSnap.exists ? markerSnap.data() || {} : {};
  if (existing.status === 'completed') {
    return {
      alreadyCompleted: true,
      deleted: existing.deleted || {},
      deletedTotal: Number(existing.deletedTotal || 0),
      completedAt: existing.completedAt || null
    };
  }

  await markerRef.set({
    status: 'in_progress',
    startedAt: new Date().toISOString(),
    startedBy: token.uid
  }, { merge: true });

  const deleted: Record<string, number> = {
    orders: 0,
    concierge_inquiries: 0,
    messages: 0,
    stock_notifications: 0,
    restock_dispatch_locks: 0,
    order_idempotency: 0,
    paypal_order_links: 0
  };

  const orderSnapshot = await adminDb.collection('orders').get();
  for (let offset = 0; offset < orderSnapshot.docs.length; offset += 400) {
    const slice = orderSnapshot.docs.slice(offset, offset + 400);
    const batch = adminDb.batch();
    let batchCount = 0;
    for (const docSnap of slice) {
      const data = docSnap.data() || {};
      const id = safeString(docSnap.id, 160);
      const orderNumber = safeString(data.orderNumber, 160);
      if (LEGACY_DEMO_ORDER_IDS.has(id) || LEGACY_DEMO_ORDER_NUMBERS.has(orderNumber)) {
        batch.delete(docSnap.ref);
        batchCount += 1;
      }
    }
    if (batchCount > 0) {
      await batch.commit();
      deleted.orders += batchCount;
    }
  }

  for (const collectionName of [
    'concierge_inquiries',
    'messages',
    'stock_notifications',
    'restock_dispatch_locks',
    'order_idempotency',
    'paypal_order_links'
  ] as const) {
    const snapshot = await adminDb.collection(collectionName).get();
    for (let offset = 0; offset < snapshot.docs.length; offset += 400) {
      const slice = snapshot.docs.slice(offset, offset + 400);
      const batch = adminDb.batch();
      let batchCount = 0;
      for (const docSnap of slice) {
        const data = docSnap.data() || {};
        const createdAt =
          data.createdAt ||
          data.updatedAt ||
          data.startedAt ||
          data.expiresAt ||
          data.timestamp ||
          null;
        if (isLegacyDemoTimestamp(createdAt)) {
          batch.delete(docSnap.ref);
          batchCount += 1;
        }
      }
      if (batchCount > 0) {
        await batch.commit();
        deleted[collectionName] += batchCount;
      }
    }
  }

  const deletedTotal = Object.values(deleted).reduce((sum, count) => sum + Number(count || 0), 0);
  const completedAt = new Date().toISOString();
  await markerRef.set({
    status: 'completed',
    completedAt,
    completedBy: token.uid,
    deleted,
    deletedTotal,
    cutoff: '2026-09-06T08:00:00.000Z'
  }, { merge: true });

  await writeAdminAudit(
    adminDb,
    token,
    'LEGACY_DEMO_FIXTURES_PURGED',
    'Purged ' + deletedTotal + ' pre-launch demo/test operational records using the fixed legacy cutoff and exact historical order identifiers. Future customer records are outside this migration.'
  );

  return { alreadyCompleted: false, deleted, deletedTotal, completedAt };
}

app.post('/api/admin/maintenance/purge-legacy-demo-fixtures', async (req, res) => {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) return res.status(503).json({ error: 'Administrator service is not configured.' });
    const token = await readBearerToken(req);
    if (!token || !(await isSuperAdminToken(token))) {
      return res.status(403).json({ error: 'Super Admin access required.' });
    }
    if (!(await hasValidAppCheck(req))) {
      return res.status(401).json({ error: 'App integrity check failed.' });
    }
    if (!hasRecentAuthentication(token)) {
      return res.status(428).json({ error: 'Recent administrator authentication required before legacy cleanup.' });
    }
    if (safeString(req.body?.confirmation, 80) !== 'RESET_OPERATIONS') {
      return res.status(400).json({ error: 'Exact legacy cleanup confirmation is required.' });
    }
    if (!(await enforceRateLimit(adminDb, 'legacy-demo-purge:' + token.uid, 4, 60 * 60_000))) {
      return res.status(429).json({ error: 'Legacy cleanup is rate limited. Please wait before retrying.' });
    }

    const result = await purgeLegacyDemoFixtures(adminDb, token);
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unable to purge legacy demo records.'
    });
  }
});

app.get('/api/admin/bootstrap', async (req, res) => {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) return res.status(503).json({ error: 'Administrator service is not configured.' });

    const token = await readBearerToken(req);
    const role = await getAdminRole(token);
    if (!token || !role) return res.status(403).json({ error: 'Administrator access required.' });
    if (!(await hasValidAppCheck(req))) return res.status(401).json({ error: 'App integrity check failed.' });
    if (!(await enforceRateLimit(adminDb, `admin-bootstrap:${token.uid}`, 30, 10 * 60_000))) {
      return res.status(429).json({ error: 'Too many administrator refresh requests. Please wait and retry.' });
    }

    const [ordersSnap, stockSnap, inquiriesSnap, staffSnap, auditSnap] = await Promise.all([
      adminDb.collection('orders').orderBy('createdAt', 'desc').limit(250).get(),
      adminDb.collection('stock_notifications').orderBy('createdAt', 'desc').limit(250).get(),
      adminDb.collection('concierge_inquiries').orderBy('createdAt', 'desc').limit(250).get(),
      adminDb.collection('staff').limit(250).get(),
      adminDb.collection('audit_logs').orderBy('timestamp', 'desc').limit(200).get()
    ]);

    const mapDocs = (snapshot: any) =>
      snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));

    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    return res.status(200).json({
      role,
      orders: mapDocs(ordersSnap),
      stockNotifications: mapDocs(stockSnap),
      messages: mapDocs(inquiriesSnap),
      staff: mapDocs(staffSnap),
      auditLogs: mapDocs(auditSnap)
    });
  } catch (error: any) {
    console.error('Admin bootstrap snapshot note:', safeString(error?.message, 240));
    return res.status(500).json({ error: 'Unable to load administrator data.' });
  }
});

app.get('/api/admin/health', async (req, res) => {
  try {
    const token = await readBearerToken(req);
    if (!token || !(await isSuperAdminToken(token))) return res.status(403).json({ error: 'Super Admin access required.' });
    if (!(await hasValidAppCheck(req))) return res.status(401).json({ error: 'App integrity check failed.' });
    return res.json({
      ok: true,
      firebaseAdminConfigured: Boolean(getAdminDb()),
      transactionalEmailConfigured: Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL),
      mediaStorageConfigured: true,
      mediaStorageProvider: 'firebase_storage',
      appCheckEnforced: isAppCheckEnforced(),
      abuseProtectionConfigured: true,
      payPalServerConfigured: Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET)
    });
  } catch {
    return res.status(500).json({ error: 'Unable to load administrator health status.' });
  }
});

function detectSupportedImageMime(buffer: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif' | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) return 'image/png';
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) return 'image/webp';
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 4, 8) === 'ftyp' &&
    ['avif', 'avis'].includes(buffer.toString('ascii', 8, 12))
  ) return 'image/avif';
  return null;
}

app.post('/api/media/upload', async (req, res) => {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) return res.status(503).json({ error: 'Media service is not configured.' });

    const token = await readBearerToken(req);
    if (!token || !(await isAdminToken(token))) return res.status(403).json({ error: 'Admin access required.' });
    if (!(await hasValidAppCheck(req))) return res.status(401).json({ error: 'App integrity check failed.' });
    if (!(await enforceRateLimit(adminDb, `media-upload:${token.uid}`, 40, 10 * 60_000))) {
      return res.status(429).json({ error: 'Too many image uploads. Please wait a few minutes and try again.' });
    }

    if (!hasOnlyKeys(req.body, ['kind', 'fileName', 'mimeType', 'dataBase64'])) {
      return res.status(400).json({ error: 'Invalid image upload request.' });
    }

    const kind = safeString(req.body?.kind, 30);
    if (!['products', 'settings'].includes(kind)) {
      return res.status(400).json({ error: 'Invalid media destination.' });
    }

    const claimedMime = safeString(req.body?.mimeType, 40).toLowerCase();
    const allowedMimes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
    if (!allowedMimes.has(claimedMime)) {
      return res.status(415).json({ error: 'Only JPEG, PNG, WebP, or AVIF images are supported.' });
    }

    const dataBase64 = typeof req.body?.dataBase64 === 'string' ? req.body.dataBase64 : '';
    if (!dataBase64 || dataBase64.length > 3_500_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(dataBase64)) {
      return res.status(413).json({ error: 'Prepared image is too large or invalid. Please choose a smaller image.' });
    }

    const buffer = Buffer.from(dataBase64, 'base64');
    if (!buffer.length || buffer.length > 2_600_000) {
      return res.status(413).json({ error: 'Prepared image exceeds the secure upload limit.' });
    }

    const detectedMime = detectSupportedImageMime(buffer);
    if (!detectedMime || detectedMime !== claimedMime) {
      return res.status(415).json({ error: 'Image file type could not be verified.' });
    }

    const requestedName = safeString(req.body?.fileName, 160)
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '') || `saelyxe-${Date.now()}`;
    const ext = detectedMime === 'image/jpeg' ? 'jpg' : detectedMime.split('/')[1];
    const baseName = requestedName.replace(/\.[^.]+$/, '').slice(0, 100) || `saelyxe-${Date.now()}`;
    const folder = kind === 'settings' ? 'saelyxe/settings' : 'saelyxe/products';
    const objectPath = `${folder}/${Date.now()}-${crypto.randomUUID()}-${baseName}.${ext}`;

    const bucketName =
      process.env.FIREBASE_STORAGE_BUCKET?.trim() ||
      process.env.VITE_FIREBASE_STORAGE_BUCKET?.trim() ||
      'gen-lang-client-0800900976.firebasestorage.app';

    const downloadToken = crypto.randomUUID();
    const bucket = getStorage().bucket(bucketName);
    const object = bucket.file(objectPath);

    await object.save(buffer, {
      resumable: false,
      validation: 'crc32c',
      metadata: {
        contentType: detectedMime,
        cacheControl: 'public,max-age=31536000,immutable',
        metadata: {
          firebaseStorageDownloadTokens: downloadToken,
          saelyxeUploadedBy: token.uid,
          saelyxeMediaKind: kind
        }
      }
    });

    const secureUrl =
      `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucketName)}/o/${encodeURIComponent(objectPath)}?alt=media&token=${encodeURIComponent(downloadToken)}`;

    return res.status(201).json({
      secureUrl,
      bytes: buffer.length,
      format: ext,
      storage: 'firebase'
    });
  } catch (error: any) {
    const code = safeString(error?.code, 120);
    const message = safeString(error?.message, 240);
    console.error('Firebase Storage admin media upload error:', code || message || 'unknown');

    if (
      code.toLowerCase().includes('permission') ||
      message.toLowerCase().includes('permission') ||
      message.toLowerCase().includes('billing')
    ) {
      return res.status(503).json({
        error: 'Firebase Media Storage is not available for this project yet. Check Storage access/billing and server permissions.'
      });
    }

    if (message.toLowerCase().includes('bucket') && message.toLowerCase().includes('not')) {
      return res.status(503).json({
        error: 'Firebase Media Storage bucket was not found for this project.'
      });
    }

    return res.status(500).json({ error: 'Unable to upload image right now.' });
  }
});

app.post('/api/newsletter', async (req, res) => {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) return res.status(503).json({ error: 'Newsletter service is not configured.' });

    if (!(await hasValidAppCheck(req))) {
      return res.status(401).json({ error: 'App integrity check failed. Please refresh and try again.' });
    }
    if (!(await enforceRateLimit(adminDb, `newsletter:${getClientAddress(req)}`, 10, 60 * 60_000))) {
      return res.status(429).json({ error: 'Too many subscription attempts. Please try again later.' });
    }

    const email = safeString(req.body?.email, 254).toLowerCase();
    if (!isEmail(email)) return res.status(400).json({ error: 'A valid email address is required.' });

    const subscriberId = crypto.createHash('sha256').update(email).digest('hex');
    await adminDb.collection('subscribers').doc(subscriberId).set({
      email,
      status: 'subscribed',
      updatedAt: new Date().toISOString(),
      serverUpdatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    return res.status(201).json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Unable to save newsletter subscription.' });
  }
});

app.post('/api/messages', async (req, res) => {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) return res.status(503).json({ error: 'Concierge service is not configured.' });

    if (!(await hasValidAppCheck(req))) {
      return res.status(401).json({ error: 'App integrity check failed. Please refresh and try again.' });
    }
    if (!(await enforceRateLimit(adminDb, `messages:${getClientAddress(req)}`, 5, 10 * 60_000))) {
      return res.status(429).json({ error: 'Too many messages were submitted. Please wait and try again.' });
    }

    const name = safeString(req.body?.name, 120);
    const email = safeString(req.body?.email, 254).toLowerCase();
    const phone = safeString(req.body?.phone, 30);
    const orderReference = safeString(req.body?.orderReference, 120);
    const message = safeString(req.body?.message, 5000);
    const allowedTopics = new Set(['order_inquiry', 'bespoke_sizing', 'concierge', 'press', 'authenticity', 'other']);
    const topic = safeString(req.body?.topic, 40);

    if (!name || !isEmail(email) || !message || !allowedTopics.has(topic)) {
      return res.status(400).json({ error: 'Valid name, email, topic, and message are required.' });
    }

    const ref = adminDb.collection('concierge_inquiries').doc();
    const record = {
      id: ref.id,
      name,
      email,
      phone: phone || '',
      topic,
      orderReference: orderReference || '',
      message,
      status: 'unread',
      createdAt: new Date().toISOString(),
      serverCreatedAt: FieldValue.serverTimestamp()
    };

    const batch = adminDb.batch();
    batch.set(ref, record);
    batch.set(adminDb.collection('messages').doc(ref.id), record);
    await batch.commit();

    return res.status(201).json({ ...record, serverCreatedAt: undefined });
  } catch {
    return res.status(500).json({ error: 'Unable to submit concierge message.' });
  }
});

app.post('/api/restock/subscribe', async (req, res) => {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) return res.status(503).json({ error: 'Restock service is not configured.' });

    if (!(await hasValidAppCheck(req))) {
      return res.status(401).json({ error: 'App integrity check failed. Please refresh and try again.' });
    }
    if (!(await enforceRateLimit(adminDb, `restock-subscribe:${getClientAddress(req)}`, 10, 10 * 60_000))) {
      return res.status(429).json({ error: 'Too many restock requests. Please wait and try again.' });
    }

    const productId = safeString(req.body?.productId, 100);
    const customerEmail = safeString(req.body?.customerEmail, 254).toLowerCase();
    const customerName = safeString(req.body?.customerName, 120);
    const phone = safeString(req.body?.phone, 30);
    const selectedSize = safeString(req.body?.selectedSize, 30);

    if (!productId || !isEmail(customerEmail)) {
      return res.status(400).json({ error: 'Valid product and email details are required.' });
    }

    const productSnap = await adminDb.collection('products').doc(productId).get();
    if (!productSnap.exists) return res.status(404).json({ error: 'Product not found.' });
    const product: any = { id: productSnap.id, ...productSnap.data() };

    const dedupeId = crypto.createHash('sha256')
      .update(`${productId}|${selectedSize.toLowerCase()}|${customerEmail}`)
      .digest('hex');

    const record = {
      id: dedupeId,
      productId,
      productTitle: safeString(product.title, 200),
      productSlug: safeString(product.slug, 160) || productId,
      productImage: Array.isArray(product.images) ? safeString(product.images[0], 1000) : '',
      selectedSize: selectedSize || 'Standard',
      customerEmail,
      customerName: customerName || '',
      phone: phone || '',
      channel: 'email',
      notified: false,
      status: 'pending',
      createdAt: new Date().toISOString(),
      serverCreatedAt: FieldValue.serverTimestamp()
    };

    await adminDb.collection('stock_notifications').doc(dedupeId).set(record, { merge: true });
    return res.status(201).json({ success: true, id: dedupeId });
  } catch {
    return res.status(500).json({ error: 'Unable to register restock notification.' });
  }
});

app.post('/api/admin/maintenance/purge-legacy-test-products', async (req, res) => {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) return res.status(503).json({ error: 'Administrator service is not configured.' });
    const token = await readBearerToken(req);
    if (!token || !(await isSuperAdminToken(token))) return res.status(403).json({ error: 'Super Admin access required.' });
    if (!(await hasValidAppCheck(req))) return res.status(401).json({ error: 'App integrity check failed.' });
    if (!hasRecentAuthentication(token)) {
      return res.status(428).json({ error: 'Recent administrator authentication required before legacy product cleanup.' });
    }
    if (!(await enforceRateLimit(adminDb, `legacy-test-products:${token.uid}`, 3, 60 * 60_000))) {
      return res.status(429).json({ error: 'Legacy product cleanup is rate limited.' });
    }
    if (safeString(req.body?.confirmation, 80) !== 'REMOVE_TEST_PRODUCTS') {
      return res.status(400).json({ error: 'Type REMOVE_TEST_PRODUCTS exactly to continue.' });
    }

    const markerRef = adminDb.collection('maintenance').doc(LEGACY_TEST_PRODUCTS_PURGE_MARKER);
    const markerSnap = await markerRef.get();
    if (markerSnap.exists && markerSnap.data()?.status === 'completed') {
      return res.json({ success: true, alreadyCompleted: true, deletedCount: Number(markerSnap.data()?.deletedCount || 0) });
    }

    const batch = adminDb.batch();
    let deletedCount = 0;
    for (const id of LEGACY_TEST_PRODUCT_IDS) {
      const ref = adminDb.collection('products').doc(id);
      const snap = await ref.get();
      if (!snap.exists) continue;
      const data: any = snap.data() || {};
      const testFingerprint = [data.title, data.slug, data.fabricDetails]
        .map(value => safeString(value, 240).toLowerCase())
        .join(' ');
      if (!testFingerprint.includes('test')) continue;
      batch.delete(ref);
      deletedCount += 1;
    }
    batch.set(markerRef, {
      status: 'completed',
      deletedCount,
      completedAt: new Date().toISOString(),
      completedBy: token.uid
    }, { merge: true });
    await batch.commit();
    await writeAdminAudit(adminDb, token, 'LEGACY_TEST_PRODUCTS_PURGED', `Removed ${deletedCount} exact pre-launch test product records.`);
    return res.json({ success: true, deletedCount });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to purge legacy test products.' });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    let products: any[];
    const adminDb = getAdminDb();

    if (adminDb) {
      const snapshot = await adminDb.collection('products').get();
      products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else {
      products = readStore().products;
    }

    products = products
      .filter(product => !LEGACY_TEST_PRODUCT_IDS.has(safeString(product.id, 120)))
      .map(product => {
        const stockCount = Math.max(0, Number(product.stockCount) || 0);
        return { ...product, stockCount, inStock: stockCount > 0 };
      });

    const category = safeString(req.query.category, 60);
    const search = safeString(req.query.search, 100).toLowerCase();

    if (category && category !== 'all') {
      products = category === 'new'
        ? products.filter(product => product.category === 'new' || product.badge?.includes('DROP') || product.badge?.includes('NEW'))
        : products.filter(product => product.category === category || product.subCategory?.toLowerCase() === category.toLowerCase());
    }

    if (search) {
      products = products.filter(product =>
        product.title?.toLowerCase().includes(search) ||
        product.subtitle?.toLowerCase().includes(search) ||
        product.description?.toLowerCase().includes(search)
      );
    }

    return res.json(products);
  } catch {
    return res.status(500).json({ error: 'Product data is unavailable.' });
  }
});

app.get('/api/products/:productId/reviews', async (req, res) => {
  try {
    const productId = safeString(req.params.productId, 120);
    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required.' });
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      return res.json({ reviews: [], count: 0, averageRating: 0 });
    }

    const snapshot = await adminDb.collection('reviews')
      .where('productId', '==', productId)
      .get();

    const reviews = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        productId: safeString(data.productId, 120),
        author: safeString(data.author, 60) || 'Verified Patron',
        rating: Math.max(1, Math.min(5, Math.round(Number(data.rating) || 5))),
        comment: safeString(data.comment, 2000),
        date: safeString(data.date, 30) || 'Recently',
        verified: Boolean(data.verifiedPurchase),
        createdAt: safeString(data.createdAt, 60) || new Date().toISOString()
      };
    });

    // Sort newest first
    reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const count = reviews.length;
    const averageRating = count > 0
      ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / count).toFixed(1))
      : 0;

    return res.json({ reviews, count, averageRating });
  } catch (err) {
    console.error('Error fetching reviews:', err);
    return res.status(500).json({ error: 'Failed to retrieve customer reviews.' });
  }
});

app.post('/api/products/:productId/reviews', async (req, res) => {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) {
      return res.status(503).json({ error: 'Review database service is unavailable.' });
    }

    const authToken = await readBearerToken(req);
    if (!authToken) {
      return res.status(401).json({ error: 'Please sign in to your patron account to submit a review.' });
    }

    if (!(await hasValidAppCheck(req))) {
      return res.status(401).json({ error: 'App integrity check failed. Please refresh and try again.' });
    }

    const productId = safeString(req.params.productId, 120);
    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required.' });
    }

    // Rate limiting: max 5 reviews per 10 minutes per authenticated customer
    if (!(await enforceRateLimit(adminDb, `reviews:${authToken.uid}`, 5, 10 * 60_000))) {
      return res.status(429).json({ error: 'Too many reviews submitted. Please wait a few minutes before submitting again.' });
    }

    const body = req.body || {};
    const ratingNum = Math.round(Number(body.rating));
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ error: 'Rating must be an integer between 1 and 5.' });
    }

    const comment = safeString(body.comment, 1500);
    if (!comment || comment.length < 3) {
      return res.status(400).json({ error: 'Review text must be at least 3 characters long.' });
    }

    // Server-derived author name: derive strictly from Firestore users/{uid}.name (or firstName/lastName),
    // fallback to Firebase token display name, fallback to "SAELYXE Patron".
    // Do NOT trust body.author, and never leak email, phone, address, or order number.
    let authorName = 'SAELYXE Patron';
    try {
      const userSnap = await adminDb.collection('users').doc(authToken.uid).get();
      if (userSnap.exists) {
        const userData = userSnap.data() || {};
        const profileName = safeString(userData.name, 50);
        const firstLast = [safeString(userData.firstName, 40), safeString(userData.lastName, 40)].filter(Boolean).join(' ').trim();
        if (profileName) {
          authorName = profileName;
        } else if (firstLast) {
          authorName = firstLast;
        }
      }
    } catch {
      // Fallback
    }

    if (authorName === 'SAELYXE Patron' && typeof authToken.name === 'string' && authToken.name.trim()) {
      authorName = safeString(authToken.name.trim(), 50);
    }

    // Prevent duplicate review spam for the same customer/product
    const existingSnap = await adminDb.collection('reviews')
      .where('productId', '==', productId)
      .where('userId', '==', authToken.uid)
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      return res.status(409).json({ error: 'You have already submitted a review for this silhouette.' });
    }

    // Server-side strict purchase verification:
    // Check if the authenticated customer has a verified, non-cancelled order containing this exact product
    let verifiedPurchase = false;
    let matchedOrderId: string | null = null;

    const ordersSnap = await adminDb.collection('orders')
      .where('userId', '==', authToken.uid)
      .get();

    for (const orderDoc of ordersSnap.docs) {
      const orderData = orderDoc.data() || {};
      const status = safeString(orderData.status, 30).toLowerCase();
      const paymentMethod = safeString(orderData.paymentMethod, 30).toLowerCase();
      const paymentStatus = safeString(orderData.paymentStatus, 30).toLowerCase();

      if (status === 'cancelled') continue;

      const items = Array.isArray(orderData.items) ? orderData.items : [];
      const hasExactProduct = items.some((item: any) => safeString(item?.productId, 120) === productId);
      if (!hasExactProduct) continue;

      let isPaidAndVerified = false;
      if ((paymentMethod === 'paypal' || paymentMethod === 'payzy') && paymentStatus === 'verified') {
        isPaidAndVerified = true;
      } else if (paymentMethod === 'cod' && (paymentStatus === 'cod_collected' || status === 'delivered')) {
        isPaidAndVerified = true;
      }

      if (isPaidAndVerified) {
        verifiedPurchase = true;
        matchedOrderId = orderDoc.id;
        break;
      }
    }

    const reviewId = `rev-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

    const reviewRecord = {
      id: reviewId,
      productId,
      userId: authToken.uid,
      author: authorName,
      rating: ratingNum,
      comment,
      verifiedPurchase,
      verifiedOrderId: matchedOrderId, // Stored internally for audit; never exposed in public responses
      createdAt: now.toISOString(),
      date: dateStr
    };

    await adminDb.collection('reviews').doc(reviewId).set(reviewRecord);

    return res.status(201).json({
      success: true,
      review: {
        id: reviewId,
        productId,
        author: authorName,
        rating: ratingNum,
        comment,
        date: dateStr,
        verified: verifiedPurchase,
        createdAt: reviewRecord.createdAt
      }
    });
  } catch (err) {
    console.error('Error saving review:', err);
    return res.status(500).json({ error: 'Unable to submit review. Please try again later.' });
  }
});

app.delete('/api/products/:productId/reviews/:reviewId', async (req, res) => {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) {
      return res.status(503).json({ error: 'Review database service is unavailable.' });
    }

    const authToken = await readBearerToken(req);
    if (!authToken) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!(await hasValidAppCheck(req))) {
      return res.status(401).json({ error: 'App integrity check failed.' });
    }

    if (!(await enforceRateLimit(adminDb, `review-delete:${authToken.uid}`, 10, 10 * 60_000))) {
      return res.status(429).json({ error: 'Too many review delete attempts. Please wait a few moments.' });
    }

    const reviewId = safeString(req.params.reviewId, 120);
    const reviewRef = adminDb.collection('reviews').doc(reviewId);
    const reviewSnap = await reviewRef.get();

    if (!reviewSnap.exists) {
      return res.status(404).json({ error: 'Review not found.' });
    }

    const reviewData = reviewSnap.data() || {};
    const isAdmin = await isAdminToken(authToken);
    const isOwner = reviewData.userId === authToken.uid;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'You are not authorized to delete this review.' });
    }

    await reviewRef.delete();
    return res.json({ success: true, message: 'Review successfully removed.' });
  } catch (err) {
    console.error('Error deleting review:', err);
    return res.status(500).json({ error: 'Unable to delete review.' });
  }
});

app.post('/api/promo/validate', async (req, res) => {
  try {
    const adminDb = getAdminDb();
    if (adminDb) {
      const clientIp = getClientAddress(req);
      if (!(await enforceRateLimit(adminDb, `promo-validate:${clientIp}`, 30, 10 * 60_000))) {
        return res.status(429).json({ valid: false, error: 'Too many requests. Please wait a few moments.' });
      }
    }

    const code = safeString(req.body?.code, 40);
    const subtotalLKR = Number(req.body?.subtotalLKR);
    if (!code || !Number.isFinite(subtotalLKR) || subtotalLKR <= 0) {
      return res.status(400).json({ valid: false, message: 'Invalid promo code or subtotal.' });
    }

    const promo = calculateDiscount(code, subtotalLKR);
    if (!promo.code || promo.discountLKR <= 0) {
      return res.json({ valid: false, message: 'Invalid promo code.' });
    }

    return res.json({
      valid: true,
      code: promo.code,
      discountLKR: promo.discountLKR,
      message: 'Promo code applied.'
    });
  } catch {
    return res.status(500).json({ valid: false, message: 'Unable to validate promo code.' });
  }
});

app.get('/api/settings', async (_req, res) => {
  try {
    const adminDb = getAdminDb();
    if (adminDb) {
      const doc = await adminDb.collection('settings').doc('drop_config').get();
      if (doc.exists) return res.json(doc.data());
    }
    return res.json(readStore().settings);
  } catch {
    return res.status(500).json({ error: 'Store settings are unavailable.' });
  }
});

app.get('/api/currencies', (_req, res) => {
  res.json(CURRENCIES);
});

app.get('/api/preview/order-email', (req, res) => {
  const view = safeString(req.query.view, 30) || 'confirmation';
  const logo = safeString(req.query.logo, 20) || 'noir';
  const bg = safeString(req.query.bg, 20) || 'wall'; // 'wall' | 'champagne'
  const icon = safeString(req.query.icon, 20) || 'gold'; // 'gold' (freestanding raw icon) | 'plaque' | 'seal' | 'none'
  const isDispatched = view === 'dispatched';
  const isDelivered = view === 'delivered';
  const isOnline = view === 'online';

  const sampleOrder = {
    _isEmailPreview: true,
    logoVariant: logo,
    iconVariant: icon,
    headerBgVariant: bg,
    id: 'SX-2026-8891',
    orderNumber: 'SX-2026-8891',
    customerName: 'Kavindu Perera',
    email: 'kavindu@example.com',
    paymentMethod: isOnline ? 'paypal' : 'cod',
    paymentStatus: isOnline ? 'verified' : 'pending',
    createdAt: new Date().toISOString(),
    trackingNumber: isDispatched || isDelivered ? 'FDX-794820194821' : undefined,
    courierName: isDispatched || isDelivered ? 'FedEx International Priority' : undefined,
    deliveryEta: isDispatched ? '3–5 business days' : undefined,
    items: [
      {
        title: 'SAELYXE ARCHITECTURAL HEAVYWEIGHT HOODIE',
        size: 'L',
        quantity: 1,
        priceLKR: 18500,
        image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=300&q=80'
      },
      {
        title: 'MONOLITH HEAVYWEIGHT TEE — NOIR',
        size: 'M',
        quantity: 1,
        priceLKR: 8500,
        image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=300&q=80'
      }
    ],
    subtotalLKR: 27000,
    shippingLKR: 0,
    discountLKR: 0,
    totalLKR: 27000,
    address: 'No. 42, Ward Place',
    city: 'Colombo 07',
    postalCode: '00700',
    country: 'Sri Lanka'
  };

  let eyebrow = 'Order received';
  let heading = 'Order summary';
  let intro = isOnline
    ? 'Thank you for choosing SAELYXE. Your payment has been verified and your order has been recorded securely.'
    : 'Thank you for choosing SAELYXE. Your order has been recorded and payment will be collected on delivery.';
  let logistics: string | undefined = undefined;

  if (isDispatched) {
    eyebrow = 'Order update';
    heading = 'Order dispatched';
    intro = 'Your order has been handed to FedEx International Priority. Your real courier and tracking details are included below.';
    logistics = [
      '<tr><td style="padding:24px 34px 0">',
      '<div style="padding-bottom:10px;border-bottom:1px solid #ded7ce;font-size:11px;letter-spacing:.16em;text-transform:uppercase;font-weight:800;color:#1b1815">Delivery details</div>',
      '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:10px;font-size:13px">',
      `<tr><td style="padding:5px 0;color:#8a7f73">Courier</td><td align="right" style="padding:5px 0;font-weight:700;color:#1b1815">FedEx International Priority</td></tr>`,
      `<tr><td style="padding:5px 0;color:#8a7f73">Tracking number</td><td align="right" style="padding:5px 0;font-family:monospace;font-weight:700;color:#1b1815">FDX-794820194821</td></tr>`,
      `<tr><td style="padding:5px 0;color:#8a7f73">Estimated delivery</td><td align="right" style="padding:5px 0;font-weight:700;color:#1b1815">3–5 business days</td></tr>`,
      '</table>',
      '</td></tr>'
    ].join('');
  } else if (isDelivered) {
    eyebrow = 'Order update';
    heading = 'Order delivered';
    intro = 'Your SAELYXE order has been marked as delivered. Thank you for choosing SAELYXE.';
  }

  const rawHtml = buildSaelyxeOrderEmail({
    order: sampleOrder,
    eyebrow,
    heading,
    intro,
    logistics
  });

  const previewBanner = `
  <div style="background:#faf6f0;color:#2c251f;padding:10px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:11.5px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;border-bottom:1px solid #e2d7c7;box-shadow:0 1px 4px rgba(0,0,0,0.03);">
    <div style="display:flex;align-items:center;gap:8px;">
      <strong style="text-transform:uppercase;letter-spacing:0.12em;font-size:10.5px;color:#8a7457;">SAELYXE Order Email Preview</strong>
      <span style="background:#f0e9df;color:#7a6b5c;padding:2px 8px;border-radius:9999px;font-size:10px;font-weight:600;">Customer View</span>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
      <span style="font-size:10.5px;color:#8a7e73;font-weight:600;margin-right:2px;">TOP BAR BG:</span>
      <a href="?view=${encodeURIComponent(view)}&logo=${encodeURIComponent(logo)}&icon=${encodeURIComponent(icon)}&bg=wall" style="color:${bg === 'wall' ? '#ffffff;background:#b88e3e;font-weight:600' : '#6b5f50;background:#efe8de'};padding:3px 9px;border-radius:9999px;text-decoration:none;font-size:11px;">Luxury Wall (Icon BG)</a>
      <a href="?view=${encodeURIComponent(view)}&logo=${encodeURIComponent(logo)}&icon=${encodeURIComponent(icon)}&bg=champagne" style="color:${bg === 'champagne' ? '#ffffff;background:#b88e3e;font-weight:600' : '#6b5f50;background:#efe8de'};padding:3px 9px;border-radius:9999px;text-decoration:none;font-size:11px;">Champagne Tint</a>
      <span style="border-left:1px solid #d8ccbd;height:14px;margin:0 4px;"></span>
      <span style="font-size:10.5px;color:#8a7e73;font-weight:600;margin-right:2px;">ICON:</span>
      <a href="?view=${encodeURIComponent(view)}&logo=${encodeURIComponent(logo)}&bg=${encodeURIComponent(bg)}&icon=gold" style="color:${icon === 'gold' ? '#ffffff;background:#b88e3e;font-weight:600' : '#6b5f50;background:#efe8de'};padding:3px 9px;border-radius:9999px;text-decoration:none;font-size:11px;">Raw Icon (No Circle)</a>
      <a href="?view=${encodeURIComponent(view)}&logo=${encodeURIComponent(logo)}&bg=${encodeURIComponent(bg)}&icon=plaque" style="color:${icon === 'plaque' ? '#ffffff;background:#b88e3e;font-weight:600' : '#6b5f50;background:#efe8de'};padding:3px 9px;border-radius:9999px;text-decoration:none;font-size:11px;">Gold Plaque</a>
      <a href="?view=${encodeURIComponent(view)}&logo=${encodeURIComponent(logo)}&bg=${encodeURIComponent(bg)}&icon=seal" style="color:${icon === 'seal' ? '#ffffff;background:#b88e3e;font-weight:600' : '#6b5f50;background:#efe8de'};padding:3px 9px;border-radius:9999px;text-decoration:none;font-size:11px;">Round Seal</a>
      <a href="?view=${encodeURIComponent(view)}&logo=${encodeURIComponent(logo)}&bg=${encodeURIComponent(bg)}&icon=none" style="color:${icon === 'none' ? '#ffffff;background:#b88e3e;font-weight:600' : '#6b5f50;background:#efe8de'};padding:3px 9px;border-radius:9999px;text-decoration:none;font-size:11px;">No Icon</a>
      <span style="border-left:1px solid #d8ccbd;height:14px;margin:0 4px;"></span>
      <span style="font-size:10.5px;color:#8a7e73;font-weight:600;margin-right:2px;">WORDMARK:</span>
      <a href="?view=${encodeURIComponent(view)}&bg=${encodeURIComponent(bg)}&icon=${encodeURIComponent(icon)}&logo=noir" style="color:${logo !== 'gold' ? '#ffffff;background:#1c1916;font-weight:600' : '#6b5f50;background:#efe8de'};padding:3px 9px;border-radius:9999px;text-decoration:none;font-size:11px;">Noir</a>
      <a href="?view=${encodeURIComponent(view)}&bg=${encodeURIComponent(bg)}&icon=${encodeURIComponent(icon)}&logo=gold" style="color:${logo === 'gold' ? '#ffffff;background:#b88e3e;font-weight:600' : '#6b5f50;background:#efe8de'};padding:3px 9px;border-radius:9999px;text-decoration:none;font-size:11px;">Gold</a>
      <span style="border-left:1px solid #d8ccbd;height:14px;margin:0 4px;"></span>
      <a href="?view=confirmation&bg=${encodeURIComponent(bg)}&icon=${encodeURIComponent(icon)}&logo=${encodeURIComponent(logo)}" style="color:${!isDispatched && !isDelivered && !isOnline ? '#ffffff;background:#b88e3e;font-weight:600' : '#6b5f50;background:#efe8de'};padding:4px 10px;border-radius:9999px;text-decoration:none;font-size:11px;">1. Received</a>
      <a href="?view=online&bg=${encodeURIComponent(bg)}&icon=${encodeURIComponent(icon)}&logo=${encodeURIComponent(logo)}" style="color:${isOnline ? '#ffffff;background:#b88e3e;font-weight:600' : '#6b5f50;background:#efe8de'};padding:4px 10px;border-radius:9999px;text-decoration:none;font-size:11px;">2. Paid</a>
      <a href="?view=dispatched&bg=${encodeURIComponent(bg)}&icon=${encodeURIComponent(icon)}&logo=${encodeURIComponent(logo)}" style="color:${isDispatched ? '#ffffff;background:#b88e3e;font-weight:600' : '#6b5f50;background:#efe8de'};padding:4px 10px;border-radius:9999px;text-decoration:none;font-size:11px;">3. Dispatched</a>
      <a href="?view=delivered&bg=${encodeURIComponent(bg)}&icon=${encodeURIComponent(icon)}&logo=${encodeURIComponent(logo)}" style="color:${isDelivered ? '#ffffff;background:#b88e3e;font-weight:600' : '#6b5f50;background:#efe8de'};padding:4px 10px;border-radius:9999px;text-decoration:none;font-size:11px;">4. Delivered</a>
    </div>
  </div>`;

  const finalHtml = rawHtml.includes('<body')
    ? rawHtml.replace(/<body[^>]*>/i, (m) => m + previewBanner)
    : previewBanner + rawHtml;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(finalHtml);
});

app.get('/api/preview/admin-email', (req, res) => {
  const isOnline = req.query.payment === 'online';
  const sampleOrder = {
    _isEmailPreview: true,
    id: 'SX-2026-9042',
    orderNumber: 'SX-2026-9042',
    customerName: 'Kavindu Perera',
    email: 'kavindu@example.com',
    phone: '077 123 4567',
    paymentMethod: isOnline ? 'paypal' : 'cod',
    paymentStatus: isOnline ? 'verified' : 'pending',
    createdAt: new Date().toISOString(),
    items: [
      {
        title: 'SAELYXE ARCHITECTURAL HEAVYWEIGHT HOODIE',
        size: 'L',
        quantity: 1,
        priceLKR: 18500,
        image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=300&q=80'
      },
      {
        title: 'MONOLITH HEAVYWEIGHT TEE — NOIR',
        size: 'M',
        quantity: 1,
        priceLKR: 8500,
        image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=300&q=80'
      }
    ],
    subtotalLKR: 27000,
    shippingLKR: 0,
    discountLKR: 0,
    totalLKR: 27000,
    address: 'No. 42, Ward Place',
    city: 'Colombo 07',
    postalCode: '00700',
    country: 'Sri Lanka'
  };

  const rawHtml = buildSaelyxeAdminNewOrderEmail(sampleOrder);
  const previewBanner = `
  <div style="background:#1c1916;color:#ffffff;padding:10px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;border-bottom:1px solid #332d27;">
    <div style="display:flex;align-items:center;gap:8px;">
      <strong style="color:#d4af37;text-transform:uppercase;letter-spacing:0.12em;font-size:11px;">SAELYXE Admin New Order Alert Preview</strong>
      <span style="background:#2e2822;color:#d4af37;padding:2px 8px;border-radius:9999px;font-size:10px;font-weight:700;">Owner View</span>
    </div>
    <div style="display:flex;gap:8px;align-items:center;">
      <a href="?payment=cod" style="color:${!isOnline ? '#141210;background:#d4af37;font-weight:700' : '#d4af37;background:#2e2822'};padding:4px 10px;border-radius:9999px;text-decoration:none;font-size:11px;">Cash on Delivery</a>
      <a href="?payment=online" style="color:${isOnline ? '#141210;background:#d4af37;font-weight:700' : '#d4af37;background:#2e2822'};padding:4px 10px;border-radius:9999px;text-decoration:none;font-size:11px;">Online / Card</a>
      <a href="/api/preview/order-email" style="color:#a89985;padding:4px 10px;text-decoration:none;font-size:11px;">&larr; Switch to Customer View</a>
    </div>
  </div>`;

  const finalHtml = rawHtml.includes('<body')
    ? rawHtml.replace(/<body[^>]*>/i, (m) => m + previewBanner)
    : previewBanner + rawHtml;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(finalHtml);
});


app.get('/api/payments/config', (_req, res) => {
  const payPalClientId = process.env.PAYPAL_CLIENT_ID || '';
  const payPalServerConfigured = Boolean(payPalClientId && process.env.PAYPAL_CLIENT_SECRET);
  const payzy = getPayzyConfig();

  return res.json({
    version: '20260911-v4-txfix',
    appCheckEnforced: isAppCheckEnforced(),
    paypal: {
      enabled: payPalServerConfigured,
      clientId: payPalServerConfigured ? payPalClientId : '',
      mode: process.env.PAYPAL_MODE === 'live' ? 'live' : 'sandbox'
    },
    payzy: {
      enabled: payzy.configured && process.env.PAYZY_UI_ENABLED !== 'false',
      configured: payzy.configured,
      mode: payzy.mode,
      testAmountLKR: payzy.mode === 'sandbox' ? payzy.sandboxTestAmountLKR : null
    }
  });
});

app.post('/api/payments/payzy/create/:orderId', async (req, res) => {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) return res.status(503).json({ error: 'Payment service is not configured.' });
    if (!(await hasValidAppCheck(req))) return res.status(401).json({ error: 'App integrity check failed.' });
    const orderId = safeString(req.params.orderId, 120);
    const config = getPayzyConfig();
    if (!config.configured) return res.status(503).json({ error: 'Payzy server credentials are not configured yet.' });
    const ref = adminDb.collection('orders').doc(orderId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Order not found.' });
    const order: any = { id: snap.id, ...snap.data() };
    const access = await authorizeCustomerOrderAccess(req, adminDb, order);
    if (!access) return res.status(404).json({ error: 'Order not found.' });
    if (!(await enforceRateLimit(adminDb, `payzy-create:${access.rateKey}:${orderId}`, 6, 10 * 60_000))) return res.status(429).json({ error: 'Too many Payzy payment attempts. Please wait and retry.' });
    if (order.paymentMethod !== 'payzy') return res.status(400).json({ error: 'This order is not a Payzy order.' });
    if (order.paymentStatus === 'verified') return res.status(409).json({ error: 'Payment is already verified.' });
    if (order.status === 'cancelled' && order.payzySandboxVerified !== true) return res.status(409).json({ error: 'Cancelled orders cannot start a new Payzy payment.' });
    if (safeString(order.country, 80).toLowerCase() !== 'sri lanka') return res.status(400).json({ error: 'Payzy is currently available only for Sri Lankan delivery addresses.' });
    const signedData = buildPayzySignedData(order, config);
    const started = await requestPayzyCheckout(signedData, config);
    const now = new Date().toISOString();
    const guardRef = adminDb.collection('payzy_order_links').doc(orderId);
    await Promise.all([
      ref.update({
        paymentProviderReference: `payzy:${safeString(order.orderNumber || order.id, 120)}`,
        paymentStatus: 'pending_verification',
        paymentVerificationSource: 'payzy_server_created',
        paymentVerificationError: FieldValue.delete(),
        paymentUpdatedAt: now,
        payzyMode: config.mode,
        payzyExpectedAmountLKR: Number(signedData.x_amount),
        payzyCheckoutInitiatedAt: now,
        payzyRequestSignatureVariant: started.signatureVariant,
        payzySandboxVerified: false
      }),
      guardRef.set({
        orderId,
        orderNumber: safeString(order.orderNumber || order.id, 120),
        userId: order.userId,
        mode: config.mode,
        signedData,
        requestSignature: started.requestSignature,
        checkoutUrl: started.checkoutUrl,
        createdAt: now,
        serverCreatedAt: FieldValue.serverTimestamp()
      }, { merge: true })
    ]);
    const updated = await ref.get();
    return res.json({ checkoutUrl: started.checkoutUrl, mode: config.mode, testAmountLKR: config.mode === 'sandbox' ? config.sandboxTestAmountLKR : null, order: stripInternalPayzyOrderFields({ id: updated.id, ...updated.data() }) });
  } catch (error: any) {
    const status = Number(error?.statusCode) || 502;
    return res.status(status).json({ error: safeString(error?.message, 240) || 'Unable to start Payzy checkout.' });
  }
});

app.get('/api/payments/payzy/status/:orderId', async (req, res) => {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) return res.status(503).json({ error: 'Payment service is not configured.' });
    if (!(await hasValidAppCheck(req))) return res.status(401).json({ error: 'App integrity check failed.' });
    const orderId = safeString(req.params.orderId, 120);
    const snap = await adminDb.collection('orders').doc(orderId).get();
    if (!snap.exists) return res.status(404).json({ error: 'Order not found.' });
    const order: any = { id: snap.id, ...snap.data() };
    const access = await authorizeCustomerOrderAccess(req, adminDb, order);
    if (!access) return res.status(404).json({ error: 'Order not found.' });
    if (!(await enforceRateLimit(adminDb, `payzy-status:${access.rateKey}:${orderId}`, 30, 10 * 60_000))) return res.status(429).json({ error: 'Too many Payzy status checks. Please wait and retry.' });
    if (order.paymentMethod !== 'payzy') return res.status(400).json({ error: 'This order is not a Payzy order.' });
    return res.json(stripInternalPayzyOrderFields(order));
  } catch {
    return res.status(500).json({ error: 'Unable to load Payzy payment status.' });
  }
});

app.get('/api/payments/payzy/return', async (req, res) => {
  const config = getPayzyConfig();
  const fallbackSite = config.siteUrl || 'https://www.saelyxe.com';
  const orderId = safeString(req.query.x_order_id, 120);
  const responseCode = safeString(req.query.response_code, 20);
  const signature = safeString(req.query.signature, 500).replace(/\s/g, '+');
  const redirect = (state: 'success' | 'sandbox-success' | 'failed' | 'error') => {
    const url = new URL('/secure-order-session', fallbackSite);
    url.searchParams.set('payzy', state);
    if (orderId) url.searchParams.set('orderId', orderId);
    return res.redirect(303, url.toString());
  };
  try {
    const adminDb = getAdminDb();
    if (!adminDb || !config.configured || !orderId || !responseCode || !signature) return redirect('error');
    const clientIp = getClientAddress(req);
    if (!(await enforceRateLimit(adminDb, `payzy-return:${clientIp}:${orderId}`, 30, 10 * 60_000))) return redirect('error');
    const ref = adminDb.collection('orders').doc(orderId);
    const guardRef = adminDb.collection('payzy_order_links').doc(orderId);
    const [snap, guardSnap] = await Promise.all([ref.get(), guardRef.get()]);
    if (!snap.exists || !guardSnap.exists) return redirect('error');
    const order: any = { id: snap.id, ...snap.data() };
    if (order.paymentMethod !== 'payzy') return redirect('error');
    const signedData = guardSnap.data()?.signedData as PayzySignedData | undefined;
    if (!signedData || !hasOnlyKeys(signedData, PAYZY_REQUEST_SIGNED_FIELDS)) {
      await ref.set({ paymentVerificationSource: 'payzy_signed_callback', paymentVerificationError: 'missing_signed_request_snapshot', paymentUpdatedAt: new Date().toISOString() }, { merge: true });
      return redirect('error');
    }
    if (!verifyPayzyReturnSignature(responseCode, signature, signedData, config.secretKey)) {
      await ref.set({ paymentVerificationSource: 'payzy_signed_callback', paymentVerificationError: 'signature_mismatch', paymentUpdatedAt: new Date().toISOString(), payzyResponseCode: responseCode, payzyReturnedAt: new Date().toISOString() }, { merge: true });
      return redirect('error');
    }
    if (responseCode !== '00') {
      await ref.set({ paymentStatus: 'failed', paymentVerificationSource: 'payzy_signed_callback', paymentVerificationError: `response_code_${responseCode}`, paymentUpdatedAt: new Date().toISOString(), payzyResponseCode: responseCode, payzyReturnedAt: new Date().toISOString() }, { merge: true });
      return redirect('failed');
    }
    const payzyMode = safeString(order.payzyMode, 20) === 'live' ? 'live' : 'sandbox';
    if (payzyMode === 'sandbox') {
      await markPayzySandboxVerified(adminDb, orderId, responseCode);
      return redirect('sandbox-success');
    }
    const updated = await markPayzyLiveVerified(adminDb, orderId, responseCode);
    await ensureOrderConfirmationEmail(adminDb, updated);
    return redirect('success');
  } catch (error) {
    console.error('Payzy return verification error:', error);
    return redirect('error');
  }
});

app.get('/api/payments/paypal/status', async (req, res) => {
  const adminDb = getAdminDb();
  if (!adminDb) return res.status(503).json({ error: 'Payment service is not configured.' });

  const token = await readBearerToken(req);
  if (!token || !(await isSuperAdminToken(token))) {
    return res.status(403).json({ error: 'Super Admin access required.' });
  }
  if (!(await hasValidAppCheck(req))) {
    return res.status(401).json({ error: 'App integrity check failed.' });
  }
  if (!(await enforceRateLimit(adminDb, `paypal-health:${token.uid}`, 12, 10 * 60_000))) {
    return res.status(429).json({ error: 'Payment diagnostics are rate limited. Please wait and retry.' });
  }

  const clientId = process.env.PAYPAL_CLIENT_ID || '';
  const configured = Boolean(clientId && process.env.PAYPAL_CLIENT_SECRET);
  const mode = process.env.PAYPAL_MODE === 'live' ? 'live' : 'sandbox';
  if (!configured) {
    return res.status(503).json({ configured: false, mode, apiReachable: false, sdkReachable: false });
  }

  try {
    const [access, sdkResponse] = await Promise.all([
      getPayPalAccessToken(),
      fetch(`https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture`, {
        headers: { 'User-Agent': 'SAELYXE-PayPal-Health/1.0' }
      }).catch(() => null)
    ]);

    const apiReachable = Boolean(access);
    const sdkReachable = Boolean(sdkResponse?.ok);
    return res.status(apiReachable && sdkReachable ? 200 : 502).json({
      configured: true,
      mode,
      apiReachable,
      sdkReachable
    });
  } catch {
    return res.status(502).json({ configured: true, mode, apiReachable: false, sdkReachable: false });
  }
});

app.post('/api/payments/paypal/create/:orderId', async (req, res) => {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) return res.status(503).json({ error: 'Payment service is not configured.' });

    if (!(await hasValidAppCheck(req))) {
      return res.status(401).json({ error: 'App integrity check failed.' });
    }

    const orderId = safeString(req.params.orderId, 120);
    const ref = adminDb.collection('orders').doc(orderId);
    const initialSnap = await ref.get();
    if (!initialSnap.exists) return res.status(404).json({ error: 'Order not found.' });
    const initialOrder: any = { id: initialSnap.id, ...initialSnap.data() };
    const access = await authorizeCustomerOrderAccess(req, adminDb, initialOrder);
    if (!access) return res.status(404).json({ error: 'Order not found.' });
    if (!(await enforceRateLimit(adminDb, `paypal-create:${access.rateKey}:${orderId}`, 6, 10 * 60_000))) {
      return res.status(429).json({ error: 'Too many PayPal payment attempts. Please wait and try again.' });
    }
    if (initialOrder.paymentMethod !== 'paypal') {
      return res.status(400).json({ error: 'This order is not a PayPal order.' });
    }
    if (initialOrder.paymentStatus === 'verified') {
      return res.status(409).json({ error: 'Payment is already verified.' });
    }
    if (initialOrder.status === 'cancelled') {
      return res.status(409).json({ error: 'Cancelled orders cannot start a new PayPal payment.' });
    }

    let paypalOrderId = safeString(initialOrder.paymentProviderReference, 160);
    let providerStatus = '';

    if (!paypalOrderId) {
      const created = await createPayPalProviderOrder(initialOrder);
      paypalOrderId = created.paypalOrderId;
      providerStatus = created.providerStatus;
    }

    const guardRef = adminDb.collection('paypal_order_links').doc(paypalOrderId);
    const now = new Date().toISOString();

    await adminDb.runTransaction(async transaction => {
      const orderSnap = await transaction.get(ref);
      const guardSnap = await transaction.get(guardRef);
      if (!orderSnap.exists) throw Object.assign(new Error('Order not found.'), { statusCode: 404 });

      const current: any = { id: orderSnap.id, ...orderSnap.data() };
      if (!customerOrderAccessStillMatches(current, access)) {
        throw Object.assign(new Error('Order access denied.'), { statusCode: 403 });
      }
      if (current.paymentMethod !== 'paypal') {
        throw Object.assign(new Error('This order is not a PayPal order.'), { statusCode: 400 });
      }
      if (current.paymentStatus === 'verified') {
        throw Object.assign(new Error('Payment is already verified.'), { statusCode: 409 });
      }
      if (current.status === 'cancelled') {
        throw Object.assign(new Error('Cancelled orders cannot start a new PayPal payment.'), { statusCode: 409 });
      }

      const currentProviderReference = safeString(current.paymentProviderReference, 160);
      if (currentProviderReference && currentProviderReference !== paypalOrderId) {
        throw Object.assign(new Error('This SAELYXE order is already linked to a different PayPal order.'), { statusCode: 409 });
      }

      if (guardSnap.exists) {
        const guard: any = guardSnap.data() || {};
        if (safeString(guard.orderId, 120) !== orderId) {
          throw Object.assign(new Error('This PayPal order is already linked to another SAELYXE order.'), { statusCode: 409 });
        }
      } else {
        transaction.set(guardRef, {
          paypalOrderId,
          orderId,
          orderNumber: safeString(current.orderNumber || current.id, 120),
          userId: current.userId,
          createdAt: now,
          serverCreatedAt: FieldValue.serverTimestamp()
        });
      }

      transaction.update(ref, {
        paymentProviderReference: paypalOrderId,
        paymentVerificationSource: 'paypal_server_created',
        paymentUpdatedAt: now
      });
    });

    const updated = await ref.get();
    return res.json({
      paypalOrderId,
      providerStatus,
      order: { id: updated.id, ...updated.data() }
    });
  } catch (error: any) {
    const status = Number(error?.statusCode) || 502;
    return res.status(status).json({ error: safeString(error?.message, 240) || 'Unable to create PayPal payment.' });
  }
});

app.post('/api/payments/paypal/capture/:orderId', async (req, res) => {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) return res.status(503).json({ error: 'Payment service is not configured.' });

    if (!(await hasValidAppCheck(req))) {
      return res.status(401).json({ error: 'App integrity check failed.' });
    }

    const orderId = safeString(req.params.orderId, 120);
    const requestedPayPalOrderId = safeString(req.body?.paypalOrderId, 160);
    const ref = adminDb.collection('orders').doc(orderId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Order not found.' });
    const order: any = { id: snap.id, ...snap.data() };
    const access = await authorizeCustomerOrderAccess(req, adminDb, order);
    if (!access) return res.status(404).json({ error: 'Order not found.' });
    if (!(await enforceRateLimit(adminDb, `paypal-capture:${access.rateKey}:${orderId}`, 12, 10 * 60_000))) {
      return res.status(429).json({ error: 'Too many PayPal capture attempts. Please wait and try again.' });
    }
    if (order.paymentMethod !== 'paypal') {
      return res.status(400).json({ error: 'This order is not a PayPal order.' });
    }

    const paypalOrderId = safeString(order.paymentProviderReference, 160);
    if (!paypalOrderId) {
      return res.status(409).json({ error: 'This SAELYXE order is not linked to a PayPal order.' });
    }
    if (requestedPayPalOrderId && requestedPayPalOrderId !== paypalOrderId) {
      return res.status(409).json({ error: 'PayPal order reference does not match the linked SAELYXE checkout.' });
    }

    const guardSnap = await adminDb.collection('paypal_order_links').doc(paypalOrderId).get();
    if (!guardSnap.exists || safeString(guardSnap.data()?.orderId, 120) !== orderId) {
      return res.status(409).json({ error: 'PayPal order linkage could not be verified.' });
    }
    if (order.paymentStatus === 'verified') {
      return res.json(order);
    }

    await reservePayPalInventory(adminDb, orderId, paypalOrderId);

    let captureResult: any = null;
    try {
      captureResult = await capturePayPalProviderOrder(paypalOrderId);
    } catch {
      captureResult = null;
    }

    const verification = await verifyPayPalOrder(order, paypalOrderId);
    if (!verification.verified) {
      await markPayPalVerificationPending(adminDb, orderId, paypalOrderId, verification.reason);
      return res.status(captureResult && !captureResult.ok ? 409 : 502).json({
        error: 'PayPal capture could not be confirmed.',
        verification
      });
    }

    const updated = await markPayPalOrderVerified(adminDb, orderId, paypalOrderId, verification);
    await ensureOrderConfirmationEmail(adminDb, updated);
    return res.json(updated);
  } catch (error: any) {
    const status = Number(error?.statusCode) || 500;
    return res.status(status).json({ error: safeString(error?.message, 240) || 'Unable to capture PayPal payment.' });
  }
});

app.post('/api/payments/paypal/verify/:orderId', async (req, res) => {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) return res.status(503).json({ error: 'Payment service is not configured.' });

    if (!(await hasValidAppCheck(req))) {
      return res.status(401).json({ error: 'App integrity check failed.' });
    }

    const orderId = safeString(req.params.orderId, 120);
    const requestedPayPalOrderId = safeString(req.body?.paypalOrderId, 160);
    const ref = adminDb.collection('orders').doc(orderId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Order not found.' });
    const order: any = { id: snap.id, ...snap.data() };
    const access = await authorizeCustomerOrderAccess(req, adminDb, order);
    if (!access) return res.status(404).json({ error: 'Order not found.' });
    if (!(await enforceRateLimit(adminDb, `paypal-verify:${access.rateKey}:${orderId}`, 12, 10 * 60_000))) {
      return res.status(429).json({ error: 'Too many PayPal verification attempts. Please wait and try again.' });
    }
    if (order.paymentMethod !== 'paypal') {
      return res.status(400).json({ error: 'This order is not a PayPal order.' });
    }

    const paypalOrderId = safeString(order.paymentProviderReference, 160);
    if (!paypalOrderId) {
      return res.status(409).json({ error: 'This SAELYXE order is not linked to a PayPal order.' });
    }
    if (requestedPayPalOrderId && requestedPayPalOrderId !== paypalOrderId) {
      return res.status(409).json({ error: 'PayPal order reference does not match the linked SAELYXE checkout.' });
    }

    const guardSnap = await adminDb.collection('paypal_order_links').doc(paypalOrderId).get();
    if (!guardSnap.exists || safeString(guardSnap.data()?.orderId, 120) !== orderId) {
      return res.status(409).json({ error: 'PayPal order linkage could not be verified.' });
    }
    if (order.paymentStatus === 'verified') {
      await ensureOrderConfirmationEmail(adminDb, order);
      return res.json(order);
    }

    const verification = await verifyPayPalOrder(order, paypalOrderId);
    if (!verification.verified) {
      await markPayPalVerificationPending(adminDb, orderId, paypalOrderId, verification.reason);
      return res.status(409).json({ error: 'PayPal payment could not be verified yet.', verification });
    }

    const updated = await markPayPalOrderVerified(adminDb, orderId, paypalOrderId, verification);
    await ensureOrderConfirmationEmail(adminDb, updated);
    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: safeString(error?.message, 240) || 'Unable to verify PayPal payment.' });
  }
});

app.post('/api/payments/paypal/cancel/:orderId', async (req, res) => {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) return res.status(503).json({ error: 'Payment service is not configured.' });

    if (!(await hasValidAppCheck(req))) {
      return res.status(401).json({ error: 'App integrity check failed.' });
    }

    const orderId = safeString(req.params.orderId, 120);
    const ref = adminDb.collection('orders').doc(orderId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Order not found.' });
    const order: any = { id: snap.id, ...snap.data() };
    const access = await authorizeCustomerOrderAccess(req, adminDb, order);
    if (!access) return res.status(404).json({ error: 'Order not found.' });
    if (!(await enforceRateLimit(adminDb, `paypal-cancel:${access.rateKey}:${orderId}`, 6, 10 * 60_000))) {
      return res.status(429).json({ error: 'Too many PayPal cancellation attempts. Please wait and try again.' });
    }
    if (order.paymentMethod !== 'paypal') {
      return res.status(400).json({ error: 'This order is not a PayPal order.' });
    }
    if (order.paymentStatus === 'verified') {
      return res.status(409).json({ error: 'A verified payment cannot be cancelled from checkout.' });
    }
    if (order.status !== 'placed') {
      return res.status(409).json({ error: 'This order can no longer be cancelled from checkout.' });
    }

    const paypalOrderId = safeString(order.paymentProviderReference, 160);
    if (paypalOrderId) {
      const guardSnap = await adminDb.collection('paypal_order_links').doc(paypalOrderId).get();
      if (!guardSnap.exists || safeString(guardSnap.data()?.orderId, 120) !== orderId) {
        return res.status(409).json({ error: 'PayPal order linkage could not be verified for cancellation.' });
      }

      const verification = await verifyPayPalOrder(order, paypalOrderId);
      if (verification.verified) {
        const updated = await markPayPalOrderVerified(adminDb, orderId, paypalOrderId, verification);
        await ensureOrderConfirmationEmail(adminDb, updated);
        return res.status(409).json({
          error: 'PayPal payment is already completed, so checkout cancellation was blocked.',
          order: updated
        });
      }

      if (verification.reason === 'paypal_lookup_failed' || verification.reason === 'paypal_not_configured') {
        return res.status(503).json({ error: 'PayPal status is temporarily unavailable. The order was not cancelled.' });
      }

      const providerStatus = safeString(verification.providerStatus, 30).toUpperCase();
      const approvedButCaptureNotStarted =
        providerStatus === 'APPROVED' &&
        order.inventoryReserved !== true &&
        !order.paymentCaptureStartedAt;
      const safeToCancel =
        ['CREATED', 'SAVED', 'PAYER_ACTION_REQUIRED', 'VOIDED'].includes(providerStatus) ||
        approvedButCaptureNotStarted;
      if (!safeToCancel) {
        return res.status(409).json({
          error: `PayPal checkout is in ${providerStatus || 'an uncertain'} state. The order was not cancelled to avoid losing a completed payment.`
        });
      }
    }

    const now = new Date().toISOString();
    await adminDb.runTransaction(async transaction => {
      const currentSnap = await transaction.get(ref);
      if (!currentSnap.exists) throw Object.assign(new Error('Order not found.'), { statusCode: 404 });
      const current: any = { id: currentSnap.id, ...currentSnap.data() };

      if (current.paymentStatus === 'verified') {
        throw Object.assign(new Error('A verified payment cannot be cancelled from checkout.'), { statusCode: 409 });
      }
      if (current.status !== 'placed') {
        throw Object.assign(new Error('This order can no longer be cancelled from checkout.'), { statusCode: 409 });
      }
      if (safeString(current.paymentProviderReference, 160) !== paypalOrderId) {
        throw Object.assign(new Error('PayPal linkage changed during cancellation. The order was not cancelled.'), { statusCode: 409 });
      }
      const captureState = safeString(current.paymentCaptureState, 40);
      if (
        current.inventoryReserved === true ||
        Boolean(current.paymentCaptureStartedAt) ||
        captureState === 'capturing' ||
        captureState === 'needs_recovery'
      ) {
        throw Object.assign(
          new Error('PayPal capture has started or needs recovery. The order was not cancelled to protect a possible completed payment.'),
          { statusCode: 409 }
        );
      }

      const quantityByProduct = new Map<string, number>();
      const items = Array.isArray(current.items) ? current.items : [];
      if (current.inventoryReserved === true) {
        for (const item of items) {
          const productId = safeString(item?.productId, 100);
          const quantity = Number(item?.quantity);
          if (!productId || !Number.isInteger(quantity) || quantity < 1) {
            throw Object.assign(new Error('Order inventory reservation data is invalid.'), { statusCode: 409 });
          }
          quantityByProduct.set(productId, (quantityByProduct.get(productId) || 0) + quantity);
        }
      }

      const productSnapshots = new Map<string, { ref: any; data: any }>();
      for (const productId of quantityByProduct.keys()) {
        const productRef = adminDb.collection('products').doc(productId);
        const productSnap = await transaction.get(productRef);
        if (!productSnap.exists) {
          throw Object.assign(new Error('Reserved inventory could not be restored safely.'), { statusCode: 409 });
        }
        productSnapshots.set(productId, { ref: productRef, data: productSnap.data() || {} });
      }

      for (const [productId, quantity] of quantityByProduct.entries()) {
        const cached = productSnapshots.get(productId)!;
        const stockCount = Number(cached.data.stockCount);
        const nextStock = (Number.isFinite(stockCount) ? stockCount : 0) + quantity;
        transaction.update(cached.ref, {
          stockCount: nextStock,
          inStock: nextStock > 0,
          updatedAt: now
        });
      }

      transaction.update(ref, {
        status: 'cancelled',
        paymentStatus: 'cancelled',
        inventoryReserved: false,
        inventoryReservationReleasedAt: current.inventoryReserved === true ? now : current.inventoryReservationReleasedAt || null,
        updatedAt: now,
        paymentUpdatedAt: now,
        statusHistory: [
          ...(Array.isArray(current.statusHistory) ? current.statusHistory : []),
          {
            status: 'cancelled',
            timestamp: now,
            note: current.inventoryReserved === true
              ? 'PayPal checkout was cancelled before payment completion and reserved inventory was released.'
              : 'PayPal checkout was cancelled before payment completion.',
            location: 'SAELYXE Online Store'
          }
        ]
      });
    });

    const updated = await ref.get();
    return res.json({ id: updated.id, ...updated.data() });
  } catch (error: any) {
    const status = Number(error?.statusCode) || 500;
    return res.status(status).json({ error: safeString(error?.message, 240) || 'Unable to cancel PayPal checkout order.' });
  }
});


app.post('/api/orders', async (req, res) => {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) return res.status(503).json({ error: 'Order service is not configured.' });

    const body = req.body || {};
    const allowedOrderKeys = [
      'customerName', 'firstName', 'lastName', 'email', 'phone', 'address', 'city',
      'postalCode', 'country', 'items', 'currencyUsed', 'paymentMethod', 'promoCode',
      'checkoutAttemptId', 'notes', 'subtotalLKR', 'shippingLKR', 'totalLKR', 'totalInCurrency'
    ] as const;
    if (!hasOnlyKeys(body, allowedOrderKeys)) {
      return res.status(400).json({ error: 'Order request contains unsupported fields.' });
    }

    const firstName = safeString(body.firstName, 60);
    const lastName = safeString(body.lastName, 60);
    let customerName = safeString(body.customerName, 120);
    if ((firstName || lastName) && !customerName) {
      customerName = `${firstName} ${lastName}`.trim();
    }
    const email = safeString(body.email, 254).toLowerCase();
    const phone = safeString(body.phone, 30);
    const address = safeString(body.address, 300);
    const city = safeString(body.city, 100);
    const postalCode = safeString(body.postalCode, 30);
    const country = safeString(body.country, 80);
    const notes = safeString(body.notes, 1000);

    if (!customerName || !isEmail(email) || phone.replace(/\D/g, '').length < 9 || !address || !city || !country) {
      return res.status(400).json({ error: 'Valid customer, delivery, email, and phone details are required.' });
    }

    const inputItems = Array.isArray(body.items) ? body.items : [];
    if (inputItems.length < 1 || inputItems.length > 50) {
      return res.status(400).json({ error: 'Order items are invalid.' });
    }

    if (inputItems.some(item => !hasOnlyKeys(item, ['productId', 'size', 'quantity', 'title', 'image', 'priceLKR']))) {
      return res.status(400).json({ error: 'Order items contain unsupported fields.' });
    }

    const requested = inputItems.map((item: any) => ({
      productId: safeString(item?.productId, 100),
      size: safeString(item?.size, 30),
      quantity: Number(item?.quantity)
    }));

    if (requested.some(item => !item.productId || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20)) {
      return res.status(400).json({ error: 'Order item quantity or product reference is invalid.' });
    }

    if (!(await hasValidAppCheck(req))) {
      return res.status(401).json({ error: 'App integrity check failed. Please refresh and try again.' });
    }

    const authToken = await readBearerToken(req);
    const isGuestCheckout = !authToken;
    if (authToken) {
      const authenticatedEmail = typeof authToken.email === 'string' ? authToken.email.toLowerCase() : '';
      if (!authenticatedEmail || authToken.email_verified !== true || authenticatedEmail !== email) {
        return res.status(403).json({ error: 'Order email must match your verified account email.' });
      }
      if (!(await enforceRateLimit(adminDb, `orders:${authToken.uid}`, 20, 10 * 60_000))) {
        return res.status(429).json({ error: 'Too many order attempts. Please wait a few minutes and try again.' });
      }
    } else {
      const clientAddress = getClientAddress(req);
      if (!(await enforceRateLimit(adminDb, `guest-orders-short:${clientAddress}`, 20, 10 * 60_000))) {
        return res.status(429).json({ error: 'Too many guest checkout attempts. Please wait a few minutes and try again.' });
      }
      if (!(await enforceRateLimit(adminDb, `guest-orders-daily:${clientAddress}`, 60, 24 * 60 * 60_000))) {
        return res.status(429).json({ error: 'Guest checkout limit reached for this network. Please try again later or sign in.' });
      }
    }

    const requestedCurrency = safeString(body.currencyUsed, 10).toUpperCase();
    const currency = CURRENCIES.find(item => item.code === requestedCurrency) || CURRENCIES[0];
    const paymentMethod = safeString(body.paymentMethod, 30);
    if (!['paypal', 'payzy', 'cod'].includes(paymentMethod)) {
      return res.status(400).json({ error: 'Unsupported payment method.' });
    }
    // Online provider references are created and linked server-side after the local order exists.
    const paymentProviderReference = '';
    const checkoutAttemptId = safeString(body.checkoutAttemptId, 120);
    const checkoutIdentity = authToken
      ? `uid:${authToken.uid}`
      : `guest:${crypto.createHash('sha256').update(`${email}|${getClientAddress(req)}`).digest('hex')}`;
    const duplicateFingerprint = crypto.createHash('sha256').update(JSON.stringify({
      identity: checkoutIdentity,
      items: [...requested].sort((a, b) => `${a.productId}:${a.size}`.localeCompare(`${b.productId}:${b.size}`)),
      paymentMethod,
      paymentProviderReference,
      checkoutAttemptId,
      address,
      city,
      postalCode,
      country
    })).digest('hex');
    const guardRef = adminDb.collection('order_idempotency').doc(duplicateFingerprint);
    const idempotencyWindowMs = checkoutAttemptId ? 24 * 60 * 60_000 : 2 * 60_000;
    const orderNumber = `SOX-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
    const orderRef = adminDb.collection('orders').doc(orderNumber);

    let responseOrder: any = null;
    let replayOrderNumber = '';

    await adminDb.runTransaction(async transaction => {
      const guardSnap = await transaction.get(guardRef);
      const guardData: any = guardSnap.exists ? guardSnap.data() || {} : {};
      const guardCreatedAtMs = Number(guardData.createdAtMs) || 0;
      if (guardSnap.exists && guardCreatedAtMs > Date.now() - idempotencyWindowMs && guardData.orderNumber) {
        replayOrderNumber = safeString(guardData.orderNumber, 120);
        return;
      }

      const productCache = new Map<string, { ref: any; data: any }>();
      const productsToSeed = new Map<any, any>();
      const quantityByProduct = new Map<string, number>();

      for (const item of requested) {
        quantityByProduct.set(item.productId, (quantityByProduct.get(item.productId) || 0) + item.quantity);
      }

      for (const productId of quantityByProduct.keys()) {
        const ref = adminDb.collection('products').doc(productId);
        const snap = await transaction.get(ref);
        if (snap.exists) {
          productCache.set(productId, { ref, data: { id: snap.id, ...snap.data() } });
        } else {
          const fallbackProduct = (readStore().products || []).find((p: any) => p.id === productId);
          if (!fallbackProduct) throw new Error('One or more products are unavailable.');
          const seededProduct = {
            ...fallbackProduct,
            id: fallbackProduct.id,
            inStock: fallbackProduct.inStock !== false,
            stockCount: Number(fallbackProduct.stockCount) || 50,
            priceLKR: Number(fallbackProduct.priceLKR) || 0
          };
          productsToSeed.set(ref, seededProduct);
          productCache.set(productId, { ref, data: seededProduct });
        }
      }

      const validatedItems = requested.map(item => {
        const product = productCache.get(item.productId)?.data;
        if (!product) throw new Error('One or more products are unavailable.');

        if (Array.isArray(product.sizes) && product.sizes.length > 0) {
          if (!item.size || !product.sizes.includes(item.size)) {
            throw new Error(`Please select a valid size for ${product.title || 'product'}.`);
          }
        }

        const unitPriceLKR = Number(product.priceLKR);
        if (!Number.isFinite(unitPriceLKR) || unitPriceLKR <= 0) {
          throw new Error(`${product.title || 'A product'} has an invalid server price.`);
        }

        return {
          productId: product.id,
          title: safeString(product.title, 200),
          image: Array.isArray(product.images) ? safeString(product.images[0], 1000) : '',
          priceLKR: unitPriceLKR,
          size: item.size,
          quantity: item.quantity
        };
      });

      for (const [productId, totalQuantity] of quantityByProduct.entries()) {
        const product = productCache.get(productId)?.data;
        if (!product || product.inStock !== true || Number(product.stockCount) < totalQuantity) {
          throw new Error(`${product?.title || 'A product'} does not have enough stock.`);
        }
      }

      const subtotalLKR = validatedItems.reduce((sum, item) => sum + item.priceLKR * item.quantity, 0);
      if (!Number.isFinite(subtotalLKR) || subtotalLKR <= 0) {
        throw new Error('Order total is invalid.');
      }

      const settingsRef = adminDb.collection('settings').doc('drop_config');
      const settingsSnap = await transaction.get(settingsRef);
      const settings = settingsSnap.exists ? settingsSnap.data() || {} : {};
      const freeShippingThresholdLKR = Number(settings.freeShippingThresholdLKR) > 0
        ? Number(settings.freeShippingThresholdLKR)
        : 50000;
      const standardShippingLKR = Number(settings.standardShippingLKR) >= 0
        ? Number(settings.standardShippingLKR)
        : 2500;

      const promo = calculateDiscount(body.promoCode, subtotalLKR);
      const discountedSubtotalLKR = Math.max(0, subtotalLKR - promo.discountLKR);
      const shippingLKR = discountedSubtotalLKR >= freeShippingThresholdLKR ? 0 : standardShippingLKR;
      const totalLKR = discountedSubtotalLKR + shippingLKR;
      const totalInCurrency = Number((totalLKR * currency.rateFromLKR).toFixed(2));
      const now = new Date().toISOString();

      const order: any = {
        id: orderNumber,
        orderNumber,
        userId: authToken?.uid || null,
        guestCheckout: isGuestCheckout,
        customerName,
        email,
        phone,
        address,
        city,
        postalCode,
        country,
        items: validatedItems,
        subtotalLKR,
        discountLKR: promo.discountLKR,
        promoCode: promo.code || null,
        shippingLKR,
        totalLKR,
        currencyUsed: currency.code,
        totalInCurrency,
        status: 'placed',
        paymentMethod,
        paymentStatus: paymentMethod === 'cod' ? 'cod_pending' : 'pending_verification',
        paymentProviderReference: paymentProviderReference || null,
        paymentVerificationSource: paymentMethod === 'cod' ? 'cash_on_delivery' : null,
        inventoryCommitted: false,
        trackingNumber: '',
        courierName: '',
        deliveryEta: '',
        notes,
        createdAt: now,
        statusHistory: [{
          status: 'placed',
          timestamp: now,
          note: 'Order placed by customer.',
          location: 'SAELYXE Online Store'
        }],
        serverCreatedAt: FieldValue.serverTimestamp()
      };

      if (firstName) order.firstName = firstName;
      if (lastName) order.lastName = lastName;

      for (const [pRef, seeded] of productsToSeed.entries()) {
        transaction.set(pRef, seeded);
      }
      transaction.set(orderRef, order);
      const guardExpiresAtMs = Date.now() + idempotencyWindowMs;
      transaction.set(guardRef, {
        orderNumber,
        userId: authToken?.uid || null,
        guestCheckout: isGuestCheckout,
        createdAtMs: Date.now(),
        expiresAtMs: guardExpiresAtMs,
        expiresAt: Timestamp.fromMillis(guardExpiresAtMs)
      });

      // Stock is committed only after verified payment and a valid order lifecycle transition.
      // This prevents unpaid or forged payment references from draining inventory.

      responseOrder = { ...order };
      delete responseOrder.serverCreatedAt;
    });

    if (replayOrderNumber) {
      const existing = await adminDb.collection('orders').doc(replayOrderNumber).get();
      if (existing.exists) {
        const replayPayload: any = { id: existing.id, ...existing.data() };
        if (replayPayload.guestCheckout === true) {
          Object.assign(replayPayload, await issueGuestOrderAccess(adminDb, existing.id, safeString(replayPayload.email, 254)));
        }
        return res.status(200).setHeader('X-Idempotent-Replay', 'true').json(replayPayload);
      }
    }

    if (paymentMethod === 'paypal' && paymentProviderReference && responseOrder) {
      const verification: any = await verifyPayPalOrder(responseOrder, paymentProviderReference).catch(() => ({ verified: false, reason: 'verification_error' }));
      if (verification.verified) {
        const verifiedAt = new Date().toISOString();
        responseOrder.paymentStatus = 'verified';
        responseOrder.paymentVerificationSource = 'paypal_orders_api';
        responseOrder.paymentVerifiedAt = verifiedAt;
        responseOrder.paymentCaptureId = verification.captureId || '';
        responseOrder.paymentCaptureAmount = verification.actualCaptureAmount;
        responseOrder.paymentCaptureCurrency = verification.actualCaptureCurrency || '';
        await orderRef.update({
          paymentStatus: 'verified',
          paymentVerificationSource: 'paypal_orders_api',
          paymentVerifiedAt: verifiedAt,
          paymentCaptureState: 'completed',
          paymentCaptureCompletedAt: verifiedAt,
          paymentCaptureId: verification.captureId || '',
          paymentCaptureAmount: verification.actualCaptureAmount,
          paymentCaptureCurrency: verification.actualCaptureCurrency || '',
          paymentUpdatedAt: verifiedAt
        });
      } else {
        responseOrder.paymentVerificationSource = 'paypal_orders_api';
        responseOrder.paymentVerificationError = verification.reason;
        await orderRef.update({
          paymentVerificationSource: 'paypal_orders_api',
          paymentVerificationError: verification.reason,
          paymentUpdatedAt: new Date().toISOString()
        });
      }
    }

    if (responseOrder?.guestCheckout === true) {
      Object.assign(responseOrder, await issueGuestOrderAccess(adminDb, safeString(responseOrder.id, 120), safeString(responseOrder.email, 254)));
    }

    // Keep short-lived abuse-protection documents bounded without requiring a manual cleanup job.
    await cleanupExpiredSecurityDocs(adminDb).catch(error => {
      console.warn('Security cleanup note:', error);
    });

    // Send confirmation email for COD immediately, or online providers only after verified settlement.
    // Unverified PayPal/Payzy orders do NOT receive confirmation email.
    if (paymentMethod === 'cod' || responseOrder.paymentStatus === 'verified') {
      await ensureOrderConfirmationEmail(adminDb, responseOrder);
    }

    return res.status(201).json(responseOrder);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create order.';
    return res.status(400).json({ error: message });
  }
});

app.put('/api/admin/messages/:id', async (req, res) => {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) return res.status(503).json({ error: 'Concierge service is not configured.' });
    const token = await readBearerToken(req);
    if (!token || !(await isAdminToken(token))) return res.status(403).json({ error: 'Admin access required.' });
    if (!(await hasValidAppCheck(req))) return res.status(401).json({ error: 'App integrity check failed.' });
    if (!(await enforceRateLimit(adminDb, `admin-message-write:${token.uid}`, 120, 60 * 60_000))) {
      return res.status(429).json({ error: 'Concierge changes are rate limited. Please wait and retry.' });
    }

    const id = safeString(req.params.id, 160);
    const status = safeString(req.body?.status, 20);
    const replyNotes = safeString(req.body?.replyNotes, 2000);
    if (!id || !['unread', 'read', 'replied'].includes(status)) {
      return res.status(400).json({ error: 'Valid message status is required.' });
    }

    const messageRef = adminDb.collection('messages').doc(id);
    const inquiryRef = adminDb.collection('concierge_inquiries').doc(id);
    const [messageSnap, inquirySnap] = await Promise.all([messageRef.get(), inquiryRef.get()]);
    if (!messageSnap.exists && !inquirySnap.exists) return res.status(404).json({ error: 'Inquiry not found.' });

    const update = {
      status,
      replyNotes,
      updatedAt: new Date().toISOString(),
      updatedBy: token.uid
    };
    const batch = adminDb.batch();
    if (messageSnap.exists) batch.update(messageRef, update);
    if (inquirySnap.exists) batch.update(inquiryRef, update);
    await batch.commit();
    await writeAdminAudit(adminDb, token, 'CONCIERGE_STATUS_UPDATED', `Updated inquiry ${id} to ${status}.`);

    const source = inquirySnap.exists ? inquirySnap : messageSnap;
    return res.json({ id, ...source.data(), ...update });
  } catch {
    return res.status(500).json({ error: 'Unable to update concierge inquiry.' });
  }
});

app.put('/api/admin/products/:id', async (req, res) => {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) return res.status(503).json({ error: 'Product service is not configured.' });
    const token = await readBearerToken(req);
    if (!token || !(await isAdminToken(token))) return res.status(403).json({ error: 'Admin access required.' });
    if (!(await hasValidAppCheck(req))) return res.status(401).json({ error: 'App integrity check failed.' });
    if (!(await enforceRateLimit(adminDb, `admin-product-write:${token.uid}`, 120, 60 * 60_000))) {
      return res.status(429).json({ error: 'Product changes are rate limited. Please wait and retry.' });
    }

    const id = safeString(req.params.id, 100);
    const title = safeString(req.body?.title, 200);
    const subtitle = safeString(req.body?.subtitle, 300);
    const description = safeString(req.body?.description, 5000);
    const fabricDetails = safeString(req.body?.fabricDetails, 1000);
    const category = safeString(req.body?.category, 40);
    const priceLKR = Number(req.body?.priceLKR);
    const stockCount = Number(req.body?.stockCount);
    const allowedCategories = new Set(['men', 'women', 'new', 'collections', 'knits', 'sets', 'accessories']);
    const images = Array.isArray(req.body?.images)
      ? req.body.images.map((value: unknown) => safeString(value, 1200)).filter((value: string) => value.startsWith('https://')).slice(0, 16)
      : [];
    const sizes = Array.isArray(req.body?.sizes)
      ? req.body.sizes.map((value: unknown) => safeString(value, 30)).filter(Boolean).slice(0, 30)
      : [];
    const bulletDetails = Array.isArray(req.body?.bulletDetails)
      ? req.body.bulletDetails.map((value: unknown) => safeString(value, 300)).filter(Boolean).slice(0, 30)
      : [];

    if (!id || !title || !allowedCategories.has(category) || !Number.isFinite(priceLKR) || priceLKR <= 0 ||
        !Number.isInteger(stockCount) || stockCount < 0 || images.length === 0) {
      return res.status(400).json({ error: 'Product title, category, positive price, valid stock, and at least one HTTPS image are required.' });
    }

    const slug = safeString(req.body?.slug, 200) || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const slugCollision = await adminDb.collection('products').where('slug', '==', slug).limit(2).get();
    if (slugCollision.docs.some(docSnap => docSnap.id !== id)) {
      return res.status(409).json({ error: 'Another product already uses this slug.' });
    }

    const ref = adminDb.collection('products').doc(id);
    const existing = await ref.get();
    const now = new Date().toISOString();
    const hoverImage = safeString(req.body?.hoverImage, 1200);
    const completeTheSetProductId = safeString(req.body?.completeTheSetProductId, 100);
    const payload = {
      id,
      slug,
      title,
      subtitle,
      description,
      fabricDetails,
      category,
      subCategory: safeString(req.body?.subCategory, 100),
      priceLKR,
      stockCount,
      inStock: stockCount > 0,
      images,
      hoverImage: hoverImage.startsWith('https://') ? hoverImage : '',
      completeTheSetProductId,
      sizes,
      bulletDetails,
      badge: safeString(req.body?.badge, 100),
      color: safeString(req.body?.color, 100),
      fit: safeString(req.body?.fit, 160),
      createdAt: existing.exists ? safeString(existing.data()?.createdAt, 80) || now : now,
      updatedAt: now
    };

    await ref.set(payload, { merge: true });
    await writeAdminAudit(adminDb, token, existing.exists ? 'PRODUCT_UPDATED' : 'PRODUCT_CREATED', `${title} (${id}).`);
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to save product.' });
  }
});

app.delete('/api/admin/products/:id', async (req, res) => {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) return res.status(503).json({ error: 'Product service is not configured.' });
    const token = await readBearerToken(req);
    if (!token || !(await isSuperAdminToken(token))) return res.status(403).json({ error: 'Super Admin access required.' });
    if (!(await hasValidAppCheck(req))) return res.status(401).json({ error: 'App integrity check failed.' });
    if (!hasRecentAuthentication(token)) {
      return res.status(428).json({ error: 'Recent administrator authentication required before retiring a product.' });
    }
    if (!(await enforceRateLimit(adminDb, `admin-product-delete:${token.uid}`, 20, 60 * 60_000))) {
      return res.status(429).json({ error: 'Product retirement is rate limited. Please wait and retry.' });
    }
    const id = safeString(req.params.id, 100);
    const ref = adminDb.collection('products').doc(id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Product not found.' });
    await ref.delete();
    await writeAdminAudit(adminDb, token, 'PRODUCT_RETIRED', `Retired ${snap.data()?.title || id} (${id}).`);
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Unable to retire product.' });
  }
});

app.put('/api/admin/settings', async (req, res) => {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) return res.status(503).json({ error: 'Settings service is not configured.' });
    const token = await readBearerToken(req);
    if (!token || !(await isSuperAdminToken(token))) return res.status(403).json({ error: 'Super Admin access required.' });
    if (!(await hasValidAppCheck(req))) return res.status(401).json({ error: 'App integrity check failed.' });
    if (!hasRecentAuthentication(token)) {
      return res.status(428).json({ error: 'Recent administrator authentication required before changing store settings.' });
    }
    if (!(await enforceRateLimit(adminDb, `admin-settings-write:${token.uid}`, 30, 60 * 60_000))) {
      return res.status(429).json({ error: 'Store setting changes are rate limited. Please wait and retry.' });
    }

    const update: Record<string, unknown> = {};
    const stringFields: Array<[string, number]> = [
      ['spotlightTitle', 300], ['spotlightSubhead', 500], ['spotlightDescription', 5000],
      ['spotlightEyebrow', 120], ['announcementText', 500], ['heroHeadline', 300],
      ['heroSubhead', 500]
    ];
    for (const [key, max] of stringFields) {
      if (key in (req.body || {})) update[key] = safeString(req.body?.[key], max);
    }

    if ('spotlightBackgroundImage' in (req.body || {})) {
      const image = safeString(req.body?.spotlightBackgroundImage, 1200);
      if (image && !image.startsWith('https://')) return res.status(400).json({ error: 'Spotlight background must use an HTTPS image URL.' });
      update.spotlightBackgroundImage = image;
    }

    for (const key of ['spotlightPriceLKR', 'freeShippingThresholdLKR'] as const) {
      if (key in (req.body || {})) {
        const value = Number(req.body?.[key]);
        if (!Number.isFinite(value) || value < 0) return res.status(400).json({ error: `${key} must be zero or greater.` });
        update[key] = value;
      }
    }

    if ('countdownTarget' in (req.body || {})) {
      const countdownTarget = safeString(req.body?.countdownTarget, 100);
      if (!countdownTarget || Number.isNaN(Date.parse(countdownTarget))) return res.status(400).json({ error: 'Countdown target must be a valid date/time.' });
      update.countdownTarget = new Date(countdownTarget).toISOString();
    }

    for (const key of ['showHeroSection', 'showSpotlightSection', 'showCollectionSection', 'showSocialFAQSection'] as const) {
      if (key in (req.body || {})) update[key] = req.body?.[key] === true;
    }

    update.updatedAt = new Date().toISOString();
    update.updatedBy = token.uid;
    const ref = adminDb.collection('settings').doc('drop_config');
    await ref.set(update, { merge: true });
    await writeAdminAudit(adminDb, token, 'SETTINGS_UPDATED', 'Updated boutique homepage/drop settings.');
    const updated = await ref.get();
    return res.json(updated.data());
  } catch {
    return res.status(500).json({ error: 'Unable to update settings.' });
  }
});

app.post('/api/admin/audit', async (req, res) => {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) return res.status(503).json({ error: 'Audit service is not configured.' });
    const token = await readBearerToken(req);
    if (!token || !(await isAdminToken(token))) return res.status(403).json({ error: 'Admin access required.' });
    if (!(await hasValidAppCheck(req))) return res.status(401).json({ error: 'App integrity check failed.' });
    if (!(await enforceRateLimit(adminDb, `admin-audit-write:${token.uid}`, 120, 60 * 60_000))) {
      return res.status(429).json({ error: 'Audit events are rate limited. Please wait and retry.' });
    }
    const action = safeString(req.body?.action, 80);
    const details = safeString(req.body?.details, 1000);
    const allowed = new Set(['ADMIN_LOGIN', 'ORDER_CSV_EXPORT', 'DATABASE_EXPORT']);
    if (!allowed.has(action)) return res.status(400).json({ error: 'Unsupported audit action.' });
    await writeAdminAudit(adminDb, token, action, details);
    return res.status(201).json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Unable to write audit event.' });
  }
});

app.get('/api/admin/orders/page', async (req, res) => {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) return res.status(503).json({ error: 'Order service is not configured.' });
    const token = await readBearerToken(req);
    if (!token || !(await isAdminToken(token))) return res.status(403).json({ error: 'Admin access required.' });
    if (!(await hasValidAppCheck(req))) return res.status(401).json({ error: 'App integrity check failed.' });

    const requestedLimit = Number(req.query.limit);
    const pageSize = Number.isInteger(requestedLimit) ? Math.min(100, Math.max(10, requestedLimit)) : 100;
    const cursorId = safeString(req.query.cursor, 120);

    const ordersRef = adminDb.collection('orders');
    let queryRef: any = ordersRef.orderBy('createdAt', 'desc');
    if (cursorId) {
      const cursorSnap = await ordersRef.doc(cursorId).get();
      if (!cursorSnap.exists) return res.status(400).json({ error: 'Order pagination cursor is invalid.' });
      queryRef = queryRef.startAfter(cursorSnap);
    }

    const snapshot = await queryRef.limit(pageSize + 1).get();
    const docs = snapshot.docs.slice(0, pageSize);
    const items = docs.map((docSnap: any) => ({ id: docSnap.id, ...docSnap.data() }));
    const hasMore = snapshot.docs.length > pageSize;
    return res.json({
      items,
      hasMore,
      nextCursor: hasMore && docs.length ? docs[docs.length - 1].id : null
    });
  } catch {
    return res.status(500).json({ error: 'Unable to load older orders.' });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) return res.status(503).json({ error: 'Order service is not configured.' });

    const token = await readBearerToken(req);
    if (!(await isAdminToken(token))) return res.status(403).json({ error: 'Admin access required.' });
    if (!(await hasValidAppCheck(req))) return res.status(401).json({ error: 'App integrity check failed.' });

    const snapshot = await adminDb.collection('orders').orderBy('createdAt', 'desc').limit(250).get();
    return res.json(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  } catch {
    return res.status(500).json({ error: 'Unable to load orders.' });
  }
});

app.get('/api/orders/:id/details', async (req, res) => {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) return res.status(503).json({ error: 'Order service is not configured.' });
    if (!(await hasValidAppCheck(req))) return res.status(401).json({ error: 'App integrity check failed.' });
    const id = safeString(req.params.id, 120);
    const snap = await adminDb.collection('orders').doc(id).get();
    if (!snap.exists) return res.status(404).json({ error: 'Order not found.' });
    const order: any = { id: snap.id, ...snap.data() };
    const access = await authorizeCustomerOrderAccess(req, adminDb, order);
    if (!access) return res.status(403).json({ error: 'Order access denied.' });
    if (!(await enforceRateLimit(adminDb, `order-details:${access.rateKey}`, 60, 60 * 60_000))) return res.status(429).json({ error: 'Too many order detail requests. Please wait and try again.' });
    const items = Array.isArray(order.items) ? order.items.slice(0, 80).map((item: any) => ({
      productId: safeString(item?.productId, 160), title: safeString(item?.title, 300), image: safeString(item?.image, 2000), size: safeString(item?.size, 80),
      quantity: Math.max(1, Math.min(99, Math.floor(Number(item?.quantity) || 1))), priceLKR: Math.max(0, Number(item?.priceLKR) || 0)
    })) : [];
    return res.json({
      id: order.id, orderNumber: safeString(order.orderNumber, 120), userId: safeString(order.userId, 160) || null, guestCheckout: order.guestCheckout === true,
      customerName: safeString(order.customerName, 200), email: safeString(order.email || order.customerEmail, 254), phone: safeString(order.phone, 80), address: safeString(order.address, 500), city: safeString(order.city, 200), postalCode: safeString(order.postalCode, 80), country: safeString(order.country, 120),
      items, subtotalLKR: Math.max(0, Number(order.subtotalLKR) || 0), discountLKR: Math.max(0, Number(order.discountLKR) || 0), shippingLKR: Math.max(0, Number(order.shippingLKR) || 0), totalLKR: Math.max(0, Number(order.totalLKR) || 0), currencyUsed: safeString(order.currencyUsed, 10), totalInCurrency: Math.max(0, Number(order.totalInCurrency) || 0),
      status: safeString(order.status, 40), paymentMethod: safeString(order.paymentMethod, 40), paymentStatus: safeString(order.paymentStatus, 60), payzySandboxVerified: order.payzySandboxVerified === true, promoCode: safeString(order.promoCode, 80), createdAt: safeString(order.createdAt, 80), updatedAt: safeString(order.updatedAt, 80),
      trackingNumber: safeString(order.trackingNumber, 160), courierName: safeString(order.courierName, 160), deliveryEta: safeString(order.deliveryEta, 160), cancellationRequestStatus: safeString(order.cancellationRequestStatus, 40), cancellationReason: safeString(order.cancellationReason, 500), timeline: Array.isArray(order.timeline) ? order.timeline.slice(-30) : []
    });
  } catch {
    return res.status(500).json({ error: 'Unable to load order details.' });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) return res.status(503).json({ error: 'Order service is not configured.' });

    if (!(await hasValidAppCheck(req))) {
      return res.status(401).json({ error: 'App integrity check failed. Please refresh and try again.' });
    }

    const id = safeString(req.params.id, 120);
    if (!id) return res.status(400).json({ error: 'Order reference is required.' });

    const snap = await adminDb.collection('orders').doc(id).get();
    if (!snap.exists) return res.status(404).json({ error: 'Order not found.' });

    const order: any = { id: snap.id, ...snap.data() };
    const access = await authorizeCustomerOrderAccess(req, adminDb, order);
    if (!access) {
      // Use the same response as a missing order so the endpoint does not confirm
      // whether another customer's order reference exists.
      return res.status(404).json({ error: 'Order not found.' });
    }
    if (!(await enforceRateLimit(adminDb, `tracking:${access.rateKey}:${id}`, 30, 10 * 60_000))) {
      return res.status(429).json({ error: 'Too many tracking requests. Please try again later.' });
    }

    const items = Array.isArray(order.items)
      ? order.items.map((item: any) => ({
          productId: safeString(item?.productId, 100),
          title: safeString(item?.title, 200),
          image: safeString(item?.image, 1000),
          size: safeString(item?.size, 30),
          quantity: Number(item?.quantity) || 0
        }))
      : [];

    const statusHistory = Array.isArray(order.statusHistory)
      ? order.statusHistory.map((entry: any) => ({
          status: safeString(entry?.status, 40),
          timestamp: safeString(entry?.timestamp, 80)
        }))
      : [];

    return res.json({
      id: order.id,
      orderNumber: safeString(order.orderNumber || order.id, 120),
      items,
      status: safeString(order.status, 40),
      trackingNumber: safeString(order.trackingNumber, 160),
      courierName: safeString(order.courierName, 160),
      deliveryEta: safeString(order.deliveryEta, 160),
      createdAt: safeString(order.createdAt, 80),
      statusHistory,
      city: safeString(order.city, 100),
      country: safeString(order.country, 80)
    });
  } catch {
    return res.status(500).json({ error: 'Unable to load tracking information.' });
  }
});

app.post('/api/orders/:id/cancellation-request', async (req, res) => {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) return res.status(503).json({ error: 'Order service is not configured.' });

    if (!(await hasValidAppCheck(req))) return res.status(401).json({ error: 'App integrity check failed.' });

    const orderId = safeString(req.params.id, 120);
    const reason = safeString(req.body?.reason, 500);
    if (!orderId || !reason) return res.status(400).json({ error: 'Cancellation reason is required.' });

    const ref = adminDb.collection('orders').doc(orderId);
    const accessSnap = await ref.get();
    if (!accessSnap.exists) return res.status(404).json({ error: 'Order not found.' });
    const accessOrder: any = { id: accessSnap.id, ...accessSnap.data() };
    const access = await authorizeCustomerOrderAccess(req, adminDb, accessOrder);
    if (!access) return res.status(404).json({ error: 'Order not found.' });
    if (!(await enforceRateLimit(adminDb, `cancel-request:${access.rateKey}:${orderId}`, 5, 60 * 60_000))) {
      return res.status(429).json({ error: 'Too many cancellation requests. Please wait and try again.' });
    }

    const now = new Date().toISOString();
    await adminDb.runTransaction(async transaction => {
      const snap = await transaction.get(ref);
      if (!snap.exists) throw Object.assign(new Error('Order not found.'), { statusCode: 404 });
      const order: any = { id: snap.id, ...snap.data() };
      if (!customerOrderAccessStillMatches(order, access)) {
        throw Object.assign(new Error('Order access denied.'), { statusCode: 403 });
      }
      if (order.status === 'cancelled') {
        throw Object.assign(new Error('This order is already cancelled.'), { statusCode: 409 });
      }
      if (!['placed', 'confirmed', 'packed'].includes(safeString(order.status, 40))) {
        throw Object.assign(new Error('Cancellation requests are closed after dispatch.'), { statusCode: 409 });
      }
      if (order.cancellationRequestStatus === 'pending') return;

      transaction.update(ref, {
        cancellationRequestedAt: now,
        cancellationRequestedBy: access.kind === 'guest' ? 'guest' : access.uid,
        cancellationReason: reason,
        cancellationRequestStatus: 'pending',
        updatedAt: now
      });
    });

    const updated = await ref.get();
    const updatedOrder: any = { id: updated.id, ...updated.data() };
    await adminDb.collection('audit_logs').add({
      timestamp: now,
      actor: access.kind === 'guest' ? 'guest-checkout' : access.uid,
      actorUid: access.kind === 'guest' ? 'guest' : access.uid,
      role: access.kind === 'guest' ? 'guest' : 'patron',
      action: 'ORDER_CANCELLATION_REQUESTED',
      details: safeString(`Customer requested cancellation for ${updatedOrder.orderNumber || orderId}: ${reason}`, 1000)
    });
    return res.status(202).json(updatedOrder);
  } catch (error: any) {
    const status = Number(error?.statusCode) || 500;
    return res.status(status).json({ error: safeString(error?.message, 240) || 'Unable to request cancellation.' });
  }
});

app.post('/api/admin/orders/:id/refund', async (req, res) => {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) return res.status(503).json({ error: 'Payment service is not configured.' });
    const token = await readBearerToken(req);
    if (!token || !(await isSuperAdminToken(token))) return res.status(403).json({ error: 'Super Admin access required for refunds.' });
    if (!(await hasValidAppCheck(req))) return res.status(401).json({ error: 'App integrity check failed.' });
    if (!hasRecentAuthentication(token)) {
      return res.status(428).json({ error: 'Recent administrator authentication required before processing a refund.' });
    }

    const orderId = safeString(req.params.id, 120);
    if (!(await enforceRateLimit(adminDb, `paypal-refund:${token.uid}:${orderId}`, 5, 30 * 60_000))) {
      return res.status(429).json({ error: 'Too many refund attempts. Please wait and retry.' });
    }

    const ref = adminDb.collection('orders').doc(orderId);
    let snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Order not found.' });
    let order: any = { id: snap.id, ...snap.data() };
    if (order.paymentMethod !== 'paypal' || !['verified', 'refund_pending'].includes(order.paymentStatus)) {
      if (order.paymentStatus === 'refunded') return res.json(order);
      return res.status(409).json({ error: 'Only verified PayPal payments can be refunded.' });
    }

    let captureId = safeString(order.paymentCaptureId, 160);
    if (!captureId) {
      const paypalOrderId = safeString(order.paymentProviderReference, 160);
      const verification = await verifyPayPalOrder(order, paypalOrderId);
      if (!verification.verified || !verification.captureId) {
        return res.status(409).json({ error: 'PayPal capture ID could not be verified for this order.' });
      }
      captureId = verification.captureId;
      await ref.set({
        paymentCaptureId: captureId,
        paymentCaptureAmount: verification.actualCaptureAmount,
        paymentCaptureCurrency: verification.actualCaptureCurrency || ''
      }, { merge: true });
    }

    let refund: { id: string; status: string };
    const existingRefundId = safeString(order.refundId, 160);
    if (existingRefundId) {
      refund = await getPayPalRefund(existingRefundId);
    } else {
      refund = await refundPayPalCapture(captureId, orderId);
      await ref.set({
        refundId: refund.id,
        refundStatus: refund.status || 'PENDING',
        refundRequestedAt: new Date().toISOString(),
        refundRequestedBy: token.uid
      }, { merge: true });
    }

    if (refund.status !== 'COMPLETED') {
      await ref.set({ refundStatus: refund.status || 'PENDING', paymentStatus: 'refund_pending' }, { merge: true });
      snap = await ref.get();
      await writeAdminAudit(adminDb, token, 'PAYPAL_REFUND_PENDING', `Refund ${refund.id || 'pending'} for order ${orderId} is ${refund.status || 'PENDING'}.`);
      return res.status(202).json({ id: snap.id, ...snap.data() });
    }

    const now = new Date().toISOString();
    await adminDb.runTransaction(async transaction => {
      const orderSnap = await transaction.get(ref);
      if (!orderSnap.exists) throw new Error('Order not found.');
      const current: any = orderSnap.data() || {};

      const canAutoRestoreInventory =
        current.inventoryCommitted === true &&
        ['placed', 'confirmed', 'packed'].includes(safeString(current.status, 40));
      const quantityByProduct = new Map<string, number>();
      if (canAutoRestoreInventory) {
        for (const item of Array.isArray(current.items) ? current.items : []) {
          const productId = safeString(item?.productId, 100);
          const quantity = Number(item?.quantity);
          if (productId && Number.isInteger(quantity) && quantity > 0) {
            quantityByProduct.set(productId, (quantityByProduct.get(productId) || 0) + quantity);
          }
        }
      }

      const products = new Map<string, { ref: any; stockCount: number }>();
      for (const productId of quantityByProduct.keys()) {
        const productRef = adminDb.collection('products').doc(productId);
        const productSnap = await transaction.get(productRef);
        if (productSnap.exists) {
          products.set(productId, { ref: productRef, stockCount: Math.max(0, Number(productSnap.data()?.stockCount) || 0) });
        }
      }

      for (const [productId, quantity] of quantityByProduct.entries()) {
        const product = products.get(productId);
        if (!product) continue;
        const nextStock = product.stockCount + quantity;
        transaction.update(product.ref, { stockCount: nextStock, inStock: nextStock > 0, updatedAt: now });
      }

      transaction.update(ref, {
        status: 'cancelled',
        paymentStatus: 'refunded',
        refundId: refund.id,
        refundStatus: 'COMPLETED',
        refundedAt: now,
        inventoryCommitted: canAutoRestoreInventory ? false : current.inventoryCommitted === true,
        requiresManualReview: current.inventoryCommitted === true && !canAutoRestoreInventory,
        inventoryException: current.inventoryCommitted === true && !canAutoRestoreInventory
          ? 'Refund completed after dispatch; returned inventory requires manual physical review before restocking.'
          : FieldValue.delete(),
        updatedAt: now,
        statusHistory: [
          ...(Array.isArray(current.statusHistory) ? current.statusHistory : []),
          {
            status: 'cancelled',
            timestamp: now,
            note: canAutoRestoreInventory
              ? 'PayPal refund completed, order cancelled, and pre-dispatch inventory restored.'
              : 'PayPal refund completed. Dispatched inventory requires manual return review.',
            location: 'SAELYXE Payments'
          }
        ]
      });
    });

    await writeAdminAudit(adminDb, token, 'PAYPAL_REFUND_COMPLETED', `Refunded PayPal capture ${captureId} for order ${orderId} (refund ${refund.id}).`);
    const updated = await ref.get();
    const updatedOrder = { id: updated.id, ...updated.data() };
    const refundEmail: EmailDeliveryResult = await sendOrderStatusEmail(updatedOrder, safeString(order.status, 40)).catch(error => ({
      sent: false,
      error: safeString(error instanceof Error ? error.message : error, 240) || 'refund_email_error'
    }));
    const refundEmailAttemptedAt = new Date().toISOString();
    await ref.set({
      lastStatusEmailStatus: refundEmail.sent ? 'sent' : 'failed',
      lastStatusEmailId: refundEmail.id || null,
      lastStatusEmailError: refundEmail.sent ? null : refundEmail.error || 'unknown_error',
      lastStatusEmailSentAt: refundEmail.sent ? refundEmailAttemptedAt : null,
      lastStatusEmailAttemptedAt: refundEmailAttemptedAt,
      lastStatusEmailFor: 'cancelled'
    }, { merge: true }).catch(error => {
      console.error('Refund email delivery state could not be recorded:', error);
    });
    const finalRefundOrder = await ref.get();
    return res.json({ id: finalRefundOrder.id, ...finalRefundOrder.data() });
  } catch (error: any) {
    const statusCode = Number(error?.statusCode) || 500;
    return res.status(statusCode).json({ error: safeString(error?.message, 240) || 'Unable to process PayPal refund.' });
  }
});

app.put('/api/orders/:id/status', async (req, res) => {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) return res.status(503).json({ error: 'Order service is not configured.' });

    const token = await readBearerToken(req);
    if (!token || !(await isAdminToken(token))) return res.status(403).json({ error: 'Admin access required.' });
    if (!(await hasValidAppCheck(req))) return res.status(401).json({ error: 'App integrity check failed.' });
    if (!hasRecentAuthentication(token)) {
      return res.status(428).json({ error: 'Recent administrator authentication required before changing order status.' });
    }
    if (!(await enforceRateLimit(adminDb, `admin-order-status:${token.uid}`, 120, 60 * 60_000))) {
      return res.status(429).json({ error: 'Order status changes are rate limited. Please wait and retry.' });
    }

    const id = safeString(req.params.id, 120);
    const status = safeString(req.body?.status, 40);
    if (!ORDER_STATUSES.has(status)) return res.status(400).json({ error: 'Invalid order status.' });

    const ref = adminDb.collection('orders').doc(id);
    const now = new Date().toISOString();
    let previousStatus = '';

    await adminDb.runTransaction(async transaction => {
      const snap = await transaction.get(ref);
      if (!snap.exists) throw new Error('Order not found.');

      const current: any = snap.data() || {};
      const currentStatus = safeString(current.status, 40) || 'placed';
      previousStatus = currentStatus;

      if (
        status === 'cancelled' &&
        current.paymentMethod === 'paypal' &&
        ['verified', 'refund_pending'].includes(safeString(current.paymentStatus, 40))
      ) {
        throw new Error('Verified PayPal orders must be cancelled through the Super Admin refund workflow.');
      }
      if (
        status === 'cancelled' &&
        current.paymentMethod === 'payzy' &&
        safeString(current.paymentStatus, 40) === 'verified'
      ) {
        throw new Error('Verified Payzy orders must be refunded from the Payzy merchant portal before cancellation.');
      }

      if (!canTransitionOrderStatus(currentStatus, status)) {
        throw new Error(
          currentStatus === 'cancelled'
            ? 'Cancelled orders are terminal. Create a new order instead of reopening a cancelled payment record.'
            : `Invalid order transition: ${currentStatus} → ${status}.`
        );
      }

      const update: Record<string, unknown> = {
        status,
        updatedAt: now
      };

      const requestedTrackingNumber = safeString(req.body?.trackingNumber, 160);
      const requestedCourierName = safeString(req.body?.courierName, 160);
      const requestedDeliveryEta = safeString(req.body?.deliveryEta, 160);
      const effectiveTrackingNumber = requestedTrackingNumber || safeString(current.trackingNumber, 160);
      const effectiveCourierName = requestedCourierName || safeString(current.courierName, 160);

      if (['dispatched', 'out_for_delivery', 'delivered'].includes(status) && (!effectiveTrackingNumber || !effectiveCourierName)) {
        throw new Error('Courier and tracking number are required for dispatched, out-for-delivery, and delivered statuses.');
      }

      if (requestedTrackingNumber) update.trackingNumber = requestedTrackingNumber;
      if (requestedCourierName) update.courierName = requestedCourierName;
      if (requestedDeliveryEta) update.deliveryEta = requestedDeliveryEta;

      if (status !== currentStatus) {
        update.statusHistory = [
          ...(Array.isArray(current.statusHistory) ? current.statusHistory : []),
          {
            status,
            timestamp: now,
            note: safeString(req.body?.note, 300) || `Order status updated directly to ${status} by an administrator.`,
            location: safeString(req.body?.location, 160) || 'SAELYXE Operations'
          }
        ];
      }

      const items = Array.isArray(current.items) ? current.items : [];
      const quantityByProduct = new Map<string, number>();
      for (const item of items) {
        const productId = safeString(item?.productId, 100);
        const quantity = Number(item?.quantity);
        if (!productId || !Number.isInteger(quantity) || quantity < 1) {
          if (INVENTORY_COMMIT_STATUSES.has(status) || status === 'cancelled') {
            throw new Error('Order inventory data is invalid.');
          }
          continue;
        }
        quantityByProduct.set(productId, (quantityByProduct.get(productId) || 0) + quantity);
      }

      const canAutoRestoreInventory =
        status === 'cancelled' &&
        current.inventoryCommitted === true &&
        !['dispatched', 'out_for_delivery', 'delivered'].includes(currentStatus);
      const needsInventoryCommit =
        INVENTORY_COMMIT_STATUSES.has(status) &&
        current.inventoryCommitted !== true;
      const needsInventoryRestore = canAutoRestoreInventory;

      // Firestore transactions require all reads before writes. Read every
      // affected product first, then apply inventory mutations.
      const productSnapshots = new Map<string, { ref: any; data: any }>();
      if (needsInventoryCommit || needsInventoryRestore) {
        for (const productId of quantityByProduct.keys()) {
          const productRef = adminDb.collection('products').doc(productId);
          const productSnap = await transaction.get(productRef);
          if (!productSnap.exists) {
            throw new Error('A product in this order is no longer available.');
          }
          productSnapshots.set(productId, { ref: productRef, data: productSnap.data() || {} });
        }
      }

      if (needsInventoryCommit) {
        if (['paypal', 'payzy'].includes(current.paymentMethod) && current.paymentStatus !== 'verified') {
          throw new Error('Online payment must be verified before moving this order into an active fulfillment stage.');
        }

        for (const [productId, quantity] of quantityByProduct.entries()) {
          const cached = productSnapshots.get(productId);
          if (!cached) throw new Error('Order inventory could not be verified.');
          const stockCount = Number(cached.data.stockCount);
          if (!Number.isFinite(stockCount) || stockCount < quantity) {
            throw new Error(`${cached.data.title || 'A product'} does not have enough stock for this order.`);
          }
          const nextStock = stockCount - quantity;
          transaction.update(cached.ref, {
            stockCount: nextStock,
            inStock: nextStock > 0,
            updatedAt: now
          });
        }

        update.inventoryCommitted = true;
        update.inventoryCommittedAt = current.inventoryCommittedAt || now;
        update.requiresManualReview = false;
        update.inventoryException = null;
        if (current.paymentMethod === 'cod' && current.paymentStatus === 'cancelled') {
          update.paymentStatus = 'cod_pending';
        }
      }

      if (status === 'cancelled') {
        if (needsInventoryRestore) {
          for (const [productId, quantity] of quantityByProduct.entries()) {
            const cached = productSnapshots.get(productId);
            if (!cached) continue;
            const stockCount = Number(cached.data.stockCount);
            const nextStock = Math.max(0, Number.isFinite(stockCount) ? stockCount : 0) + quantity;
            transaction.update(cached.ref, {
              stockCount: nextStock,
              inStock: nextStock > 0,
              updatedAt: now
            });
          }
          update.inventoryCommitted = false;
          update.inventoryReservationReleasedAt = now;
          update.requiresManualReview = false;
          update.inventoryException = null;
        } else if (current.inventoryCommitted === true) {
          // Once a courier has collected the parcel, inventory is not silently
          // restored. A real return must be reviewed before stock is increased.
          update.requiresManualReview = true;
          update.inventoryException = 'Cancellation after dispatch requires manual physical-return inventory review.';
        }

        if (current.paymentMethod !== 'paypal' || current.paymentStatus !== 'verified') {
          update.paymentStatus = 'cancelled';
        }
      }

      if (status === 'delivered' && current.paymentMethod === 'cod') {
        update.paymentStatus = 'cod_collected';
      }

      transaction.update(ref, update);
    });

    const updated = await ref.get();
    const updatedOrder = { id: updated.id, ...updated.data() };
    if (token) {
      await writeAdminAudit(adminDb, token, 'ORDER_STATUS_UPDATED', `Order ${id} updated from ${previousStatus} to ${status}.`);
    }

    if (previousStatus !== status) {
      const emailDelivery: EmailDeliveryResult = await sendOrderStatusEmail(updatedOrder, previousStatus).catch(error => ({
        sent: false,
        error: safeString(error instanceof Error ? error.message : error, 240) || 'order_status_email_error'
      }));
      const attemptedAt = new Date().toISOString();
      await ref.set({
        lastStatusEmailStatus: emailDelivery.sent ? 'sent' : 'failed',
        lastStatusEmailId: emailDelivery.id || null,
        lastStatusEmailError: emailDelivery.sent ? null : emailDelivery.error || 'unknown_error',
        lastStatusEmailSentAt: emailDelivery.sent ? attemptedAt : null,
        lastStatusEmailAttemptedAt: attemptedAt,
        lastStatusEmailFor: status
      }, { merge: true }).catch(error => {
        console.error('Order status email delivery state could not be recorded:', error);
      });
    }

    const finalOrder = await ref.get();
    return res.json({ id: finalOrder.id, ...finalOrder.data() });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update order.';
    const statusCode =
      message.startsWith('Invalid order transition') ? 409 :
      message.includes('Cancelled orders are terminal') ? 409 :
      message.includes('must be cancelled through') ? 409 :
      message.includes('must be refunded from the Payzy merchant portal') ? 409 :
      message.includes('Online payment must be verified') ? 409 :
      message.includes('not enough stock') ? 409 :
      message.includes('Courier and tracking number are required') ? 409 :
      message === 'Order not found.' ? 404 : 400;
    return res.status(statusCode).json({ error: message });
  }
});

app.post('/api/restock/dispatch', async (req, res) => {
  const adminDb = getAdminDb();
  let lockRef: any = null;
  let lockAcquired = false;
  let executionId = '';
  try {
    if (!adminDb) return res.status(503).json({ error: 'Restock service is not configured.' });

    const token = await readBearerToken(req);
    if (!token || !(await isAdminToken(token))) return res.status(403).json({ error: 'Admin access required.' });
    if (!(await hasValidAppCheck(req))) return res.status(401).json({ error: 'App integrity check failed.' });
    if (!(await enforceRateLimit(adminDb, `restock-dispatch:${token.uid}`, 12, 60 * 60_000))) {
      return res.status(429).json({ error: 'Too many restock dispatch attempts. Please wait before retrying.' });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    if (!apiKey || !from) {
      return res.status(503).json({ error: 'Transactional email is not configured.' });
    }

    const productId = safeString(req.body?.productId, 100);
    if (!productId) return res.status(400).json({ error: 'Product ID is required.' });

    const productSnap = await adminDb.collection('products').doc(productId).get();
    if (!productSnap.exists) return res.status(404).json({ error: 'Product not found.' });
    const product: any = { id: productSnap.id, ...productSnap.data() };
    if (product.inStock !== true || Math.max(0, Number(product.stockCount) || 0) < 1) {
      return res.status(409).json({ error: 'Restock alerts can only be sent while this product is currently in stock.' });
    }

    executionId = `restock-${crypto.randomBytes(8).toString('hex')}`;
    const currentLockRef = adminDb.collection('restock_dispatch_locks').doc(productId);
    lockRef = currentLockRef;
    const nowMs = Date.now();
    const lockTtlMs = 10 * 60_000;

    await adminDb.runTransaction(async transaction => {
      const lockSnap = await transaction.get(currentLockRef);
      const lockData: any = lockSnap.exists ? lockSnap.data() || {} : {};
      if (lockSnap.exists && Number(lockData.expiresAtMs) > nowMs) {
        throw Object.assign(new Error('A restock dispatch for this product is already in progress.'), { statusCode: 409 });
      }
      transaction.set(currentLockRef, {
        productId,
        executionId,
        ownerUid: token.uid,
        createdAt: new Date(nowMs).toISOString(),
        expiresAtMs: nowMs + lockTtlMs
      });
    });
    lockAcquired = true;

    const allNotifications = await adminDb.collection('stock_notifications')
      .where('productId', '==', productId)
      .limit(500)
      .get();

    const staleSendingThreshold = nowMs - 15 * 60_000;
    const candidates = allNotifications.docs
      .filter(docSnap => {
        const data: any = docSnap.data() || {};
        if (data.status === 'pending' || data.status === 'failed') return true;
        if (data.status === 'sending') {
          const started = Date.parse(safeString(data.dispatchStartedAt, 80));
          return Number.isFinite(started) && started < staleSendingThreshold;
        }
        return false;
      })
      .slice(0, 200);

    if (candidates.length === 0) {
      await lockRef.delete().catch(() => undefined);
      lockRef = null;
      await writeAdminAudit(adminDb, token, 'RESTOCK_DISPATCH_NOOP', `No pending or failed restock recipients for ${product.title || productId}.`);
      return res.json({
        success: true,
        productTitle: product.title || 'Selected Garment',
        dispatchedCount: 0,
        failedCount: 0,
        processedCount: 0,
        recipients: [],
        executionId
      });
    }

    const dispatchStartedAt = new Date().toISOString();
    const claimBatch = adminDb.batch();
    for (const docSnap of candidates) {
      const data: any = docSnap.data() || {};
      claimBatch.update(docSnap.ref, {
        status: 'sending',
        dispatchExecutionId: executionId,
        dispatchStartedAt,
        dispatchFinishedAt: FieldValue.delete(),
        lastDispatchError: FieldValue.delete(),
        dispatchAttempts: Math.max(0, Number(data.dispatchAttempts) || 0) + 1
      });
    }
    await claimBatch.commit();

    const recipients: string[] = [];
    const failedRecipients: string[] = [];
    const productUrl = `https://www.saelyxe.com/product/${encodeURIComponent(safeString(product.slug, 160) || productId)}`;

    for (const docSnap of candidates) {
      const subscriber: any = docSnap.data() || {};
      const email = safeString(subscriber.customerEmail, 254).toLowerCase();
      const finishedAt = new Date().toISOString();

      if (!isEmail(email)) {
        failedRecipients.push(email || docSnap.id);
        await docSnap.ref.update({
          status: 'failed',
          notified: false,
          dispatchFinishedAt: finishedAt,
          lastDispatchError: 'Invalid subscriber email address.'
        });
        continue;
      }

      const html = [
        '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#181614">',
        '<h2>SAELYXE — Back in Stock</h2>',
        `<p>${escapeHtml(subscriber.customerName || 'Valued Patron')}, the piece you requested is available again.</p>`,
        `<p><strong>${escapeHtml(product.title || 'SAELYXE Garment')}</strong></p>`,
        `<p>Requested size: ${escapeHtml(subscriber.selectedSize || 'Standard')}</p>`,
        `<p><a href="${productUrl}">View the garment</a></p>`,
        '<p>Availability can change quickly while the drop remains live.</p>',
        '</div>'
      ].join('');

      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': `saelyxe-restock-${docSnap.id}`
          },
          body: JSON.stringify({
            from,
            to: [email],
            subject: `Back in stock: ${product.title || 'SAELYXE Garment'}`,
            html
          })
        });

        const payload: any = await response.json().catch(() => ({}));
        if (!response.ok) {
          failedRecipients.push(email);
          await docSnap.ref.update({
            status: 'failed',
            notified: false,
            dispatchFinishedAt: finishedAt,
            lastDispatchError: `Resend HTTP ${response.status}`
          });
          continue;
        }

        recipients.push(email);
        await docSnap.ref.update({
          status: 'sent',
          notified: true,
          notifiedAt: finishedAt,
          dispatchFinishedAt: finishedAt,
          resendEmailId: safeString(payload?.id, 160),
          lastDispatchError: FieldValue.delete()
        });
      } catch (error) {
        failedRecipients.push(email);
        await docSnap.ref.update({
          status: 'failed',
          notified: false,
          dispatchFinishedAt: finishedAt,
          lastDispatchError: safeString(error instanceof Error ? error.message : 'Email transport failed.', 240)
        });
      }
    }

    await writeAdminAudit(
      adminDb,
      token,
      failedRecipients.length ? 'RESTOCK_DISPATCH_PARTIAL' : 'RESTOCK_ALERT_DISPATCHED',
      `Restock dispatch ${executionId} for ${product.title || productId}: ${recipients.length} sent, ${failedRecipients.length} failed.`
    );

    return res.status(failedRecipients.length ? 207 : 200).json({
      success: failedRecipients.length === 0,
      productTitle: product.title || 'Selected Garment',
      dispatchedCount: recipients.length,
      failedCount: failedRecipients.length,
      processedCount: candidates.length,
      recipients,
      failedRecipients,
      executionId,
      error: failedRecipients.length ? 'Some recipients failed. Retry will target failed recipients only.' : undefined
    });
  } catch (error: any) {
    const statusCode = Number(error?.statusCode) || 500;
    console.error('Restock dispatch failed:', error);
    return res.status(statusCode).json({
      error: safeString(error?.message, 240) || 'Unable to dispatch restock alerts.'
    });
  } finally {
    if (lockAcquired && lockRef) {
      try {
        const snapshot = await lockRef.get();
        if (snapshot.exists && snapshot.data()?.executionId === executionId) {
          await lockRef.delete();
        }
      } catch {
        // Lock TTL protects against a cleanup transport failure.
      }
    }
  }
});

app.get(['/api/sitemap', '/sitemap.xml'], async (_req, res) => {
  try {
    const urls = [
      '/',
      '/collections/all',
      '/collections/men',
      '/collections/women',
      '/collections/new',
      '/collections/knits',
      '/vip',
      '/care/shipping',
      '/contact-support',
      '/care/size-guide',
      '/care/authenticity',
      '/legal/terms',
      '/legal/privacy',
      '/legal/returns'
    ];

    const adminDb = getAdminDb();
    if (adminDb) {
      const products = await adminDb.collection('products').get();
      for (const product of products.docs) {
        const data: any = product.data();
        const slug = safeString(data.slug, 160) || product.id;
        urls.push(`/product/${encodeURIComponent(slug)}`);
      }
    }

    const lastmod = new Date().toISOString().slice(0, 10);
    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...urls.map(url => `  <url><loc>https://www.saelyxe.com${url}</loc><lastmod>${lastmod}</lastmod></url>`),
      '</urlset>'
    ].join('\n');

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600');
    return res.status(200).send(xml);
  } catch {
    return res.status(500).send('Unable to generate sitemap.');
  }
});

app.get('/api/preview/order-email', (_req, res) => {
  const sampleOrder = {
    id: 'preview_order_123',
    orderNumber: 'SAEL-20260913-9821',
    createdAt: new Date().toISOString(),
    customerName: 'Roshan Samarasinghe',
    email: 'saelyxe.co@gmail.com',
    phone: '0707775568',
    address: 'No. 42/B, Ward Place, Cinnamon Gardens',
    city: 'Colombo 07',
    postalCode: '00700',
    country: 'Sri Lanka',
    paymentMethod: 'cod',
    paymentStatus: 'pending',
    subtotalLKR: 14500,
    shippingLKR: 0,
    discountLKR: 0,
    totalLKR: 14500,
    promoCode: 'SAELYXE10',
    items: [
      {
        id: 'prod_1',
        title: 'SAELYXE Oversized French Terry Hoodie - Charcoal Noir',
        size: 'L',
        quantity: 1,
        priceLKR: 14500,
        image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=600&q=80'
      }
    ],
    _isEmailPreview: true
  };
  const html = buildSaelyxeOrderEmail({
    order: sampleOrder,
    heading: 'Order summary',
    intro: 'Thank you for choosing SAELYXE. Your order has been recorded and payment will be collected on delivery.'
  });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(html);
});

app.get('/api/preview/admin-email', (_req, res) => {
  const sampleOrder = {
    id: 'preview_order_123',
    orderNumber: 'SAEL-20260913-9821',
    createdAt: new Date().toISOString(),
    customerName: 'Roshan Samarasinghe',
    email: 'saelyxe.co@gmail.com',
    phone: '0707775568',
    address: 'No. 42/B, Ward Place, Cinnamon Gardens',
    city: 'Colombo 07',
    postalCode: '00700',
    country: 'Sri Lanka',
    paymentMethod: 'cod',
    paymentStatus: 'pending',
    subtotalLKR: 14500,
    shippingLKR: 0,
    discountLKR: 0,
    totalLKR: 14500,
    promoCode: 'SAELYXE10',
    items: [
      {
        id: 'prod_1',
        title: 'SAELYXE Oversized French Terry Hoodie - Charcoal Noir',
        size: 'L',
        quantity: 1,
        priceLKR: 14500,
        image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=600&q=80'
      }
    ],
    _isEmailPreview: true
  };
  const html = buildSaelyxeAdminNewOrderEmail(sampleOrder);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(html);
});

export default app;
