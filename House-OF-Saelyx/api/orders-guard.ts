import type { IncomingMessage, ServerResponse } from 'node:http';
import app from './index.js';

const MAX_BODY_BYTES = 64 * 1024;

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
  try { return JSON.parse(raw) as Record<string, unknown>; }
  catch { throw Object.assign(new Error('Order request must contain valid JSON.'), { statusCode: 400 }); }
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
    const body = await readJsonBody(req);
    const paymentMethod = typeof body.paymentMethod === 'string' ? body.paymentMethod.trim().toLowerCase() : '';
    if (!['paypal', 'payzy', 'cod'].includes(paymentMethod)) {
      return json(res, 400, { error: 'SAELYXE accepts PayPal, Payzy, or Cash on Delivery for checkout.' });
    }
    req.body = body;
    req._body = true;
    req.url = '/api/orders';
    return app(req as any, res as any);
  } catch (error: any) {
    return json(res, Number(error?.statusCode) || 500, { error: error?.message || 'Unable to create order.' });
  }
}
