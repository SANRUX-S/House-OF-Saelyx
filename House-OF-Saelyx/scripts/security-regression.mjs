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
const payzy = read('api/payzy.ts');
const store = read('src/context/StoreContext.tsx');
const rules = read('firestore.rules');
const firebaseClient = read('src/lib/firebase.ts');
const vercel = read('vercel.json');
const checkout = read('src/components/CheckoutPage.tsx');
const cartDrawer = read('src/components/CartDrawer.tsx');
const tracker = read('src/components/TrackOrderPage.tsx');
const trackerModal = read('src/components/OrderTrackerModal.tsx');
const guestOrderAccess = read('src/lib/guestOrderAccess.ts');
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
const heroSection = read('src/components/HeroSection.tsx');
const footer = read('src/components/Footer.tsx');
const careConcierge = read('src/components/CareConciergePage.tsx');
const careShipping = read('src/components/CareShippingPage.tsx');
const profilePage = read('src/components/ProfilePage.tsx');
const orderConfirmation = read('src/components/OrderConfirmationModal.tsx');
const ordersPage = read('src/components/OrdersPage.tsx');
const orderReceipt = read('src/lib/orderReceipt.ts');
const pkg = JSON.parse(read('package.json'));
const pdp = read('src/components/ProductDetailPage.tsx');
const productModal = read('src/components/ProductModal.tsx');
const spotlight = read('src/components/SpotlightProduct.tsx');
const seoManager = read('src/components/SEOManager.tsx');
const indexHtml = read('index.html');
const privacyPage = read('src/components/LegalPrivacyPage.tsx');
const packageLock = read('package-lock.json');

const trackingStart = api.indexOf("app.get('/api/orders/:id'");
const trackingEnd = api.indexOf("app.post('/api/admin/orders/:id/refund'", trackingStart);
const trackingRoute = trackingStart >= 0 && trackingEnd > trackingStart
  ? api.slice(trackingStart, trackingEnd)
  : '';

assert(trackingRoute.length > 0, 'order tracking route must exist');
assert(trackingRoute.includes('authorizeCustomerOrderAccess(req, adminDb, order)'), 'order tracking must require signed-in ownership or a scoped guest order token');
assert(trackingRoute.includes('hasValidAppCheck(req)'), 'order tracking must enforce App Check');
assert(trackingRoute.includes('tracking:${access.rateKey}'), 'order tracking must rate limit both account and guest access');
assert(!trackingRoute.includes('customerName:'), 'tracking response must not expose customer name');
assert(!trackingRoute.includes('phone:'), 'tracking response must not expose phone number');
assert(!trackingRoute.includes('address:'), 'tracking response must not expose street address');
assert(!trackingRoute.includes('note: safeString(entry?.note'), 'tracking response must not expose operational notes');
assert(!trackingRoute.includes('location: safeString(entry?.location'), 'tracking response must not expose detailed status locations');
assert(tracker.includes("'Not assigned yet'"), 'tracking UI must not invent a courier');
assert(tracker.includes("'Pending courier update'"), 'tracking UI must not invent a delivery ETA');
assert(!tracker.includes('Real-Time Fleet Telemetry'), 'tracking UI must not claim live fleet telemetry without a courier integration');
assert(tracker.includes("{ label: 'Order Placed'"), 'tracking UI must represent placed orders as placed, not confirmed');

assert(rules.includes("request.resource.data.role == 'patron'"), 'new customer profiles must not self-assign privileged roles');
assert(rules.includes('request.resource.data.role == resource.data.role'), 'customer profile updates must preserve role');
assert(rules.includes("data.status == 'active'"), 'Firestore admin access must require an active admin record');
assert(rules.includes('data.email == request.auth.token.email'), 'Firestore admin record must be bound to the verified token email');
assert(rules.includes('allow create, update, delete: if false;'), 'sensitive collections must include server-only mutation rules');
assert(!rules.includes("request.auth.token.role == 'admin'"), 'Firestore must not trust stale role claims as the sole admin source');
assert(rules.includes('function isBootstrapRootAdmin()'), 'Firestore root bypass must be scoped to a dedicated helper');
assert(rules.includes("request.auth.token.email == 'saelyx.co@gmail.com'"), 'Firestore root bypass must use the primary root email');
assert(!rules.includes("request.auth.token.email == 'saelyx.co+super@gmail.com'"), 'legacy +super email must not retain Firestore root bypass');
assert(!firebaseClient.includes("'saelyx.co+super@gmail.com': 'super_admin'"), 'legacy +super email must not remain in the client administrator allowlist');
assert(!api.includes("['saelyx.co+super@gmail.com', 'super_admin']"), 'legacy +super email must not remain in the API administrator allowlist');

