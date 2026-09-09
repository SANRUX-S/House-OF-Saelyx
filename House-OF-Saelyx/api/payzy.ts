import crypto from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';

export const PAYZY_REQUEST_SIGNED_FIELDS = [
  'x_test_mode',
  'x_shopid',
  'x_amount',
  'x_order_id',
  'x_response_url',
  'x_first_name',
  'x_last_name',
  'x_company',
  'x_address',
  'x_country',
  'x_state',
  'x_city',
  'x_zip',
  'x_phone',
  'x_email',
  'x_ship_to_first_name',
  'x_ship_to_last_name',
  'x_ship_to_company',
  'x_ship_to_address',
  'x_ship_to_country',
  'x_ship_to_state',
  'x_ship_to_city',
  'x_ship_to_zip',
  'x_freight',
  'x_platform',
  'x_version',
  'signed_field_names'
] as const;

export type PayzySignedData = Record<(typeof PAYZY_REQUEST_SIGNED_FIELDS)[number], string>;

const PAYZY_REQUEST_SIGNED_FIELD_NAMES = PAYZY_REQUEST_SIGNED_FIELDS.join(',');
const PAYZY_RESPONSE_SIGNED_FIELD_NAMES = ['response_code', ...PAYZY_REQUEST_SIGNED_FIELDS].join(',');

function clean(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function formatAmount(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) throw new Error('Payzy payment amount is invalid.');
  return Number(amount.toFixed(2)).toString();
}

export function getPayzyConfig() {
  const mode = process.env.PAYZY_MODE === 'live' ? 'live' : 'sandbox';
  const shopId = clean(process.env.PAYZY_SHOP_ID || (mode === 'sandbox' ? '2' : ''), 80);
  const secretKey = clean(process.env.PAYZY_SECRET_KEY, 500);
  const configuredBaseUrl = clean(process.env.PAYZY_BASE_URL, 500).replace(/\/+$/, '');
  const baseUrl = configuredBaseUrl || (mode === 'live' ? 'https://api.payzy.lk' : 'https://api.payzypay.xyz');
  const siteUrl = clean(process.env.PAYZY_SITE_URL, 500).replace(/\/+$/, '') || 'https://www.saelyxe.com';
  const responseUrl = clean(process.env.PAYZY_RESPONSE_URL, 800) || siteUrl + '/api/payments/payzy/return';
  const requestedSandboxAmount = Number(process.env.PAYZY_SANDBOX_TEST_AMOUNT_LKR || '10');
  const sandboxTestAmountLKR = Number.isFinite(requestedSandboxAmount) && requestedSandboxAmount > 0
    ? Number(requestedSandboxAmount.toFixed(2))
    : 10;

  return {
    mode,
    shopId,
    secretKey,
    baseUrl,
    siteUrl,
    responseUrl,
    sandboxTestAmountLKR,
    configured: Boolean(shopId && secretKey && /^https:\/\//i.test(baseUrl) && /^https:\/\//i.test(responseUrl))
  };
}

export function buildPayzySignedData(order: any, config: ReturnType<typeof getPayzyConfig>): PayzySignedData {
  const customerName = clean(order.customerName, 120);
  const firstName = clean(order.firstName, 60) || customerName.split(/\s+/)[0] || 'SAELYXE';
  const lastName = clean(order.lastName, 60) || customerName.split(/\s+/).slice(1).join(' ') || 'Customer';
  const country = clean(order.country, 80) || 'Sri Lanka';
  const city = clean(order.city, 100);
  const state = clean(order.state, 100) || city || 'Western';
  const address = clean(order.address, 300);
  const postalCode = clean(order.postalCode, 30) || '00000';
  const amountLKR = config.mode === 'sandbox' ? config.sandboxTestAmountLKR : Number(order.totalLKR);

  return {
    x_test_mode: config.mode === 'sandbox' ? 'on' : 'off',
    x_shopid: config.shopId,
    x_amount: formatAmount(amountLKR),
    x_order_id: clean(order.orderNumber || order.id, 120),
    x_response_url: config.responseUrl,
    x_first_name: firstName,
    x_last_name: lastName,
    x_company: 'SAELYXE',
    x_address: address,
    x_country: country,
    x_state: state,
    x_city: city,
    x_zip: postalCode,
    x_phone: clean(order.phone, 30),
    x_email: clean(order.email, 254).toLowerCase(),
    x_ship_to_first_name: firstName,
    x_ship_to_last_name: lastName,
    x_ship_to_company: 'SAELYXE',
    x_ship_to_address: address,
    x_ship_to_country: country,
    x_ship_to_state: state,
    x_ship_to_city: city,
    x_ship_to_zip: postalCode,
    x_freight: formatAmount(Math.max(0, Number(order.shippingLKR) || 0)),
    x_platform: 'custom',
    x_version: '1.0',
    signed_field_names: PAYZY_REQUEST_SIGNED_FIELD_NAMES
  };
}

function requestCanonical(data: PayzySignedData, sampleCompatibility: boolean) {
  return PAYZY_REQUEST_SIGNED_FIELDS.map(field => {
    if (sampleCompatibility && field === 'x_version') return 'x_version' + data[field];
    return field + '=' + data[field];
  }).join(',');
}

function responseCanonical(responseCode: string, data: PayzySignedData) {
  const fields = PAYZY_REQUEST_SIGNED_FIELDS.map(field => {
    const value = field === 'signed_field_names' ? PAYZY_RESPONSE_SIGNED_FIELD_NAMES : data[field];
    return field + '=' + value;
  });
  return 'response_code=' + responseCode + ',' + fields.join(',');
}

function sign(canonical: string, secretKey: string) {
  return crypto.createHmac('sha256', secretKey).update(canonical, 'utf8').digest('base64');
}

function signaturesMatch(expected: string, receivedRaw: unknown) {
  const received = clean(receivedRaw, 500).replace(/\s/g, '+');
  if (!expected || !received) return false;
  try {
    const expectedBuffer = Buffer.from(expected, 'base64');
    const receivedBuffer = Buffer.from(received, 'base64');
    return expectedBuffer.length > 0 &&
      expectedBuffer.length === receivedBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  } catch {
    return false;
  }
}

function isAllowedCheckoutUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;
    const host = url.hostname.toLowerCase();
    return host === 'payzypay.xyz' ||
      host.endsWith('.payzypay.xyz') ||
      host === 'payzy.lk' ||
      host.endsWith('.payzy.lk');
  } catch {
    return false;
  }
}

