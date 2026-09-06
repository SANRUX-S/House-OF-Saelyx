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
const firebaseClient = read('src/lib/firebase.ts');
const vercel = read('vercel.json');
const checkout = read('src/components/CheckoutPage.tsx');
const tracker = read('src/components/TrackOrderPage.tsx');
const trackerModal = read('src/components/OrderTrackerModal.tsx');
const adminSecurity = read('src/components/admin/AdminSecurity.tsx');
const adminStaff = read('src/components/admin/AdminStaff.tsx');
const adminPanel = read('src/components/AdminPanel.tsx');
const adminProducts = read('src/components/admin/AdminProducts.tsx');
const adminDrop = read('src/components/admin/AdminDropSettings.tsx');
const adminDashboard = read('src/components/admin/AdminDashboard.tsx');
const adminOrders = read('src/components/admin/AdminCommissions.tsx');
const adminRestock = read('src/components/admin/AdminRestock.tsx');
const adminLayout = read('src/components/admin/AdminLayout.tsx');
const adminLogin = read('src/components/admin/AdminLogin.tsx');
const adminConcierge = read('src/components/admin/AdminConcierge.tsx');
const adminTypes = read('src/types.ts');
const ciWorkflow = read('../.github/workflows/ci.yml');
const localServer = read('server.ts');
const fallbackJson = read('data/saelyx_store.json');

const trackingStart = api.indexOf("app.get('/api/orders/:id'");
const trackingEnd = api.indexOf("app.post('/api/admin/orders/:id/refund'", trackingStart);
const trackingRoute = trackingStart >= 0 && trackingEnd > trackingStart
  ? api.slice(trackingStart, trackingEnd)
  : '';

assert(trackingRoute.length > 0, 'order tracking route must exist');
assert(trackingRoute.includes('const token = await readBearerToken(req);'), 'order tracking must require Firebase authentication');
assert(trackingRoute.includes('hasValidAppCheck(req)'), 'order tracking must enforce App Check');
assert(trackingRoute.includes('order.userId !== token.uid && !(await isAdminToken(token))'), 'order tracking must enforce owner/admin access');
assert(!trackingRoute.includes('customerName:'), 'tracking response must not expose customer name');
assert(!trackingRoute.includes('phone:'), 'tracking response must not expose phone number');
assert(!trackingRoute.includes('address:'), 'tracking response must not expose street address');
assert(!trackingRoute.includes('note: safeString(entry?.note'), 'tracking response must not expose operational notes');
assert(!trackingRoute.includes('location: safeString(entry?.location'), 'tracking response must not expose detailed status locations');

assert(rules.includes("request.resource.data.role == 'patron'"), 'new customer profiles must not self-assign privileged roles');
assert(rules.includes('request.resource.data.role == resource.data.role'), 'customer profile updates must preserve role');
assert(rules.includes("data.status == 'active'"), 'Firestore admin access must require an active admin record');
assert(rules.includes('data.email == request.auth.token.email'), 'Firestore admin record must be bound to the verified token email');
assert(rules.includes('allow create, update, delete: if false;'), 'sensitive collections must include server-only mutation rules');
assert(!rules.includes("request.auth.token.role == 'admin'"), 'Firestore must not trust stale role claims as the sole admin source');
assert(rules.includes('function isBootstrapRootAdmin()'), 'Firestore root bypass must be scoped to a dedicated helper');
assert(rules.includes("request.auth.token.email == 'saelyx.co+super@gmail.com'"), 'Firestore root bypass must use the exact root email allowlist');

assert(!store.includes('configuredAdminRole || data.role'), 'client session must not trust users/{uid}.role');
assert(store.includes("adminData?.status === 'active'"), 'client admin session must require an active admin record');
assert(store.includes('setOrders([]);') && store.includes('setMessages([]);') && store.includes('setStaffList([]);'), 'session loss must clear privileged data');
assert(store.includes('/api/admin/products/'), 'product mutations must use the trusted admin API');
assert(store.includes('/api/admin/messages/'), 'concierge mutations must use the trusted admin API');
assert(store.includes('/api/admin/settings'), 'settings mutations must use the trusted admin API');