assert(!store.includes('configuredAdminRole || data.role'), 'client session must not trust users/{uid}.role');
assert(store.includes("adminData?.status === 'active'"), 'client admin session must require an active admin record');
assert(store.includes('setOrders([]);') && store.includes('setMessages([]);') && store.includes('setStaffList([]);'), 'session loss must clear privileged data');
assert(store.includes('/api/admin/products/'), 'product mutations must use the trusted admin API');
assert(store.includes('/api/admin/messages/'), 'concierge mutations must use the trusted admin API');
assert(store.includes('/api/admin/settings'), 'settings mutations must use the trusted admin API');

assert(
  api.indexOf("token.email_verified !== true") >= 0 &&
  api.indexOf("token.email_verified !== true") < api.indexOf("ROOT_ADMIN_EMAILS.has(email)"),
  'API must require verified email ownership before root bootstrap authorization'
);
assert(api.includes("token.email_verified !== true"), 'all administrator authorization must require verified email ownership');
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
assert(firebaseClient.includes('ROOT_ADMIN_EMAILS.has(normalizedEmail)'), 'client must scope root bootstrap access to exact normalized root emails');
assert(firebaseClient.includes('!credential.user.emailVerified'), 'configured administrators must be blocked until Firebase email verification');
assert(firebaseClient.includes('sendEmailVerification(credential.user)'), 'unverified administrators must retain an email verification path');
assert(firebaseClient.includes('browserLocalPersistence') && firebaseClient.includes('browserSessionPersistence'), 'Remember Me must control Firebase persistence');
assert(firebaseClient.includes('verifyAdminGoogleCredentials'), 'administrator login must expose a verified Google sign-in path');
assert(firebaseClient.includes("credential.user.emailVerified !== true"), 'Google administrator login must require a verified Google/Firebase email');
assert(firebaseClient.includes('const allowlistedRole = ADMIN_ROLES[email]'), 'Google administrator login must resolve roles only from the trusted admin allowlist or active admin record');
assert(adminLogin.includes('CONTINUE WITH GOOGLE'), 'admin login UI must expose Google sign-in for verified root access');
assert(store.includes('loginAdminWithGoogle'), 'StoreContext must wire the verified Google administrator sign-in flow');
assert(api.includes('identitytoolkit.googleapis.com/v1/accounts:sendOobCode'), 'admin reset server route must fall back to Firebase native reset delivery when Admin Auth permissions are unavailable');
assert(api.includes("requestType: 'PASSWORD_RESET'"), 'Firebase native admin reset fallback must be restricted to password-reset OOB delivery');

assert(api.includes("app.post('/api/admin/staff/invite'"), 'staff invitation API must exist');
assert(api.includes('generateEmailVerificationLink'), 'staff invitation must include Firebase email verification');
assert(api.includes('generatePasswordResetLink'), 'staff invitation must include secure password setup');
assert(api.includes("app.post('/api/admin/staff/:uid/activate'"), 'staff activation API must exist');
assert(api.includes('setCustomUserClaims'), 'staff activation must set Firebase custom claims');
assert(api.includes('revokeRefreshTokens'), 'staff revocation must revoke Firebase refresh tokens');
assert(adminStaff.includes('INVITE ADMINISTRATOR'), 'staff UI must expose the real invitation workflow');
assert(adminStaff.includes('Activate') && adminStaff.includes('Revoke'), 'staff UI must expose activation and revocation');

