import { auth, getAppCheckRequestHeaders } from './firebase';

export type AdminMediaKind = 'products' | 'settings';

export interface AdminMediaUploadConfig {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
  maxFileSizeBytes: number;
}

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const MAX_SOURCE_FILE_BYTES = 25 * 1024 * 1024;
const MAX_SOURCE_DIMENSION = 12000;
const MAX_IMAGE_MEGAPIXELS = 60;
const MAX_UPLOAD_BYTES = 2_400_000;
const MAX_OUTPUT_DIMENSION = 3200;
const MAX_OUTPUT_MEGAPIXELS = 12;

export async function getAdminMediaUploadConfig(kind: AdminMediaKind): Promise<AdminMediaUploadConfig> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Admin session expired. Please sign in again.');

  const idToken = await currentUser.getIdToken();
  const appCheckHeaders = await getAppCheckRequestHeaders();
  const response = await fetch('/api/media/cloudinary-signature', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
      ...appCheckHeaders
    },
    body: JSON.stringify({ kind })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || 'Unable to authorize image upload.');
  }
  return payload as AdminMediaUploadConfig;
}

async function decodeAdminImage(file: File): Promise<ImageBitmap> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error('Only JPEG, PNG, WebP, or AVIF images are allowed.');
  }
  if (file.size > MAX_SOURCE_FILE_BYTES) {
    throw new Error('The selected image is too large. Use an image smaller than 25 MB.');
  }

  try {
    const bitmap = await createImageBitmap(file);
    const pixels = bitmap.width * bitmap.height;
    if (
      bitmap.width < 1 ||
      bitmap.height < 1 ||
      bitmap.width > MAX_SOURCE_DIMENSION ||
      bitmap.height > MAX_SOURCE_DIMENSION ||
      pixels > MAX_IMAGE_MEGAPIXELS * 1_000_000
    ) {
      bitmap.close();
      throw new Error('The selected image dimensions are too large.');
    }
    return bitmap;
  } catch (error) {
    if (error instanceof Error && error.message.includes('too large')) throw error;
    throw new Error('This image could not be opened. Please use a normal JPG, PNG, WebP, or AVIF file.');
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Unable to optimize the selected image.'));
    }, type, quality);
  });
}

async function prepareAdminImage(file: File): Promise<File> {
  const bitmap = await decodeAdminImage(file);
  try {
    const sourcePixels = bitmap.width * bitmap.height;
    const dimensionScale = Math.min(1, MAX_OUTPUT_DIMENSION / bitmap.width, MAX_OUTPUT_DIMENSION / bitmap.height);
    const pixelScale = Math.min(1, Math.sqrt((MAX_OUTPUT_MEGAPIXELS * 1_000_000) / sourcePixels));
    const baseScale = Math.min(dimensionScale, pixelScale);

    // Keep already-small supported images untouched so there is no needless quality loss.
    if (baseScale === 1 && file.size <= MAX_UPLOAD_BYTES) return file;

    const scaleSteps = [baseScale, baseScale * 0.88, baseScale * 0.76, baseScale * 0.64, baseScale * 0.54]
      .map(value => Math.max(0.2, Math.min(1, value)));
    const qualitySteps = [0.92, 0.86, 0.8, 0.74, 0.68];

    let smallestBlob: Blob | null = null;
    for (const scale of scaleSteps) {
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d', { alpha: true });
      if (!context) throw new Error('Image optimization is unavailable in this browser.');
      context.drawImage(bitmap, 0, 0, width, height);

      for (const quality of qualitySteps) {
        const blob = await canvasToBlob(canvas, 'image/webp', quality);
        if (!smallestBlob || blob.size < smallestBlob.size) smallestBlob = blob;
        if (blob.size <= MAX_UPLOAD_BYTES) {
          const cleanName = (file.name || 'saelyxe-product')
            .replace(/\.[^.]+$/, '')
            .replace(/[^a-zA-Z0-9._-]+/g, '-')
            .slice(0, 100) || 'saelyxe-product';
          return new File([blob], `${cleanName}.webp`, { type: 'image/webp', lastModified: Date.now() });
        }
      }
    }

    if (smallestBlob && smallestBlob.size <= 2_600_000) {
      const cleanName = (file.name || 'saelyxe-product')
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
        .slice(0, 100) || 'saelyxe-product';
      return new File([smallestBlob], `${cleanName}.webp`, { type: 'image/webp', lastModified: Date.now() });
    }

    throw new Error('The image is still too large after optimization. Please choose a smaller image.');
  } finally {
    bitmap.close();
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

async function uploadAdminImageViaServer(file: File, kind: AdminMediaKind): Promise<string> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Admin session expired. Please sign in again.');

  const prepared = await prepareAdminImage(file);
  const dataBase64 = arrayBufferToBase64(await prepared.arrayBuffer());
  const idToken = await currentUser.getIdToken();
  const appCheckHeaders = await getAppCheckRequestHeaders();

  const response = await fetch('/api/media/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
      ...appCheckHeaders
    },
    body: JSON.stringify({
      kind,
      fileName: prepared.name,
      mimeType: prepared.type,
      dataBase64
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || 'Image upload failed.');
  }

  const secureUrl = String(payload?.secureUrl || '');
  if (!secureUrl.startsWith('https://res.cloudinary.com/')) {
    throw new Error('Image storage did not return a valid secure URL.');
  }
  return secureUrl;
}

// Retained for compatibility with any older admin screen still using signed direct uploads.
// New uploads use the server-side path below so Cloudinary credentials and provider quirks
// never have to be handled by the browser.
export async function uploadAdminImageWithConfig(file: File, config: AdminMediaUploadConfig): Promise<string> {
  const prepared = await prepareAdminImage(file);
  const maxBytes = Number(config.maxFileSizeBytes) || 10 * 1024 * 1024;
  if (prepared.size > maxBytes) {
    throw new Error(`${prepared.name} is larger than the allowed image size.`);
  }

  const body = new FormData();
  body.append('file', prepared);
  body.append('api_key', config.apiKey);
  body.append('timestamp', String(config.timestamp));
  body.append('folder', config.folder);
  body.append('signature', config.signature);

  const uploadResponse = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/image/upload`,
    { method: 'POST', body }
  );
  const uploaded = await uploadResponse.json().catch(() => ({}));
  if (!uploadResponse.ok) {
    throw new Error(uploaded?.error?.message || 'Cloud image upload failed.');
  }

  const secureUrl = String(uploaded?.secure_url || '');
  if (!secureUrl.startsWith('https://')) throw new Error('Cloudinary did not return a secure image URL.');
  return secureUrl.replace('/image/upload/', '/image/upload/f_auto,q_auto/');
}

export async function uploadAdminImage(file: File, kind: AdminMediaKind): Promise<string> {
  return uploadAdminImageViaServer(file, kind);
}
