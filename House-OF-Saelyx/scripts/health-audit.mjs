// Live health audit script for SAELYXE web app
import http from 'http';

const BASE_URL = 'http://localhost:3000';

const endpoints = [
  { path: '/', expected: 200, type: 'html' },
  { path: '/src/main.tsx', expected: 200, type: 'ts' },
  { path: '/api/health', expected: 200, type: 'json' },
  { path: '/api/currencies', expected: 200, type: 'json' },
  { path: '/api/preview/order-email', expected: 200, type: 'html' },
  { path: '/images/saelyxe-icon-gold.png', expected: 200, type: 'image' },
  { path: '/images/saelyxe-wordmark-noir.png', expected: 200, type: 'image' },
  { path: '/images/saelyxe-wordmark-gold.png', expected: 200, type: 'image' },
  { path: '/images/saelyxe-header-wall-bg.jpg', expected: 200, type: 'image' },
  { path: '/api/admin/health', allowedStatuses: [401, 403, 503], type: 'protected' }, // Admin health requires server credentials or auth token
];

async function checkUrl(endpoint) {
  return new Promise((resolve) => {
    http.get(`${BASE_URL}${endpoint.path}`, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        const passed = endpoint.allowedStatuses
          ? endpoint.allowedStatuses.includes(res.statusCode)
          : res.statusCode === endpoint.expected;
        resolve({
          path: endpoint.path,
          status: res.statusCode,
          expected: endpoint.allowedStatuses ? endpoint.allowedStatuses.join('/') : endpoint.expected,
          passed,
          length: data.length
        });
      });
    }).on('error', (err) => {
      resolve({
        path: endpoint.path,
        error: err.message,
        passed: false
      });
    });
  });
}

async function run() {
  console.log('--- STARTING SAELYXE SITE HEALTH AUDIT ---');
  let failures = 0;
  for (const ep of endpoints) {
    const res = await checkUrl(ep);
    if (res.passed) {
      console.log(`[PASS] ${res.path} -> HTTP ${res.status} (${res.length} bytes)`);
    } else {
      console.error(`[FAIL] ${res.path} -> HTTP ${res.status || 'ERR'} (Expected: ${res.expected}) ${res.error || ''}`);
      failures++;
    }
  }

  if (failures === 0) {
    console.log('--- ALL ENDPOINTS PASSED CLEANLY (0 ERRORS) ---');
    process.exit(0);
  } else {
    console.error(`--- AUDIT FAILED WITH ${failures} ERRORS ---`);
    process.exit(1);
  }
}

run();