assert(
  api.indexOf("ROOT_ADMIN_EMAILS.has(email)") >= 0 &&
  api.indexOf("ROOT_ADMIN_EMAILS.has(email)") < api.indexOf("token.email_verified !== true"),
  'API must allow only exact root bootstrap emails before the verified-email gate'
);
assert(api.includes("token.email_verified !== true"), 'secondary administrator authorization must still require verified email ownership');
assert(api.includes("status !== 'active'"), 'API administrator authorization must require active admin records');
assert(api.includes("collection('admins').doc(token.uid)"), 'API must resolve protected admin records');
assert(firebaseClient.includes("adminData?.status === 'active'"), 'admin credential flow must require active administrator records');
assert(
  firebaseClient.indexOf('if (allowlistedRole)') >= 0 &&
  firebaseClient.indexOf('if (allowlistedRole)') < firebaseClient.indexOf("getDoc(doc(db, 'admins', credential.user.uid))"),
  'bootstrap administrator login must not depend on a Firestore admin-document read'
);
assert(firebaseClient.includes("'auth/too-many-requests'"), 'admin login must surface Firebase throttling clearly');
assert(firebaseClient.includes("'auth/network-request-failed'"), 'admin login must surface Firebase network failures clearly');
assert(firebaseClient.includes('ROOT_ADMIN_EMAILS.has(email)'), 'client must scope verification bypass to exact root bootstrap emails');
assert(firebaseClient.includes('sendEmailVerification(credential.user)'), 'unverified secondary admin must retain an email verification path');
assert(firebaseClient.includes('browserLocalPersistence') && firebaseClient.includes('browserSessionPersistence'), 'Remember Me must control Firebase persistence');

assert(api.includes("app.post('/api/admin/staff/invite'"), 'staff invitation API must exist');
assert(api.includes('generateEmailVerificationLink'), 'staff invitation must include Firebase email verification');
assert(api.includes('generatePasswordResetLink'), 'staff invitation must include secure password setup');
assert(api.includes("app.post('/api/admin/staff/:uid/activate'"), 'staff activation API must exist');
assert(api.includes('setCustomUserClaims'), 'staff activation must set Firebase custom claims');
assert(api.includes('revokeRefreshTokens'), 'staff revocation must revoke Firebase refresh tokens');
assert(adminStaff.includes('INVITE ADMINISTRATOR'), 'staff UI must expose the real invitation workflow');
assert(adminStaff.includes('Activate') && adminStaff.includes('Revoke'), 'staff UI must expose activation and revocation');

assert(api.includes("app.post('/api/admin/orders/:id/refund'"), 'Super Admin PayPal refund endpoint must exist');
assert(api.includes('/v2/payments/captures/') && api.includes('/refund'), 'refund must use PayPal Payments v2 capture refund');
assert(api.includes('paymentCaptureId'), 'PayPal capture ID must be persisted');
assert(api.includes("paymentStatus: 'refund_pending'"), 'pending refund state must be explicit');
assert(api.includes("paymentStatus: 'refunded'"), 'completed refund state must be explicit');
assert(api.includes('canAutoRestoreInventory'), 'refund flow must avoid blindly restocking dispatched items');
assert(api.includes('Verified PayPal orders must be cancelled through the Super Admin refund workflow.'), 'normal status API must not fake a paid cancellation');

assert(vercel.includes('"Content-Security-Policy"'), 'production CSP must be enforced');
assert(!vercel.includes('Content-Security-Policy-Report-Only'), 'report-only CSP must not remain');
assert(vercel.includes('https://www.google.com/recaptcha/'), 'CSP must allow reCAPTCHA Enterprise used by App Check');
assert(vercel.includes('https://*.paypal.com'), 'CSP must allow PayPal SDK resources');

assert(!firebaseClient.includes('VITE_FIREBASE_STORAGE_BUCKET'), 'client must not depend on Firebase Storage');
assert(!fs.existsSync('storage.rules'), 'Firebase Storage rules must not remain after Cloudinary migration');
assert(!fs.existsSync('functions/index.js'), 'duplicate Firebase Functions runtime must be retired');
assert(api.includes('CLOUDINARY_CLOUD_NAME') && api.includes('CLOUDINARY_API_SECRET'), 'media uploads must use server-signed Cloudinary configuration');
assert(api.includes('media-signature:'), 'Cloudinary signing must be rate limited per admin');
assert(api.includes("createHash('sha256')"), 'Cloudinary signatures must use SHA-256');
assert(adminDrop.includes("uploadAdminImage(file, 'settings')"), 'drop background must use Cloudinary instead of Firestore base64');
assert(!adminDrop.includes('readAsDataURL'), 'drop settings must not store base64 images in Firestore');

