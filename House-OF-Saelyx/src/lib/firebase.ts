import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  FacebookAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail,
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
import { AppUser, UserRole } from '../types';

const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-project',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || 'demo-app-id',
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'demo-project.firebaseapp.com',
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || '(default)',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'demo-project.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '000000000000',
  oAuthClientId: import.meta.env.VITE_FIREBASE_OAUTH_CLIENT_ID || '',
};

const placeholderFirebaseValues = new Set(['', 'demo-project', 'demo-app-id', 'demo-api-key', '000000000000']);
export const isFirebaseConfigured = [
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
    return { valid: false, error: 'Firebase is not configured. Use a provisioned operator account or add real Firebase values to .env.' };
  }
  try {
    const credential = await signInWithEmailAndPassword(auth, username.trim(), pass);
    const token = await credential.user.getIdTokenResult(true);
    const role = token.claims.role as UserRole | undefined;
    const adminDoc = await getDoc(doc(db, 'admins', credential.user.uid));
    const adminData = adminDoc.exists() ? adminDoc.data() : null;
    const adminDocRole = adminData?.role as UserRole | undefined;
    const configuredRole = credential.user.email ? ADMIN_ROLES[credential.user.email.toLowerCase()] : undefined;
    const isAdmin = token.claims.admin === true || role === 'admin' || role === 'super_admin' || adminDoc.exists() || Boolean(configuredRole);

    if (!isAdmin) {
      await fbSignOut(auth);
      return { valid: false, error: 'Access denied. This Firebase account is not an administrator.' };
    }

    return {
      valid: true,
      user: {
        uid: credential.user.uid,
        name: credential.user.displayName || credential.user.email?.split('@')[0] || 'Atelier Operator',
        email: credential.user.email || '',
        role: role || adminDocRole || configuredRole || 'admin',
        joinedDate: new Date().toISOString().slice(0, 10),
        ordersCount: (role || adminDocRole) === 'super_admin' ? 99 : 45
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
