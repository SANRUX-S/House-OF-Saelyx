const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

const databaseId = process.env.FIREBASE_DATABASE_ID || "ai-studio-saelyxmadeforpre-9fd90c38-837e-435e-b027-e53891c99a41";
const db = admin.firestore(databaseId);

/**
 * Cloud Function Trigger: onStockReplenished
 * Automatically triggered when a product document in Firestore is updated.
 * If inStock switches to true or stockCount increases above 0,
 * it queries all pending notifications for this product and sends back-in-stock dispatches.
 */
exports.onStockReplenished = onDocumentUpdated({
  document: "products/{productId}",
  database: databaseId
}, async (event) => {
  const beforeData = event.data?.before?.data();
  const afterData = event.data?.after?.data();
  const productId = event.params.productId;

  if (!afterData) return null;

  const wasOutOfStock = !beforeData || !beforeData.inStock || (beforeData.stockCount || 0) <= 0;
  const isNowInStock = afterData.inStock === true && (afterData.stockCount || 0) > 0;

  if (wasOutOfStock && isNowInStock) {
    logger.info(`[Cloud Function] Product ${productId} (${afterData.title}) restocked! Processing pending subscribers...`);

    const snapshot = await db.collection("stock_notifications")
      .where("productId", "==", productId)
      .where("status", "==", "pending")
      .get();

    if (snapshot.empty) {
      logger.info(`[Cloud Function] No pending waitlist subscribers for product ${productId}.`);
      return null;
    }

    const batch = db.batch();
    const notificationPromises = [];
    const executionId = `fn-exec-${Date.now().toString(36)}`;

    snapshot.docs.forEach((docSnap) => {
      const subscriber = docSnap.data();
      logger.info(`[Cloud Function] Queuing restock dispatch for notification ${docSnap.id}.`);

      // Update notification status to 'sent'
      batch.update(docSnap.ref, {
        status: "sent",
        notified: true,
        notifiedAt: new Date().toISOString(),
        cloudFunctionExecutionId: executionId
      });

      // Simulated automated SMTP / SendGrid / Postmark dispatch
      notificationPromises.push(
        deliverRestockEmail({
          email: subscriber.customerEmail,
          name: subscriber.customerName || "Valued Patron",
          productTitle: afterData.title,
          productSlug: afterData.slug || productId,
          productPrice: afterData.priceLKR,
          productImage: afterData.images?.[0] || "",
          size: subscriber.selectedSize || "Standard",
          executionId
        })
      );
    });

    // Send successfully first. Only mark notifications as sent after delivery succeeds.
    await Promise.all(notificationPromises);
    await batch.commit();

    // Record audit log entry
    await db.collection("audit_logs").add({
      timestamp: new Date().toISOString(),
      actor: "Firebase Cloud Functions (Auto-Trigger)",
      role: "super_admin",
      action: "CLOUD_FUNCTION_RESTOCK_DISPATCH",
      details: `Dispatched ${snapshot.size} automated back-in-stock alerts for [${afterData.title}] (Execution ID: ${executionId})`
    });

    logger.info(`[Cloud Function] Successfully processed ${snapshot.size} restock notifications.`);
  }

  return null;
});

/**
 * Callable Cloud Function: subscribeBackInStock
 * Allows frontend clients to register an email alert for out-of-stock garments.
 */
exports.subscribeBackInStock = onCall(async (request) => {
  const { productId, productTitle, productSlug, productImage, selectedSize, customerEmail, customerName, phone, channel } = request.data;

  if (!productId || !customerEmail) {
    throw new HttpsError("invalid-argument", "Product ID and customer email are required.");
  }

  const notificationRecord = {
    productId,
    productTitle: productTitle || "Atelier Garment",
    productSlug: productSlug || productId,
    productImage: productImage || "",
    selectedSize: selectedSize || "Any Size",
    customerEmail: customerEmail.trim().toLowerCase(),
    customerName: customerName ? customerName.trim() : "",
    phone: phone || "",
    channel: channel || "email",
    notified: false,
    status: "pending",
    createdAt: new Date().toISOString()
  };

  const docRef = await db.collection("stock_notifications").add(notificationRecord);

  logger.info(`[Cloud Function] Registered waitlist subscriber ${customerEmail} for ${productTitle} (${docRef.id})`);

  return {
    success: true,
    notificationId: docRef.id,
    message: "You have been registered for private restock priority notifications."
  };
});

/**
 * HTTPS Webhook/API trigger for manual admin broadcast
 */
exports.dispatchRestockAlerts = onRequest(async (req, res) => {
  try {
    const authorization = req.headers.authorization || "";
    if (!authorization.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const idToken = authorization.slice("Bearer ".length).trim();
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const isAdmin = decodedToken.admin === true ||
      decodedToken.role === "admin" ||
      decodedToken.role === "super_admin";

    if (!isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { productId } = req.body || req.query;
    if (!productId) {
      return res.status(400).json({ error: "Missing productId parameter" });
    }

    const productDoc = await db.collection("products").doc(productId).get();
    if (!productDoc.exists) {
      return res.status(404).json({ error: "Product not found in Firestore" });
    }

    const productData = productDoc.data();
    const snapshot = await db.collection("stock_notifications")
      .where("productId", "==", productId)
      .where("status", "==", "pending")
      .get();

    const count = snapshot.size;
    const batch = db.batch();
    const executionId = `manual-exec-${Date.now().toString(36)}`;
    const deliveries = [];

    snapshot.docs.forEach((docSnap) => {
      const subscriber = docSnap.data();
      deliveries.push(deliverRestockEmail({
        email: subscriber.customerEmail,
        name: subscriber.customerName || "Valued Patron",
        productTitle: productData.title,
        productSlug: productData.slug || productId,
        productPrice: productData.priceLKR,
        productImage: productData.images?.[0] || "",
        size: subscriber.selectedSize || "Standard",
        executionId
      }));

      batch.update(docSnap.ref, {
        status: "sent",
        notified: true,
        notifiedAt: new Date().toISOString(),
        cloudFunctionExecutionId: executionId
      });
    });

    await Promise.all(deliveries);
    await batch.commit();

    return res.json({
      success: true,
      product: productData.title,
      dispatchedCount: count,
      executionId
    });
  } catch (error) {
    logger.error("Error in dispatchRestockAlerts:", error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Transactional restock email delivery via Resend.
 * Configure RESEND_API_KEY and RESEND_FROM_EMAIL as Firebase Function secrets/env vars.
 */
async function deliverRestockEmail(payload) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    throw new Error("Restock email delivery is not configured.");
  }

  const productUrl = `https://www.saelyxe.com/product/${encodeURIComponent(payload.productSlug)}`;
  const subject = `SAELYXE Restock: ${payload.productTitle} is available`;
  const html = [
    "<div style=\"font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#181614\">",
    "<h2>SAELYXE — Made for Presence</h2>",
    `<p>${escapeHtml(payload.name)}, the item you requested is available again.</p>`,
    `<p><strong>${escapeHtml(payload.productTitle)}</strong> · Size ${escapeHtml(payload.size)}</p>`,
    `<p><a href="${productUrl}">View product</a></p>`,
    "<p>Availability is not reserved until checkout is completed.</p>",
    "</div>"
  ].join("");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [payload.email],
      subject,
      html
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Restock email provider rejected delivery (${response.status}): ${errorText.slice(0, 200)}`);
  }

  const result = await response.json();
  logger.info(`[Email Dispatcher] Restock email delivered for execution ${payload.executionId}.`);
  return {
    sent: true,
    providerId: result.id,
    subject,
    timestamp: new Date().toISOString()
  };
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
