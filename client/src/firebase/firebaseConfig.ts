import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';

// Firebase credentials provided for project ludo-a2586
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBdY_2dMiJxSKtMrkZKFKmLyyAzBYxfLJ4",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ludo-a2586.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ludo-a2586",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "ludo-a2586.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "347473497955",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:347473497955:web:57ed62cf91c51d286ecd56",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-V5F8W22T4L",
};

// Initialize Firebase App singleton safely
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Providers
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
};
export type { FirebaseUser };
