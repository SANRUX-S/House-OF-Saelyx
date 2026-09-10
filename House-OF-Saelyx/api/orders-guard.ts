import type { IncomingMessage, ServerResponse } from 'node:http';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import app from './index.js';

const MAX_BODY_BYTES = 64 * 1024;

function ensureFirebaseAdmin() {
  if (getApps().length) return true;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  if (!projectId || !clientEmail || !privateKey || privateKey.startsWith('replace-with-')) return false;
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  return true;
}

function json(res: ServerResponse, status: number, payload: Record<string, unknown>) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req: IncomingMessage & { body?: unknown; _body?: boolean }) {
  if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) return req.body as Record<string, unknown>;

  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > MAX_BODY_BYTES) throw Object.assign(new Error('Order request is too large.'), { statusCode: 413 });
    chunks.push(buffer);
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw Object.assign(new Error('Order request must contain valid JSON.'), { statusCode: 400 });
  }
}

export default async function handler(
  req: IncomingMessage & { url?: string; method?: string; headers: Record<string, any>; body?: unknown; _body?: boolean },
  res: ServerResponse
) {
  if (req.method !== 'POST') {
    req.url = '/api/orders';
    return app(req as any, res as any);
  }

  try {
    // Authentication must fail closed before any infrastructure/configuration
    // check so anonymous callers never learn server configuration state.
    const authorization = String(req.headers.authorization || '');
    if (!authorization.startsWith('Bearer ')) {
      return json(res, 401, { error: 'Please sign in to your SAELYXE account before checkout.' });
    }

    const idToken = authorization.slice(7).trim();
    if (!idToken) return json(res, 401, { error: 'Please sign in to your SAELYXE account before checkout.' });

    if (!ensureFirebaseAdmin()) {
      return json(res, 503, { error: 'Order authentication service is temporarily unavailable.' });
    }

    let decoded: any;
    try {
      decoded = await getAuth().verifyIdToken(idToken);
    } catch {
      return json(res, 401, { error: 'Your checkout session has expired. Please sign in again.' });
    }

    if (!decoded?.uid || decoded.email_verified !== true || typeof decoded.email !== 'string') {
      return json(res, 403, { error: 'A verified SAELYXE account is required before checkout.' });
    }

    const body = await readJsonBody(req);
    const paymentMethod = typeof body.paymentMethod === 'string' ? body.paymentMethod.trim().toLowerCase() : '';
    if (!['paypal', 'payzy'].includes(paymentMethod)) {
      return json(res, 400, { error: 'SAELYXE accepts PayPal or Payzy for live online checkout. Google Pay remains in review mode until its processor is connected; Cash on Delivery is not available.' });
    }

    req.body = body;
    req._body = true;
    req.url = '/api/orders';
    return app(req as any, res as any);
  } catch (error: any) {
    const status = Number(error?.statusCode) || 500;
    return json(res, status, { error: error?.message || 'Unable to create order.' });
  }
}
