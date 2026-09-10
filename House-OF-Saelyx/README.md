# SAELYXE

SAELYXE is the production e-commerce storefront and protected administrator application for the SAELYXE fashion brand.

## Local development

1. Install dependencies with `npm install`.
2. Copy `.env.example` to your local environment file and provide the required Firebase, Vercel Blob, payment, and email values.
3. Run `npm run dev`.
4. Before shipping changes, run the project TypeScript/security checks and `npm run build`.

## Production architecture

- **Frontend:** React + TypeScript + Vite.
- **Hosting/API:** Vercel.
- **Authentication and application data:** Firebase / Google Cloud.
- **Product and administrator media:** Vercel Blob. Admin media uploads are authenticated, Firebase App Check protected, validated server-side, optimized in the browser, and written to the connected public Blob store through the protected media API.
- **Transactional email:** Resend.
- **Payments:** PayPal and Payzy. Cash on Delivery is not supported.

## Checkout rules

SAELYXE checkout requires an authenticated customer account. Guest browsing is allowed, but guest checkout is blocked. PayPal and Payzy orders must never be treated as paid until the payment is verified by the trusted server-side flow. Cash on Delivery is not supported.

## Server configuration

Protected server routes require the existing server-only Firebase Admin values in the local environment and Vercel Project Settings > Environment Variables:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

Administrator media uploads additionally require the Vercel Blob store connection to provide:

- `BLOB_STORE_ID`
- `BLOB_READ_WRITE_TOKEN`

Never commit service-account credentials, Blob tokens, or payment secrets. Never expose them through `VITE_*` variables. Browser Firebase configuration is separate and may use the public `VITE_FIREBASE_*` values shown in `.env.example`.

## Production hardening checklist

1. Keep `VITE_FIREBASE_ENABLE_REALTIME=true` only with the intended production Firebase project.
2. Keep `saelyxe.com` and `www.saelyxe.com` in Firebase Authentication authorized domains.
3. Deploy and review `firestore.rules` before production data-model changes.
4. Keep Firebase App Check and administrator authorization enforced for protected write/upload routes.
5. Keep the Vercel Blob store connected to the production project and keep its read-write token server-only.
6. Configure `RESEND_API_KEY` and `RESEND_FROM_EMAIL` only as server-side values.
7. Verify PayPal/Payzy payments server-side before marking orders as paid.
8. Keep guest checkout and Cash on Delivery disabled.
9. Run the SAELYXE CI checks and production build before final deployment.

### Local server alignment

The local VS Code server mounts the same protected API implementation used in production so authorization and order behavior stay aligned between development and Vercel.
