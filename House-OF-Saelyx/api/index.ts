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
const payHereFormParser = express.urlencoded({ extended: false, limit: '32kb' });

const DATABASE_ID = process.env.VITE_FIREBASE_DATABASE_ID || 'ai-studio-saelyxmadeforpre-9fd90c38-837e-435e-b027-e53891c99a41';
const ADMIN_EMAILS = new Set([
  'saelyx.co@gmail.com',
  'saelyx.co+super@gmail.com',
  'saelyx.co+admin@gmail.com'
]);

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

function isAdminToken(token: DecodedIdToken | null) {
  if (!token) return false;
  const email = typeof token.email === 'string' ? token.email.toLowerCase() : '';
  return token.admin === true ||
    token.role === 'admin' ||
    token.role === 'super_admin' ||
    ADMIN_EMAILS.has(email);
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

function md5Upper(value: string) {
  return crypto.createHash('md5').update(value).digest('hex').toUpperCase();
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
    if (order.paymentStatus === 'verified' || order.inventoryCommitted === true || order.inventoryReserved === true) {
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
      paymentUpdatedAt: now
    });
  });
}

async function markPayPalOrderVerified(adminDb: any, orderId: string, paypalOrderId: string) {
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
      paymentCaptureCompletedAt: current.paymentCaptureCompletedAt || now,
      paymentUpdatedAt: now
    };

    if (current.inventoryReserved === true) {
      update.inventoryReserved = false;
      update.inventoryCommitted = true;
      update.inventoryCommittedAt = current.inventoryCommittedAt || now;
    }

    if (current.status === 'cancelled') {
      update.status = 'placed';
      update.updatedAt = now;
      update.statusHistory = [
        ...(Array.isArray(current.statusHistory) ? current.statusHistory : []),
        {
          status: 'placed',
          timestamp: now,
          note: 'PayPal payment completed after a checkout cancellation request; order restored for fulfilment or refund review.',
          location: 'SAELYXE Payment Verification'
        }
      ];
    }

    transaction.update(ref, update);
  });

  const updated = await ref.get();
  return { id: updated.id, ...updated.data() };
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

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'saelyxe-api',
    firebaseAdminConfigured: Boolean(getAdminDb()),
    transactionalEmailConfigured: Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL),
    mediaStorageConfigured: Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    ),
    appCheckEnforced: process.env.FIREBASE_APP_CHECK_ENFORCE === 'true',
    abuseProtectionConfigured: true,
    payHereConfigured: Boolean(process.env.PAYHERE_MERCHANT_ID && process.env.PAYHERE_MERCHANT_SECRET),
    payPalServerConfigured: Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET)
  });
});

