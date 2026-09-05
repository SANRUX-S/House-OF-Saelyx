import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const app = express();
app.disable('x-powered-by');
app.use((_req, res, next) => {
	res.setHeader('X-Content-Type-Options', 'nosniff');
	res.setHeader('X-Frame-Options', 'DENY');
	res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
	res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
	next();
});
app.use(express.json({ limit: '64kb' }));

function getAdminDb() {
	if (!getApps().length) {
		const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
		const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
		const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
		if (!projectId || !clientEmail || !privateKey || privateKey.startsWith('replace-with-')) return null;
		initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
	}
	return getFirestore(process.env.VITE_FIREBASE_DATABASE_ID || 'ai-studio-saelyxmadeforpre-9fd90c38-837e-435e-b027-e53891c99a41');
}

function safeString(value: unknown, maxLength: number) {
	return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function readStore() {
	const moduleDir = path.dirname(fileURLToPath(import.meta.url));
	const storePaths = [
		path.join(process.cwd(), 'data', 'saelyx_store.json'),
		path.join(moduleDir, '..', 'data', 'saelyx_store.json')
	];
	const storePath = storePaths.find(candidate => fs.existsSync(candidate));
	if (!storePath) throw new Error('Store data file is missing from the deployment.');
	const raw = fs.readFileSync(storePath, 'utf8');
	return JSON.parse(raw) as { products: any[]; settings: Record<string, unknown> };
}

app.get('/api/products', (req, res) => {
	try {
		let products = readStore().products;
		const category = req.query.category;
		const search = typeof req.query.search === 'string' ? req.query.search.slice(0, 100).toLowerCase() : '';

		if (category && category !== 'all') {
			products = category === 'new'
				? products.filter(product => product.category === 'new' || product.badge?.includes('DROP') || product.badge?.includes('NEW'))
				: products.filter(product => product.category === category || product.subCategory?.toLowerCase() === String(category).toLowerCase());
		}
		if (search) {
			products = products.filter(product =>
				product.title?.toLowerCase().includes(search) ||
				product.subtitle?.toLowerCase().includes(search) ||
				product.description?.toLowerCase().includes(search)
			);
		}
		res.json(products);
	} catch {
		res.status(500).json({ error: 'Product data is unavailable.' });
	}
});

app.get('/api/settings', (_req, res) => {
	try {
		res.json(readStore().settings);
	} catch {
		res.status(500).json({ error: 'Store settings are unavailable.' });
	}
});

app.post('/api/orders', async (req, res) => {
	try {
		const adminDb = getAdminDb();
		if (!adminDb) return res.status(503).json({ error: 'Order service is not configured.' });

		const body = req.body || {};
		const inputItems = Array.isArray(body.items) ? body.items : [];
		if (inputItems.length < 1 || inputItems.length > 50) return res.status(400).json({ error: 'Order items are invalid.' });

		const products = new Map<string, any>();
		for (const item of inputItems) {
			const productId = safeString(item?.productId, 100);
			const productSnap = await adminDb.collection('products').doc(productId).get();
			if (!productSnap.exists) return res.status(400).json({ error: 'One or more products are unavailable.' });
			products.set(productId, { id: productSnap.id, ...productSnap.data() });
		}

		const items = inputItems.map((item: any) => {
			const product = products.get(safeString(item?.productId, 100));
			const quantity = Number(item?.quantity);
			const size = safeString(item?.size, 20);
			if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20 || !product.inStock || product.stockCount < quantity) {
				throw new Error('Invalid quantity or unavailable stock.');
			}
			if (Array.isArray(product.sizes) && product.sizes.length > 0 && !product.sizes.includes(size)) {
				throw new Error('Invalid product size.');
			}
			return {
				productId: product.id,
				title: safeString(product.title, 200),
				image: Array.isArray(product.images) ? safeString(product.images[0], 1000) : '',
				priceLKR: Number(product.priceLKR),
				size,
				quantity
			};
		});

		const subtotalLKR = items.reduce((sum: number, item: any) => sum + item.priceLKR * item.quantity, 0);
		const shippingLKR = subtotalLKR > 50000 ? 0 : 2500;
		const orderNumber = `SOX-${Date.now()}-${crypto.randomInt(1000, 10000)}`;
		const order = {
			id: orderNumber,
			orderNumber,
			customerName: safeString(body.customerName, 120),
			email: safeString(body.email, 254).toLowerCase(),
			phone: safeString(body.phone, 30),
			address: safeString(body.address, 300),
			city: safeString(body.city, 100),
			postalCode: safeString(body.postalCode, 30),
			country: safeString(body.country, 80),
			items,
			subtotalLKR,
			shippingLKR,
			totalLKR: subtotalLKR + shippingLKR,
			currencyUsed: safeString(body.currencyUsed, 10) || 'LKR',
			totalInCurrency: subtotalLKR + shippingLKR,
			status: 'placed',
			paymentMethod: ['cod', 'paypal', 'payhere', 'binance_qr'].includes(body.paymentMethod) ? body.paymentMethod : 'cod',
			paymentStatus: 'pending_verification',
			createdAt: new Date().toISOString(),
			statusHistory: [{ status: 'placed', timestamp: new Date().toISOString(), note: 'Order placed by customer.', location: 'SAELYXE Online System' }],
			serverCreatedAt: FieldValue.serverTimestamp()
		};

		await adminDb.collection('orders').doc(orderNumber).set(order);
		const responseOrder = { ...order, serverCreatedAt: undefined };
		return res.status(201).json(responseOrder);
	} catch (error) {
		return res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to create order.' });
	}
});

app.get('/api/currencies', (_req, res) => {
	res.json([
		{ code: 'LKR', symbol: 'Rs', name: 'Sri Lankan Rupee', rateFromLKR: 1, symbolPosition: 'before', flag: 'LK' },
		{ code: 'USD', symbol: '$', name: 'US Dollar', rateFromLKR: 0.0033, symbolPosition: 'before', flag: 'US' },
		{ code: 'EUR', symbol: 'EUR', name: 'Euro', rateFromLKR: 0.0031, symbolPosition: 'before', flag: 'EU' },
		{ code: 'GBP', symbol: 'GBP', name: 'British Pound', rateFromLKR: 0.0026, symbolPosition: 'before', flag: 'GB' },
		{ code: 'AED', symbol: 'AED', name: 'UAE Dirham', rateFromLKR: 0.0121, symbolPosition: 'before', flag: 'AE' }
	]);
});

export default app;
