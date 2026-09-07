# SAELYXE WhatsApp Cloud API setup

This integration uses Meta's official WhatsApp Business Platform / Cloud API.

## Callback

Use this Meta webhook callback after the branch is deployed:

```
https://www.saelyxe.com/api/whatsapp/webhook
```

Set `WHATSAPP_VERIFY_TOKEN` in Vercel and paste the exact same value into Meta's **Verify token** field.

The GET callback implements Meta's `hub.mode`, `hub.verify_token`, and `hub.challenge` verification flow.

The POST callback acknowledges Cloud API webhook events and validates `X-Hub-Signature-256` whenever `WHATSAPP_APP_SECRET` is configured.

## Required Vercel environment variables

```
WHATSAPP_VERIFY_TOKEN=<long-random-value>
WHATSAPP_APP_SECRET=<Meta App Secret>
WHATSAPP_ACCESS_TOKEN=<production/system-user access token>
WHATSAPP_PHONE_NUMBER_ID=<production Phone Number ID>
WHATSAPP_ORDER_TEMPLATE_NAME=saelyxe_order_confirmed
WHATSAPP_ORDER_TEMPLATE_LANGUAGE=en_US
WHATSAPP_GRAPH_API_VERSION=v25.0
```

Do not prefix any server secret with `VITE_`.

## Meta message template

Create an approved **Utility** template:

- Name: `saelyxe_order_confirmed`
- Language: English (US)
- Body:
  `Your SAELYXE order {{1}} has been confirmed. Total: {{2}}. We’ll send delivery updates here.`

The backend sends:
- `{{1}}`: SAELYXE order number
- `{{2}}`: server-calculated order total

If you change the template name, update `WHATSAPP_ORDER_TEMPLATE_NAME`.

## Checkout consent

Checkout now contains an explicit, unchecked consent option:

> Send my order confirmation and delivery updates to this phone number via WhatsApp.

The server stores the opt-in with the order and will not send a WhatsApp order confirmation unless the customer explicitly selected it.

## Delivery trigger

For PayPal, the WhatsApp confirmation is sent only after the server verifies the payment. The send is idempotency-protected so duplicate capture/verify requests do not intentionally send duplicate confirmations.

If Cloud API configuration is missing or Meta rejects the request, the order remains valid; the WhatsApp delivery failure is recorded on the order instead of breaking payment/order completion.