assert(api.includes("app.post('/api/admin/orders/:id/refund'"), 'Super Admin PayPal refund endpoint must exist');
assert(api.includes("app.post('/api/orders/:id/cancellation-request'"), 'customer cancellation request endpoint must exist');
assert(api.includes("cancellationRequestedBy: access.kind === 'guest' ? 'guest' : access.uid"), 'customer cancellation requests must be bound to signed-in ownership or the scoped guest-order capability');
assert(api.includes("Cancellation requests are closed after dispatch."), 'customer cancellation requests must close after dispatch');
assert(api.includes('/v2/payments/captures/') && api.includes('/refund'), 'refund must use PayPal Payments v2 capture refund');
assert(api.includes('paymentCaptureId'), 'PayPal capture ID must be persisted');
assert(api.includes("paymentStatus: 'refund_pending'"), 'pending refund state must be explicit');
assert(api.includes("paymentStatus: 'refunded'"), 'completed refund state must be explicit');
assert(api.includes('canAutoRestoreInventory'), 'refund flow must avoid blindly restocking dispatched items');
assert(api.includes('Verified PayPal orders must be cancelled through the Super Admin refund workflow.'), 'normal status API must not fake a paid cancellation');
assert(checkout.includes("'paypal' | 'payzy' | 'cod'"), 'checkout payment selector must explicitly support PayPal, Payzy, and COD');
assert(checkout.includes('Cash on Delivery'), 'checkout must expose Cash on Delivery');
assert(checkout.includes('Pay in cash when your order is delivered.'), 'COD checkout must explain hand-delivery cash settlement');
assert(!checkout.includes('Temporary Test'), 'COD checkout must not contain temporary test wording');
assert(checkout.includes("paymentMethod: 'cod'"), 'COD checkout must create a server-backed order instead of faking local success');
assert(checkout.includes('createCodCheckoutAttemptId'), 'COD checkout must use an idempotent checkout attempt identifier');
assert(checkout.includes("cart.length === 0 && !confirmedOrder && !isPayzyReturn"), 'empty checkout state must return the customer to the storefront');
assert(store.includes("path === '/checkout' || path.startsWith('/checkout/')") && store.includes("window.history.replaceState({}, '', '/')"), 'legacy /checkout must be retired to the storefront');
assert(store.includes("path === '/secure-order-session'") && store.includes('hasValidCheckoutEntry(search)'), 'checkout page must require a valid same-tab checkout entry session');
assert(store.includes("route.name === 'checkout'") && store.includes('issueCheckoutEntry()'), 'internal checkout navigation must issue the checkout entry session');
assert(cartDrawer.includes("navigateTo({ name: 'checkout' })") && !cartDrawer.includes("if (!user)"), 'shopping bag must allow guest customers to proceed to checkout');
assert(store.includes("path === '/congsoleadmintechbypenetix' || path.startsWith('/congsoleadmintechbypenetix/')"), 'admin UI must use the requested private console route');
assert(store.includes("path === '/atelier-console' || path.startsWith('/atelier-console/')") && store.includes("path === '/admin'"), 'legacy admin routes must remain retired');
assert(api.includes("!['paypal', 'payzy', 'cod'].includes(paymentMethod)"), 'order API must allow only PayPal, Payzy, or COD');
assert(api.includes("paymentStatus: paymentMethod === 'cod' ? 'cod_pending' : 'pending_verification'"), 'COD orders must remain explicitly unpaid');
assert(api.includes("paymentVerificationSource: paymentMethod === 'cod' ? 'cash_on_delivery' : null"), 'COD must never masquerade as provider-verified payment');
assert(api.includes("['paypal', 'payzy'].includes(current.paymentMethod) && current.paymentStatus !== 'verified'"), 'online payment providers must be verified before fulfilment while COD remains separately collectible');
assert(api.includes("order.paymentMethod !== 'paypal' || !['verified', 'refund_pending'].includes(order.paymentStatus)"), 'refund endpoint must stay restricted to verified PayPal payments');

assert(vercel.includes('"Content-Security-Policy"'), 'production CSP must be enforced');
assert(!vercel.includes('Content-Security-Policy-Report-Only'), 'report-only CSP must not remain');
assert(vercel.includes('https://www.google.com/recaptcha/'), 'CSP must allow reCAPTCHA Enterprise used by App Check');
assert(vercel.includes('https://*.paypal.com'), 'CSP must allow PayPal SDK resources');
assert(!vercel.includes("script-src 'self' 'unsafe-inline'"), 'script-src must not allow unsafe-inline execution');
assert(vercel.includes("script-src-attr 'none'"), 'inline script attributes must be blocked');
assert(!vercel.includes("connect-src 'self' https: wss:"), 'connect-src must use an explicit origin allowlist');
assert(vercel.includes("img-src 'self' data: blob: https://saelyxe.com https://www.saelyxe.com"), 'img-src must use an explicit trusted-origin allowlist');
assert(!indexHtml.includes('<script type="application/ld+json">'), 'static HTML must not require inline JSON-LD under strict CSP');
assert(seoManager.includes("document.createElement('script')") && seoManager.includes("'application/ld+json'"), 'structured data must be injected by the trusted application bundle');
assert(vercel.includes('"deploymentEnabled"') && vercel.includes('"**": false') && vercel.includes('"main": true'), 'Vercel preview deployments must stay disabled while main remains deployable');

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
assert(api.includes('LEGACY_TEST_PRODUCT_IDS'), 'legacy test product cleanup must use exact IDs');
assert(api.includes("app.post('/api/admin/maintenance/purge-legacy-test-products'"), 'legacy test product cleanup endpoint must exist');
assert(api.includes("testFingerprint.includes('test')"), 'legacy test product cleanup must verify a test fingerprint before deletion');
assert(api.includes("'prod-mtj5ymhb'") && api.includes("'prod-mtmk3gor'"), 'all known legacy test product IDs must be covered');
assert(api.includes('if (!value) return false;'), 'legacy cleanup must never delete records with unknown timestamps');
assert(!JSON.stringify(JSON.parse(fallbackJson).products).toLowerCase().includes('"title":"test'), 'fallback product data must not contain test-labelled products');
assert(!heroSection.includes("title: 'SÆ SIGNATURE TEE'"), 'hero must not invent fallback product inventory');
assert(!adminProducts.includes('images.unsplash.com'), 'Admin Products must not invent a fallback fashion image');
assert(!adminRestock.includes('images.unsplash.com'), 'Admin Restock must not invent a fallback fashion image');
assert(api.includes("confirmation, 80) !== 'REMOVE_TEST_PRODUCTS'"), 'legacy test product cleanup must require explicit confirmation');
assert(store.includes('LEGACY_TEST_PRODUCT_IDS.has(product.id)'), 'realtime product state must exclude exact legacy test products');
assert(store.includes('saelyxe_prelaunch_cleanup_v2'), 'Super Admin must trigger the one-time combined pre-launch cleanup');
assert(store.includes('/api/admin/maintenance/purge-legacy-demo-fixtures'), 'Super Admin cleanup must include legacy operational fixtures');
assert(store.includes('/api/admin/maintenance/purge-legacy-test-products'), 'Super Admin cleanup must include exact legacy test products');
assert(api.includes("req.body?.confirmation, 80) !== 'RESET_OPERATIONS'"), 'legacy operational purge must require explicit confirmation');

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
assert(adminSecurity.includes('legacyDemoCleanupCompleted') && adminSecurity.includes('legacyTestProductCleanupCompleted'), 'Admin Security must show physical legacy cleanup completion status');

