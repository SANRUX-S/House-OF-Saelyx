import { Order } from '../types';

const escapeReceiptHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const formatLkr = (value: unknown) => {
  const amount = Number(value);
  return \`LKR \${(Number.isFinite(amount) ? amount : 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}\`;
};

const formatPaymentMethod = (order: Order) => {
  if (order.paymentMethod === 'cod') return 'Cash on Delivery';
  if (order.paymentMethod === 'paypal') return 'PayPal';
  return order.paymentMethod || 'Payment method pending';
};

const formatPaymentStatus = (order: Order) => {
  const status = order.paymentStatus || '';
  if (order.paymentMethod === 'cod') {
    if (status === 'cod_collected') return 'Collected on delivery';
    if (status === 'cancelled') return 'Cancelled';
    return 'Pay on delivery';
  }
  if (status === 'verified') return 'Payment verified';
  if (status === 'refunded') return 'Refund completed';
  if (status === 'refund_pending') return 'Refund processing';
  if (status === 'cancelled') return 'Payment cancelled';
  return status ? status.replace(/_/g, ' ') : 'Pending verification';
};

export const buildOrderReceiptHtml = (order: Order) => {
  const createdAt = order.createdAt && Number.isFinite(Date.parse(order.createdAt))
    ? new Date(order.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Recorded by SAELYXE';

  const items = (order.items || []).map(item => {
    const image = /^https:\/\//i.test(item.image || '')
      ? \`<img src="\${escapeReceiptHtml(item.image)}" alt="" />\`
      : '<div class="image-placeholder"></div>';

    return \`
      <div class="item">
        <div class="item-image">\${image}</div>
        <div class="item-copy">
          <div class="item-title">\${escapeReceiptHtml(item.title)}</div>
          <div class="item-meta">Size \${escapeReceiptHtml(item.size || '—')} &nbsp;·&nbsp; Qty \${Math.max(1, Number(item.quantity) || 1)}</div>
          <div class="item-unit">Unit price \${formatLkr(item.priceLKR)}</div>
        </div>
        <div class="item-price">\${formatLkr((Number(item.priceLKR) || 0) * (Math.max(1, Number(item.quantity) || 1)))}</div>
      </div>
    \`;
  }).join('');

  const discount = Number(order.discountLKR) || 0;
  const delivery = Number(order.shippingLKR) || 0;
  const address = [
    order.address,
    order.city,
    order.postalCode,
    order.country
  ].filter(Boolean).map(escapeReceiptHtml).join(', ');

  return \`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>SAELYXE Receipt \${escapeReceiptHtml(order.orderNumber)}</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #ede9e3; color: #1b1815; font-family: Arial, Helvetica, sans-serif; }
    .toolbar { max-width: 860px; margin: 24px auto 0; display: flex; justify-content: flex-end; gap: 10px; padding: 0 16px; }
    .toolbar button { border: 0; border-radius: 10px; background: #171411; color: #fff; padding: 12px 18px; font-size: 11px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; cursor: pointer; }
    .sheet { width: calc(100% - 32px); max-width: 860px; margin: 14px auto 36px; background: #fff; border: 1px solid #ded7ce; border-radius: 22px; overflow: hidden; box-shadow: 0 16px 45px rgba(25,20,16,.08); }
    .brand { background: #171411; color: #fff; padding: 34px 42px; }
    .logo { font-family: Georgia, 'Times New Roman', serif; font-size: 34px; font-weight: 700; letter-spacing: .15em; }
    .tagline { margin-top: 7px; color: #d7ccbf; font-size: 10px; letter-spacing: .26em; text-transform: uppercase; }
    .body { padding: 42px; }
    .eyebrow { font-size: 10px; letter-spacing: .2em; text-transform: uppercase; color: #8c8074; font-weight: 800; }
    h1 { margin: 9px 0 10px; font-family: Georgia, 'Times New Roman', serif; font-size: 40px; font-weight: 500; line-height: 1.05; }
    .muted { color: #756a60; font-size: 13px; line-height: 1.65; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #e4ddd4; border-radius: 14px; background: #f8f5f1; margin-top: 26px; overflow: hidden; }
    .info { padding: 18px 20px; }
    .info + .info { border-left: 1px solid #e4ddd4; }
    .label { color: #918579; font-size: 9px; font-weight: 800; letter-spacing: .15em; text-transform: uppercase; }
    .value { margin-top: 6px; color: #1b1815; font-size: 13px; font-weight: 700; }
    .section { margin-top: 30px; }
    .section-title { padding-bottom: 10px; border-bottom: 1px solid #ded7ce; font-size: 11px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
    .row { display: flex; justify-content: space-between; gap: 20px; padding: 6px 0; color: #756a60; font-size: 13px; }
    .row strong { color: #1b1815; }
    .item { display: grid; grid-template-columns: 72px minmax(0,1fr) auto; gap: 16px; align-items: start; padding: 16px 0; border-bottom: 1px solid #eee8df; }
    .item-image { width: 72px; height: 88px; border-radius: 11px; overflow: hidden; background: #f6f2ec; border: 1px solid #e6ded4; }
    .item-image img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .image-placeholder { width: 100%; height: 100%; background: #f6f2ec; }
    .item-title { font-size: 14px; font-weight: 800; line-height: 1.45; }
    .item-meta { margin-top: 7px; color: #8c8074; font-size: 10px; letter-spacing: .08em; text-transform: uppercase; }
    .item-unit { margin-top: 8px; color: #8c8074; font-size: 11px; }
    .item-price { font-size: 13px; font-weight: 800; white-space: nowrap; }
    .totals { width: 100%; max-width: 390px; margin-left: auto; margin-top: 26px; }
    .total { margin-top: 8px; padding-top: 15px; border-top: 1px solid #d8d0c6; display: flex; justify-content: space-between; gap: 20px; font-size: 20px; font-weight: 800; }
    .footer { background: #f8f5f1; border-top: 1px solid #e5ddd4; padding: 20px 42px; color: #8b8075; font-size: 10px; letter-spacing: .13em; text-transform: uppercase; }
    @media (max-width: 640px) {
      .body, .brand { padding: 28px 22px; }
      .info-grid { grid-template-columns: 1fr; }
      .info + .info { border-left: 0; border-top: 1px solid #e4ddd4; }
      .item { grid-template-columns: 58px minmax(0,1fr); }
      .item-image { width: 58px; height: 72px; }
      .item-price { grid-column: 2; }
      h1 { font-size: 32px; }
    }
    @media print {
      body { background: #fff; }
      .toolbar { display: none !important; }
      .sheet { width: 100%; max-width: none; margin: 0; border: 0; border-radius: 0; box-shadow: none; }
      @page { margin: 10mm; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button type="button" onclick="window.print()">Print / Save PDF</button>
  </div>
  <main class="sheet">
    <header class="brand">
      <div class="logo">SAELYXE</div>
      <div class="tagline">Made for Presence</div>
    </header>
    <section class="body">
      <div class="eyebrow">Receipt / Invoice</div>
      <h1>Order summary</h1>
      <div class="muted">A detailed receipt for your SAELYXE order. Keep this document with your order number for future reference.</div>

      <div class="info-grid">
        <div class="info">
          <div class="label">Order number</div>
          <div class="value">#\${escapeReceiptHtml(order.orderNumber)}</div>
        </div>
        <div class="info">
          <div class="label">Order date</div>
          <div class="value">\${escapeReceiptHtml(createdAt)}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Customer & delivery</div>
        <div class="row"><span>Customer</span><strong>\${escapeReceiptHtml(order.customerName)}</strong></div>
        <div class="row"><span>Email</span><strong>\${escapeReceiptHtml(order.email || order.customerEmail || '')}</strong></div>
        <div class="row"><span>Phone</span><strong>\${escapeReceiptHtml(order.phone || '')}</strong></div>
        <div class="row"><span>Delivery address</span><strong style="text-align:right">\${address || '—'}</strong></div>
      </div>

      <div class="section">
        <div class="section-title">Payment details</div>
        <div class="row"><span>Payment method</span><strong>\${escapeReceiptHtml(formatPaymentMethod(order))}</strong></div>
        <div class="row"><span>Payment status</span><strong>\${escapeReceiptHtml(formatPaymentStatus(order))}</strong></div>
        <div class="row"><span>Order status</span><strong>\${escapeReceiptHtml((order.status || 'placed').replace(/_/g, ' '))}</strong></div>
      </div>

      <div class="section">
        <div class="section-title">Your items</div>
        \${items || '<div class="muted" style="padding:18px 0">No item details available.</div>'}
      </div>

      <div class="totals">
        <div class="row"><span>Subtotal</span><strong>\${formatLkr(order.subtotalLKR)}</strong></div>
        \${discount > 0 ? \`<div class="row"><span>Discount\${order.promoCode ? \` (\${escapeReceiptHtml(order.promoCode)})\` : ''}</span><strong>-\${formatLkr(discount)}</strong></div>\` : ''}
        <div class="row"><span>Delivery</span><strong>\${delivery === 0 ? 'Complimentary' : formatLkr(delivery)}</strong></div>
        <div class="total"><span>Total</span><span>\${formatLkr(order.totalLKR)}</span></div>
      </div>
    </section>
    <footer class="footer">SAELYXE · Made for Presence · Sri Lanka</footer>
  </main>
</body>
</html>\`;
};

export const openOrderReceipt = (order: Order) => {
  if (typeof window === 'undefined') return false;
  const receiptWindow = window.open('', '_blank', 'width=940,height=1000');
  if (!receiptWindow) return false;

  try {
    receiptWindow.opener = null;
  } catch {
    // Some browsers do not allow resetting opener; the receipt still renders.
  }

  receiptWindow.document.open();
  receiptWindow.document.write(buildOrderReceiptHtml(order));
  receiptWindow.document.close();
  receiptWindow.focus();
  return true;
};
