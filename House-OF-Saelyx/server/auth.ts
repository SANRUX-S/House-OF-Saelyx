import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import type { Request, Response, NextFunction } from 'express';

const ADMIN_ROLES: Record<string, 'admin' | 'super_admin'> = {
  'saelyx.co@gmail.com': 'super_admin',
  'saelyx.co+super@gmail.com': 'super_admin',
  'saelyx.co+admin@gmail.com': 'admin'
};

function getAdminAuth() {
  if (!getApps().length) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const hasPlaceholder = (value?: string) => !value || value.startsWith('replace-with-') || value.startsWith('your-');
    if (hasPlaceholder(clientEmail) || hasPlaceholder(privateKey) || hasPlaceholder(projectId)) {
      return null;
    }
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey
      })
    });
  }
  return getAuth();
}

function getFirebaseApiKey() {
  const apiKey = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY;
  if (!apiKey || apiKey.startsWith('replace-with-') || apiKey.startsWith('your-')) return null;
  return apiKey;
}

async function verifyWithFirebaseApi(idToken: string) {
  const apiKey = getFirebaseApiKey();
  if (!apiKey) return null;

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    }
  );
  if (!response.ok) return null;

  const payload = await response.json() as { users?: Array<{ localId?: string; email?: string; emailVerified?: boolean }> };
  const firebaseUser = payload.users?.[0];
  if (!firebaseUser?.email) return null;
  return {
    uid: firebaseUser.localId || '',
    email: firebaseUser.email,
    email_verified: firebaseUser.emailVerified === true
  };
}

export async function requireAuthenticated(req: Request, res: Response, next: NextFunction) {
  const authorization = req.headers.authorization || '';
  if (!authorization.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const adminAuth = getAdminAuth();
    const idToken = authorization.slice(7).trim();
    const token = adminAuth
      ? await adminAuth.verifyIdToken(idToken)
      : await verifyWithFirebaseApi(idToken);
    if (!token) return res.status(503).json({ error: 'Firebase server authentication is not configured' });
    const tokenClaims = token as { uid?: string; email?: string; email_verified?: boolean; admin?: boolean; role?: string; [key: string]: unknown };
    (req as Request & { auth?: typeof tokenClaims }).auth = tokenClaims;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired authentication token' });
  }
}

async function resolveAdminRole(req: Request): Promise<'admin' | 'super_admin' | null> {
  const auth = (req as Request & {
    auth?: {
      uid?: string;
      email?: string;
      email_verified?: boolean;
      adminRole?: 'admin' | 'super_admin';
    };
  }).auth;
  const email = auth?.email?.toLowerCase() || '';
  if (!auth?.uid || auth.email_verified !== true || !email) return null;

  const configuredRole = ADMIN_ROLES[email];
  if (configuredRole) return configuredRole;

  const adminAuth = getAdminAuth();
  if (!adminAuth) return null;

  const snap = await getFirestore().collection('admins').doc(auth.uid).get();
  if (!snap.exists) return null;
  const data = snap.data() || {};
  if (data.status !== 'active' || typeof data.email !== 'string' || data.email.toLowerCase() !== email) {
    return null;
  }
  return data.role === 'super_admin' ? 'super_admin' : data.role === 'admin' ? 'admin' : null;
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  return requireAuthenticated(req, res, async () => {
    try {
      const role = await resolveAdminRole(req);
      if (!role) return res.status(403).json({ error: 'Admin access required' });
      const auth = (req as Request & { auth?: Record<string, unknown> }).auth || {};
      auth.adminRole = role;
      (req as Request & { auth?: Record<string, unknown> }).auth = auth;
      return next();
    } catch {
      return res.status(503).json({ error: 'Administrator authorization is unavailable' });
    }
  });
}

export async function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  return requireAdmin(req, res, () => {
    const auth = (req as Request & { auth?: { adminRole?: string } }).auth;
    if (auth?.adminRole !== 'super_admin') {
      return res.status(403).json({ error: 'Super administrator access required' });
    }
    return next();
  });
}