export async function requestPayzyCheckout(data: PayzySignedData, config: ReturnType<typeof getPayzyConfig>) {
  if (!config.configured) {
    throw Object.assign(new Error('Payzy server credentials are not configured.'), { statusCode: 503 });
  }

  const endpoint = config.baseUrl + '/checkout/custom-checkout';
  const attempts = [true, false];

  for (let index = 0; index < attempts.length; index += 1) {
    const sampleCompatibility = attempts[index];
    const signature = sign(requestCanonical(data, sampleCompatibility), config.secretKey);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'SAELYXE-Payzy/1.0'
      },
      body: JSON.stringify({ ...data, signature }),
      signal: AbortSignal.timeout(15000)
    });

    const payload: any = await response.json().catch(() => ({}));
    const checkoutUrl = clean(payload?.url || payload?.data?.url, 1200);

    if (response.ok && checkoutUrl && isAllowedCheckoutUrl(checkoutUrl)) {
      return {
        checkoutUrl,
        requestSignature: signature,
        signatureVariant: sampleCompatibility ? 'payzy_sample_compat' : 'normalized'
      };
    }

    if (index === 0 && [400, 401, 422].includes(response.status)) continue;

    const providerMessage = clean(payload?.message || payload?.error, 240);
    throw Object.assign(
      new Error(providerMessage || 'Payzy checkout initialization failed (' + response.status + ').'),
      { statusCode: response.status >= 400 && response.status < 500 ? 409 : 502 }
    );
  }

  throw Object.assign(new Error('Payzy checkout initialization failed.'), { statusCode: 502 });
}

export function verifyPayzyReturnSignature(
  responseCode: string,
  signature: unknown,
  signedData: PayzySignedData,
  secretKey: string
) {
  return signaturesMatch(sign(responseCanonical(responseCode, signedData), secretKey), signature);
}

export function stripInternalPayzyOrderFields(order: any) {
  const result: any = { ...order };
  delete result.payzySignedData;
  delete result.payzyRequestSignature;
  delete result.payzyCheckoutUrl;
  return result;
}