assert(api.includes("app.post('/api/admin/password-reset'"), 'admin password reset must use a protected server endpoint');
assert(api.includes('admin-password-reset:'), 'admin password reset must be rate limited');
assert(firebaseClient.includes('/api/admin/password-reset'), 'client password reset must use the protected server route');
assert(!firebaseClient.includes('sendPasswordResetEmail('), 'admin reset must not call Firebase reset directly from the browser');

assert(api.includes("collection('restock_dispatch_locks')"), 'restock dispatch must use a concurrency lock');
assert(api.includes("status: 'sending'") && api.includes("status: 'failed'"), 'restock dispatch must track per-recipient delivery states');
assert(api.includes("'Idempotency-Key':"), 'restock delivery must use an idempotency key');
assert(api.includes('Some recipients failed. Retry will target failed recipients only.'), 'restock retry semantics must preserve successful recipients');
assert(api.includes("writeAdminAudit(") && api.includes('RESTOCK_DISPATCH_PARTIAL'), 'restock dispatch must use trusted server audit logging');

const conciergeRouteStart = api.indexOf("app.post('/api/messages'");
const conciergeRouteEnd = api.indexOf("app.post('/api/restock/subscribe'", conciergeRouteStart);
const conciergeRoute = conciergeRouteStart >= 0 && conciergeRouteEnd > conciergeRouteStart
  ? api.slice(conciergeRouteStart, conciergeRouteEnd)
  : '';
assert(conciergeRoute.length > 0, 'customer concierge submission endpoint must exist');
assert(conciergeRoute.includes('hasValidAppCheck(req)'), 'customer concierge submission must enforce App Check');
assert(conciergeRoute.includes('messages:${getClientAddress(req)}'), 'customer concierge submission must be rate limited');
assert(conciergeRoute.includes("allowedTopics = new Set(['order_inquiry', 'bespoke_sizing', 'concierge', 'press', 'authenticity', 'other'])"), 'customer concierge topic values must be allowlisted');
assert(conciergeRoute.includes("collection('concierge_inquiries').doc()"), 'customer concierge submission must persist to the real inquiry collection');
assert(conciergeRoute.includes("collection('messages').doc(ref.id)"), 'customer concierge submission must mirror the real admin message collection atomically');
assert(conciergeRoute.includes("status: 'unread'"), 'new concierge submissions must arrive unread in Admin');

const restockSubscribeStart = api.indexOf("app.post('/api/restock/subscribe'");
const restockSubscribeEnd = api.indexOf("app.get('/api/products'", restockSubscribeStart);
const restockSubscribeRoute = restockSubscribeStart >= 0 && restockSubscribeEnd > restockSubscribeStart
  ? api.slice(restockSubscribeStart, restockSubscribeEnd)
  : '';
