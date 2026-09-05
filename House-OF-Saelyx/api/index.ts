import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
app.use(express.json({ limit: '64kb' }));

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
		const search = typeof req.query.search === 'string' ? req.query.search.toLowerCase() : '';

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
