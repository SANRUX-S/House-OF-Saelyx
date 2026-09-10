import crypto from 'crypto';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import { getAppCheck } from 'firebase-admin/app-check';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const DATABASE_ID = process.env.VITE_FIREBASE_DATABASE_ID || 'ai-studio-saelyxmadeforpre-9fd90c38-837e-435e-b027-e53891c99a41';
const ROOT_ADMIN_EMAIL = 'saelyxe.co@gmail.com';
const ALLOWED_CATEGORIES = new Set(['men', 'women', 'new', 'collections', 'knits', 'sets', 'accessories']);

function safeString(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function ensureAdminApp() {
  if (getApps().length) return;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'gen-lang-client-0800900976';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  if (!projectId || !clientEmail || !privateKey || privateKey.startsWith('replace-with-')) {
    throw new Error('Firebase Admin credentials are not configured.');
  }
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

async function readToken(req: any): Promise<DecodedIdToken | null> {
  const authorization = safeString(req.headers?.authorization, 5000);
  if (!authorization.startsWith('Bearer ')) return null;
  try {
    ensureAdminApp();
    return await getAuth().verifyIdToken(authorization.slice(7).trim());
  } catch {
    return null;
  }
}

async function getAdminRole(token: DecodedIdToken | null): Promise<'admin' | 'super_admin' | null> {
  if (!token) return null;
  const email = safeString(token.email, 254).toLowerCase();
  if (email === ROOT_ADMIN_EMAIL) return 'super_admin';
  if (token.email_verified !== true || !email) return null;
  const db = getFirestore(DATABASE_ID);
  const snap = await db.collection('admins').doc(token.uid).get();
  if (!snap.exists) return null;
  const data: any = snap.data() || {};
  if (safeString(data.status, 30) !== 'active' || safeString(data.email, 254).toLowerCase() !== email) return null;
  const role = safeString(data.role, 30);
  return role === 'super_admin' ? 'super_admin' : role === 'admin' ? 'admin' : null;
}

async function hasValidAppCheck(req: any) {
  const enforced = process.env.FIREBASE_APP_CHECK_ENFORCE === 'true' || process.env.VERCEL_ENV === 'production';
  if (!enforced) return true;
  const token = safeString(req.headers?.['x-firebase-appcheck'], 4096);
  if (!token) return false;
  try {
    ensureAdminApp();
    await getAppCheck().verifyToken(token);
    return true;
  } catch {
    return false;
  }
}

function hasRecentAuthentication(token: DecodedIdToken, maxAgeSeconds = 10 * 60) {
  const authTime = Number(token.auth_time);
  if (!Number.isFinite(authTime) || authTime <= 0) return false;
  return Math.floor(Date.now() / 1000) - authTime <= maxAgeSeconds;
}

async function enforceRateLimit(uid: string, action: string, limit: number, windowMs: number) {
  const db = getFirestore(DATABASE_ID);
  const key = crypto.createHash('sha256').update(`${action}:${uid}`).digest('hex');
  const ref = db.collection('security_rate_limits').doc(key);
  const now = Date.now();
  return db.runTransaction(async transaction => {
    const snap = await transaction.get(ref);
    const data: any = snap.exists ? snap.data() || {} : {};
    const startedAt = Number(data.windowStartedAtMs) || 0;
    const count = Number(data.count) || 0;
    if (!startedAt || now - startedAt >= windowMs) {
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
    transaction.set(ref, { count: count + 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return true;
  });
}

async function writeAudit(token: DecodedIdToken, action: string, details: string) {
  const db = getFirestore(DATABASE_ID);
  const role = await getAdminRole(token);
  await db.collection('audit_logs').add({
    timestamp: new Date().toISOString(),
    actor: safeString(token.email, 254) || token.uid,
    actorUid: token.uid,
    role: role || 'admin',
    action: safeString(action, 80),
    details: safeString(details, 1000)
  });
}

function normalizeImageUrls(value: unknown) {
  return Array.isArray(value)
    ? Array.from(new Set(value.map(item => safeString(item, 1200)).filter(item => item.startsWith('https://')))).slice(0, 16)
    : [];
}

function normalizeTextArray(value: unknown, itemLength: number, maxItems: number) {
  return Array.isArray(value)
    ? value.map(item => safeString(item, itemLength)).filter(Boolean).slice(0, maxItems)
    : [];
}

function parseFirebaseStorageUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'firebasestorage.googleapis.com') return null;
    const match = parsed.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
    if (!match) return null;
    return { bucket: decodeURIComponent(match[1]), objectPath: decodeURIComponent(match[2]) };
  } catch {
    return null;
  }
}

async function cleanupProductImages(urls: string[]) {
  let deleted = 0;
  let failed = 0;
  for (const url of urls) {
    const target = parseFirebaseStorageUrl(url);
    if (!target || !target.objectPath.startsWith('saelyxe/products/')) continue;
    try {
      await getStorage().bucket(target.bucket).file(target.objectPath).delete({ ignoreNotFound: true });
      deleted += 1;
    } catch (error) {
      failed += 1;
      console.error('Unable to remove retired SAELYXE product image:', target, error);
    }
  }
  return { deleted, failed };
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  try {
    ensureAdminApp();
    const token = await readToken(req);
    const role = await getAdminRole(token);
    if (!token || !role) return res.status(403).json({ error: 'Admin access required.' });
    if (!(await hasValidAppCheck(req))) return res.status(401).json({ error: 'App integrity check failed.' });

    const id = safeString(req.query?.id, 100);
    if (!id) return res.status(400).json({ error: 'Product ID is required.' });
    const db = getFirestore(DATABASE_ID);
    const ref = db.collection('products').doc(id);

    if (req.method === 'PUT') {
      if (!(await enforceRateLimit(token.uid, 'admin-product-write-v2', 180, 60 * 60_000))) {
        return res.status(429).json({ error: 'Product changes are rate limited. Please wait and retry.' });
      }

      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const title = safeString(body.title, 200);
      const subtitle = safeString(body.subtitle, 300);
      const description = safeString(body.description, 5000);
      const fabricDetails = safeString(body.fabricDetails, 1000);
      const color = safeString(body.color, 100);
      const fit = safeString(body.fit, 160);
      const category = safeString(body.category, 40);
      const priceLKR = Number(body.priceLKR);
      const stockCount = Number(body.stockCount);
      const images = normalizeImageUrls(body.images);
      const sizes = normalizeTextArray(body.sizes, 30, 30);
      const bulletDetails = normalizeTextArray(body.bulletDetails, 300, 30);

      if (!title) return res.status(400).json({ error: 'Product title is required.' });
      if (!ALLOWED_CATEGORIES.has(category)) return res.status(400).json({ error: 'Choose a valid product category.' });
      if (!Number.isFinite(priceLKR) || priceLKR <= 0) return res.status(400).json({ error: 'Price must be greater than zero.' });
      if (!Number.isInteger(stockCount) || stockCount < 0) return res.status(400).json({ error: 'Stock must be a whole number of zero or more.' });
      if (!images.length) return res.status(400).json({ error: 'Upload at least one HTTPS product image.' });
      if (!description) return res.status(400).json({ error: 'Editorial description is required.' });
      if (!fabricDetails) return res.status(400).json({ error: 'Fabric details are required.' });
      if (!color) return res.status(400).json({ error: 'Product color is required.' });
      if (!fit) return res.status(400).json({ error: 'Product fit is required.' });
      if (category !== 'accessories' && !sizes.length) return res.status(400).json({ error: 'At least one size is required for clothing products.' });

      const slug = safeString(body.slug, 200) || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      if (!slug) return res.status(400).json({ error: 'Product title must create a valid slug.' });
      const slugCollision = await db.collection('products').where('slug', '==', slug).limit(2).get();
      if (slugCollision.docs.some(doc => doc.id !== id)) return res.status(409).json({ error: 'Another product already uses this title/slug.' });

      const existing = await ref.get();
      const now = new Date().toISOString();
      const completeTheSetProductId = safeString(body.completeTheSetProductId, 100);
      if (completeTheSetProductId === id) return res.status(400).json({ error: 'A product cannot complete a set with itself.' });
      if (completeTheSetProductId) {
        const linked = await db.collection('products').doc(completeTheSetProductId).get();
        if (!linked.exists) return res.status(400).json({ error: 'The selected complete-the-set product no longer exists.' });
      }

      const requestedHover = safeString(body.hoverImage, 1200);
      const hoverImage = requestedHover && images.includes(requestedHover) ? requestedHover : '';
      const payload = {
        id,
        slug,
        title,
        subtitle,
        description,
        fabricDetails,
        category,
        subCategory: safeString(body.subCategory, 100),
        priceLKR,
        stockCount,
        inStock: stockCount > 0,
        images,
        hoverImage,
        completeTheSetProductId,
        sizes,
        bulletDetails,
        badge: safeString(body.badge, 100),
        color,
        fit,
        createdAt: existing.exists ? safeString(existing.data()?.createdAt, 100) || now : now,
        updatedAt: now
      };

      await ref.set(payload, { merge: true });
      await writeAudit(token, existing.exists ? 'PRODUCT_UPDATED' : 'PRODUCT_CREATED', `${title} (${id})`);
      return res.json({ success: true, product: payload });
    }

    if (req.method === 'DELETE') {
      if (role !== 'super_admin') return res.status(403).json({ error: 'Super Admin access required.' });
      if (!hasRecentAuthentication(token)) return res.status(428).json({ error: 'Recent administrator authentication required before deleting a product. Sign out and sign in again.' });
      if (!(await enforceRateLimit(token.uid, 'admin-product-delete-v2', 30, 60 * 60_000))) {
        return res.status(429).json({ error: 'Product deletion is rate limited. Please wait and retry.' });
      }

      const snap = await ref.get();
      if (!snap.exists) return res.status(404).json({ error: 'Product not found.' });
      const data: any = snap.data() || {};
      const images = normalizeImageUrls(data.images);
      const hoverImage = safeString(data.hoverImage, 1200);
      if (hoverImage.startsWith('https://') && !images.includes(hoverImage)) images.push(hoverImage);

      await ref.delete();
      const mediaCleanup = await cleanupProductImages(images);
      await writeAudit(token, 'PRODUCT_RETIRED', `Retired ${safeString(data.title, 200) || id} (${id}); media deleted=${mediaCleanup.deleted}, failed=${mediaCleanup.failed}.`);
      return res.json({ success: true, mediaCleanup });
    }

    res.setHeader('Allow', 'PUT, DELETE');
    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (error) {
    console.error('SAELYXE admin product endpoint error:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to process product change.' });
  }
}