assert(!adminDashboard.includes('565K'), 'dashboard must not contain fabricated traffic metrics');
assert(!adminDashboard.includes('productReturned = 8'), 'dashboard must not contain fabricated return counts');
assert(!adminDashboard.includes('increased 40%'), 'dashboard must not contain fabricated revenue growth');
assert(adminDashboard.includes("paymentStatus === 'verified'"), 'dashboard revenue must derive from verified payments');
assert(!adminProducts.includes('stockCount || 50'), 'product admin must preserve real zero stock');
assert(!adminRestock.includes('stockCount || 50'), 'restock admin must preserve real zero stock');
assert(adminProducts.includes('min={0}') && adminProducts.includes('min={1}'), 'product editor must validate stock and price ranges');

assert(adminOrders.includes("if (/^[=+\\-@]/.test(text))"), 'CSV export must neutralize spreadsheet formulas');
assert(adminOrders.includes('isSuperAdmin &&'), 'PII CSV export must be Super Admin restricted');
assert(api.includes("app.get('/api/admin/export'"), 'database export must use a protected server endpoint');
assert(api.includes('hasRecentAuthentication(token)'), 'database export must require recent administrator authentication');
assert(api.includes("writeAdminAudit(adminDb, token, 'DATABASE_EXPORT'"), 'database export must create a trusted server audit event');

assert(api.includes("app.get('/api/admin/health'"), 'detailed health diagnostics must be protected');
assert(api.includes("res.json({ ok: true, service: 'saelyxe-api' });"), 'public health endpoint must expose only minimal status');
assert(adminSecurity.includes('/api/admin/health'), 'Admin Security must use protected diagnostics');
assert(api.includes("app.get('/api/admin/maintenance/operational-data'"), 'operational reset preview endpoint must exist');
assert(api.includes("app.post('/api/admin/maintenance/reset-operational-data'"), 'one-time operational reset endpoint must exist');
assert(api.includes("confirmation !== 'RESET_OPERATIONS'"), 'operational reset must require an exact destructive confirmation phrase');
assert(api.includes("OPERATIONAL_RESET_MARKER"), 'operational reset must be sealed by a persistent one-time marker');
assert(api.includes("hasRecentAuthentication(token)"), 'destructive operational reset must require recent administrator authentication');
assert(adminSecurity.includes('RESET_OPERATIONS'), 'Super Admin security UI must expose explicit typed confirmation for the one-time reset');

assert(api.includes("app.post('/api/admin/password-reset'"), 'admin password reset must use a protected server endpoint');
assert(api.includes('admin-password-reset:'), 'admin password reset must be rate limited');
assert(firebaseClient.includes('/api/admin/password-reset'), 'client password reset must use the protected server route');
assert(!firebaseClient.includes('sendPasswordResetEmail('), 'admin reset must not call Firebase reset directly from the browser');

assert(api.includes("collection('restock_dispatch_locks')"), 'restock dispatch must use a concurrency lock');
assert(api.includes("status: 'sending'") && api.includes("status: 'failed'"), 'restock dispatch must track per-recipient delivery states');
assert(api.includes("'Idempotency-Key':"), 'restock delivery must use an idempotency key');
assert(api.includes('Some recipients failed. Retry will target failed recipients only.'), 'restock retry semantics must preserve successful recipients');
assert(api.includes("writeAdminAudit(") && api.includes('RESTOCK_DISPATCH_PARTIAL'), 'restock dispatch must use trusted server audit logging');

const adminMedia = read('src/lib/adminMedia.ts');
assert(adminMedia.includes('createImageBitmap(file)'), 'admin media must decode images before upload');
assert(adminMedia.includes('MAX_IMAGE_MEGAPIXELS'), 'admin media must enforce megapixel limits');
assert(adminMedia.includes('ALLOWED_IMAGE_TYPES'), 'admin media must restrict accepted image formats');

assert(fs.existsSync('scripts/firestore-rules.test.mjs'), 'Firestore emulator authorization tests must exist');
assert(fs.existsSync('tests/e2e/admin-security.spec.mjs'), 'browser end-to-end security tests must exist');
assert(fs.existsSync('playwright.config.mjs'), 'Playwright configuration must exist');

assert(!adminPanel.includes('Firebase Cloud Function'), 'admin panel must not describe the retired Firebase Functions architecture');
assert(!store.includes('triggerRestockCloudFunction'), 'store context must not expose retired Cloud Function naming');
assert(!fs.existsSync('functions'), 'retired Firebase Functions directory must not remain');


