declare global {
  var usdRateFromLKR: number | undefined;
  function createPayHereSession(orderId: string): Promise<{ action: string; fields: Record<string, string> }>;
}

const DEFAULT_USD_RATE_FROM_LKR = 0.0033;

if (typeof globalThis.usdRateFromLKR !== 'number' || !Number.isFinite(globalThis.usdRateFromLKR)) {
  globalThis.usdRateFromLKR = DEFAULT_USD_RATE_FROM_LKR;
}

if (typeof globalThis.createPayHereSession !== 'function') {
  globalThis.createPayHereSession = async () => {
    throw new Error('PayHere is unavailable until merchant approval and authenticated checkout configuration are complete.');
  };
}

export {};
