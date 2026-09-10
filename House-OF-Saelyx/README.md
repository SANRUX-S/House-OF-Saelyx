# SAELYXE

SAELYXE is the production e-commerce storefront and protected administrator application for the SAELYXE fashion brand.

## Local development

1. Install dependencies with `npm install`.
2. Copy `.env.example` to your local environment file and provide the required Firebase, payment, and email values.
3. Run `npm run dev`.
4. Before shipping changes, run the project TypeScript/security checks and `npm run build`.

## Production architecture

- **Frontend:** React + TypeScript + Vite.
- **Hosting/API:** Vercel.
- **Authentication, application data, and product media:** Firebase / Google Cloud. Admin media uploads are authenticated, App Check protected, optimized in the browser, and stored through protected Firebase Storage server functions.
- **Transactional email:** Resend.
- **Payments:** PayPal, Payzy, and Cash on Delivery where the checkout UI makes them available.

## Checkout rules

SAELYXE supports both registered-customer checkout and eligible guest checkout. Guest orders are protected with scoped order-access capabilities. Cash on Delivery orders remain unpaid until delivery settlement. PayPal and Payzy orders must never be treated as paid until the payment is verified by the trusted server-side flow.

## Firebase Admin API configuration

Protected server routes require these server-only values in the local environment and Vercel Project Settings > Environment Variables:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_STORAGE_BUCKET`

Never commit service-account credentials and never expose them through `VITE_*` variables. Browser Firebase configuration is separate and may use the public `VITE_FIREBASE_*` values shown in `.env.example`.

## Production hardening checklist

1. Keep `VITE_FIREBASE_ENABLE_REALTIME=true` only with the intended production Firebase project.
2. Keep `saelyxe.com` and `www.saelyxe.com` in Firebase Authentication authorized domains.
3. Deploy and review `firestore.rules` before production data-model changes.
4. Keep Firebase App Check and administrator authorization enforced for protected write/upload routes.
5. Configure `RESEND_API_KEY` and `RESEND_FROM_EMAIL` only as server-side values.
6. Verify PayPal/Payzy payments server-side before marking prepaid orders as paid.
7. Keep COD orders in an unpaid/pending state until delivery settlement.
8. Run the SAELYXE CI checks and production build before final deployment.

### Local server alignment

The local VS Code server mounts the same protected API implementation used in production so authorization and order behavior stay aligned between development and Vercel.
