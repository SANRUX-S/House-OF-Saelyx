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

export async function uploadAdminImageWithConfig(file: File, config: AdminMediaUploadConfig): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Only image files can be uploaded.');
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
  if (!secureUrl.startsWith('https://')) throw new Error('Cloudinary did not return a secure image URL.');
  return secureUrl.replace('/image/upload/', '/image/upload/f_auto,q_auto/');
}

export async function uploadAdminImage(file: File, kind: AdminMediaKind): Promise<string> {
  const config = await getAdminMediaUploadConfig(kind);
  return uploadAdminImageWithConfig(file, config);
}
