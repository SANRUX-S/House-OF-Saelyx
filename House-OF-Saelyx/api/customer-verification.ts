import type { IncomingMessage, ServerResponse } from 'node:http';
import crypto from 'node:crypto';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getAppCheck } from 'firebase-admin/app-check';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';

const DATABASE_ID = process.env.VITE_FIREBASE_DATABASE_ID || 'ai-studio-saelyxmadeforpre-9fd90c38-837e-435e-b027-e53891c99a41';
const MAX_BODY_BYTES = 8 * 1024;

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
function safe(value: unknown, max: number) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
function escapeHtml(value: unknown) { return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }

async function readJsonBody(req: IncomingMessage & { body?: unknown }) {
  if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) return req.body as Record<string, unknown>;
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > MAX_BODY_BYTES) throw Object.assign(new Error('Request is too large.'), { statusCode: 413 });
    chunks.push(buffer);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw.trim()) return {};
  try { return JSON.parse(raw) as Record<string, unknown>; }
  catch { throw Object.assign(new Error('Invalid JSON request.'), { statusCode: 400 }); }
}

async function rateLimit(uid: string) {
  const db = getFirestore(DATABASE_ID);
  const now = Date.now();
  const windowMs = 15 * 60_000;
  const id = crypto.createHash('sha256').update(`customer-verify:${uid}`).digest('hex');
  const ref = db.collection('security_rate_limits').doc(id);
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    const data: any = snap.exists ? snap.data() || {} : {};
    const started = Number(data.windowStartedAtMs) || 0;
    const count = Number(data.count) || 0;
    if (!started || now - started >= windowMs) {
      tx.set(ref, { count: 1, windowStartedAtMs: now, expiresAtMs: now + windowMs, expiresAt: Timestamp.fromMillis(now + windowMs), updatedAt: FieldValue.serverTimestamp() });
      return true;
    }
    if (count >= 4) return false;
    tx.set(ref, { count: count + 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return true;
  });
}

export default async function handler(req: IncomingMessage & { method?: string; headers: Record<string, any>; body?: unknown }, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed.' });
  }
  try {
    if (!ensureFirebaseAdmin()) return json(res, 503, { error: 'Verification service is temporarily unavailable.' });
    const authorization = safe(req.headers.authorization, 8192);
    if (!authorization.startsWith('Bearer ')) return json(res, 401, { error: 'Authentication required.' });
    let token: any;
    try { token = await getAuth().verifyIdToken(authorization.slice(7).trim()); }
    catch { return json(res, 401, { error: 'Verification session expired. Please try again.' }); }
    const email = safe(token?.email, 254).toLowerCase();
    if (!token?.uid || !email) return json(res, 400, { error: 'A valid email account is required.' });
    if (token.email_verified === true) return json(res, 200, { ok: true, alreadyVerified: true });

    if (process.env.VERCEL_ENV === 'production' || process.env.FIREBASE_APP_CHECK_ENFORCE === 'true') {
      const appCheckToken = safe(req.headers['x-firebase-appcheck'], 4096);
      if (!appCheckToken) return json(res, 401, { error: 'App integrity check failed.' });
      try { await getAppCheck().verifyToken(appCheckToken); }
      catch { return json(res, 401, { error: 'App integrity check failed.' }); }
    }
    if (!(await rateLimit(token.uid))) return json(res, 429, { error: 'A verification email was sent recently. Please wait before trying again.' });

    const body = await readJsonBody(req);
    const name = safe(body.name, 120) || safe(token.name, 120) || 'SAELYXE Client';
    const firebaseLink = await getAuth().generateEmailVerificationLink(email);
    const firebaseUrl = new URL(firebaseLink);
    const code = firebaseUrl.searchParams.get('oobCode') || '';
    if (!code) throw new Error('Verification code could not be generated.');
    const brandedLink = `https://www.saelyxe.com/verify-email?code=${encodeURIComponent(code)}`;

    const apiKey = process.env.RESEND_API_KEY;
    const configuredFrom = safe(process.env.RESEND_FROM_EMAIL, 320);
    if (!apiKey || !configuredFrom) return json(res, 503, { error: 'Verification email delivery is temporarily unavailable.' });
    const from = configuredFrom.includes('<') ? configuredFrom : `SAELYXE <${configuredFrom}>`;
    const html = `<!doctype html><html><body style="margin:0;background:#eee9e2;font-family:Arial,Helvetica,sans-serif;color:#211d19"><div style="max-width:620px;margin:32px auto;background:#fff;border-radius:20px;overflow:hidden;border:1px solid #ddd4c8"><div style="background:#171411;color:#fff;padding:34px 38px"><div style="font-family:Georgia,serif;font-size:30px;font-weight:700;letter-spacing:.16em">SAELYXE</div><div style="margin-top:7px;color:#d8cdc0;font-size:10px;letter-spacing:.25em;text-transform:uppercase">Made for Presence</div></div><div style="padding:38px"><div style="font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#897b6d;font-weight:700">Email verification</div><h1 style="font-family:Georgia,serif;font-size:30px;font-weight:500;margin:10px 0 14px">Verify your SAELYXE account</h1><p style="font-size:14px;line-height:1.7;color:#665b50">Hello ${escapeHtml(name)},</p><p style="font-size:14px;line-height:1.7;color:#665b50">Confirm this email address to activate sign-in and your private client account. Guest shopping and guest orders remain available while you verify.</p><p style="margin:30px 0"><a href="${brandedLink}" style="display:inline-block;background:#171411;color:#fff;text-decoration:none;border-radius:999px;padding:14px 24px;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase">Verify Email</a></p><p style="font-size:12px;line-height:1.6;color:#8b8075">If you did not create a SAELYXE account, you can ignore this message.</p></div><div style="background:#f8f5f1;border-top:1px solid #e5ddd4;padding:20px 38px;color:#8b8075;font-size:10px;letter-spacing:.13em;text-transform:uppercase">SAELYXE · Made for Presence</div></div></body></html>`;

    const delivery = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `saelyxe-customer-verify-${token.uid}-${Math.floor(Date.now() / (15 * 60_000))}` },
      body: JSON.stringify({ from, to: [email], subject: 'Verify your SAELYXE email', html })
    });
    if (!delivery.ok) {
      const detail = await delivery.text().catch(() => '');
      console.error('Customer verification email failed:', delivery.status, detail.slice(0, 500));
      return json(res, 502, { error: 'Verification email could not be delivered right now.' });
    }
    return json(res, 200, { ok: true, sent: true });
  } catch (error: any) {
    console.error('Customer verification handler error:', error?.message || error);
    return json(res, Number(error?.statusCode) || 500, { error: 'Unable to send verification email right now.' });
  }
}
