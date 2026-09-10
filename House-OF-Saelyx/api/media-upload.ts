import crypto from 'crypto';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import { getAppCheck } from 'firebase-admin/app-check';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const DATABASE_ID = process.env.VITE_FIREBASE_DATABASE_ID || 'ai-studio-saelyxmadeforpre-9fd90c38-837e-435e-b027-e53891c99a41';
const ROOT_ADMIN_EMAIL = 'saelyxe.co@gmail.com';
const MAX_UPLOAD_BYTES = 2_100_000;
const MAX_REQUEST_BASE64_CHARS = 3_000_000;
const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const BLOB_API_URL = 'https://vercel.com/api/blob';
const BLOB_API_VERSION = '12';

function safeString(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function getProjectId() {
  return process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'gen-lang-client-0800900976';
}

function ensureAdminApp() {
  if (getApps().length) return;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const projectId = getProjectId();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  if (!projectId || !clientEmail || !privateKey || privateKey.startsWith('replace-with-')) {
    throw new Error('Firebase Admin credentials are not configured.');
  }
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

async function readAdminToken(req: any): Promise<DecodedIdToken | null> {
  const authorization = safeString(req.headers?.authorization, 5000);
  if (!authorization.startsWith('Bearer ')) return null;
  try {
    ensureAdminApp();
    return await getAuth().verifyIdToken(authorization.slice(7).trim());
  } catch {
    return null;
  }
}

async function isAdmin(token: DecodedIdToken | null) {
  if (!token) return false;
  const email = safeString(token.email, 254).toLowerCase();
  if (email === ROOT_ADMIN_EMAIL) return true;
  if (token.email_verified !== true || !email) return false;
  const db = getFirestore(DATABASE_ID);
  const snap = await db.collection('admins').doc(token.uid).get();
  if (!snap.exists) return false;
  const data: any = snap.data() || {};
  return safeString(data.status, 30) === 'active' &&
    safeString(data.email, 254).toLowerCase() === email &&
    ['admin', 'super_admin'].includes(safeString(data.role, 30));
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

async function enforceUploadRateLimit(uid: string) {
  const db = getFirestore(DATABASE_ID);
  const key = crypto.createHash('sha256').update(`media-upload:${uid}`).digest('hex');
  const ref = db.collection('security_rate_limits').doc(key);
  const now = Date.now();
  const windowMs = 10 * 60_000;
  const limit = 40;
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
        updatedAtMs: now
      });
      return true;
    }
    if (count >= limit) return false;
    transaction.set(ref, { count: count + 1, updatedAtMs: now }, { merge: true });
    return true;
  });
}

