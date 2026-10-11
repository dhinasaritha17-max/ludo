import React, { useState, useEffect } from 'react';
import { UserProfile, PlayerColor } from '../types/index.js';
import { X, User, Check, Flame, Trophy, Shield, Save, LogOut } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onUpdateUser: (updated: Partial<UserProfile>) => void;
  onResetSession: () => void;
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
}) => {
  const [username, setUsername] = useState(user.username);
  const [avatar, setAvatar] = useState(user.avatar);
  const [favoriteColor, setFavoriteColor] = useState<PlayerColor>(user.favoriteColor || 'red');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setUsername(user.username);
    setAvatar(user.avatar);
    setFavoriteColor(user.favoriteColor || 'red');
  }, [user]);

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
                {user.isGuest ? 'Guest Account' : 'Registered Member'} • Level {user.level}
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
          {/* Stats Summary Cards */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="glass-card rounded-2xl p-3 text-center border-slate-800">
              <Trophy className="w-4 h-4 text-amber-400 mx-auto mb-1" />
              <p className="text-lg font-extrabold text-white">{user.wins}</p>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Wins</p>
            </div>
            <div className="glass-card rounded-2xl p-3 text-center border-slate-800">
              <Flame className="w-4 h-4 text-rose-400 mx-auto mb-1" />
              <p className="text-lg font-extrabold text-white">{user.winRate}%</p>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Win Rate</p>
            </div>
            <div className="glass-card rounded-2xl p-3 text-center border-slate-800">
              <Shield className="w-4 h-4 text-purple-400 mx-auto mb-1" />
              <p className="text-lg font-extrabold text-white">{user.gamesPlayed}</p>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Matches</p>
            </div>
          </div>

          {/* Form */}
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

              <button
                type="button"
                onClick={onResetSession}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition"
                title="Reset local guest identity"
              >
                <LogOut className="w-4 h-4" />
                Reset
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
