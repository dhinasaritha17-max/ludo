import React, { useState, useEffect } from 'react';
import { UserProfile, PlayerColor, MatchRecord } from '../types/index.js';
import {
  X,
  User,
  Check,
  Flame,
  Trophy,
  Shield,
  Save,
  LogOut,
  LogIn,
  Sparkles,
  Coins,
  History,
  Calendar,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { getPlayerMatchHistoryFromFirestore } from '../firebase/firestoreService.js';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onUpdateUser: (updated: Partial<UserProfile>) => void;
  onResetSession: () => void;
  onOpenAuth: () => void;
  onSignOut: () => void;
}

const AVATARS = [
  { id: 'dice-king', label: 'Dice King', emoji: '👑' },
  { id: 'star-master', label: 'Star Master', emoji: '⭐' },
  { id: 'phoenix', label: 'Phoenix', emoji: '🔥' },
  { id: 'cyber-bot', label: 'Cyber Bot', emoji: '🤖' },
  { id: 'trophy-hunter', label: 'Trophy Hunter', emoji: '🏆' },
  { id: 'ninja', label: 'Ninja', emoji: '🥷' },
  { id: 'wizard', label: 'Wizard', emoji: '🧙‍♂️' },
  { id: 'dragon', label: 'Dragon', emoji: '🐉' },
];

