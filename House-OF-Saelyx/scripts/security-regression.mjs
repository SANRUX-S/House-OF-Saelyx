import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    console.error(`SECURITY CHECK FAILED: ${message}`);
    process.exitCode = 1;
  }
}

const api = read('api/index.ts');
const store = read('src/context/StoreContext.tsx');
const rules = read('firestore.rules');
const vercel = read('vercel.json');
const checkout = read('src/components/CheckoutPage.tsx');
const tracker = read('src/components/TrackOrderPage.tsx');
const trackerModal = read('src/components/OrderTrackerModal.tsx');
const adminSecurity = read('src/components/admin/AdminSecurity.tsx');
const fallbackDb = read('server/db.ts');
const fallbackJson = read('data/saelyx_store.json');

const trackingStart = api.indexOf("app.get('/api/orders/:id'");
const trackingEnd = api.indexOf("app.put('/api/orders/:id/status'", trackingStart);
const trackingRoute = trackingStart >= 0 && trackingEnd > trackingStart
  ? api.slice(trackingStart, trackingEnd)
  : '';

assert(trackingRoute.length > 0, 'order tracking route must exist');
assert(trackingRoute.includes('const token = await readBearerToken(req);'), 'order tracking must require Firebase authentication');
assert(trackingRoute.includes('hasValidAppCheck(req)'), 'order tracking must enforce App Check when configured');
assert(trackingRoute.includes('order.userId !== token.uid && !isAdminToken(token)'), 'order tracking must enforce owner/admin access');
assert(!trackingRoute.includes('customerName:'), 'tracking response must not expose customer name');
assert(!trackingRoute.includes('phone:'), 'tracking response must not expose phone number');
assert(!trackingRoute.includes('address:'), 'tracking response must not expose street address');

assert(rules.includes("request.resource.data.role == 'patron'"), 'new customer profiles must not self-assign privileged roles');
assert(rules.includes('request.resource.data.role == resource.data.role'), 'customer profile updates must preserve role');
assert(!store.includes('configuredAdminRole || data.role'), 'client session must not trust users/{uid}.role');
assert(store.includes("role: trustedRole"), 'client session must use a trusted role source');
assert(store.includes('if (!fbUser) {\n        setUser(null);'), 'sign-out/session loss must clear local user state');

assert(vercel.includes('"Content-Security-Policy"'), 'production CSP must be enforced');
assert(!vercel.includes('Content-Security-Policy-Report-Only'), 'report-only CSP must not remain');
assert(vercel.includes('https://www.google.com/recaptcha/'), 'CSP must allow reCAPTCHA Enterprise used by App Check');
assert(vercel.includes('https://*.paypal.com'), 'CSP must allow PayPal SDK resources');

for (const [name, source] of [
  ['checkout', checkout],
  ['API', api],
  ['store context', store]
]) {
  assert(!/payhere/i.test(source), `${name} must not contain retired PayHere runtime flow`);
  assert(!/binance/i.test(source), `${name} must not contain retired Binance runtime flow`);
}

for (const fake of [
  'Alexandra Vance',
  'Dmitri Ivanov',
  'Elena Rostova',
  'Lady Vivienne Sterling',
  'Dr. Rohan Jayasinghe',
  'Lady Eleanor Vance',
  'Ashan Perera',
  'Sarah Kingsley',
  'vip-patron-demo',
  'SECURITY_KERNEL_BOOT',
  'Latency: 14ms',
  'SAELYX_VAULT_SALT_v2'
]) {
  assert(!store.includes(fake), `store context contains demo fixture: ${fake}`);
  assert(!fallbackDb.includes(fake), `fallback DB contains demo fixture: ${fake}`);
  assert(!fallbackJson.includes(fake), `fallback JSON contains demo fixture: ${fake}`);
  assert(!adminSecurity.includes(fake), `admin security UI contains fake result: ${fake}`);
}

assert(!trackerModal.includes("useState('SLX-94821')"), 'legacy tracker must not ship with a demo order reference');
assert(tracker.includes('Authorization: `Bearer ${token}`'), 'tracking page must authenticate API requests');
assert(trackerModal.includes('Authorization: `Bearer ${token}`'), 'tracking modal must authenticate API requests');

if (!process.exitCode) {
  console.log('SAELYXE security regression checks passed.');
}
