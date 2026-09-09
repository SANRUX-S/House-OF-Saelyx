const STORAGE_KEY = 'saelyxe_guest_order_access_v1';

type GuestAccessRecord = {
  token: string;
  expiresAt: string;
};

type GuestAccessStore = Record<string, GuestAccessRecord>;

function readStore(): GuestAccessStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as GuestAccessStore;
  } catch {
    return {};
  }
}

function writeStore(store: GuestAccessStore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Guest checkout can still complete in the current response even if storage is unavailable.
  }
}

export function saveGuestOrderAccess(orderId: string, token: string, expiresAt: string) {
  const id = String(orderId || '').trim();
  const value = String(token || '').trim();
  if (!id || !value) return;

  const store = readStore();
  store[id] = {
    token: value,
    expiresAt: String(expiresAt || '')
  };
  writeStore(store);
}

export function getGuestOrderAccessToken(orderId: string): string {
  const id = String(orderId || '').trim();
  if (!id) return '';

  const store = readStore();
  const record = store[id];
  if (!record?.token) return '';

  const expiresMs = Date.parse(record.expiresAt || '');
  if (Number.isFinite(expiresMs) && expiresMs <= Date.now()) {
    delete store[id];
    writeStore(store);
    return '';
  }

  return record.token;
}

export function guestOrderAccessHeaders(orderId: string): Record<string, string> {
  const token = getGuestOrderAccessToken(orderId);
  return token ? { 'X-SAELYXE-Guest-Order-Token': token } : {};
}

export function clearGuestOrderAccess(orderId: string) {
  const id = String(orderId || '').trim();
  if (!id) return;
  const store = readStore();
  if (!(id in store)) return;
  delete store[id];
  writeStore(store);
}
