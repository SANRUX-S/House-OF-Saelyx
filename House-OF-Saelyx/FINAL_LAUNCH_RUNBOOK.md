# SAELYXE Final Launch Runbook

This file is the production source of truth for the SAELYXE storefront and administrator console.

## Final business rules

- Brand name is **SAELYXE**.
- Customers may browse without an account, but **checkout requires a signed-in and verified customer account**.
- **Guest checkout is disabled.**
- **Cash on Delivery is disabled.**
- Customer checkout payment methods are **PayPal** and **Payzy** only when their production configuration reports them as available.
- Orders are confirmed only after server-side payment verification.
- PayPal is configured for live mode in production.
- Payzy is configured for live mode in production.
- Product and administrator media use the connected **Vercel Blob** store.
- Firebase remains responsible for authentication, Firestore application data, App Check, and trusted server authorization.
- Do not reintroduce Cloudinary into the active media upload flow.

## Storefront configuration

The Admin Console → Store Settings controls the live storefront fields below after **Save & Publish**:

- Spotlight headline, eyebrow, subhead, description, price, and background image.
- Spotlight countdown target. The second homepage section stays locked before this timestamp and unlocks automatically when the target is reached.
- Hero headline and subheading.
- Announcement bar text.
- Free-shipping threshold.
- Homepage section visibility toggles.

Use a future date/time when a countdown is required. An expired countdown target intentionally means the drop is already unlocked.

## Administrator rules

- Administrator access remains on the private SAELYXE console route.
- Legacy `/admin` and `/atelier-console` entry points remain retired.
- Product deletion is Super Admin only and requires recent Firebase authentication; the UI may request the administrator password to securely reauthenticate instead of weakening the server rule.
- App Check, Firebase ID-token verification, rate limits, role checks, and audit logging must not be bypassed.
- Product images must be validated before upload and stored in Vercel Blob.

## Release checks

Before merging a production change run:

```bash
npm ci
npm run security:check
npm run final:readiness
npm run lint
npm run build
npm run rules:test
npm run e2e
```

Do not merge if a code/security/build test fails. Provider-dependent payment tests must never initiate a real-money transaction in CI.

After the production deployment verify:

- `https://www.saelyxe.com/` returns 200.
- `/api/health` returns the minimal healthy response.
- `/api/products`, `/api/settings`, and `/api/payments/config` return expected production data.
- Anonymous `POST /api/orders` is rejected.
- Checkout does not expose Cash on Delivery.
- The second homepage countdown reflects the Admin Store Settings target.
- Current Vercel runtime logs contain no new error/fatal clusters.

## Secrets

Never commit Firebase private keys, Vercel Blob read-write tokens, PayPal secrets, Payzy secrets, or Resend keys. Keep all server credentials in Vercel environment variables only.