export async function markPayzyLiveVerified(adminDb: any, orderId: string, responseCode: string) {
  const ref = adminDb.collection('orders').doc(orderId);
  const now = new Date().toISOString();

  await adminDb.runTransaction(async (transaction: any) => {
    const snap = await transaction.get(ref);
    if (!snap.exists) throw Object.assign(new Error('Order not found.'), { statusCode: 404 });
    const current: any = { id: snap.id, ...snap.data() };
    if (current.paymentMethod !== 'payzy') {
      throw Object.assign(new Error('This order is not a Payzy order.'), { statusCode: 400 });
    }
    if (current.paymentStatus === 'verified' && current.inventoryCommitted === true) return;

    const items = Array.isArray(current.items) ? current.items : [];
    const quantityByProduct = new Map<string, number>();
    let inventoryDataValid = items.length > 0;

    if (current.inventoryCommitted !== true) {
      for (const item of items) {
        const productId = clean(item?.productId, 100);
        const quantity = Number(item?.quantity);
        if (!productId || !Number.isInteger(quantity) || quantity < 1) {
          inventoryDataValid = false;
          break;
        }
        quantityByProduct.set(productId, (quantityByProduct.get(productId) || 0) + quantity);
      }
    }

    const productSnapshots = new Map<string, { ref: any; data: any }>();
    if (current.inventoryCommitted !== true && inventoryDataValid) {
      for (const productId of quantityByProduct.keys()) {
        const productRef = adminDb.collection('products').doc(productId);
        const productSnap = await transaction.get(productRef);
        if (!productSnap.exists) {
          inventoryDataValid = false;
          break;
        }
        productSnapshots.set(productId, { ref: productRef, data: productSnap.data() || {} });
      }
    }

    let inventoryAvailable = current.inventoryCommitted === true || inventoryDataValid;
    if (current.inventoryCommitted !== true && inventoryAvailable) {
      for (const [productId, quantity] of quantityByProduct.entries()) {
        const cached = productSnapshots.get(productId);
        const stockCount = Number(cached?.data?.stockCount);
        if (!cached || !Number.isFinite(stockCount) || stockCount < quantity) {
          inventoryAvailable = false;
          break;
        }
      }
    }

    const update: Record<string, unknown> = {
      paymentStatus: 'verified',
      paymentVerificationSource: 'payzy_signed_callback',
      paymentVerificationError: FieldValue.delete(),
      paymentVerifiedAt: current.paymentVerifiedAt || now,
      paymentUpdatedAt: now,
      payzyResponseCode: responseCode,
      payzyReturnedAt: now,
      payzySandboxVerified: false
    };

    if (current.inventoryCommitted !== true && inventoryAvailable) {
      for (const [productId, quantity] of quantityByProduct.entries()) {
        const cached = productSnapshots.get(productId)!;
        const nextStock = Number(cached.data.stockCount) - quantity;
        transaction.update(cached.ref, {
          stockCount: nextStock,
          inStock: nextStock > 0,
          updatedAt: now
        });
      }
      update.inventoryCommitted = true;
      update.inventoryCommittedAt = now;
      update.requiresManualReview = false;
      update.inventoryException = FieldValue.delete();
    } else if (current.inventoryCommitted !== true) {
      update.inventoryCommitted = false;
      update.requiresManualReview = true;
      update.inventoryException = 'payzy_paid_without_available_inventory';
    }

    if (current.status === 'cancelled') {
      update.status = 'placed';
      update.updatedAt = now;
      update.statusHistory = [
        ...(Array.isArray(current.statusHistory) ? current.statusHistory : []),
        {
          status: 'placed',
          timestamp: now,
          note: inventoryAvailable
            ? 'Payzy payment verified after checkout cancellation; order restored for fulfilment.'
            : 'Payzy payment verified after cancellation, but inventory requires manual review.',
          location: 'SAELYXE Payzy Verification'
        }
      ];
    }

    transaction.update(ref, update);
  });

  const updated = await ref.get();
  return { id: updated.id, ...updated.data() };
}

export async function markPayzySandboxVerified(adminDb: any, orderId: string, responseCode: string) {
  const ref = adminDb.collection('orders').doc(orderId);
  const now = new Date().toISOString();

  await adminDb.runTransaction(async (transaction: any) => {
    const snap = await transaction.get(ref);
    if (!snap.exists) throw Object.assign(new Error('Order not found.'), { statusCode: 404 });
    const current: any = { id: snap.id, ...snap.data() };
    if (current.paymentMethod !== 'payzy') {
      throw Object.assign(new Error('This order is not a Payzy order.'), { statusCode: 400 });
    }
    if (current.payzySandboxVerified === true) return;

    transaction.update(ref, {
      status: 'cancelled',
      paymentStatus: 'cancelled',
      paymentVerificationSource: 'payzy_sandbox_signature_verified',
      paymentVerificationError: 'sandbox_test_only_no_live_settlement',
      paymentUpdatedAt: now,
      payzyResponseCode: responseCode,
      payzyReturnedAt: now,
      payzySandboxVerified: true,
      requiresManualReview: false,
      inventoryCommitted: false,
      statusHistory: [
        ...(Array.isArray(current.statusHistory) ? current.statusHistory : []),
        {
          status: 'cancelled',
          timestamp: now,
          note: 'Payzy sandbox signature verified. Test order closed automatically and is not eligible for fulfilment.',
          location: 'SAELYXE Payzy Sandbox'
        }
      ]
    });
  });

  const updated = await ref.get();
  return { id: updated.id, ...updated.data() };
}
