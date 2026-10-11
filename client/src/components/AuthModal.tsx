import React, { useState } from 'react';
import { UserProfile } from '../types/index.js';
import {
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  sendPasswordReset,
} from '../firebase/authService.js';
import {
  X,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { soundEffects } from '../audio/SoundEffects.js';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentGuestId?: string;
  onAuthSuccess: (user: UserProfile) => void;
  initialTab?: 'signin' | 'signup';
}

type AuthTab = 'signin' | 'signup' | 'forgot';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentGuestId,
  onAuthSuccess,
  initialTab = 'signin',
}) => {
  const [activeTab, setActiveTab] = useState<AuthTab>(initialTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleTabChange = (tab: AuthTab) => {
    resetForm();
    setActiveTab(tab);
  };

  const parseFirebaseError = (err: any): string => {
    const code = err?.code || '';
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
      return 'Invalid email or password. Please try again.';
    }
    if (code === 'auth/email-already-in-use') {
      return 'This email address is already in use by another account.';
    }
    if (code === 'auth/weak-password') {
      return 'Password should be at least 6 characters long.';
    }
    if (code === 'auth/invalid-email') {
      return 'Please enter a valid email address.';
    }
    if (code === 'auth/popup-closed-by-user') {
      return 'Google sign-in popup was closed before completing.';
    }
    if (code === 'auth/cancelled-popup-request') {
      return 'Authentication request cancelled.';
    }
    if (code === 'auth/unauthorized-domain') {
      return 'Domain not authorized for Firebase auth. Please ensure localhost or your Vercel domain is authorized in Firebase Console.';
    }
    if (code === 'auth/network-request-failed' || err?.message?.includes('JSON') || err?.message?.includes('network')) {
      return 'Network or configuration error connecting to Firebase. Please check your internet connection.';
    }
    return err?.message || 'Authentication failed. Please check your credentials.';
  };

  // Google 1-Click Sign In
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    resetForm();
    try {
      soundEffects.playTokenHop();
      const updatedUser = await signInWithGoogle(currentGuestId);
      soundEffects.playHomeGoal();
      onAuthSuccess(updatedUser);
      onClose();
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      setErrorMsg(parseFirebaseError(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Email Sign In / Sign Up / Forgot Password Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetForm();

    if (!email.trim()) {
      setErrorMsg('Please enter your email address');
      return;
    }

    if (activeTab === 'forgot') {
      setIsLoading(true);
      try {
        await sendPasswordReset(email.trim());
        setSuccessMsg(`Password reset link sent to ${email.trim()}. Please check your inbox.`);
      } catch (err: any) {
        setErrorMsg(parseFirebaseError(err));
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!password) {
      setErrorMsg('Please enter your password');
      return;
    }

    if (activeTab === 'signup') {
      if (password.length < 6) {
        setErrorMsg('Password must be at least 6 characters');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match');
        return;
      }
      if (!username.trim()) {
        setErrorMsg('Please enter a display name for the game');
        return;
      }

      setIsLoading(true);
      try {
        soundEffects.playTokenHop();
        const updatedUser = await signUpWithEmail(
          email.trim(),
          password,
          username.trim(),
          currentGuestId
        );
        soundEffects.playHomeGoal();
        onAuthSuccess(updatedUser);
        onClose();
      } catch (err: any) {
        console.error('Sign Up Error:', err);
        setErrorMsg(parseFirebaseError(err));
      } finally {
        setIsLoading(false);
      }
    } else {
      // Sign In
      setIsLoading(true);
      try {
        soundEffects.playTokenHop();
        const updatedUser = await signInWithEmail(
          email.trim(),
          password,
          currentGuestId
        );
        soundEffects.playHomeGoal();
        onAuthSuccess(updatedUser);
        onClose();
      } catch (err: any) {
        console.error('Sign In Error:', err);
        setErrorMsg(parseFirebaseError(err));
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-md rounded-3xl p-6 sm:p-8 border-slate-700/80 shadow-2xl relative flex flex-col overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute -top-20 -right-20 w-44 h-44 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-44 h-44 bg-pink-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition z-10"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center pb-5 relative z-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-700 to-pink-600 shadow-lg shadow-purple-600/30 mb-3">
            <span className="text-2xl">🎲</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
            Ludo<span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-300 to-indigo-400">Verse</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900/60 border border-purple-500/40 text-purple-200 font-semibold">
              Auth
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {activeTab === 'signin' && 'Sign in to save your rank, win rate, and trophies'}
            {activeTab === 'signup' && 'Create your account and dominate the global leaderboards'}
            {activeTab === 'forgot' && 'Reset your password to regain access'}
          </p>
        </div>

        {/* Auth Mode Tabs (if not forgot) */}
        {activeTab !== 'forgot' && (
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900/80 border border-slate-800 rounded-2xl mb-5 relative z-10">
            <button
              type="button"
              onClick={() => handleTabChange('signin')}
              className={`py-2 text-xs font-bold rounded-xl transition ${
                activeTab === 'signin'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('signup')}
              className={`py-2 text-xs font-bold rounded-xl transition ${
                activeTab === 'signup'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-start gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">{successMsg}</div>
          </div>
        )}

        {/* Google OAuth Quick Button (for signin & signup) */}
        {activeTab !== 'forgot' && (
          <div className="space-y-4 mb-5 relative z-10">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm flex items-center justify-center gap-3 shadow-lg shadow-white/10 transition active:scale-[0.98] disabled:opacity-60 cursor-pointer"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.97 0 12s.45 3.83 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>{isLoading ? 'Connecting...' : 'Continue with Google'}</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-800" />
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                or with email
              </span>
              <div className="flex-1 h-px bg-slate-800" />
            </div>
          </div>
        )}

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 relative z-10">
          {/* Username Field for Sign Up */}
          {activeTab === 'signup' && (
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Player Display Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="e.g. CosmicKing"
                  maxLength={20}
                  required
                  className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-sm rounded-xl pl-10 pr-3.5 py-2.5 focus:outline-none focus:border-purple-500 transition placeholder:text-slate-500"
                />
              </div>
            </div>
          )}

          {/* Email Field */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-sm rounded-xl pl-10 pr-3.5 py-2.5 focus:outline-none focus:border-purple-500 transition placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Password Field */}
          {activeTab !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Password
                </label>
                {activeTab === 'signin' && (
                  <button
                    type="button"
                    onClick={() => handleTabChange('forgot')}
                    className="text-[11px] text-purple-400 hover:text-purple-300 font-medium transition"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-sm rounded-xl pl-10 pr-10 py-2.5 focus:outline-none focus:border-purple-500 transition placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Confirm Password Field for Sign Up */}
          {activeTab === 'signup' && (
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-sm rounded-xl pl-10 pr-3.5 py-2.5 focus:outline-none focus:border-purple-500 transition placeholder:text-slate-500"
                />
              </div>
            </div>
          )}

          {/* Submit Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition active:scale-[0.98] disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : activeTab === 'signin' ? (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : activeTab === 'signup' ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Create Account & Play</span>
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  <span>Send Reset Link</span>
                </>
              )}
            </button>
          </div>

          {/* Back to sign in link for forgot tab */}
          {activeTab === 'forgot' && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => handleTabChange('signin')}
                className="text-xs text-slate-400 hover:text-purple-300 font-semibold transition"
              >
                ← Back to Sign In
              </button>
            </div>
          )}
        </form>

        {/* Footer Guarantee */}
        <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
          <span>Secured with Firebase Authentication</span>
        </div>
      </div>
    </div>
  );
};
