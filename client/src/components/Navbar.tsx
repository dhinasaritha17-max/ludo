import React, { useState } from 'react';
import { UserProfile } from '../types/index.js';
import { Volume2, VolumeX, Trophy, HelpCircle, LogIn } from 'lucide-react';
import { soundEffects } from '../audio/SoundEffects.js';

interface NavbarProps {
  user: UserProfile;
  onOpenProfile: () => void;
  onOpenLeaderboard: () => void;
  onOpenTutorial: () => void;
  onOpenAuth: () => void;
}

const AVATAR_EMOJIS: Record<string, string> = {
  'dice-king': '👑',
  'star-master': '⭐',
  'phoenix': '🔥',
  'cyber-bot': '🤖',
  'trophy-hunter': '🏆',
  'ninja': '🥷',
  'wizard': '🧙‍♂️',
  'dragon': '🐉',
};

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onOpenProfile,
  onOpenLeaderboard,
  onOpenTutorial,
  onOpenAuth,
}) => {
  const [muted, setMuted] = useState(!soundEffects.isEnabled());

  const toggleSound = () => {
    const next = !muted;
    setMuted(next);
    soundEffects.setEnabled(!next);
  };

  const xpInCurrentLevel = user.xp % 300;
  const xpPercent = Math.min(100, Math.round((xpInCurrentLevel / 300) * 100));

  return (
    <header className="w-full glass-panel border-b border-slate-800/80 px-4 py-3 sticky top-0 z-30">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-2.5 cursor-pointer select-none">
          {/* Creative Logo Icon: 4 tokens converging on glowing dice */}
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-700 via-indigo-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-600/30">
            <span className="text-xl leading-none">🎲</span>
            <div className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-red-500 border border-slate-900" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-slate-900" />
            <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 border border-slate-900" />
            <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 rounded-full bg-blue-500 border border-slate-900" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-1">
              Ludo<span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-300 to-indigo-400">Verse</span>
            </h1>
            <p className="text-[9px] text-slate-400 font-semibold tracking-wider uppercase hidden sm:block">
              Roll. Rule. Play Together.
            </p>
          </div>
        </div>

        {/* Action Controls & User Profile Badge */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className="p-2 rounded-xl glass-card text-slate-300 hover:text-white hover:bg-slate-800/80 transition"
            title={muted ? 'Unmute Sound Effects' : 'Mute Sound Effects'}
          >
            {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-purple-300" />}
          </button>

          {/* Leaderboard Button */}
          <button
            onClick={onOpenLeaderboard}
            className="p-2 rounded-xl glass-card text-slate-300 hover:text-white hover:bg-slate-800/80 transition"
            title="Global Leaderboards"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
          </button>

          {/* Tutorial / Help Button */}
          <button
            onClick={onOpenTutorial}
            className="p-2 rounded-xl glass-card text-slate-300 hover:text-white hover:bg-slate-800/80 transition"
            title="How to Play"
          >
            <HelpCircle className="w-4 h-4 text-blue-400" />
          </button>

          {/* Sign In CTA if Guest */}
          {user.isGuest ? (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition active:scale-95 cursor-pointer"
              title="Sign in to save your game rank and progress"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          ) : (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-[10px] font-bold text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{user.authProvider === 'google' ? 'Google' : 'Account'}</span>
            </span>
          )}

          {/* User Profile Pill */}
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-2xl glass-card hover:bg-slate-800/90 border border-purple-500/30 transition text-left select-none cursor-pointer"
          >
            <div className="w-7 h-7 rounded-full bg-purple-950 flex items-center justify-center text-sm border border-purple-500/50 overflow-hidden">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.username} className="w-full h-full object-cover" />
              ) : (
                AVATAR_EMOJIS[user.avatar] || '🎲'
              )}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-bold text-slate-100 max-w-[90px] truncate leading-tight">
                {user.username}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[9px] font-extrabold text-purple-300">
                  Lvl {user.level}
                </span>
                <div className="w-10 h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                    style={{ width: `${xpPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