function detectMime(buffer: Buffer) {
  if (buffer.length >= 12 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  if (buffer.length >= 12 && buffer.subarray(4, 12).toString('ascii').includes('ftypavif')) return 'image/avif';
  return '';
}

function cleanBase64(value: string) {
  return value.replace(/^data:[^;]+;base64,/, '').replace(/\s+/g, '');
}

function getBlobCredentials() {
  const token = safeString(process.env.BLOB_READ_WRITE_TOKEN, 5000);
  if (!token) {
    throw new Error('Vercel Blob is not configured for this project. Connect the Blob store to the Vercel project and redeploy.');
  }
  const configuredStoreId = safeString(process.env.BLOB_STORE_ID, 300).replace(/^store_/, '');
  const tokenStoreId = token.split('_')[3] || '';
  const storeId = configuredStoreId || tokenStoreId;
  if (!storeId) {
    throw new Error('Vercel Blob store configuration is incomplete. Reconnect the Blob store and redeploy.');
  }
  return { token, storeId };
}

async function uploadToVercelBlob(buffer: Buffer, pathname: string, contentType: string) {
  const { token, storeId } = getBlobCredentials();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20_000);
  try {
    const requestId = `${storeId}:${Date.now()}:${crypto.randomBytes(8).toString('hex')}`;
    const response = await fetch(`${BLOB_API_URL}/?pathname=${encodeURIComponent(pathname)}`, {
      method: 'PUT',
      body: buffer,
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${token}`,
        'x-vercel-blob-store-id': storeId,
        'x-api-version': BLOB_API_VERSION,
        'x-api-blob-request-id': requestId,
        'x-api-blob-request-attempt': '0',
        'x-vercel-blob-access': 'public',
        'x-content-type': contentType,
        'x-cache-control-max-age': '31536000',
        'x-add-random-suffix': '0',
        'x-allow-overwrite': '0'
      }
    });

    const responseText = await response.text();
    let payload: any = {};
    try {
      payload = responseText ? JSON.parse(responseText) : {};
    } catch {
      payload = {};
    }

    if (!response.ok) {
      const blobCode = safeString(payload?.error?.code, 100);
      const blobMessage = safeString(payload?.error?.message, 300);
      console.error('SAELYXE Vercel Blob upload rejected:', { status: response.status, code: blobCode, message: blobMessage });
      if (response.status === 401 || response.status === 403) {
        throw new Error('Vercel Blob access was rejected. Reconnect the Blob store to this Vercel project and redeploy.');
      }
      if (response.status === 413 || blobCode === 'file_too_large') {
        throw new Error('The optimized image is too large for Vercel Blob.');
      }
      if (response.status === 429 || blobCode === 'rate_limited') {
        throw new Error('Vercel Blob is temporarily rate limited. Please wait a moment and retry.');
      }
      if (blobCode === 'store_not_found') {
        throw new Error('The connected Vercel Blob store could not be found. Reconnect the store and redeploy.');
      }
      throw new Error('Vercel Blob rejected the image upload. Please retry.');
    }

    const url = safeString(payload?.url, 2000);
    if (!url.startsWith('https://') || !url.includes('.blob.vercel-storage.com/')) {
      console.error('SAELYXE Vercel Blob returned an invalid media URL shape.');
      throw new Error('Vercel Blob did not return a valid image URL. Please retry.');
    }
    return url;
  } catch (error: any) {
    if (error?.name === 'AbortError') throw new Error('Vercel Blob upload timed out. Please retry.');
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    ensureAdminApp();
    const token = await readAdminToken(req);
    if (!token || !(await isAdmin(token))) return res.status(403).json({ error: 'Admin access required for image upload.' });
    if (!(await hasValidAppCheck(req))) return res.status(401).json({ error: 'App integrity check failed. Refresh the admin page and retry.' });
    if (!(await enforceUploadRateLimit(token.uid))) return res.status(429).json({ error: 'Too many image uploads. Please wait a few minutes and try again.' });

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const kind = safeString(body.kind, 20) as 'products' | 'settings';
    if (!['products', 'settings'].includes(kind)) return res.status(400).json({ error: 'Invalid media destination.' });

    const requestedName = safeString(body.fileName, 140) || 'saelyxe-image.webp';
    const claimedMime = safeString(body.mimeType, 40).toLowerCase();
    if (!ALLOWED_MIMES.has(claimedMime)) return res.status(415).json({ error: 'Only JPG, PNG, WebP, or AVIF images are accepted.' });

    const encoded = cleanBase64(safeString(body.dataBase64, MAX_REQUEST_BASE64_CHARS));
    if (!encoded) return res.status(400).json({ error: 'No image data was received from the computer.' });

    let buffer: Buffer;
    try {
      buffer = Buffer.from(encoded, 'base64');
    } catch {
      return res.status(400).json({ error: 'The uploaded image data is invalid.' });
    }
    if (!buffer.length || buffer.length > MAX_UPLOAD_BYTES) {
      return res.status(413).json({ error: 'The optimized image is too large for upload.' });
    }

    const detectedMime = detectMime(buffer);
    if (!detectedMime || !ALLOWED_MIMES.has(detectedMime)) {
      return res.status(415).json({ error: 'Only valid JPG, PNG, WebP, or AVIF images are accepted.' });
    }
    if (claimedMime !== detectedMime) {
      return res.status(415).json({ error: 'The image file type does not match its content.' });
    }

    const ext = detectedMime === 'image/jpeg' ? 'jpg' : detectedMime.split('/')[1];
    const baseName = requestedName.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 100) || `saelyxe-${Date.now()}`;
    const folder = kind === 'settings' ? 'saelyxe/settings' : 'saelyxe/products';
    const objectPath = `${folder}/${Date.now()}-${crypto.randomUUID()}-${baseName}.${ext}`;
    const secureUrl = await uploadToVercelBlob(buffer, objectPath, detectedMime);

    return res.status(201).json({ secureUrl, bytes: buffer.length, format: ext, provider: 'vercel_blob' });
  } catch (error) {
    console.error('SAELYXE media upload error:', error);
    const message = error instanceof Error ? error.message : 'Unable to upload image right now.';
    const status = /not configured|configuration is incomplete|reconnect/i.test(message) ? 503 : 500;
    return res.status(status).json({ error: message });
  }
}
