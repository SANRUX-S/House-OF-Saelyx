import express, { type Request } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import { getAppCheck } from 'firebase-admin/app-check';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

const app = express();
app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});
app.use(express.json({ limit: '64kb' }));

const DATABASE_ID = process.env.VITE_FIREBASE_DATABASE_ID || 'ai-studio-saelyxmadeforpre-9fd90c38-837e-435e-b027-e53891c99a41';
const ADMIN_EMAIL_ROLES = new Map<string, 'admin' | 'super_admin'>([
  ['saelyx.co@gmail.com', 'super_admin'],
  ['saelyx.co+super@gmail.com', 'super_admin'],
  ['saelyx.co+admin@gmail.com', 'admin']
]);
const ADMIN_EMAILS = new Set(ADMIN_EMAIL_ROLES.keys());
const ROOT_ADMIN_EMAILS = new Set(['saelyx.co@gmail.com', 'saelyx.co+super@gmail.com']);

const LEGACY_TEST_PRODUCT_IDS = new Set([
  'prod-mtogg0qy',
  'prod-mtiy4opf',
  'prod-mtogbgv5',
  'prod-mtogl585',
  'prod-mtogck9y',
  'prod-mtogokor'
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

const ORDER_TRANSITIONS: Record<string, Set<string>> = {
  placed: new Set(['confirmed', 'cancelled']),
  confirmed: new Set(['packed', 'cancelled']),
  packed: new Set(['dispatched']),
  dispatched: new Set(['out_for_delivery']),
  out_for_delivery: new Set(['delivered']),
  delivered: new Set(),
  cancelled: new Set()
};

function canTransitionOrderStatus(current: string, next: string) {
  if (current === next) return true;
  return ORDER_TRANSITIONS[current]?.has(next) === true;
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

function readStore() {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const storePaths = [
    path.join(process.cwd(), 'data', 'saelyx_store.json'),
    path.join(moduleDir, '..', 'data', 'saelyx_store.json')
  ];
  const storePath = storePaths.find(candidate => fs.existsSync(candidate));
  if (!storePath) throw new Error('Store data file is missing from the deployment.');
  const raw = fs.readFileSync(storePath, 'utf8');
  return JSON.parse(raw) as { products: any[]; settings: Record<string, unknown> };
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

  // Root bootstrap accounts are authenticated by Firebase Auth plus the exact
  // hard-coded root email allowlist. Secondary/invited admins still require a
  // verified Firebase email.
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

async function hasValidAppCheck(req: Request) {
  if (process.env.FIREBASE_APP_CHECK_ENFORCE !== 'true') return true;
  const token = safeString(req.header('X-Firebase-AppCheck'), 4096);
  if (!token || !getAdminDb()) return false;
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
  for (const collectionName of ['security_rate_limits', 'order_idempotency']) {
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
    for (const productId of quantityByProduct.keys()) {
      const productRef = adminDb.collection('products').doc(productId);
      const productSnap = await transaction.get(productRef);
      if (!productSnap.exists) {
        throw Object.assign(new Error('A product in this order is no longer available.'), { statusCode: 409 });
      }
      productSnapshots.set(productId, { ref: productRef, data: productSnap.data() || {} });
    }

    for (const [productId, quantity] of quantityByProduct.entries()) {
      const cached = productSnapshots.get(productId);
      if (!cached) throw Object.assign(new Error('Order inventory could not be reserved.'), { statusCode: 409 });
      const stockCount = Number(cached.data.stockCount);
      if (!Number.isFinite(stockCount) || stockCount < quantity) {
        throw Object.assign(new Error(`${cached.data.title || 'A product'} is no longer available in the requested quantity.`), { statusCode: 409 });
      }
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

async function sendOrderConfirmationEmail(order: any) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from || !order?.email) return;

  const itemLines = Array.isArray(order.items)
    ? order.items.map((item: any) =>
        `<li>${escapeHtml(item.title)} · Size ${escapeHtml(item.size)} · Qty ${Number(item.quantity) || 1}</li>`
      ).join('')
    : '';

  const html = [
    '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#181614">',
    '<h2>SAELYXE — Made for Presence</h2>',
    `<p>Thank you, ${escapeHtml(order.customerName)}. Your order has been securely recorded.</p>`,
    `<p><strong>Order:</strong> ${escapeHtml(order.orderNumber)}</p>`,
    `<ul>${itemLines}</ul>`,
    `<p><strong>Total:</strong> LKR ${Number(order.totalLKR).toLocaleString('en-US')}</p>`,
    `<p><strong>Payment status:</strong> ${escapeHtml(order.paymentStatus)}</p>`,
    '<p>We will send a separate update when payment and dispatch are confirmed.</p>',
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
      to: [order.email],
      subject: `SAELYXE Order ${order.orderNumber}`,
      html
    })
  });

  if (!response.ok) {
    console.error('Order confirmation email failed:', response.status);
  }
}

async function sendOrderStatusEmail(order: any, previousStatus?: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const email = safeString(order?.email || order?.customerEmail, 254).toLowerCase();
  if (!apiKey || !from || !isEmail(email)) return;

  const status = safeString(order?.status, 40);
  if (!status || status === previousStatus) return;

  const copy: Record<string, { subject: string; heading: string; message: string }> = {
    confirmed: {
      subject: `SAELYXE Order ${safeString(order.orderNumber, 120)} Confirmed`,
      heading: 'ORDER CONFIRMED',
      message: 'Your payment and order have been confirmed. Our atelier is preparing your pieces.'
    },
    packed: {
      subject: `SAELYXE Order ${safeString(order.orderNumber, 120)} Is Packed`,
      heading: 'ORDER PACKED',
      message: 'Your order has been packed and is ready for dispatch.'
    },
    dispatched: {
      subject: `SAELYXE Order ${safeString(order.orderNumber, 120)} Has Shipped`,
      heading: 'ORDER DISPATCHED',
      message: 'Your order has been handed to the courier and is on its way.'
    },
    out_for_delivery: {
      subject: `SAELYXE Order ${safeString(order.orderNumber, 120)} Is Out for Delivery`,
      heading: 'OUT FOR DELIVERY',
      message: 'Your order is with the delivery team and is heading to your destination.'
    },
    delivered: {
      subject: `SAELYXE Order ${safeString(order.orderNumber, 120)} Delivered`,
      heading: 'ORDER DELIVERED',
      message: 'Your SAELYXE order has been marked as delivered. Thank you for choosing SAELYXE.'
    },
    cancelled: {
      subject: order?.paymentStatus === 'refunded'
        ? `SAELYXE Refund Completed — ${safeString(order.orderNumber, 120)}`
        : `SAELYXE Order ${safeString(order.orderNumber, 120)} Cancelled`,
      heading: order?.paymentStatus === 'refunded' ? 'REFUND COMPLETED' : 'ORDER CANCELLED',
      message: order?.paymentStatus === 'refunded'
        ? 'Your PayPal refund has been completed and the order is cancelled.'
        : 'Your order has been cancelled.'
    }
  };

  const selected = copy[status];
  if (!selected) return;
  const trackingNumber = safeString(order?.trackingNumber, 160);
  const courierName = safeString(order?.courierName, 160);
  const deliveryEta = safeString(order?.deliveryEta, 160);
  const orderNumber = safeString(order?.orderNumber || order?.id, 120);
  const history = Array.isArray(order?.statusHistory) ? order.statusHistory : [];
  const eventTimestamp = safeString(history[history.length - 1]?.timestamp || order?.updatedAt || new Date().toISOString(), 100);
  const idempotency = crypto.createHash('sha256').update(`${orderNumber}|${status}|${eventTimestamp}`).digest('hex').slice(0, 40);

  const logistics = (trackingNumber || courierName || deliveryEta) ? [
    '<div style="margin-top:20px;padding:16px;background:#f7f5f2;border-radius:12px">',
    courierName ? `<p style="margin:4px 0"><strong>Courier:</strong> ${escapeHtml(courierName)}</p>` : '',
    trackingNumber ? `<p style="margin:4px 0"><strong>Tracking:</strong> ${escapeHtml(trackingNumber)}</p>` : '',
    deliveryEta ? `<p style="margin:4px 0"><strong>ETA:</strong> ${escapeHtml(deliveryEta)}</p>` : '',
    '</div>'
  ].join('') : '';

  const html = [
    '<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#181614">',
    '<p style="font-size:12px;letter-spacing:2px">SAELYXE — MADE FOR PRESENCE</p>',
    `<h2>${escapeHtml(selected.heading)}</h2>`,
    `<p>Hello ${escapeHtml(safeString(order?.customerName, 120) || 'Customer')},</p>`,
    `<p>${escapeHtml(selected.message)}</p>`,
    `<p><strong>Order:</strong> ${escapeHtml(orderNumber)}</p>`,
    logistics,
    `<p style="margin-top:24px"><a href="https://www.saelyxe.com/orders?id=${encodeURIComponent(orderNumber)}">View your order</a></p>`,
    '</div>'
  ].join('');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `saelyxe-order-status-${idempotency}`
    },
    body: JSON.stringify({ from, to: [email], subject: selected.subject, html })
  });

  if (!response.ok) {
    console.error('Order status email failed:', status, response.status);
  }
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

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    if (!apiKey || !from) {
      console.error('Admin password reset requested while Resend is not configured.');
      return genericSuccess();
    }

    try {
      const authAdmin = getAuth();
      const userRecord = await authAdmin.getUserByEmail(email);
      if (!userRecord.emailVerified && !ROOT_ADMIN_EMAILS.has(email)) return genericSuccess();

      const resetLink = await authAdmin.generatePasswordResetLink(email, {
        url: 'https://www.saelyxe.com/admin',
        handleCodeInApp: false
      });

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
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
      }
    } catch (error: any) {
      // User-not-found and transport failures intentionally share the generic response.
      console.error('Admin password reset delivery note:', safeString(error?.code || error?.message, 160));
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
    const actionSettings = { url: 'https://www.saelyxe.com/admin', handleCodeInApp: false };
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
  if (!value) return true;
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

app.get('/api/admin/health', async (req, res) => {
  try {
    const token = await readBearerToken(req);
    if (!token || !(await isSuperAdminToken(token))) return res.status(403).json({ error: 'Super Admin access required.' });
    if (!(await hasValidAppCheck(req))) return res.status(401).json({ error: 'App integrity check failed.' });
    return res.json({
      ok: true,
      firebaseAdminConfigured: Boolean(getAdminDb()),
      transactionalEmailConfigured: Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL),
      mediaStorageConfigured: Boolean(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
      ),
      appCheckEnforced: process.env.FIREBASE_APP_CHECK_ENFORCE === 'true',
      abuseProtectionConfigured: true,
      payPalServerConfigured: Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET)
    });
  } catch {
    return res.status(500).json({ error: 'Unable to load administrator health status.' });
  }
});

