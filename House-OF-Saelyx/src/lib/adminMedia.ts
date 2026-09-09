import { getAdminAccessToken, getAppCheckRequestHeaders } from './firebase';

export type AdminMediaKind = 'products' | 'settings';

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const MAX_SOURCE_FILE_BYTES = 25 * 1024 * 1024;
const MAX_SOURCE_DIMENSION = 12000;
const MAX_IMAGE_MEGAPIXELS = 60;
const MAX_UPLOAD_BYTES = 2_400_000;
const MAX_OUTPUT_DIMENSION = 3200;
const MAX_OUTPUT_MEGAPIXELS = 12;

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

export async function uploadAdminImage(file: File, kind: AdminMediaKind): Promise<string> {
  const idToken = await getAdminAccessToken();
  if (!idToken) throw new Error('Admin session expired. Please sign in again.');

  const prepared = await prepareAdminImage(file);
  const appCheckHeaders = await getAppCheckRequestHeaders();
  const dataBase64 = arrayBufferToBase64(await prepared.arrayBuffer());

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
    throw new Error(payload?.error || 'Unable to upload image right now.');
  }

  const secureUrl = String(payload?.secureUrl || '');
  if (!secureUrl.startsWith('https://firebasestorage.googleapis.com/')) {
    throw new Error('SAELYXE Media Storage did not return a valid Firebase image URL.');
  }
  return secureUrl;
}
