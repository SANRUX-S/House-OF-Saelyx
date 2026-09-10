import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import { getAppCheck } from 'firebase-admin/app-check';
import { getFirestore } from 'firebase-admin/firestore';

const DATABASE_ID = process.env.VITE_FIREBASE_DATABASE_ID || 'ai-studio-saelyxmadeforpre-9fd90c38-837e-435e-b027-e53891c99a41';
const ROOT_ADMIN_EMAIL = 'saelyxe.co@gmail.com';
const SNAPSHOT_LIMIT = 100;
const AUDIT_LIMIT = 100;
const CACHE_TTL_MS = 5 * 60_000;
const FIRESTORE_TIMEOUT_MS = 12_000;

type AdminSnapshot = {
  orders: any[];
  stockNotifications: any[];
  messages: any[];
  staff: any[];
  auditLogs: any[];
  generatedAt: string;
};

let cachedSnapshot: { expiresAt: number; value: AdminSnapshot } | null = null;
let snapshotInFlight: Promise<AdminSnapshot> | null = null;

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

function withTimeout<T>(promise: Promise<T>, milliseconds: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Administrator data request timed out.')), milliseconds);
    promise.then(
      value => { clearTimeout(timer); resolve(value); },
      error => { clearTimeout(timer); reject(error); }
    );
  });
}

function mapDocs(snapshot: any) {
  return snapshot.docs.map((docSnap: any) => ({ id: docSnap.id, ...docSnap.data() }));
}

async function loadSnapshot(): Promise<AdminSnapshot> {
  const now = Date.now();
  if (cachedSnapshot && cachedSnapshot.expiresAt > now) return cachedSnapshot.value;
  if (snapshotInFlight) return snapshotInFlight;

  snapshotInFlight = (async () => {
    const db = getFirestore(DATABASE_ID);
    const [ordersSnap, stockSnap, inquiriesSnap, staffSnap, auditSnap] = await withTimeout(
      Promise.all([
        db.collection('orders').orderBy('createdAt', 'desc').limit(SNAPSHOT_LIMIT).get(),
        db.collection('stock_notifications').orderBy('createdAt', 'desc').limit(SNAPSHOT_LIMIT).get(),
        db.collection('concierge_inquiries').orderBy('createdAt', 'desc').limit(SNAPSHOT_LIMIT).get(),
        db.collection('staff').limit(SNAPSHOT_LIMIT).get(),
        db.collection('audit_logs').orderBy('timestamp', 'desc').limit(AUDIT_LIMIT).get()
      ]),
      FIRESTORE_TIMEOUT_MS
    );

    const value: AdminSnapshot = {
      orders: mapDocs(ordersSnap),
      stockNotifications: mapDocs(stockSnap),
      messages: mapDocs(inquiriesSnap),
      staff: mapDocs(staffSnap),
      auditLogs: mapDocs(auditSnap),
      generatedAt: new Date().toISOString()
    };
    cachedSnapshot = { value, expiresAt: Date.now() + CACHE_TTL_MS };
    return value;
  })();

  try {
    return await snapshotInFlight;
  } finally {
    snapshotInFlight = null;
  }
}

export function invalidateAdminBootstrapCache() {
  cachedSnapshot = null;
}

export default async function handler(req: any, res: any) {
  // This endpoint is a fallback snapshot. Realtime Firestore listeners deliver live
  // changes in the admin UI, so a private five-minute browser cache prevents the
  // legacy short poll from repeatedly invoking Vercel while keeping data current.
  res.setHeader('Cache-Control', 'private, max-age=300, must-revalidate');
  res.setHeader('Vary', 'Authorization, X-Firebase-AppCheck');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    ensureAdminApp();
    const token = await readBearerToken(req);
    if (!token || !(await isAdminToken(token))) return res.status(403).json({ error: 'Admin access required.' });
    if (!(await hasValidAppCheck(req))) return res.status(401).json({ error: 'App integrity check failed.' });

    const snapshot = await loadSnapshot();
    return res.status(200).json(snapshot);
  } catch (error: any) {
    const message = safeString(error?.message, 240);
    console.error('Admin bootstrap snapshot note:', message);

    if (/RESOURCE_EXHAUSTED|Quota exceeded/i.test(message)) {
      return res.status(429).json({ error: 'Administrator data quota is temporarily busy. Please wait a moment and retry.' });
    }
    if (/timed out/i.test(message)) {
      return res.status(503).json({ error: 'Administrator data service is temporarily slow. Please retry shortly.' });
    }
    if (/not configured/i.test(message)) {
      return res.status(503).json({ error: 'Administrator service is not configured.' });
    }
    return res.status(500).json({ error: 'Unable to load administrator data.' });
  }
}
