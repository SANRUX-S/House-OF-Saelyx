import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
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

  const payload = await response.json() as { users?: Array<{ localId?: string; email?: string }> };
  const firebaseUser = payload.users?.[0];
  if (!firebaseUser?.email) return null;
  return {
    uid: firebaseUser.localId || '',
    email: firebaseUser.email
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
    const tokenClaims = token as { uid?: string; email?: string; admin?: boolean; role?: string; [key: string]: unknown };
    (req as Request & { auth?: typeof tokenClaims }).auth = tokenClaims;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired authentication token' });
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  return requireAuthenticated(req, res, () => {
    const tokenClaims = (req as Request & { auth?: { uid?: string; email?: string; admin?: boolean; role?: string } }).auth;
    const configuredRole = tokenClaims?.email ? ADMIN_ROLES[tokenClaims.email.toLowerCase()] : undefined;
    if (
      tokenClaims?.admin !== true &&
      tokenClaims?.role !== 'admin' &&
      tokenClaims?.role !== 'super_admin' &&
      !configuredRole
    ) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    return next();
  });
}

export async function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  return requireAdmin(req, res, () => {
    const auth = (req as Request & { auth?: { email?: string; role?: string; admin?: boolean } }).auth;
    const email = auth?.email?.toLowerCase();
    if (auth?.role !== 'super_admin' && email !== 'saelyx.co@gmail.com' && email !== 'saelyx.co+super@gmail.com') {
      return res.status(403).json({ error: 'Super administrator access required' });
    }
    return next();
  });
}
