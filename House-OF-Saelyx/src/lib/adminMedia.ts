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

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const MAX_IMAGE_DIMENSION = 12000;
const MAX_IMAGE_MEGAPIXELS = 40;

async function validateAdminImage(file: File) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error('Only JPEG, PNG, WebP, or AVIF images are allowed.');
  }

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
    const pixels = bitmap.width * bitmap.height;
    if (
      bitmap.width < 1 ||
      bitmap.height < 1 ||
      bitmap.width > MAX_IMAGE_DIMENSION ||
      bitmap.height > MAX_IMAGE_DIMENSION ||
      pixels > MAX_IMAGE_MEGAPIXELS * 1_000_000
    ) {
      throw new Error(`Image dimensions exceed the ${MAX_IMAGE_DIMENSION}px / ${MAX_IMAGE_MEGAPIXELS}MP safety limit.`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('safety limit')) throw error;
    throw new Error('The selected file is not a decodable supported image.');
  } finally {
    bitmap?.close();
  }
}

export async function uploadAdminImageWithConfig(file: File, config: AdminMediaUploadConfig): Promise<string> {
  await validateAdminImage(file);
  const maxBytes = Number(config.maxFileSizeBytes) || 10 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(`${file.name} is larger than the allowed image size.`);
  }

  const body = new FormData();
  body.append('file', file);
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
  const uploadedFormat = String(uploaded?.format || '').toLowerCase();
  const allowedFormats = new Set(['jpg', 'jpeg', 'png', 'webp', 'avif']);
  if (uploaded?.resource_type && uploaded.resource_type !== 'image') {
    throw new Error('Cloudinary returned a non-image resource.');
  }
  if (uploadedFormat && !allowedFormats.has(uploadedFormat)) {
    throw new Error('Cloudinary returned an unsupported image format.');
  }
  if (!secureUrl.startsWith('https://')) throw new Error('Cloudinary did not return a secure image URL.');
  return secureUrl.replace('/image/upload/', '/image/upload/f_auto,q_auto/');
}

export async function uploadAdminImage(file: File, kind: AdminMediaKind): Promise<string> {
  const config = await getAdminMediaUploadConfig(kind);
  return uploadAdminImageWithConfig(file, config);
}
