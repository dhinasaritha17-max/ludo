import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  FirebaseUser,
} from './firebaseConfig.js';
import { UserProfile } from '../types/index.js';

/**
 * Synchronize Firebase User with backend database
 */
export async function syncFirebaseUserWithBackend(
  firebaseUser: FirebaseUser,
  guestIdToMigrate?: string,
  preferredUsername?: string
): Promise<UserProfile> {
  const displayName = preferredUsername || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Player';
  const providerId = firebaseUser.providerData[0]?.providerId || 'password';

  const res = await fetch('/api/auth/firebase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName,
      photoURL: firebaseUser.photoURL,
      providerId,
      guestIdToMigrate,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to synchronize user session with server');
  }

  return data.user;
}

/**
 * Sign in using Google Popup
 */
export async function signInWithGoogle(guestIdToMigrate?: string): Promise<UserProfile> {
  const result = await signInWithPopup(auth, googleProvider);
  return await syncFirebaseUserWithBackend(result.user, guestIdToMigrate);
}

/**
 * Sign in using Email and Password
 */
export async function signInWithEmail(
  email: string,
  pass: string,
  guestIdToMigrate?: string
): Promise<UserProfile> {
  const result = await signInWithEmailAndPassword(auth, email, pass);
  return await syncFirebaseUserWithBackend(result.user, guestIdToMigrate);
}

/**
 * Register / Sign up using Email and Password
 */
export async function signUpWithEmail(
  email: string,
  pass: string,
  displayName: string,
  guestIdToMigrate?: string
): Promise<UserProfile> {
  const result = await createUserWithEmailAndPassword(auth, email, pass);

  // Set displayName on Firebase auth profile
  if (displayName) {
    try {
      await updateProfile(result.user, { displayName });
    } catch (e) {
      console.warn('Failed to update displayName on Firebase profile', e);
    }
  }

  return await syncFirebaseUserWithBackend(result.user, guestIdToMigrate, displayName);
}

/**
 * Send password reset email
 */
export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

/**
 * Sign out of Firebase Auth
 */
export async function logOut(): Promise<void> {
  await firebaseSignOut(auth);
}

/**
 * Listen for Firebase auth state changes
 */
export function onFirebaseAuthStateChanged(
  callback: (user: FirebaseUser | null) => void
) {
  return onAuthStateChanged(auth, callback);
}
