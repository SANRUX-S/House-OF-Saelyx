import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const dataFile = path.join(__dirname, 'data.json');

// Fix mojibake (broken UTF-8 characters like â€”, â€™) in text fields
function fixMojibake(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(/\u00e2\u20ac\u201c/g, '\u2014')   // â€” -> — (em dash)
    .replace(/\u00e2\u20ac\u2122/g, '\u2019')   // â€™ -> ' (right single quote)
    .replace(/\u00e2\u20ac\u201d/g, '\u201d')   // â€“ -> " (double quote)
    .replace(/\u00e2\u20ac\u0153/g, '\u201c')   // â€œ -> " (left double quote)
    .replace(/\u00e2\u20ac\u2019/g, '\u2019')   // ä¹ — safety
    .replace(/â€”/g, '\u2014')
    .replace(/â€™/g, '\u2019')
    .replace(/â€œ/g, '\u201c')
    .replace(/â€\u009d/g, '\u201d')
    .replace(/â€“/g, '\u2013')
    .replace(/\u00c2/g, '');
}

function sanitizeProduct(product) {
  const clean = { ...product };
  ['name', 'description'].forEach((key) => {
    if (typeof clean[key] === 'string') clean[key] = fixMojibake(clean[key]);
  });
  return clean;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use(express.json({ limit: '2mb' }));
app.get('/api/products', (_req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    const products = (data.products || [])
      .filter((product) => product.available !== false)
      .map(sanitizeProduct);
    res.json(products);
  } catch (error) {
    console.error('Unable to read product catalogue:', error.message);
    res.status(500).json({ message: 'Product catalogue unavailable' });
  }
});

app.post('/api/orders', (req, res) => {
  const body = req.body || {};
  const items = Array.isArray(body.items) ? body.items : [];
  const subtotal = items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity || item.qty) || 1), 0);
  const order = { ...body, id: `o-${Date.now()}`, status: 'Pending', total: Number(body.total) || subtotal, createdAt: new Date().toISOString() };
  if (!process.env.VERCEL) {
    try { const data = JSON.parse(fs.readFileSync(dataFile, 'utf8')); data.orders = [order, ...(data.orders || [])]; fs.writeFileSync(dataFile, JSON.stringify(data, null, 2)); } catch (error) { console.error('Unable to save local order:', error.message); }
  }
  res.status(201).json(order);
});

// Generic message record helper (contact + newsletter)
function recordMessage(body, channel) {
  if (process.env.VERCEL) return; // Stateless on serverless — log only
  try {
    const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    data.messages = data.messages || [];
    data.messages.push({ ...body, channel, id: `m-${Date.now()}`, createdAt: new Date().toISOString() });
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Unable to save ${channel} message locally:`, error.message);
  }
}

// Contact form endpoint
app.post('/api/contact', (req, res) => {
  const body = req.body || {};
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim();
  const subject = String(body.subject || '').trim();
  const message = String(body.message || '').trim();
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ message: 'All contact fields are required.' });
  }
  recordMessage({ name, email, subject, message }, 'contact');
  res.status(201).json({ status: 'ok', message: 'Your message has been received.' });
});

// Newsletter subscription endpoint
app.post('/api/newsletter', (req, res) => {
  const body = req.body || {};
  const email = String(body.email || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'A valid email address is required.' });
  }
  recordMessage({ email }, 'newsletter');
  res.status(201).json({ status: 'ok', message: 'Subscribed successfully.' });
});

// Middleware to resolve asset prefixes like /css/*, /js/*, /fonts/*, /webfonts/*, /images/*, /img/*
app.use((req, res, next) => {
  const cleanPath = req.path.replace(/^\/(?:css|js|fonts|webfonts|images|img)\//, '/');
  const filePath = path.join(__dirname, cleanPath);
  
  if (cleanPath !== req.path && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return res.sendFile(filePath);
  }
  next();
});

// Serve static files from root
app.use(express.static(__dirname));

// Fallback to index.html for SPA / general routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

if (!process.env.VERCEL) app.listen(PORT, '0.0.0.0', () => console.log(`Server is running on http://0.0.0.0:${PORT}`));

export default app;