assert(restockSubscribeRoute.length > 0, 'customer restock subscription endpoint must exist');
assert(restockSubscribeRoute.includes('hasValidAppCheck(req)'), 'customer restock subscription must enforce App Check');
assert(restockSubscribeRoute.includes('restock-subscribe:${getClientAddress(req)}'), 'customer restock subscription must be rate limited');
assert(restockSubscribeRoute.includes("collection('products').doc(productId).get()"), 'restock subscription must validate a real product');
assert(restockSubscribeRoute.includes("createHash('sha256')"), 'restock subscription must deduplicate by stable hash');
assert(restockSubscribeRoute.includes("status: 'pending'"), 'new restock subscriptions must enter the pending queue');
assert(restockSubscribeRoute.includes("collection('stock_notifications').doc(dedupeId).set"), 'restock subscription must persist to the real notification queue');

assert(api.includes('async function sendOrderStatusEmail(order: any, previousStatus?: string)'), 'order lifecycle email helper must exist');
for (const status of ['confirmed', 'packed', 'dispatched', 'out_for_delivery', 'delivered', 'cancelled']) {
  assert(api.includes(status + ':'), `order lifecycle email must support ${status}`);
}
assert(
  api.includes('idempotencyKey: `saelyxe-order-status-') &&
  api.includes("'Idempotency-Key': params.idempotencyKey"),
  'order lifecycle emails must be idempotent'
);
assert(api.includes('await sendOrderStatusEmail(updatedOrder, previousStatus)'), 'status updates must await Resend delivery before the serverless response completes');
assert(api.includes('lastStatusEmailStatus'), 'order records must persist the last lifecycle email delivery result');
assert(api.includes('INVENTORY_COMMIT_STATUSES.has(status)'), 'direct active-stage selection must still commit inventory safely');
assert(adminOrders.includes('You can select any active order stage directly'), 'Admin Orders must explain direct active-stage selection');
assert(!adminOrders.includes('Follow the order stages in sequence'), 'Admin Orders must not enforce the retired sequential-stage UI rule');
assert(orderReceipt.includes('Print / Save PDF'), 'customer receipt view must support print/save-as-PDF');
assert(orderConfirmation.includes('RECEIPT / INVOICE'), 'checkout confirmation must expose the receipt/invoice action');
assert(ordersPage.includes('RECEIPT / INVOICE'), 'My Orders must expose the receipt/invoice action');
assert(!checkout.includes('live courier GPS'), 'checkout must not claim courier GPS telemetry without a real integration');
assert(!checkout.includes('Live Order Tracking'), 'checkout must not claim live tracking without a real courier integration');
assert(api.includes('Courier and tracking number are required for dispatched, out-for-delivery, and delivered statuses.'), 'dispatch-related statuses must require real logistics data');
assert(adminOrders.includes('Order Timeline'), 'Admin Orders must display the persisted order timeline');
assert(adminOrders.includes("required={['dispatched', 'out_for_delivery', 'delivered'].includes(newStatus)}"), 'Admin must require courier/tracking from dispatch onward');
assert(adminOrders.includes('Cancellation Requested'), 'Admin Orders must surface customer cancellation requests');
assert(store.includes('requestOrderCancellation'), 'customer store context must expose secure cancellation requests');

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
assert(!footer.includes('74 Ward Place'), 'public footer must not publish an unverified physical address');
assert(!footer.includes('https://twitter.com'), 'public footer must not link to a generic placeholder social profile');
assert(!careConcierge.includes('wa.me/94771234567'), 'concierge must not publish a placeholder WhatsApp number');
assert(!careConcierge.includes('+94 11 234 5678'), 'concierge must not publish a placeholder phone number');
assert(!careConcierge.includes('Private Showroom'), 'concierge must not claim an unverified showroom');
assert(!careConcierge.includes('respond within 4 hours'), 'concierge must not promise an unverified response SLA');
assert(!careShipping.includes('DHL'), 'shipping page must not claim an unconfigured carrier');
assert(!careShipping.includes('Same-Day & Next-Day'), 'shipping page must not promise an unverified delivery SLA');
assert(!careShipping.includes('live tracking'), 'shipping page must not claim live courier telemetry');
assert(checkout.includes('settings?.freeShippingThresholdLKR'), 'checkout must use the same configurable free-shipping threshold as the server');
assert(checkout.includes('settings?.standardShippingLKR'), 'checkout must support the server standard-shipping setting');
assert(!checkout.includes('74 Ward Place'), 'checkout placeholders must not suggest the old fake address');
assert(!profilePage.includes('74 Ward Place'), 'profile placeholders must not suggest the old fake address');


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
assert(tracker.includes('X-SAELYXE-Guest-Order-Token'), 'tracking page must support scoped guest-order capability tokens');
assert(tracker.includes('firebaseUser.getIdToken()'), 'tracking page must still authenticate signed-in customer requests');
assert(trackerModal.includes('X-SAELYXE-Guest-Order-Token') && trackerModal.includes('firebaseUser.getIdToken()'), 'tracking modal must support scoped guest access while preserving signed-in authentication');


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
assert(!pkg.dependencies?.['@google/genai'], 'unused @google/genai dependency must not remain in package.json');
assert(!packageLock.includes('"node_modules/@google/genai"'), 'unused @google/genai package must be pruned from package-lock');
assert(privacyPage.includes('Firebase / Google Cloud') && privacyPage.includes('Vercel') && privacyPage.includes('Cloudinary') && privacyPage.includes('Resend'), 'Privacy Policy must identify production technology service providers');
assert(api.includes("res.setHeader('Cache-Control', 'private, no-store, max-age=0, must-revalidate')"), 'all API responses must disable browser/shared caching');
assert(api.includes("res.setHeader('Pragma', 'no-cache')") && api.includes("res.setHeader('Expires', '0')"), 'API responses must include legacy no-cache protections');