const COLORS: { id: PlayerColor; label: string; bg: string }[] = [
  { id: 'red', label: 'Red', bg: 'bg-red-500' },
  { id: 'green', label: 'Green', bg: 'bg-emerald-500' },
  { id: 'yellow', label: 'Yellow', bg: 'bg-amber-500' },
  { id: 'blue', label: 'Blue', bg: 'bg-blue-500' },
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdateUser,
  onResetSession,
  onOpenAuth,
  onSignOut,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'matches'>('profile');
  const [username, setUsername] = useState(user.username);
  const [avatar, setAvatar] = useState(user.avatar);
  const [favoriteColor, setFavoriteColor] = useState<PlayerColor>(user.favoriteColor || 'red');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Match History State
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [lastVisibleDoc, setLastVisibleDoc] = useState<any>(null);
  const [hasMoreMatches, setHasMoreMatches] = useState(false);

  useEffect(() => {
    setUsername(user.username);
    setAvatar(user.avatar);
    setFavoriteColor(user.favoriteColor || 'red');
  }, [user]);

  // Load Match History on Tab Selection
  useEffect(() => {
    if (isOpen && activeTab === 'matches') {
      loadInitialMatches();
    }
  }, [isOpen, activeTab, user.id]);

  const loadInitialMatches = async () => {
    setLoadingMatches(true);
    try {
      const res = await getPlayerMatchHistoryFromFirestore(user.id, 8);
      if (res.matches && res.matches.length > 0) {
        setMatches(res.matches);
        setLastVisibleDoc(res.lastDoc);
        setHasMoreMatches(res.hasMore);
      } else {
        // Fallback to local server endpoint
        const serverRes = await fetch(`/api/profile/${user.id}/matches`);
        const serverData = await serverRes.json();
        if (serverData.success && serverData.matches) {
          setMatches(serverData.matches);
        }
      }
    } catch (e) {
      console.error('Error fetching matches:', e);
    } finally {
      setLoadingMatches(false);
    }
  };

  const loadMoreMatches = async () => {
    if (!lastVisibleDoc || loadingMatches) return;
    setLoadingMatches(true);
    try {
      const res = await getPlayerMatchHistoryFromFirestore(user.id, 8, lastVisibleDoc);
      if (res.matches && res.matches.length > 0) {
        setMatches(prev => [...prev, ...res.matches]);
        setLastVisibleDoc(res.lastDoc);
        setHasMoreMatches(res.hasMore);
      } else {
        setHasMoreMatches(false);
      }
    } catch (e) {
      console.error('Error loading more matches:', e);
    } finally {
      setLoadingMatches(false);
    }
  };

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    onUpdateUser({
      username: username.trim(),
      avatar,
      favoriteColor,
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-lg rounded-3xl p-6 sm:p-7 border-slate-700/80 shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-700/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Player Profile</h2>
              <p className="text-xs text-slate-400">
                {user.isGuest ? 'Guest Account' : `${user.authProvider === 'google' ? 'Google' : 'Verified'} Member`} • Level {user.level}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
          {/* Account Status Banner */}
          {user.isGuest ? (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900/40 via-indigo-900/40 to-pink-900/40 border border-purple-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-pink-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-white">Save Your Game Progress</p>
                  <p className="text-[11px] text-slate-300">
                    Sign in to keep your wins, XP, and unlock verified leaderboards.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAuth();
                }}
                className="shrink-0 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-purple-600/30 transition active:scale-95"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In
              </button>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-950 text-emerald-400 flex items-center justify-center text-xs">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>{user.email || 'Authenticated Player'}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-900/60 text-purple-300 font-semibold uppercase">
                      {user.authProvider || 'Firebase'}
                    </span>
                  </p>
                  <p className="text-[11px] text-emerald-400">Account synced securely</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onSignOut}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-rose-400 text-xs font-semibold flex items-center gap-1 transition"
                title="Sign out of your account"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          )}
          {/* Stats Summary Cards */}
          <div className="grid grid-cols-4 gap-2">
            <div className="glass-card rounded-2xl p-2.5 text-center border-slate-800">
              <Trophy className="w-4 h-4 text-amber-400 mx-auto mb-1" />
              <p className="text-base font-extrabold text-white">{user.wins}</p>
              <p className="text-[9px] text-slate-400 font-semibold uppercase">Wins</p>
            </div>
            <div className="glass-card rounded-2xl p-2.5 text-center border-slate-800">
              <Flame className="w-4 h-4 text-rose-400 mx-auto mb-1" />
              <p className="text-base font-extrabold text-white">{user.winRate}%</p>
              <p className="text-[9px] text-slate-400 font-semibold uppercase">Win Rate</p>
            </div>
            <div className="glass-card rounded-2xl p-2.5 text-center border-slate-800">
              <Shield className="w-4 h-4 text-purple-400 mx-auto mb-1" />
              <p className="text-base font-extrabold text-white">{user.gamesPlayed}</p>
              <p className="text-[9px] text-slate-400 font-semibold uppercase">Matches</p>
            </div>
            <div className="glass-card rounded-2xl p-2.5 text-center border-slate-800">
              <Coins className="w-4 h-4 text-amber-300 mx-auto mb-1" />
              <p className="text-base font-extrabold text-amber-300">{user.coins || 0}</p>
              <p className="text-[9px] text-slate-400 font-semibold uppercase">Coins</p>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex border-b border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`flex-1 py-2 text-xs font-bold transition flex items-center justify-center gap-1.5 border-b-2 ${
                activeTab === 'profile'
                  ? 'border-purple-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Profile Details
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('matches')}
              className={`flex-1 py-2 text-xs font-bold transition flex items-center justify-center gap-1.5 border-b-2 ${
                activeTab === 'matches'
                  ? 'border-purple-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Match History
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-purple-900/60 text-purple-300 border border-purple-500/30">
                Firestore
              </span>
            </button>
          </div>

          {activeTab === 'profile' ? (
            /* Form */
            <form onSubmit={handleSave} className="space-y-4">
              {/* Username Input */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  maxLength={20}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-purple-500 transition"
                />
              </div>

              {/* Avatar Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Choose Avatar
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {AVATARS.map(av => (
                    <button
                      type="button"
                      key={av.id}
                      onClick={() => setAvatar(av.id)}
                      className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1 transition ${
                        avatar === av.id
                          ? 'bg-purple-900/40 border-purple-500 ring-2 ring-purple-500/50'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-2xl">{av.emoji}</span>
                      <span className="text-[10px] font-medium text-slate-300 truncate w-full text-center">
                        {av.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Favorite Color */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Favorite Color
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {COLORS.map(c => (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => setFavoriteColor(c.id)}
                      className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 transition text-xs font-bold ${
                        favoriteColor === c.id
                          ? 'bg-slate-800 border-white ring-2 ring-white/30 text-white'
                          : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-full ${c.bg}`} />
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition active:scale-95"
                >
                  {savedSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      Saved!
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>

                {user.isGuest ? (
                  <button
                    type="button"
                    onClick={onResetSession}
                    className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition"
                    title="Reset local guest identity"
                  >
                    <LogOut className="w-4 h-4" />
                    Reset Guest
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition"
                    title="Sign out of your account"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                )}
              </div>
            </form>
          ) : (
            /* Match History Tab */
            <div className="space-y-3">
              {loadingMatches && matches.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                  <p className="text-xs">Querying match records from Cloud Firestore...</p>
                </div>
              ) : matches.length === 0 ? (
                <div className="py-12 text-center text-slate-400 glass-card rounded-2xl p-6 border-slate-800">
                  <History className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-60" />
                  <p className="text-xs font-bold text-slate-300">No Match History Found</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Play a game online or practice with AI to record your first match in the database!
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {matches.map(m => {
                    const mySummary = m.players?.find(p => p.id === user.id);
                    const isWinner = mySummary && mySummary.color === m.winner;
                    const dateFormatted = new Date(m.endedAt || m.startedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <div
                        key={m.id}
                        className={`p-3.5 rounded-2xl border transition flex flex-col gap-2 ${
                          isWinner
                            ? 'bg-emerald-950/20 border-emerald-500/40'
                            : 'bg-slate-900/60 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider ${
                                isWinner
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-slate-800 text-slate-300 border border-slate-700'
                              }`}
                            >
                              {isWinner ? '🏆 Victory' : '❌ Defeat'}
                            </span>
                            <span className="text-[11px] font-bold text-purple-300 uppercase px-2 py-0.5 rounded bg-purple-900/40">
                              {m.mode.toUpperCase()}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            {dateFormatted}
                          </span>
                        </div>

                        {/* Player participants strip */}
                        <div className="flex items-center justify-between text-xs pt-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {m.players?.map((p, idx) => (
                              <div
                                key={idx}
                                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] ${
                                  p.color === m.winner
                                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-200 font-bold'
                                    : 'bg-slate-800/80 border-slate-700/80 text-slate-300'
                                }`}
                              >
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    p.color === 'red'
                                      ? 'bg-red-500'
                                      : p.color === 'green'
                                      ? 'bg-emerald-500'
                                      : p.color === 'yellow'
                                      ? 'bg-amber-500'
                                      : 'bg-blue-500'
                                  }`}
                                />
                                <span>{p.name.replace(' (AI)', '')}</span>
                                {p.color === m.winner && <span>👑</span>}
                              </div>
                            ))}
                          </div>
                          <div className="text-right shrink-0 pl-2">
                            <span className="text-[11px] font-extrabold text-amber-300 flex items-center justify-end gap-1">
                              {isWinner ? '+150' : '+20'}
                              <Coins className="w-3 h-3 text-amber-400 inline" />
                            </span>
                            <p className="text-[10px] text-slate-400">{m.turnsCount || 1} Turns</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Pagination: Load More */}
                  {hasMoreMatches && (
                    <button
                      type="button"
                      onClick={loadMoreMatches}
                      disabled={loadingMatches}
                      className="w-full py-2.5 rounded-xl border border-slate-700 hover:border-purple-500 bg-slate-900/60 hover:bg-slate-800 text-xs font-bold text-slate-300 hover:text-white transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {loadingMatches ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                          Loading more...
                        </>
                      ) : (
                        'Load More Matches'
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
