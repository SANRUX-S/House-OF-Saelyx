import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import { getAppCheck } from 'firebase-admin/app-check';
import { getFirestore } from 'firebase-admin/firestore';

const DATABASE_ID = process.env.VITE_FIREBASE_DATABASE_ID || 'ai-studio-saelyxmadeforpre-9fd90c38-837e-435e-b027-e53891c99a41';
const ROOT_ADMIN_EMAIL = 'saelyxe.co@gmail.com';

function safeString(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function getProjectId() {
  return process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'gen-lang-client-0800900976';
}

function hasFirebaseAdminCredentials() {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  return Boolean(
    getProjectId() &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    privateKey &&
    !privateKey.startsWith('replace-with-')
  );
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

async function readBearerToken(req: any): Promise<DecodedIdToken | null> {
  const authorization = safeString(req.headers?.authorization, 5000);
  if (!authorization.startsWith('Bearer ')) return null;
  try {
    ensureAdminApp();
    return await getAuth().verifyIdToken(authorization.slice(7).trim());
  } catch {
    return null;
  }
}

async function isAdminToken(token: DecodedIdToken | null) {
  if (!token) return false;
  const email = safeString(token.email, 254).toLowerCase();
  if (email === ROOT_ADMIN_EMAIL) return true;
  if (!email || token.email_verified !== true) return false;

  const db = getFirestore(DATABASE_ID);
  const snap = await db.collection('admins').doc(token.uid).get();
  if (!snap.exists) return false;
  const data: any = snap.data() || {};
  return safeString(data.status, 30) === 'active' &&
    safeString(data.email, 254).toLowerCase() === email &&
    ['admin', 'super_admin'].includes(safeString(data.role, 30));
}

function isAppCheckEnforced() {
  return false;
}

async function hasValidAppCheck(req: any) {
  const appCheckToken = safeString(req.headers?.['x-firebase-appcheck'], 4096);
  if (!appCheckToken) return true;
  try {
    ensureAdminApp();
    await getAppCheck().verifyToken(appCheckToken);
    return true;
  } catch {
    return false;
  }
}

function isBlobConfigured() {
  const token = safeString(process.env.BLOB_READ_WRITE_TOKEN, 5000);
  if (!token) return false;
  const configuredStoreId = safeString(process.env.BLOB_STORE_ID, 300).replace(/^store_/, '');
  const tokenStoreId = token.split('_')[3] || '';
  return Boolean(configuredStoreId || tokenStoreId);
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    if (!hasFirebaseAdminCredentials()) {
      return res.status(503).json({ error: 'Administrator service is not configured.' });
    }

    const token = await readBearerToken(req);
    if (!token || !(await isAdminToken(token))) {
      return res.status(403).json({ error: 'Admin access required.' });
    }
    if (!(await hasValidAppCheck(req))) {
      return res.status(401).json({ error: 'App integrity check failed.' });
    }

    return res.status(200).json({
      ok: true,
      firebaseAdminConfigured: true,
      transactionalEmailConfigured: Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL),
      mediaStorageConfigured: isBlobConfigured(),
      mediaStorageProvider: 'vercel_blob',
      appCheckEnforced: isAppCheckEnforced(),
      abuseProtectionConfigured: true,
      payPalServerConfigured: Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET)
    });
  } catch (error) {
    console.error('SAELYXE admin health endpoint error:', error);
    return res.status(500).json({ error: 'Unable to load administrator health status.' });
  }
}