assert(localServer.includes('app.use(productionApi);'), 'local VS Code server must mount the production API');
assert(!localServer.includes("from './server/db.js'"), 'local server must not import the retired StoreDB');
assert(!localServer.includes("from './server/auth.js'"), 'local server must not import duplicate legacy auth middleware');
assert(!localServer.includes("app.get('/api/products'"), 'local server must not duplicate production API routes');
assert(!fs.existsSync('server/db.ts') && !fs.existsSync('server/auth.ts'), 'legacy local DB/auth modules must stay removed');

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
  assert(!fallbackJson.includes(fake), `fallback JSON contains demo fixture: ${fake}`);
  assert(!adminSecurity.includes(fake), `admin security UI contains fake result: ${fake}`);
}

assert(!trackerModal.includes("useState('SLX-94821')"), 'legacy tracker must not ship with a demo order reference');
assert(tracker.includes('Authorization: `Bearer ${token}`'), 'tracking page must authenticate API requests');
assert(trackerModal.includes('Authorization: `Bearer ${token}`'), 'tracking modal must authenticate API requests');


/* Admin production audit #1–#36 regression gates */
assert(adminDashboard.includes('thirtyDaysAgo') && !adminDashboard.includes('2026-01-12') && !adminDashboard.includes('2026-01-23'), '#4 dashboard date range must be dynamic');
assert(adminDashboard.includes('verifiedOrders') && adminDashboard.includes("order.status !== 'cancelled'"), '#5 dashboard revenue must exclude unverified/cancelled orders');
assert(!adminDashboard.includes('stockCount || 25'), '#6 dashboard stock must preserve zero inventory');

for (const field of ['sizes', 'color', 'fit', 'hoverImage', 'completeTheSetProductId']) {
  assert(adminProducts.includes(field), '#7 product editor must expose ' + field);
}
assert(api.includes('priceLKR <= 0') && api.includes('stockCount < 0'), '#8 product API must reject invalid price/stock');
assert(api.includes("where('slug', '==', slug)"), '#8 product API must prevent slug collisions');
assert(!adminDrop.includes('readAsDataURL'), '#9 settings image must not be saved as base64');
assert(!adminOrders.includes('Cancelled / Refunded'), '#10 order UI must not claim a refund before provider completion');
assert(api.includes('paymentCaptureId') && api.includes('refundId'), '#11 payment lifecycle must retain capture/refund references');
assert(api.includes("isSuperAdminToken(token)") && api.includes("app.post('/api/admin/orders/:id/refund'"), '#12 paid refunds must require Super Admin');
assert(adminOrders.includes('csvCell') && adminOrders.includes("if (/^[=+\\-@]/.test(text))"), '#13 CSV export must escape formulas and quoted data');
assert(adminOrders.includes('isSuperAdmin') && adminOrders.includes('Export CSV'), '#14 customer-data CSV export must be Super Admin only');
assert(api.includes("app.get('/api/admin/export'") && api.includes('hasRecentAuthentication(token)'), '#15 backup export must be server-side and step-up protected');

const messageRouteStart = api.indexOf("app.put('/api/admin/messages/:id'");
const messageRouteEnd = api.indexOf("app.put('/api/admin/products/:id'", messageRouteStart);
const messageRoute = messageRouteStart >= 0 && messageRouteEnd > messageRouteStart ? api.slice(messageRouteStart, messageRouteEnd) : '';
assert(messageRoute.includes('const batch = adminDb.batch()') && messageRoute.includes('await batch.commit()'), '#16 concierge status updates must be atomic');
assert(adminConcierge.includes('if (!success)') && adminConcierge.includes('Nothing was marked as resolved'), '#16 concierge UI must not show false success');

assert(!store.includes('setAuditLogs(prev => [entry'), '#17 client must not forge authoritative audit entries');
assert(api.includes('async function writeAdminAudit'), '#17 audit identity must be generated by trusted server code');
const auditRuleStart = rules.indexOf('match /audit_logs/');
const auditRuleEnd = rules.indexOf('match /security_rate_limits/', auditRuleStart);
const auditRule = auditRuleStart >= 0 && auditRuleEnd > auditRuleStart ? rules.slice(auditRuleStart, auditRuleEnd) : '';
assert(auditRule.includes('allow read: if isAdmin()') && auditRule.includes('allow create, update, delete: if false'), '#18 audit logs must be append-only from trusted server');