const paypalStatusStart = api.indexOf("app.get('/api/payments/paypal/status'");
const paypalStatusEnd = api.indexOf("app.post('/api/payments/paypal/create/:orderId'", paypalStatusStart);
const paypalStatusRoute = paypalStatusStart >= 0 && paypalStatusEnd > paypalStatusStart ? api.slice(paypalStatusStart, paypalStatusEnd) : '';
assert(paypalStatusRoute.includes('isSuperAdminToken(token)'), 'PayPal provider health diagnostics must be Super Admin only');
assert(paypalStatusRoute.includes('hasValidAppCheck(req)'), 'PayPal provider health diagnostics must enforce App Check');
assert(paypalStatusRoute.includes('paypal-health:'), 'PayPal provider health diagnostics must be rate limited');

for (const [label, routeStart, routeEnd, rateKey, recent] of [
  ['product write', "app.put('/api/admin/products/:id'", "app.delete('/api/admin/products/:id'", 'admin-product-write:', false],
  ['product delete', "app.delete('/api/admin/products/:id'", "app.put('/api/admin/settings'", 'admin-product-delete:', true],
  ['settings', "app.put('/api/admin/settings'", "app.post('/api/admin/audit'", 'admin-settings-write:', true],
  ['order status', "app.put('/api/orders/:id/status'", "app.post('/api/restock/dispatch'", 'admin-order-status:', true],
  ['refund', "app.post('/api/admin/orders/:id/refund'", "app.put('/api/orders/:id/status'", 'paypal-refund:', true]
]) {
  const start = api.indexOf(routeStart);
  const end = api.indexOf(routeEnd, start);
  const route = start >= 0 && end > start ? api.slice(start, end) : '';
  assert(route.includes(rateKey), label + ' must be rate limited');
  if (recent) assert(route.includes('hasRecentAuthentication(token)'), label + ' must require recent administrator authentication');
}


for (const [name, source] of [
  ['API', api],
  ['Payzy server module', payzy],
  ['Firebase client', firebaseClient],
  ['StoreContext', store],
  ['Checkout', checkout],
  ['local server', localServer]
]) {
  assert(!source.includes('-----BEGIN PRIVATE KEY-----'), name + ' must not contain a committed private key');
  assert(!/\b(?:sk_live_|sk_test_|ghp_|github_pat_|AKIA)[A-Za-z0-9_\-]+/.test(source), name + ' must not contain obvious committed secret tokens');
}


assert(
  !pkg.dependencies?.['@rollup/rollup-linux-x64-gnu'] &&
  !pkg.devDependencies?.['@rollup/rollup-linux-x64-gnu'] &&
  !pkg.optionalDependencies?.['@rollup/rollup-linux-x64-gnu'],
  '@rollup/rollup-linux-x64-gnu must NOT be a direct dependency in package.json'
);

// Footer payment/network artwork is intentionally preserved as an approved
// visual trust strip. Availability is enforced at checkout, not inferred from
// footer artwork. Payzy is now an approved checkout provider; Apple Pay is not.
assert(/payzy/i.test(checkout), 'CheckoutPage.tsx must expose the approved Payzy payment option');
assert(checkout.includes('CONTINUE WITH PAYZY'), 'Payzy checkout must expose an explicit redirect action');
assert(checkout.includes('createPayzyCheckoutAttemptId'), 'Payzy checkout must use an idempotent cryptographic attempt identifier');
assert(checkout.includes('LKR 10 sandbox transaction'), 'Payzy sandbox checkout must disclose that the test amount is not a live settlement');
assert(!/PAYZY_SECRET_KEY/.test(checkout), 'Payzy signing secret must never be referenced by CheckoutPage');
assert(!/PAYZY_SECRET_KEY/.test(store), 'Payzy signing secret must never be referenced by StoreContext');
assert(!/applepay/i.test(checkout), 'CheckoutPage.tsx must not expose applepay');

