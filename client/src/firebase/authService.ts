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
import {
  getPlayerProfileFromFirestore,
  savePlayerProfileToFirestore,
} from './firestoreService.js';

/**
 * Synchronize Firebase User with Cloud Firestore (primary) and optional backend
 */
export async function syncFirebaseUserWithBackend(
  firebaseUser: FirebaseUser,
  guestIdToMigrate?: string,
  preferredUsername?: string
): Promise<UserProfile> {
  const displayName = preferredUsername || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Player';
  const providerId = firebaseUser.providerData[0]?.providerId || 'password';

  // 1. Primary: Retrieve existing profile from Cloud Firestore
  let existingProfile: UserProfile | null = null;
  try {
    existingProfile = await getPlayerProfileFromFirestore(firebaseUser.uid);
  } catch (err) {
    console.warn('[Auth] Firestore profile read fallback:', err);
  }

  // Check if migrating from guest
  let guestProfile: UserProfile | null = null;
  if (guestIdToMigrate && guestIdToMigrate !== firebaseUser.uid) {
    try {
      guestProfile = await getPlayerProfileFromFirestore(guestIdToMigrate);
    } catch {
      // Guest profile lookup optional
    }
  }

  const finalUsername =
    preferredUsername ||
    existingProfile?.username ||
    firebaseUser.displayName ||
    guestProfile?.username ||
    displayName;

  const finalAvatar = existingProfile?.avatar || guestProfile?.avatar || 'dice-king';
  const gamesPlayed = existingProfile?.gamesPlayed ?? guestProfile?.gamesPlayed ?? 0;
  const wins = existingProfile?.wins ?? guestProfile?.wins ?? 0;
  const losses = existingProfile?.losses ?? guestProfile?.losses ?? 0;
  const xp = existingProfile?.xp ?? guestProfile?.xp ?? 0;
  const coins = existingProfile?.coins ?? guestProfile?.coins ?? 500;
  const favoriteColor = existingProfile?.favoriteColor || guestProfile?.favoriteColor || 'red';

  const userProfile: UserProfile = {
    id: firebaseUser.uid,
    username: finalUsername,
    avatar: finalAvatar,
    isGuest: false,
    email: firebaseUser.email || existingProfile?.email,
    photoURL: firebaseUser.photoURL || existingProfile?.photoURL,
    authProvider: providerId === 'google.com' ? 'google' : 'password',
    gamesPlayed,
    wins,
    losses,
    winRate: gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0,
    coins,
    xp,
    level: Math.floor(xp / 300) + 1,
    favoriteColor,
    lastActive: Date.now(),
    createdAt: existingProfile?.createdAt || guestProfile?.createdAt || Date.now(),
  };

  // 2. Persist to Cloud Firestore
  try {
    const saved = await savePlayerProfileToFirestore(userProfile);
    if (saved) {
      Object.assign(userProfile, saved);
    }
  } catch (err) {
    console.warn('[Auth] Firestore profile save fallback to memory:', err);
  }

  // 3. Optional: Sync with local express server if running and returning JSON
  try {
    const res = await fetch('/api/auth/firebase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: userProfile.username,
        photoURL: userProfile.photoURL,
        providerId,
        guestIdToMigrate,
      }),
    });
    const contentType = res.headers.get('content-type');
    if (res.ok && contentType && contentType.includes('application/json')) {
      const data = await res.json();
      if (data?.success && data?.user) {
        return data.user;
      }
    }
  } catch {
    // Local server is optional (e.g. running standalone on Vercel)
  }

  return userProfile;
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