assert(!fs.existsSync('functions') && !read('firebase.json').includes('"functions"'), '#19 Firebase Functions runtime must remain retired');
assert(adminRestock.includes('Vercel API + Resend') || adminRestock.includes('Email Delivery'), '#20 restock admin must describe the real Vercel/Resend architecture');
assert(api.includes('lockAcquired') && api.includes("status: 'sending'") && api.includes("status: 'failed'"), '#21 restock dispatch must be concurrency and partial-failure safe');

assert(adminLayout.includes('searchResults') && adminLayout.includes('onSwitchTab(item.tab)'), '#22 global admin search must navigate to matching sections');
assert(adminLayout.includes('Administrator Access') && adminLayout.includes('Send Password Reset'), '#23 account dropdown controls must perform real actions');
assert(firebaseClient.includes('browserLocalPersistence') && firebaseClient.includes('browserSessionPersistence'), '#24 Remember Me must select Firebase persistence');
assert(api.includes('admin-password-reset:') && api.includes('hasValidAppCheck(req)'), '#25 password reset must be App Check/rate-limit protected');
assert(!fs.existsSync('src/components/admin/AdminSectionSettings.tsx'), '#26 duplicate section settings component must remain removed');
assert(!adminLayout.includes('section-settings') && !adminPanel.includes('section-settings'), '#27 forbidden duplicate settings navigation must remain removed');

assert(api.includes("app.get('/api/admin/health'") && api.includes("res.json({ ok: true, service: 'saelyxe-api' });"), '#28 public health must stay minimal while admin diagnostics are protected');
assert(adminMedia.includes('MAX_IMAGE_MEGAPIXELS') && api.includes("createHash('sha256')"), '#29 media uploads must enforce image limits and SHA-256 signatures');
assert(api.includes('startAfter(cursorSnap)') && store.includes('/api/admin/orders/page?limit=100&cursor=') && store.includes('oldest.id'), '#30 order history pagination must use stable document cursors');
assert(store.includes('limit(250)') && store.includes('limit(200)'), '#31 realtime admin listeners must remain bounded');
assert(!store.includes("setDoc(doc(db, 'products'") && !store.includes('for (const p of data)'), '#32 empty product collections must not auto-seed fallback products');
assert(adminLayout.includes("'fullscreenchange'"), '#33 fullscreen UI state must synchronize with browser events');

for (const [name, source] of [
  ['AdminPanel', adminPanel],
  ['AdminProducts', adminProducts],
  ['AdminOrders', adminOrders],
  ['AdminConcierge', adminConcierge],
  ['AdminRestock', adminRestock],
  ['AdminSecurity', adminSecurity],
  ['AdminLayout', adminLayout],
  ['AdminStaff', adminStaff],
  ['AdminDropSettings', adminDrop],
  ['StoreContext', store]
]) {
  assert(!/catch\s*(?:\([^)]*\))?\s*\{\s*\}/.test(source), '#34 ' + name + ' must not silently swallow errors');
}

assert(ciWorkflow.includes('Browser end-to-end security smoke') && ciWorkflow.includes('npm run e2e'), '#35 browser E2E must run in CI');
assert(ciWorkflow.includes('Firestore authorization emulator tests') && ciWorkflow.includes('npm run rules:test'), '#36 Firestore emulator tests must run in CI');

assert(!store.includes("localStorage.setItem('saelyx_user'"), 'user/customer/admin profile data must not persist in localStorage');
assert(!store.includes('Math.random()'), 'StoreContext identifiers must use cryptographic randomness');
assert(!checkout.includes('Math.random()'), 'PayPal checkout attempt identifiers must use cryptographic randomness');
assert(checkout.includes('createPayPalCheckoutAttemptId'), 'checkout must use the cryptographic attempt ID helper');
assert(ciWorkflow.includes('npm audit --omit=dev --audit-level=high'), 'CI must block high/critical production dependency vulnerabilities');

for (const [name, source] of [
  ['API', api],
  ['Firebase client', firebaseClient],
  ['StoreContext', store],
  ['Checkout', checkout],
  ['local server', localServer]
]) {
  assert(!source.includes('-----BEGIN PRIVATE KEY-----'), name + ' must not contain a committed private key');
  assert(!/\b(?:sk_live_|sk_test_|ghp_|github_pat_|AKIA)[A-Za-z0-9_\-]+/.test(source), name + ' must not contain obvious committed secret tokens');
}


if (!process.exitCode) {
  console.log('SAELYXE security regression checks passed.');
}