const reviewPostStart = api.indexOf("app.post('/api/products/:productId/reviews'");
const reviewPostEnd = api.indexOf("app.delete('/api/products/:productId/reviews/:reviewId'", reviewPostStart);
const reviewPostRoute = reviewPostStart >= 0 && reviewPostEnd > reviewPostStart
  ? api.slice(reviewPostStart, reviewPostEnd)
  : '';
assert(reviewPostRoute.length > 0, 'review submission route must exist');
assert(reviewPostRoute.includes("authorName = 'SAELYXE Patron'"), 'review submission must initialize safe default author');
assert(!reviewPostRoute.includes('author: body.author') && !reviewPostRoute.includes('safeString(body.author'), 'review submission must reject client-provided author');
assert(reviewPostRoute.includes("adminDb.collection('users').doc(authToken.uid).get()"), 'review submission must derive author from patron profile server-side');

assert(
  reviewPostRoute.includes("(paymentMethod === 'paypal' || paymentMethod === 'payzy') && paymentStatus === 'verified'") &&
  reviewPostRoute.includes("paymentMethod === 'cod' && (paymentStatus === 'cod_collected' || status === 'delivered')"),
  'verified review check must require verified PayPal/Payzy or collected COD status'
);

const orderPostStart = api.indexOf("app.post('/api/orders'");
const orderPostEnd = api.indexOf("app.get('/api/orders/:id'", orderPostStart);
const orderPostRoute = orderPostStart >= 0 && orderPostEnd > orderPostStart
  ? api.slice(orderPostStart, orderPostEnd)
  : '';
assert(orderPostRoute.length > 0, 'order creation route must exist');
assert(orderPostRoute.includes('!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20'), 'order quantity validation must reject invalid or abusive quantities');
assert(orderPostRoute.includes("hasOnlyKeys(item, ['productId', 'size', 'quantity'])"), 'order items must reject unsupported client-controlled fields');
assert(orderPostRoute.includes('authenticatedEmail !== email'), 'signed-in order email must match the verified Firebase account');
assert(orderPostRoute.includes('const isGuestCheckout = !authToken'), 'order API must explicitly separate guest and authenticated checkout paths');
assert(orderPostRoute.includes('guest-orders-short:') && orderPostRoute.includes('guest-orders-daily:'), 'guest checkout must have layered server-side rate limits');
assert(orderPostRoute.includes('issueGuestOrderAccess'), 'guest checkout must issue a scoped server-backed order capability token');
assert(api.includes("adminDb.collection('guest_order_access')") && api.includes('tokenHash'), 'guest order access tokens must be stored server-side only as hashes');
assert(guestOrderAccess.includes('X-SAELYXE-Guest-Order-Token'), 'client guest access helper must use the dedicated scoped header');
assert(orderPostRoute.includes('const unitPriceLKR = Number(product.priceLKR)'), 'order pricing must come from trusted server product records');

const payzyCreateStart = api.indexOf("app.post('/api/payments/payzy/create/:orderId'");
const payzyStatusStart = api.indexOf("app.get('/api/payments/payzy/status/:orderId'", payzyCreateStart);
const payzyReturnStart = api.indexOf("app.get('/api/payments/payzy/return'", payzyStatusStart);
const payzyNextRoute = api.indexOf("app.get('/api/payments/paypal/status'", payzyReturnStart);
const payzyCreateRoute = payzyCreateStart >= 0 && payzyStatusStart > payzyCreateStart ? api.slice(payzyCreateStart, payzyStatusStart) : '';
const payzyStatusRoute = payzyStatusStart >= 0 && payzyReturnStart > payzyStatusStart ? api.slice(payzyStatusStart, payzyReturnStart) : '';
const payzyReturnRoute = payzyReturnStart >= 0 && payzyNextRoute > payzyReturnStart ? api.slice(payzyReturnStart, payzyNextRoute) : '';
assert(payzyCreateRoute.includes('authorizeCustomerOrderAccess(req, adminDb, order)') && payzyCreateRoute.includes('hasValidAppCheck(req)'), 'Payzy create route must require App Check plus signed-in or scoped guest order access');
assert(payzyCreateRoute.includes('payzy-create:'), 'Payzy checkout creation must be rate limited');
assert(payzyCreateRoute.includes("order.paymentMethod !== 'payzy'"), 'Payzy checkout creation must be bound to a Payzy order');
assert(payzyStatusRoute.includes('authorizeCustomerOrderAccess(req, adminDb, order)'), 'Payzy status route must enforce signed-in or scoped guest order ownership');
assert(payzyReturnRoute.includes('verifyPayzyReturnSignature'), 'Payzy provider return must be HMAC verified server-side');
assert(payzyReturnRoute.includes("responseCode !== '00'"), 'Payzy provider failures must not be treated as successful payments');
assert(payzyReturnRoute.includes('markPayzySandboxVerified') && payzyReturnRoute.includes('markPayzyLiveVerified'), 'Payzy sandbox and live settlement states must be separated');
assert(payzy.includes("createHmac('sha256'"), 'Payzy signing must use server-side HMAC SHA-256');
assert(payzy.includes('timingSafeEqual'), 'Payzy callback signatures must use timing-safe comparison');
assert(payzy.includes("status: 'cancelled'") && payzy.includes("paymentVerificationSource: 'payzy_sandbox_signature_verified'"), 'Payzy sandbox success must auto-close the test order');
assert(payzy.includes('inventoryCommitted: false'), 'Payzy sandbox success must not commit inventory');
assert(!payzy.includes('test@payzy.lk') && !payzy.includes('Test@!123'), 'Payzy customer sandbox login credentials must never be committed to the application');


