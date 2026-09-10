import crypto from 'crypto';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import { getAppCheck } from 'firebase-admin/app-check';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const DATABASE_ID = process.env.VITE_FIREBASE_DATABASE_ID || 'ai-studio-saelyxmadeforpre-9fd90c38-837e-435e-b027-e53891c99a41';
const ROOT_ADMIN_EMAIL = 'saelyxe.co@gmail.com';
const MAX_UPLOAD_BYTES = 2_100_000;
const MAX_REQUEST_BASE64_CHARS = 3_000_000;

function safeString(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function getProjectId() {
  return process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'gen-lang-client-0800900976';
}

function getBucketCandidates() {
  const projectId = getProjectId();
  return Array.from(new Set([
    process.env.FIREBASE_STORAGE_BUCKET?.trim(),
    process.env.VITE_FIREBASE_STORAGE_BUCKET?.trim(),
    `${projectId}.firebasestorage.app`,
    `${projectId}.appspot.com`,
    'gen-lang-client-0800900976.firebasestorage.app'
  ].filter((value): value is string => Boolean(value))));
}

function ensureAdminApp() {
  if (getApps().length) return;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const projectId = getProjectId();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  if (!projectId || !clientEmail || !privateKey || privateKey.startsWith('replace-with-')) {
    throw new Error('Firebase Admin credentials are not configured.');
  }
  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    storageBucket: getBucketCandidates()[0]
  });
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
  const key = crypto.createHash('sha256').update(`media-upload-v2:${uid}`).digest('hex');
  const ref = db.collection('security_rate_limits').doc(key);
  const now = Date.now();
  const windowMs = 10 * 60_000;
  const limit = 100;
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

async function saveToFirstAvailableBucket(buffer: Buffer, objectPath: string, contentType: string, downloadToken: string, uid: string) {
  const errors: string[] = [];
  for (const bucketName of getBucketCandidates()) {
    try {
      const object = getStorage().bucket(bucketName).file(objectPath);
      await object.save(buffer, {
        resumable: false,
        validation: 'crc32c',
        metadata: {
          contentType,
          cacheControl: 'public,max-age=31536000,immutable',
          metadata: {
            firebaseStorageDownloadTokens: downloadToken,
            saelyxeUploadedBy: uid,
            saelyxeMediaKind: 'products'
          }
        }
      });
      return { bucketName, objectPath };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${bucketName}: ${message.slice(0, 180)}`);
    }
  }
  console.error('SAELYXE Firebase Storage upload failed for all bucket candidates:', errors);
  throw new Error('Firebase Storage rejected the image on every configured bucket.');
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    ensureAdminApp();
    const token = await readAdminToken(req);
    if (!token || !(await isAdmin(token))) return res.status(403).json({ error: 'Admin access required for image upload.' });
    if (!(await hasValidAppCheck(req))) return res.status(401).json({ error: 'App integrity check failed. Refresh the admin page and retry.' });
    if (!(await enforceUploadRateLimit(token.uid))) return res.status(429).json({ error: 'Too many image uploads. Please wait and retry.' });

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const kind = safeString(body.kind, 20);
    if (!['products', 'settings'].includes(kind)) return res.status(400).json({ error: 'Invalid media destination.' });

    const requestedName = safeString(body.fileName, 140) || 'saelyxe-image.webp';
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
    if (!detectedMime) return res.status(415).json({ error: 'Only valid JPG, PNG, WebP, or AVIF images are accepted.' });

    const ext = detectedMime === 'image/jpeg' ? 'jpg' : detectedMime.split('/')[1];
    const baseName = requestedName.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 100) || `saelyxe-${Date.now()}`;
    const folder = kind === 'settings' ? 'saelyxe/settings' : 'saelyxe/products';
    const objectPath = `${folder}/${Date.now()}-${crypto.randomUUID()}-${baseName}.${ext}`;
    const downloadToken = crypto.randomUUID();
    const saved = await saveToFirstAvailableBucket(buffer, objectPath, detectedMime, downloadToken, token.uid);
    const secureUrl = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(saved.bucketName)}/o/${encodeURIComponent(saved.objectPath)}?alt=media&token=${encodeURIComponent(downloadToken)}`;

    return res.status(201).json({ secureUrl, bytes: buffer.length, format: ext, provider: 'firebase_storage' });
  } catch (error) {
    console.error('SAELYXE media upload error:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to upload image right now.' });
  }
}
