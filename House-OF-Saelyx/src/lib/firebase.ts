import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  FacebookAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  sendEmailVerification,
  createUserWithEmailAndPassword, 
  signOut as fbSignOut, 
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
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

const ROOT_ADMIN_EMAILS = new Set([
  'saelyx.co@gmail.com',
  'saelyx.co+super@gmail.com'
]);

export function getConfiguredAdminRole(email?: string | null, emailVerified = false): UserRole | undefined {
  if (!email) return undefined;
  const normalizedEmail = email.toLowerCase();
  if (ROOT_ADMIN_EMAILS.has(normalizedEmail)) return 'super_admin';
  return emailVerified ? ADMIN_ROLES[normalizedEmail] : undefined;
}

export async function verifyAdminCredentials(username: string, pass: string, rememberMe = true): Promise<{ valid: boolean; user?: AppUser; error?: string }> {
  if (!isFirebaseConfigured) {
    return { valid: false, error: 'Firebase administrator authentication is not configured.' };
  }

  try {
    await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
    const credential = await signInWithEmailAndPassword(auth, username.trim(), pass);
    const email = credential.user.email?.toLowerCase() || '';
    const allowlistedRole = email ? ADMIN_ROLES[email] : undefined;

    // Root bootstrap administrators are recoverable using Firebase Auth +
    // the exact hard-coded root email allowlist. Invited/secondary admins still
    // require verified email ownership.
    if (allowlistedRole) {
      const isRootAdmin = ROOT_ADMIN_EMAILS.has(email);
      if (!isRootAdmin && !credential.user.emailVerified) {
        try {
          await sendEmailVerification(credential.user);
        } catch {
          // Firebase may throttle repeated verification emails.
        }
        await fbSignOut(auth);
        return {
          valid: false,
          error: 'Verify this administrator email first, then sign in again.'
        };
      }

      return {
        valid: true,
        user: {
          uid: credential.user.uid,
          name: credential.user.displayName || credential.user.email?.split('@')[0] || 'Administrator',
          email: credential.user.email || '',
          role: allowlistedRole,
          joinedDate: new Date().toISOString().slice(0, 10)
        }
      };
    }

    // Invited staff accounts must additionally have an active protected admin
    // record bound to the same verified Firebase email.
    const adminDoc = await getDoc(doc(db, 'admins', credential.user.uid));
    const adminData = adminDoc.exists() ? adminDoc.data() : null;
    const adminRecordMatches =
      credential.user.emailVerified &&
      adminData?.status === 'active' &&
      typeof adminData?.email === 'string' &&
      adminData.email.toLowerCase() === email;

    const trustedRole: UserRole | undefined = adminRecordMatches
      ? adminData?.role === 'super_admin'
        ? 'super_admin'
        : adminData?.role === 'admin'
          ? 'admin'
          : undefined
      : undefined;

    if (!trustedRole) {
      if (adminData?.status === 'invited') {
        await fbSignOut(auth);
        return {
          valid: false,
          error: credential.user.emailVerified
            ? 'Your administrator invitation is waiting for Super Admin activation.'
            : 'Verify your administrator email, then ask a Super Admin to activate the account.'
        };
      }
      if (adminData?.status === 'revoked' || adminData?.status === 'suspended') {
        await fbSignOut(auth);
        return { valid: false, error: 'Administrator access has been revoked or suspended.' };
      }

      await fbSignOut(auth);
      return { valid: false, error: 'This Firebase account does not have active SAELYXE administrator access.' };
    }

    return {
      valid: true,
      user: {
        uid: credential.user.uid,
        name: credential.user.displayName || credential.user.email?.split('@')[0] || 'Administrator',
        email: credential.user.email || '',
        role: trustedRole,
        joinedDate: new Date().toISOString().slice(0, 10)
      }
    };
  } catch (err: any) {
    const code = String(err?.code || '');

    if (['auth/invalid-credential', 'auth/invalid-login-credentials', 'auth/user-not-found', 'auth/wrong-password'].includes(code)) {
      return { valid: false, error: 'Email or password is incorrect.' };
    }
    if (code === 'auth/invalid-email') {
      return { valid: false, error: 'Enter a valid administrator email address.' };
    }
    if (code === 'auth/user-disabled') {
      return { valid: false, error: 'This Firebase administrator account is disabled.' };
    }
    if (code === 'auth/too-many-requests') {
      return { valid: false, error: 'Too many sign-in attempts. Wait a few minutes, then try again or reset the password.' };
    }
    if (code === 'auth/network-request-failed') {
      return { valid: false, error: 'Could not reach Firebase Authentication. Check the connection and try again.' };
    }
    if (code === 'auth/operation-not-allowed') {
      return { valid: false, error: 'Email/password sign-in is not enabled for this Firebase project.' };
    }
    if (code === 'permission-denied' || code === 'firestore/permission-denied') {
      return { valid: false, error: 'Firebase signed in, but administrator access data could not be read. Please try again.' };
    }

    console.warn('Administrator sign-in diagnostic:', code || err);
    return { valid: false, error: 'Administrator sign-in could not be completed. Please try again.' };
  }
}

export async function sendAdminPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const appCheckHeaders = await getAppCheckRequestHeaders();
    const response = await fetch('/api/admin/password-reset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...appCheckHeaders
      },
      body: JSON.stringify({ email: email.trim().toLowerCase() })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { success: false, error: payload?.error || 'Unable to request a password reset right now.' };
    }
    return { success: true };
  } catch {
    return { success: false, error: 'Unable to request a password reset right now.' };
  }
}