app.post('/api/media/cloudinary-signature', async (req, res) => {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) return res.status(503).json({ error: 'Media service is not configured.' });

    const token = await readBearerToken(req);
    if (!isAdminToken(token)) {
      return res.status(403).json({ error: 'Admin access required.' });
    }
    // Admin media uploads rely on authenticated admin access only.
    // No App Check or rate-limit friction is applied to the private admin panel.
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
      return res.status(503).json({ error: 'Media storage is not configured.' });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = 'saelyxe/products';
    const signatureBase = `folder=${folder}&timestamp=${timestamp}`;
    const signature = crypto
      .createHash('sha1')
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
  const payHereConfigured = Boolean(process.env.PAYHERE_MERCHANT_ID && process.env.PAYHERE_MERCHANT_SECRET);
  const binanceConfigured = Boolean(process.env.BINANCE_PAY_ID);

  return res.json({
    paypal: {
      enabled: payPalServerConfigured,
      clientId: payPalServerConfigured ? payPalClientId : '',
      mode: process.env.PAYPAL_MODE === 'live' ? 'live' : 'sandbox'
    },
    payhere: {
      enabled: payHereConfigured
    },
    binance: {
      enabled: binanceConfigured
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
    const ref = adminDb.collection('orders').doc(orderId);
    const initialSnap = await ref.get();
    if (!initialSnap.exists) return res.status(404).json({ error: 'Order not found.' });
    const initialOrder: any = { id: initialSnap.id, ...initialSnap.data() };

    if (initialOrder.userId !== token.uid && !isAdminToken(token)) {
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
      if (current.userId !== token.uid && !isAdminToken(token)) {
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
    const requestedPayPalOrderId = safeString(req.body?.paypalOrderId, 160);
    const ref = adminDb.collection('orders').doc(orderId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Order not found.' });
    const order: any = { id: snap.id, ...snap.data() };

    if (order.userId !== token.uid && !isAdminToken(token)) {
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
    const captureStartedAt = new Date().toISOString();
    await ref.update({
      paymentCaptureStartedAt: captureStartedAt,
      paymentUpdatedAt: captureStartedAt
    });

    let captureResult: any = null;
    try {
      captureResult = await capturePayPalProviderOrder(paypalOrderId);
    } catch {
      captureResult = null;
    }

    const verification = await verifyPayPalOrder(order, paypalOrderId);
    if (!verification.verified) {
      const now = new Date().toISOString();
      if (order.status !== 'cancelled') {
        await ref.update({
          paymentStatus: 'pending_verification',
          paymentVerificationSource: 'paypal_orders_api',
          paymentVerificationError: verification.reason,
          paymentUpdatedAt: now
        });
      }
      return res.status(captureResult && !captureResult.ok ? 409 : 502).json({
        error: 'PayPal capture could not be confirmed.',
        verification
      });
    }

    const updated = await markPayPalOrderVerified(adminDb, orderId, paypalOrderId);
    return res.json(updated);
  } catch (error: any) {
    const status = Number(error?.statusCode) || 500;
    return res.status(status).json({ error: safeString(error?.message, 240) || 'Unable to capture PayPal payment.' });
  }
});

app.post('/api/payments/paypal/link/:orderId', async (req, res) => {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) return res.status(503).json({ error: 'Payment service is not configured.' });

    const token = await readBearerToken(req);
    if (!token) return res.status(401).json({ error: 'Authentication required.' });
    if (!(await hasValidAppCheck(req))) {
      return res.status(401).json({ error: 'App integrity check failed.' });
    }

    const orderId = safeString(req.params.orderId, 120);
    const paypalOrderId = safeString(req.body?.paypalOrderId, 160);
    if (!paypalOrderId) return res.status(400).json({ error: 'PayPal order reference is required.' });

    const ref = adminDb.collection('orders').doc(orderId);
    const guardRef = adminDb.collection('paypal_order_links').doc(paypalOrderId);
    const now = new Date().toISOString();

    await adminDb.runTransaction(async transaction => {
      const orderSnap = await transaction.get(ref);
      const guardSnap = await transaction.get(guardRef);
      if (!orderSnap.exists) throw Object.assign(new Error('Order not found.'), { statusCode: 404 });

      const order: any = { id: orderSnap.id, ...orderSnap.data() };
      if (order.userId !== token.uid && !isAdminToken(token)) {
        throw Object.assign(new Error('Order access denied.'), { statusCode: 403 });
      }
      if (order.paymentMethod !== 'paypal') {
        throw Object.assign(new Error('This order is not a PayPal order.'), { statusCode: 400 });
      }
      if (order.paymentStatus === 'verified') {
        throw Object.assign(new Error('Payment is already verified.'), { statusCode: 409 });
      }
      if (order.status === 'cancelled') {
        throw Object.assign(new Error('Cancelled orders cannot be linked to a new PayPal payment.'), { statusCode: 409 });
      }

      const existingProviderReference = safeString(order.paymentProviderReference, 160);
      if (existingProviderReference && existingProviderReference !== paypalOrderId) {
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
          orderNumber: safeString(order.orderNumber || order.id, 120),
          userId: order.userId,
          createdAt: now,
          serverCreatedAt: FieldValue.serverTimestamp()
        });
      }

      transaction.update(ref, {
        paymentProviderReference: paypalOrderId,
        paymentVerificationSource: 'paypal_linked',
        paymentUpdatedAt: now
      });
    });

    const updated = await ref.get();
    return res.json({ id: updated.id, ...updated.data() });
  } catch (error: any) {
    const status = Number(error?.statusCode) || 500;
    return res.status(status).json({ error: safeString(error?.message, 240) || 'Unable to link PayPal payment.' });
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
    const requestedPayPalOrderId = safeString(req.body?.paypalOrderId, 160);
    const ref = adminDb.collection('orders').doc(orderId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Order not found.' });
    const order: any = { id: snap.id, ...snap.data() };

    if (order.userId !== token.uid && !isAdminToken(token)) {
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
      const now = new Date().toISOString();
      if (order.status !== 'cancelled') {
        await ref.update({
          paymentStatus: 'pending_verification',
          paymentVerificationSource: 'paypal_orders_api',
          paymentVerificationError: verification.reason,
          paymentUpdatedAt: now
        });
      }
      return res.status(409).json({ error: 'PayPal payment could not be verified yet.', verification });
    }

    const updated = await markPayPalOrderVerified(adminDb, orderId, paypalOrderId);
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
    const ref = adminDb.collection('orders').doc(orderId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Order not found.' });
    const order: any = { id: snap.id, ...snap.data() };

    if (order.userId !== token.uid && !isAdminToken(token)) {
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
        const updated = await markPayPalOrderVerified(adminDb, orderId, paypalOrderId);
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

app.post('/api/payments/payhere/session/:orderId', async (req, res) => {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) return res.status(503).json({ error: 'Payment service is not configured.' });

    const token = await readBearerToken(req);
    if (!token) return res.status(401).json({ error: 'Authentication required.' });
    if (!(await hasValidAppCheck(req))) {
      return res.status(401).json({ error: 'App integrity check failed.' });
    }

    const merchantId = process.env.PAYHERE_MERCHANT_ID;
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET;
    if (!merchantId || !merchantSecret) {
      return res.status(503).json({ error: 'PayHere is not configured yet.' });
    }

    const orderId = safeString(req.params.orderId, 120);
    const snap = await adminDb.collection('orders').doc(orderId).get();
    if (!snap.exists) return res.status(404).json({ error: 'Order not found.' });
    const order: any = { id: snap.id, ...snap.data() };
    if (order.userId !== token.uid && !isAdminToken(token)) {
      return res.status(403).json({ error: 'Order access denied.' });
    }
    if (order.paymentMethod !== 'payhere') {
      return res.status(400).json({ error: 'This order is not a PayHere order.' });
    }

    const amount = Number(order.totalLKR).toFixed(2);
    const currency = 'LKR';
    const hashedSecret = md5Upper(merchantSecret);
    const hash = md5Upper(`${merchantId}${order.orderNumber}${amount}${currency}${hashedSecret}`);
    const nameParts = safeString(order.customerName, 120).split(/\s+/).filter(Boolean);
    const firstName = nameParts.shift() || 'SAELYXE';
    const lastName = nameParts.join(' ') || 'Customer';
    const baseUrl = 'https://www.saelyxe.com';

    return res.json({
      action: process.env.PAYHERE_MODE === 'sandbox'
        ? 'https://sandbox.payhere.lk/pay/checkout'
        : 'https://www.payhere.lk/pay/checkout',
      fields: {
        merchant_id: merchantId,
        return_url: `${baseUrl}/orders/${encodeURIComponent(order.orderNumber)}`,
        cancel_url: `${baseUrl}/checkout?payment=cancelled&order=${encodeURIComponent(order.orderNumber)}`,
        notify_url: `${baseUrl}/api/payments/payhere/notify`,
        first_name: firstName,
        last_name: lastName,
        email: order.email,
        phone: order.phone,
        address: order.address,
        city: order.city,
        country: order.country,
        order_id: order.orderNumber,
        items: `SAELYXE Order ${order.orderNumber}`,
        currency,
        amount,
        hash
      }
    });
  } catch {
    return res.status(500).json({ error: 'Unable to start PayHere payment.' });
  }
});

app.post('/api/payments/payhere/notify', payHereFormParser, async (req, res) => {
  try {
    const adminDb = getAdminDb();
    const merchantIdExpected = process.env.PAYHERE_MERCHANT_ID;
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET;
    if (!adminDb || !merchantIdExpected || !merchantSecret) return res.status(503).send('not configured');

    const merchantId = safeString(req.body?.merchant_id, 80);
    const orderId = safeString(req.body?.order_id, 120);
    const paymentId = safeString(req.body?.payment_id, 160);
    const amount = safeString(req.body?.payhere_amount, 40);
    const currency = safeString(req.body?.payhere_currency, 10).toUpperCase();
    const statusCode = safeString(req.body?.status_code, 10);
    const md5sig = safeString(req.body?.md5sig, 80).toUpperCase();

    if (!merchantId || merchantId !== merchantIdExpected || !orderId || !md5sig) {
      return res.status(400).send('invalid');
    }

    const localSig = md5Upper(
      `${merchantId}${orderId}${amount}${currency}${statusCode}${md5Upper(merchantSecret)}`
    );
    if (!crypto.timingSafeEqual(Buffer.from(localSig), Buffer.from(md5sig))) {
      return res.status(400).send('invalid signature');
    }

    const ref = adminDb.collection('orders').doc(orderId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).send('order not found');
    const order: any = snap.data() || {};
    if (order.paymentMethod !== 'payhere') return res.status(400).send('wrong payment method');

    const expectedAmount = Number(order.totalLKR).toFixed(2);
    if (currency !== 'LKR' || Number(amount).toFixed(2) !== expectedAmount) {
      await ref.update({
        paymentStatus: 'verification_mismatch',
        paymentProviderReference: paymentId || null,
        paymentVerificationSource: 'payhere_notify',
        paymentVerificationError: 'amount_or_currency_mismatch',
        paymentUpdatedAt: new Date().toISOString()
      });
      return res.status(200).send('ignored');
    }

    const statusMap: Record<string, string> = {
      '2': 'verified',
      '0': 'pending_verification',
      '-1': 'cancelled',
      '-2': 'failed',
      '-3': 'chargeback_review'
    };
    const paymentStatus = statusMap[statusCode] || 'pending_verification';
    const now = new Date().toISOString();
    await ref.update({
      paymentStatus,
      paymentProviderReference: paymentId || order.paymentProviderReference || null,
      paymentVerificationSource: 'payhere_notify',
      paymentVerifiedAt: paymentStatus === 'verified' ? now : order.paymentVerifiedAt || null,
      paymentUpdatedAt: now,
      payhereStatusCode: statusCode
    });

    return res.status(200).send('ok');
  } catch {
    return res.status(200).send('ignored');
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
    const paymentMethod = ['paypal', 'payhere', 'binance_qr'].includes(body.paymentMethod)
      ? body.paymentMethod
      : 'payhere';
    const paymentProviderReference = safeString(body.paymentProviderReference, 160);
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
        paymentStatus: 'pending_verification',
        paymentProviderReference: paymentProviderReference || null,
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
      const verification = await verifyPayPalOrder(responseOrder, paymentProviderReference).catch(() => ({ verified: false, reason: 'verification_error' }));
      if (verification.verified) {
        const verifiedAt = new Date().toISOString();
        responseOrder.paymentStatus = 'verified';
        responseOrder.paymentVerificationSource = 'paypal_orders_api';
        responseOrder.paymentVerifiedAt = verifiedAt;
        await orderRef.update({
          paymentStatus: 'verified',
          paymentVerificationSource: 'paypal_orders_api',
          paymentVerifiedAt: verifiedAt,
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

app.get('/api/orders', async (req, res) => {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) return res.status(503).json({ error: 'Order service is not configured.' });

    const token = await readBearerToken(req);
    if (!isAdminToken(token)) return res.status(403).json({ error: 'Admin access required.' });

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

    const clientKey = `tracking:${getClientAddress(req)}`;
    if (!(await enforceRateLimit(adminDb, clientKey, 60, 10 * 60_000))) {
      return res.status(429).json({ error: 'Too many tracking requests. Please try again later.' });
    }

    const id = safeString(req.params.id, 120);
    const snap = await adminDb.collection('orders').doc(id).get();
    if (!snap.exists) return res.status(404).json({ error: 'Order not found.' });

    const order: any = { id: snap.id, ...snap.data() };

    // Public tracking intentionally excludes email, phone, and street address.
    return res.json({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      items: order.items,
      status: order.status,
      trackingNumber: order.trackingNumber || '',
      courierName: order.courierName || '',
      deliveryEta: order.deliveryEta || '',
      createdAt: order.createdAt,
      statusHistory: order.statusHistory || [],
      city: order.city || '',
      country: order.country || ''
    });
  } catch {
    return res.status(500).json({ error: 'Unable to load tracking information.' });
  }
});

app.put('/api/orders/:id/status', async (req, res) => {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) return res.status(503).json({ error: 'Order service is not configured.' });

    const token = await readBearerToken(req);
    if (!isAdminToken(token)) return res.status(403).json({ error: 'Admin access required.' });

    const id = safeString(req.params.id, 120);
    const status = safeString(req.body?.status, 40);
    if (!ORDER_STATUSES.has(status)) return res.status(400).json({ error: 'Invalid order status.' });

    const ref = adminDb.collection('orders').doc(id);
    const now = new Date().toISOString();

    await adminDb.runTransaction(async transaction => {
      const snap = await transaction.get(ref);
      if (!snap.exists) throw new Error('Order not found.');

      const current: any = snap.data() || {};
      const currentStatus = safeString(current.status, 40) || 'placed';

      if (!canTransitionOrderStatus(currentStatus, status)) {
        throw new Error(`Invalid order transition: ${currentStatus} → ${status}.`);
      }

      const update: Record<string, unknown> = {
        status,
        updatedAt: now
      };

      for (const key of ['trackingNumber', 'courierName', 'deliveryEta'] as const) {
        const value = safeString(req.body?.[key], 160);
        if (value) update[key] = value;
      }

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
        if ((current.paymentMethod === 'paypal' || current.paymentMethod === 'payhere') && current.paymentStatus !== 'verified') {
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
        if (current.paymentMethod === 'binance_qr' && current.paymentStatus !== 'verified') {
          update.paymentStatus = 'verified';
          update.paymentVerificationSource = 'admin_manual_crypto_verification';
          update.paymentVerifiedAt = now;
          update.paymentVerifiedBy = token?.uid || 'admin';
        }
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
    return res.json({ id: updated.id, ...updated.data() });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update order.';
    const statusCode =
      message.startsWith('Invalid order transition') ? 409 :
      message.includes('not enough stock') ? 409 :
      message === 'Order not found.' ? 404 : 400;
    return res.status(statusCode).json({ error: message });
  }
});

app.post('/api/restock/dispatch', async (req, res) => {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) return res.status(503).json({ error: 'Restock service is not configured.' });

    const token = await readBearerToken(req);
    if (!isAdminToken(token)) return res.status(403).json({ error: 'Admin access required.' });

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

    const notificationSnap = await adminDb.collection('stock_notifications')
      .where('productId', '==', productId)
      .where('status', '==', 'pending')
      .get();

    const executionId = `restock-${crypto.randomBytes(6).toString('hex')}`;
    const recipients: string[] = [];

    for (const docSnap of notificationSnap.docs) {
      const subscriber: any = docSnap.data();
      const email = safeString(subscriber.customerEmail, 254).toLowerCase();
      if (!isEmail(email)) continue;

      const productUrl = `https://www.saelyxe.com/product/${encodeURIComponent(safeString(product.slug, 160) || productId)}`;
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

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from,
          to: [email],
          subject: `Back in stock: ${product.title || 'SAELYXE Garment'}`,
          html
        })
      });

      if (!response.ok) {
        console.error('Restock email failed:', response.status);
        return res.status(502).json({ error: 'One or more restock emails could not be delivered.' });
      }

      recipients.push(email);
    }

    const batch = adminDb.batch();
    for (const docSnap of notificationSnap.docs) {
      const subscriber: any = docSnap.data();
      const email = safeString(subscriber.customerEmail, 254).toLowerCase();
      if (!recipients.includes(email)) continue;
      batch.update(docSnap.ref, {
        status: 'sent',
        notified: true,
        notifiedAt: new Date().toISOString(),
        cloudFunctionExecutionId: executionId
      });
    }
    await batch.commit();

    await adminDb.collection('audit_logs').add({
      timestamp: new Date().toISOString(),
      actor: typeof token?.email === 'string' ? token.email : token?.uid || 'admin',
      role: typeof token?.role === 'string' ? token.role : 'admin',
      action: 'RESTOCK_ALERT_DISPATCHED',
      details: `Dispatched ${recipients.length} restock emails for [${product.title || productId}] (Execution: ${executionId})`
    });

    return res.json({
      success: true,
      productTitle: product.title || 'Selected Garment',
      dispatchedCount: recipients.length,
      processedCount: notificationSnap.size,
      recipients,
      executionId
    });
  } catch (error) {
    console.error('Restock dispatch failed:', error);
    return res.status(500).json({ error: 'Unable to dispatch restock alerts.' });
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
