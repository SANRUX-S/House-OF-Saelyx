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
    if (!process.env.FIREBASE_CLIENT_EMAIL || !privateKey || !process.env.VITE_FIREBASE_PROJECT_ID) {
      return null;
    }
    initializeApp({
      credential: cert({
        projectId: process.env.VITE_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey
      })
    });
  }
  return getAuth();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authorization = req.headers.authorization || '';
  if (!authorization.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const adminAuth = getAdminAuth();
    if (!adminAuth) return res.status(503).json({ error: 'Server authentication is not configured' });
    const token = await adminAuth.verifyIdToken(authorization.slice(7).trim());
    const configuredRole = token.email ? ADMIN_ROLES[token.email.toLowerCase()] : undefined;
    if (token.admin !== true && token.role !== 'admin' && token.role !== 'super_admin' && !configuredRole) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    (req as Request & { auth?: typeof token }).auth = token;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired authentication token' });
  }
}
