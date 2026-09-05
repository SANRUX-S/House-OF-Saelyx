import express, { type Request } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

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

const ORDER_STATUSES = new Set(['placed', 'confirmed', 'packed', 'dispatched', 'out_for_delivery', 'delivered']);

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
    firebaseAdminConfigured: Boolean(getAdminDb())
  });
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

    const requestedCurrency = safeString(body.currencyUsed, 10).toUpperCase();
    const currency = CURRENCIES.find(item => item.code === requestedCurrency) || CURRENCIES[0];
    const paymentMethod = ['paypal', 'payhere', 'binance_qr', 'cod'].includes(body.paymentMethod)
      ? body.paymentMethod
      : 'payhere';
    const paymentProviderReference = safeString(body.paymentProviderReference, 160);
    const orderNumber = `SOX-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
    const orderRef = adminDb.collection('orders').doc(orderNumber);

    let responseOrder: any = null;

    await adminDb.runTransaction(async transaction => {
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
        paymentStatus: paymentMethod === 'cod' ? 'pending_delivery' : 'pending_verification',
        paymentProviderReference: paymentProviderReference || null,
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

      for (const [productId, totalQuantity] of quantityByProduct.entries()) {
        const entry = productCache.get(productId);
        if (!entry) continue;
        const currentStock = Number(entry.data.stockCount);
        const nextStock = Math.max(0, currentStock - totalQuantity);
        transaction.update(entry.ref, {
          stockCount: nextStock,
          inStock: nextStock > 0,
          updatedAt: now
        });
      }

      responseOrder = { ...order };
      delete responseOrder.serverCreatedAt;
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
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Order not found.' });

    const current: any = snap.data() || {};
    const now = new Date().toISOString();
    const update: Record<string, unknown> = {
      status,
      updatedAt: now,
      statusHistory: [
        ...(Array.isArray(current.statusHistory) ? current.statusHistory : []),
        {
          status,
          timestamp: now,
          note: safeString(req.body?.note, 300) || `Order status updated to ${status}.`,
          location: safeString(req.body?.location, 160) || 'SAELYXE Operations'
        }
      ]
    };

    for (const key of ['trackingNumber', 'courierName', 'deliveryEta'] as const) {
      const value = safeString(req.body?.[key], 160);
      if (value) update[key] = value;
    }

    await ref.update(update);
    const updated = await ref.get();
    return res.json({ id: updated.id, ...updated.data() });
  } catch {
    return res.status(500).json({ error: 'Unable to update order.' });
  }
});

app.get('/api/sitemap', async (_req, res) => {
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