app.post('/api/media/cloudinary-signature', async (req, res) => {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) return res.status(503).json({ error: 'Media service is not configured.' });

    const token = await readBearerToken(req);
    if (!token || !(await isAdminToken(token))) return res.status(403).json({ error: 'Admin access required.' });
    if (!(await hasValidAppCheck(req))) return res.status(401).json({ error: 'App integrity check failed.' });
    if (!(await enforceRateLimit(adminDb, `media-signature:${token.uid}`, 30, 10 * 60_000))) {
      return res.status(429).json({ error: 'Too many media upload authorizations. Please wait and try again.' });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
      return res.status(503).json({ error: 'Media storage is not configured.' });
    }

    const kind = safeString(req.body?.kind, 30);
    const folder = kind === 'settings' ? 'saelyxe/settings' : 'saelyxe/products';
    const timestamp = Math.floor(Date.now() / 1000);
    const signatureBase = `folder=${folder}&timestamp=${timestamp}`;
    const signature = crypto
      .createHash('sha256')
      .update(`${signatureBase}${apiSecret}`)
      .digest('hex');

    return res.json({
      cloudName,
      apiKey,
      timestamp,
      folder,
      signature,
      maxFileSizeBytes: 10 * 1024 * 1024
    });
  } catch {
    return res.status(500).json({ error: 'Unable to authorize media upload.' });
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


app.get('/api/payments/config', (_req, res) => {
  const payPalClientId = process.env.PAYPAL_CLIENT_ID || '';
  const payPalServerConfigured = Boolean(payPalClientId && process.env.PAYPAL_CLIENT_SECRET);

  return res.json({
    paypal: {
      enabled: payPalServerConfigured,
      clientId: payPalServerConfigured ? payPalClientId : '',
      mode: process.env.PAYPAL_MODE === 'live' ? 'live' : 'sandbox'
    }
  });
});

app.get('/api/payments/paypal/status', async (_req, res) => {
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

    const token = await readBearerToken(req);
    if (!token) return res.status(401).json({ error: 'Authentication required.' });
    if (!(await hasValidAppCheck(req))) {
      return res.status(401).json({ error: 'App integrity check failed.' });
    }

    const orderId = safeString(req.params.orderId, 120);
    if (!(await enforceRateLimit(adminDb, `paypal-create:${token.uid}:${orderId}`, 6, 10 * 60_000))) {
      return res.status(429).json({ error: 'Too many PayPal payment attempts. Please wait and try again.' });
    }
    const ref = adminDb.collection('orders').doc(orderId);
    const initialSnap = await ref.get();
    if (!initialSnap.exists) return res.status(404).json({ error: 'Order not found.' });
    const initialOrder: any = { id: initialSnap.id, ...initialSnap.data() };

    if (initialOrder.userId !== token.uid && !(await isAdminToken(token))) {
      return res.status(403).json({ error: 'Order access denied.' });
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
      if (current.userId !== token.uid && !(await isAdminToken(token))) {
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

    const token = await readBearerToken(req);
    if (!token) return res.status(401).json({ error: 'Authentication required.' });
    if (!(await hasValidAppCheck(req))) {
      return res.status(401).json({ error: 'App integrity check failed.' });
    }

    const orderId = safeString(req.params.orderId, 120);
    if (!(await enforceRateLimit(adminDb, `paypal-capture:${token.uid}:${orderId}`, 12, 10 * 60_000))) {
      return res.status(429).json({ error: 'Too many PayPal capture attempts. Please wait and try again.' });
    }
    const requestedPayPalOrderId = safeString(req.body?.paypalOrderId, 160);
    const ref = adminDb.collection('orders').doc(orderId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Order not found.' });
    const order: any = { id: snap.id, ...snap.data() };

    if (order.userId !== token.uid && !(await isAdminToken(token))) {
      return res.status(403).json({ error: 'Order access denied.' });
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

    const token = await readBearerToken(req);
    if (!token) return res.status(401).json({ error: 'Authentication required.' });
    if (!(await hasValidAppCheck(req))) {
      return res.status(401).json({ error: 'App integrity check failed.' });
    }

    const orderId = safeString(req.params.orderId, 120);
    if (!(await enforceRateLimit(adminDb, `paypal-verify:${token.uid}:${orderId}`, 12, 10 * 60_000))) {
      return res.status(429).json({ error: 'Too many PayPal verification attempts. Please wait and try again.' });
    }
    const requestedPayPalOrderId = safeString(req.body?.paypalOrderId, 160);
    const ref = adminDb.collection('orders').doc(orderId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Order not found.' });
    const order: any = { id: snap.id, ...snap.data() };

    if (order.userId !== token.uid && !(await isAdminToken(token))) {
      return res.status(403).json({ error: 'Order access denied.' });
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

    const verification = await verifyPayPalOrder(order, paypalOrderId);
    if (!verification.verified) {
      await markPayPalVerificationPending(adminDb, orderId, paypalOrderId, verification.reason);
      return res.status(409).json({ error: 'PayPal payment could not be verified yet.', verification });
    }

    const updated = await markPayPalOrderVerified(adminDb, orderId, paypalOrderId, verification);
    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: safeString(error?.message, 240) || 'Unable to verify PayPal payment.' });
  }
});

app.post('/api/payments/paypal/cancel/:orderId', async (req, res) => {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) return res.status(503).json({ error: 'Payment service is not configured.' });

    const token = await readBearerToken(req);
    if (!token) return res.status(401).json({ error: 'Authentication required.' });
    if (!(await hasValidAppCheck(req))) {
      return res.status(401).json({ error: 'App integrity check failed.' });
    }

    const orderId = safeString(req.params.orderId, 120);
    if (!(await enforceRateLimit(adminDb, `paypal-cancel:${token.uid}:${orderId}`, 6, 10 * 60_000))) {
      return res.status(429).json({ error: 'Too many PayPal cancellation attempts. Please wait and try again.' });
    }
    const ref = adminDb.collection('orders').doc(orderId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Order not found.' });
    const order: any = { id: snap.id, ...snap.data() };

    if (order.userId !== token.uid && !(await isAdminToken(token))) {
      return res.status(403).json({ error: 'Order access denied.' });
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
    const customerName = safeString(body.customerName, 120);
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

    const requested = inputItems.map((item: any) => ({
      productId: safeString(item?.productId, 100),
      size: safeString(item?.size, 30),
      quantity: Number(item?.quantity)
    }));

    if (requested.some(item => !item.productId || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20)) {
      return res.status(400).json({ error: 'Order item quantity or product reference is invalid.' });
    }

    const authToken = await readBearerToken(req);
    if (!authToken) {
      return res.status(401).json({ error: 'Please sign in before placing an order.' });
    }
    if (!(await hasValidAppCheck(req))) {
      return res.status(401).json({ error: 'App integrity check failed. Please refresh and try again.' });
    }
    if (!(await enforceRateLimit(adminDb, `orders:${authToken.uid}`, 5, 10 * 60_000))) {
      return res.status(429).json({ error: 'Too many order attempts. Please wait a few minutes and try again.' });
    }

    const requestedCurrency = safeString(body.currencyUsed, 10).toUpperCase();
    const currency = CURRENCIES.find(item => item.code === requestedCurrency) || CURRENCIES[0];
    const paymentMethod = safeString(body.paymentMethod, 30);
    if (!['paypal', 'cod'].includes(paymentMethod)) {
      return res.status(400).json({ error: 'Unsupported payment method.' });
    }
    // The PayPal provider reference is created and linked server-side after the local order exists.
    const paymentProviderReference = '';
    const checkoutAttemptId = safeString(body.checkoutAttemptId, 120);
    const duplicateFingerprint = crypto.createHash('sha256').update(JSON.stringify({
      uid: authToken.uid,
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
      const quantityByProduct = new Map<string, number>();

      for (const item of requested) {
        quantityByProduct.set(item.productId, (quantityByProduct.get(item.productId) || 0) + item.quantity);
      }

      for (const productId of quantityByProduct.keys()) {
        const ref = adminDb.collection('products').doc(productId);
        const snap = await transaction.get(ref);
        if (!snap.exists) throw new Error('One or more products are unavailable.');
        productCache.set(productId, { ref, data: { id: snap.id, ...snap.data() } });
      }

      const validatedItems = requested.map(item => {
        const product = productCache.get(item.productId)?.data;
        if (!product) throw new Error('One or more products are unavailable.');

        if (Array.isArray(product.sizes) && product.sizes.length > 0 && item.size && !product.sizes.includes(item.size)) {
          throw new Error(`Invalid size selected for ${product.title || 'product'}.`);
        }

        return {
          productId: product.id,
          title: safeString(product.title, 200),
          image: Array.isArray(product.images) ? safeString(product.images[0], 1000) : '',
          priceLKR: Number(product.priceLKR),
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

      const order = {
        id: orderNumber,
        orderNumber,
        userId: authToken.uid,
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

      transaction.set(orderRef, order);
      const guardExpiresAtMs = Date.now() + idempotencyWindowMs;
      transaction.set(guardRef, {
        orderNumber,
        userId: authToken.uid,
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
        return res.status(200).setHeader('X-Idempotent-Replay', 'true').json({ id: existing.id, ...existing.data() });
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

    // Keep short-lived abuse-protection documents bounded without requiring a manual cleanup job.
    await cleanupExpiredSecurityDocs(adminDb).catch(error => {
      console.warn('Security cleanup note:', error);
    });

    // Email failure must never roll back a successfully committed order.
    sendOrderConfirmationEmail(responseOrder).catch(error => {
      console.error('Order confirmation email error:', error);
    });

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

app.get('/api/orders/:id', async (req, res) => {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) return res.status(503).json({ error: 'Order service is not configured.' });

    const token = await readBearerToken(req);
    if (!token) return res.status(401).json({ error: 'Authentication required.' });
    if (!(await hasValidAppCheck(req))) {
      return res.status(401).json({ error: 'App integrity check failed. Please refresh and try again.' });
    }

    const id = safeString(req.params.id, 120);
    if (!id) return res.status(400).json({ error: 'Order reference is required.' });

    if (!(await enforceRateLimit(adminDb, `tracking:${token.uid}:${id}`, 30, 10 * 60_000))) {
      return res.status(429).json({ error: 'Too many tracking requests. Please try again later.' });
    }

    const snap = await adminDb.collection('orders').doc(id).get();
    if (!snap.exists) return res.status(404).json({ error: 'Order not found.' });

    const order: any = { id: snap.id, ...snap.data() };
    if (order.userId !== token.uid && !(await isAdminToken(token))) {
      // Use the same response as a missing order so the endpoint does not confirm
      // whether another customer's order reference exists.
      return res.status(404).json({ error: 'Order not found.' });
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

    const token = await readBearerToken(req);
    if (!token) return res.status(401).json({ error: 'Authentication required.' });
    if (!(await hasValidAppCheck(req))) return res.status(401).json({ error: 'App integrity check failed.' });

    const orderId = safeString(req.params.id, 120);
    const reason = safeString(req.body?.reason, 500);
    if (!orderId || !reason) return res.status(400).json({ error: 'Cancellation reason is required.' });
    if (!(await enforceRateLimit(adminDb, `cancel-request:${token.uid}:${orderId}`, 5, 60 * 60_000))) {
      return res.status(429).json({ error: 'Too many cancellation requests. Please wait and try again.' });
    }

    const ref = adminDb.collection('orders').doc(orderId);
    const now = new Date().toISOString();
    await adminDb.runTransaction(async transaction => {
      const snap = await transaction.get(ref);
      if (!snap.exists) throw Object.assign(new Error('Order not found.'), { statusCode: 404 });
      const order: any = { id: snap.id, ...snap.data() };
      if (safeString(order.userId, 160) !== token.uid) {
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
        cancellationRequestedBy: token.uid,
        cancellationReason: reason,
        cancellationRequestStatus: 'pending',
        updatedAt: now
      });
    });

    const updated = await ref.get();
    const updatedOrder: any = { id: updated.id, ...updated.data() };
    await adminDb.collection('audit_logs').add({
      timestamp: now,
      actor: typeof token.email === 'string' ? token.email : token.uid,
      actorUid: token.uid,
      role: 'patron',
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
    sendOrderStatusEmail(updatedOrder, safeString(order.status, 40)).catch(error => {
      console.error('Refund completion email error:', error);
    });
    return res.json(updatedOrder);
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
    if (!(await isAdminToken(token))) return res.status(403).json({ error: 'Admin access required.' });
    if (!(await hasValidAppCheck(req))) return res.status(401).json({ error: 'App integrity check failed.' });

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

      if (!canTransitionOrderStatus(currentStatus, status)) {
        throw new Error(`Invalid order transition: ${currentStatus} → ${status}.`);
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
        throw new Error('Courier and tracking number are required before dispatch.');
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
            note: safeString(req.body?.note, 300) || `Order status updated to ${status}.`,
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
          if (status === 'confirmed' || status === 'cancelled') {
            throw new Error('Order inventory data is invalid.');
          }
          continue;
        }
        quantityByProduct.set(productId, (quantityByProduct.get(productId) || 0) + quantity);
      }

      // Firestore transactions require all reads before writes. Read every affected
      // product first, then apply inventory mutations as a second phase.
      const productSnapshots = new Map<string, { ref: any; data: any }>();
      const needsInventoryCommit = status === 'confirmed' && current.inventoryCommitted !== true;
      const needsInventoryRestore = status === 'cancelled' && current.inventoryCommitted === true;

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
        if (current.paymentMethod === 'paypal' && current.paymentStatus !== 'verified') {
          throw new Error('Payment must be verified by the payment provider before confirming this order.');
        }

        for (const [productId, quantity] of quantityByProduct.entries()) {
          const cached = productSnapshots.get(productId);
          if (!cached) throw new Error('Order inventory could not be verified.');
          const stockCount = Number(cached.data.stockCount);
          if (!Number.isFinite(stockCount) || stockCount < quantity) {
            throw new Error(`${cached.data.title || 'A product'} does not have enough stock to confirm this order.`);
          }
          const nextStock = stockCount - quantity;
          transaction.update(cached.ref, {
            stockCount: nextStock,
            inStock: nextStock > 0,
            updatedAt: now
          });
        }

        update.inventoryCommitted = true;
      }

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
        update.paymentStatus = current.paymentStatus === 'verified' ? 'refund_required' : 'cancelled';
      }

      transaction.update(ref, update);
    });

    const updated = await ref.get();
    const updatedOrder = { id: updated.id, ...updated.data() };
    if (token) await writeAdminAudit(adminDb, token, 'ORDER_STATUS_UPDATED', `Order ${id} updated to ${status}.`);
    if (previousStatus !== status) {
      sendOrderStatusEmail(updatedOrder, previousStatus).catch(error => {
        console.error('Order status email error:', error);
      });
    }
    return res.json(updatedOrder);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update order.';
    const statusCode =
      message.startsWith('Invalid order transition') ? 409 :
      message.includes('must be cancelled through') ? 409 :
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

export default app;
