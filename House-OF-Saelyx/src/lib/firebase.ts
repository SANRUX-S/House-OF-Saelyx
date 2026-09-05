import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  FacebookAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail,
  sendEmailVerification,
  createUserWithEmailAndPassword, 
  signOut as fbSignOut, 
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult
} from 'firebase/auth';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  getToken as getAppCheckToken,
  type AppCheck
} from 'firebase/app-check';
import { AppUser, UserRole } from '../types';

const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'gen-lang-client-0800900976',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:915679491947:web:e4a01bb7e854eca503fe2e',
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'gen-lang-client-0800900976.firebaseapp.com',
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || 'ai-studio-saelyxmadeforpre-9fd90c38-837e-435e-b027-e53891c99a41',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'gen-lang-client-0800900976.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '915679491947',
  oAuthClientId: import.meta.env.VITE_FIREBASE_OAUTH_CLIENT_ID || '',
};

const placeholderFirebaseValues = new Set(['', 'demo-project', 'demo-app-id', 'demo-api-key', '000000000000']);
const isRealtimeFirebaseEnabled = (import.meta.env.VITE_FIREBASE_ENABLE_REALTIME || '').toLowerCase() === 'true';
export const isFirebaseConfigured = isRealtimeFirebaseEnabled && [
  firebaseConfig.projectId,
  firebaseConfig.appId,
  firebaseConfig.apiKey,
  firebaseConfig.authDomain,
  firebaseConfig.messagingSenderId
].every(value => !placeholderFirebaseValues.has(value) && !value.startsWith('replace-with-') && !value.startsWith('your-'));

// Initialize Firebase App safely
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firestore with custom database ID
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

const appCheckSiteKey = import.meta.env.VITE_FIREBASE_APP_CHECK_SITE_KEY || '';
let appCheckInstance: AppCheck | null = null;

if (typeof window !== 'undefined' && appCheckSiteKey) {
  try {
    appCheckInstance = initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
      isTokenAutoRefreshEnabled: true
    });
  } catch (error) {
    console.warn('Firebase App Check initialization note:', error);
  }
}

export async function getAppCheckRequestHeaders(): Promise<Record<string, string>> {
  if (!appCheckInstance) return {};
  try {
    const token = await getAppCheckToken(appCheckInstance, false);
    return token?.token ? { 'X-Firebase-AppCheck': token.token } : {};
  } catch {
    return {};
  }
}

// Providers
export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();

const ADMIN_ROLES: Record<string, UserRole> = {
  'saelyx.co@gmail.com': 'super_admin',
  'saelyx.co+super@gmail.com': 'super_admin',
  'saelyx.co+admin@gmail.com': 'admin'
};

export function getConfiguredAdminRole(email?: string | null): UserRole | undefined {
  return email ? ADMIN_ROLES[email.toLowerCase()] : undefined;
}

export async function verifyAdminCredentials(username: string, pass: string): Promise<{ valid: boolean; user?: AppUser; error?: string }> {
  if (!isFirebaseConfigured) {
    return { valid: false, error: 'Firebase administrator authentication is not configured.' };
  }
  try {
    const credential = await signInWithEmailAndPassword(auth, username.trim(), pass);
    const token = await credential.user.getIdTokenResult(true);
    const claimRole: UserRole | undefined = token.claims.role === 'super_admin'
      ? 'super_admin'
      : token.claims.role === 'admin' || token.claims.admin === true
        ? 'admin'
        : undefined;
    const adminDoc = await getDoc(doc(db, 'admins', credential.user.uid));
    const adminData = adminDoc.exists() ? adminDoc.data() : null;
    const adminDocRole: UserRole | undefined = adminData?.role === 'super_admin'
      ? 'super_admin'
      : adminData?.role === 'admin'
        ? 'admin'
        : undefined;
    const allowlistedRole = credential.user.email
      ? ADMIN_ROLES[credential.user.email.toLowerCase()]
      : undefined;
    const configuredRole = credential.user.emailVerified ? allowlistedRole : undefined;
    const trustedRole = claimRole || adminDocRole || configuredRole;

    if (!trustedRole) {
      if (allowlistedRole && !credential.user.emailVerified) {
        try {
          await sendEmailVerification(credential.user);
        } catch {
          // A verification email may already have been sent recently.
        }
        await fbSignOut(auth);
        return {
          valid: false,
          error: 'Administrator email verification is required. Check the administrator inbox, verify the address, then sign in again.'
        };
      }

      await fbSignOut(auth);
      return { valid: false, error: 'Access denied. This Firebase account is not an administrator.' };
    }

    return {
      valid: true,
      user: {
        uid: credential.user.uid,
        name: credential.user.displayName || credential.user.email?.split('@')[0] || 'Atelier Operator',
        email: credential.user.email || '',
        role: trustedRole,
        joinedDate: new Date().toISOString().slice(0, 10)
      }
    };

  } catch (err: any) {
    return {
      valid: false,
      error: err?.code === 'auth/invalid-credential' ? 'Invalid Firebase administrator credentials.' : 'Firebase administrator authentication failed.'
    };
  }
}

export async function sendAdminPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    await sendPasswordResetEmail(auth, email.trim());
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.code === 'auth/user-not-found'
        ? 'No Firebase account was found for that email address.'
        : 'Unable to send the Firebase password reset email.'
    };
  }
}