const reviewDeleteStart = api.indexOf("app.delete('/api/products/:productId/reviews/:reviewId'");
const reviewDeleteEnd = api.indexOf("app.post('/api/promo/validate'", reviewDeleteStart);
const reviewDeleteRoute = reviewDeleteStart >= 0 && reviewDeleteEnd > reviewDeleteStart
  ? api.slice(reviewDeleteStart, reviewDeleteEnd)
  : '';
assert(reviewDeleteRoute.length > 0, 'review deletion route must exist');
assert(reviewDeleteRoute.includes('hasValidAppCheck(req)'), 'review deletion must enforce App Check');
assert(reviewDeleteRoute.includes('review-delete:${authToken.uid}'), 'review deletion must enforce rate limiting per authenticated user');
assert(reviewDeleteRoute.includes('!isAdmin && !isOwner'), 'review deletion must enforce owner or admin access');

assert(rules.includes("'firstName'") && rules.includes("'lastName'") && rules.includes("'lastLoginAt'"), 'firestore.rules must include firstName, lastName, and lastLoginAt in valid user profile fields');

assert(!pdp.includes('Austin K.'), 'ProductDetailPage must not contain fake Austin review placeholder');
assert(productModal.includes('SELECT A SIZE'), 'ProductModal must prompt for size selection when required');
assert(spotlight.includes('if (added)'), 'SpotlightProduct must not indicate success if size selection was required');
assert(!seoManager.includes('Worldwide Delivery') && !seoManager.includes('Global express'), 'SEOManager must not claim worldwide delivery');
assert(!ordersPage.includes('hand-delivery courier'), 'OrdersPage must not make unconditional hand-delivery claims');
assert(careShipping.includes('Sri Lanka Exclusively'), 'CareShippingPage must state Sri Lanka delivery exclusively');

assert(rules.includes('allow update, delete: if false;'), 'orders must not be mutated directly by browser clients');
const adminsRuleStart = rules.indexOf('match /admins/{adminId}');
const adminsRuleEnd = rules.indexOf('match /audit_logs/', adminsRuleStart);
const adminsRule = adminsRuleStart >= 0 && adminsRuleEnd > adminsRuleStart ? rules.slice(adminsRuleStart, adminsRuleEnd) : '';
assert(adminsRule.includes('allow create, update, delete: if false'), 'admin privilege records must be server-only');
assert(rules.includes("(!('ordersCount' in request.resource.data) || request.resource.data.ordersCount == 0)"), 'new users must not forge order counters');
assert(api.includes("process.env.VERCEL_ENV === 'production'"), 'App Check must fail closed on Vercel production');
for (const key of ['admin-staff-invite:', 'admin-staff-activate:', 'admin-staff-role:', 'admin-staff-revoke:']) {
  assert(api.includes(key), 'staff privilege actions must be rate limited: ' + key);
}
assert(api.includes('Recent administrator authentication required. Sign out and sign in again before changing staff access.'), 'staff privilege changes must require recent authentication');
assert(!store.includes('localStorage.setItem(`saelyx_saved_delivery_details:${user.uid}`'), 'profile updates must not implicitly persist delivery PII');
assert(store.includes('localStorage.removeItem(`saelyx_saved_delivery_details:${departingUserId}`)'), 'logout must clear account-scoped saved delivery PII');

if (!process.exitCode) {
  console.log('SAELYXE security regression checks passed.');
}
