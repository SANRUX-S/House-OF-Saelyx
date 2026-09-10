import { getAdminAccessToken, getAppCheckRequestHeaders } from './firebase';

export type AdminMediaKind = 'products' | 'settings';

export const ADMIN_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/avif';
const ALLOWED_IMAGE_TYPES = new Set(ADMIN_IMAGE_ACCEPT.split(','));
const MAX_SOURCE_FILE_BYTES = 25 * 1024 * 1024;
const MAX_SOURCE_DIMENSION = 12000;
const MAX_IMAGE_MEGAPIXELS = 60;
const MAX_UPLOAD_BYTES = 1_850_000;
const MAX_OUTPUT_DIMENSION = 2800;
const MAX_OUTPUT_MEGAPIXELS = 10;
const UPLOAD_TIMEOUT_MS = 45_000;

export function isSupportedAdminImageFile(file: File) {
  return ALLOWED_IMAGE_TYPES.has(String(file.type || '').toLowerCase());
}

async function decodeWithImageElement(file: File): Promise<{ image: HTMLImageElement; revoke: () => void }> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = objectUrl;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Unable to decode image.'));
    });
    return { image, revoke: () => URL.revokeObjectURL(objectUrl) };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

function validateDimensions(width: number, height: number) {
  const pixels = width * height;
  if (
    width < 1 ||
    height < 1 ||
    width > MAX_SOURCE_DIMENSION ||
    height > MAX_SOURCE_DIMENSION ||
    pixels > MAX_IMAGE_MEGAPIXELS * 1_000_000
  ) {
    throw new Error('The selected image dimensions are too large.');
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

function cleanFileName(file: File) {
  return (file.name || 'saelyxe-product')
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .slice(0, 100) || 'saelyxe-product';
}

async function optimizeFromDrawable(
  file: File,
  width: number,
  height: number,
  draw: (context: CanvasRenderingContext2D, targetWidth: number, targetHeight: number) => void
): Promise<File> {
  validateDimensions(width, height);
  const sourcePixels = width * height;
  const dimensionScale = Math.min(1, MAX_OUTPUT_DIMENSION / width, MAX_OUTPUT_DIMENSION / height);
  const pixelScale = Math.min(1, Math.sqrt((MAX_OUTPUT_MEGAPIXELS * 1_000_000) / sourcePixels));
  const baseScale = Math.min(dimensionScale, pixelScale);

  if (baseScale === 1 && file.size <= MAX_UPLOAD_BYTES && file.type === 'image/webp') return file;

  const scaleSteps = [baseScale, baseScale * 0.88, baseScale * 0.76, baseScale * 0.64, baseScale * 0.52, baseScale * 0.42]
    .map(value => Math.max(0.18, Math.min(1, value)));
  const qualitySteps = [0.9, 0.84, 0.78, 0.72, 0.66, 0.6];
  let smallestBlob: Blob | null = null;

  for (const scale of scaleSteps) {
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) throw new Error('Image optimization is unavailable in this browser.');
    draw(context, targetWidth, targetHeight);

    for (const quality of qualitySteps) {
      const blob = await canvasToBlob(canvas, 'image/webp', quality);
      if (!smallestBlob || blob.size < smallestBlob.size) smallestBlob = blob;
      if (blob.size <= MAX_UPLOAD_BYTES) {
        return new File([blob], `${cleanFileName(file)}.webp`, { type: 'image/webp', lastModified: Date.now() });
      }
    }
  }

  if (smallestBlob && smallestBlob.size <= 2_000_000) {
    return new File([smallestBlob], `${cleanFileName(file)}.webp`, { type: 'image/webp', lastModified: Date.now() });
  }

  throw new Error('The image is still too large after optimization. Please choose a smaller image.');
}

async function prepareAdminImage(file: File): Promise<File> {
  if (!isSupportedAdminImageFile(file)) {
    throw new Error('Only JPG, PNG, WebP, or AVIF images are allowed.');
  }
  if (file.size <= 0) throw new Error('The selected image file is empty.');
  if (file.size > MAX_SOURCE_FILE_BYTES) {
    throw new Error('The selected image is too large. Use an image smaller than 25 MB.');
  }

  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      try {
        return await optimizeFromDrawable(file, bitmap.width, bitmap.height, (context, width, height) => {
          context.drawImage(bitmap, 0, 0, width, height);
        });
      } finally {
        bitmap.close();
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('too large')) throw error;
    }
  }

  try {
    const decoded = await decodeWithImageElement(file);
    try {
      return await optimizeFromDrawable(file, decoded.image.naturalWidth, decoded.image.naturalHeight, (context, width, height) => {
        context.drawImage(decoded.image, 0, 0, width, height);
      });
    } finally {
      decoded.revoke();
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('too large')) throw error;
    throw new Error('This image could not be opened. Please use a normal JPG, PNG, WebP, or AVIF file.');
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

function uploadErrorMessage(status: number, payload: any) {
  const serverMessage = typeof payload?.error === 'string' ? payload.error.trim() : '';
  if (serverMessage) return serverMessage;
  if (status === 400) return 'The image upload request was rejected. Choose the image again and retry.';
  if (status === 401) return 'Image upload was blocked by the app integrity check. Refresh the admin page and try again.';
  if (status === 403) return 'Admin image upload access expired. Sign out, sign in again, and retry.';
  if (status === 413) return 'The optimized image payload is still too large. Choose a smaller image.';
  if (status === 415) return 'The selected file is not a valid JPG, PNG, WebP, or AVIF image.';
  if (status === 429) return 'Too many image uploads were sent at once. Wait a moment and retry.';
  if (status === 503) return 'SAELYXE Media Storage is not configured on the server.';
  if (status >= 500) return 'SAELYXE Media Storage could not save the image. Please retry shortly.';
  return `Unable to upload image right now (HTTP ${status}).`;
}

async function readApiPayload(response: Response) {
  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  const text = await response.text();
  const trimmed = text.trim();

  if (!contentType.includes('application/json')) {
    if (contentType.includes('text/html') || /^<!doctype html/i.test(trimmed) || /^<html/i.test(trimmed)) {
      throw new Error('Image upload API returned HTML instead of JSON. The media API route is not being reached correctly.');
    }
    throw new Error('Image upload API returned an unexpected response. Please verify the media API route.');
  }

  if (!trimmed) return {};
  try {
    return JSON.parse(trimmed);
  } catch {
    throw new Error('Image upload API returned invalid JSON. Please verify the media API deployment.');
  }
}

export async function uploadAdminImage(file: File, kind: AdminMediaKind): Promise<string> {
  const idToken = await getAdminAccessToken();
  if (!idToken) throw new Error('Admin session expired. Please sign in again.');

  const prepared = await prepareAdminImage(file);
  const appCheckHeaders = await getAppCheckRequestHeaders();
  const dataBase64 = arrayBufferToBase64(await prepared.arrayBuffer());
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

  try {
    const response = await fetch('/api/media/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...appCheckHeaders
      },
      body: JSON.stringify({
        kind,
        fileName: prepared.name,
        mimeType: prepared.type,
        dataBase64
      }),
      cache: 'no-store',
      credentials: 'same-origin',
      signal: controller.signal
    });

    const payload = await readApiPayload(response);
    if (!response.ok) throw new Error(uploadErrorMessage(response.status, payload));

    const secureUrl = String(payload?.secureUrl || '');
    if (!secureUrl.startsWith('https://firebasestorage.googleapis.com/')) {
      throw new Error('SAELYXE Media Storage did not return a valid Firebase image URL.');
    }
    return secureUrl;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Image upload timed out. Check your connection and try again.');
    }
    if (error instanceof TypeError) {
      throw new Error('Image upload could not reach the server. Check your connection and retry.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
