import React, { useState } from 'react';
import { UserProfile, GameMode } from '../types/index.js';
import { Globe, Users, Bot, BookOpen, Gift, Trophy, Flame, Play, Sparkles, LogIn } from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundEffects } from '../audio/SoundEffects.js';

interface HomeScreenProps {
  user: UserProfile;
  onPlayOnline: () => void;
  onPlayWithFriends: () => void;
  onPlayWithComputer: (mode: GameMode) => void;
  onOpenTutorial: () => void;
  onOpenLeaderboard: () => void;
  onClaimDailyReward: () => void;
  onOpenAuth?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  user,
  onPlayOnline,
  onPlayWithFriends,
  onPlayWithComputer,
  onOpenTutorial,
  onOpenLeaderboard,
  onClaimDailyReward,
  onOpenAuth,
}) => {
  const [claiming, setClaiming] = useState(false);

  const canClaimReward = !user.lastDailyReward || Date.now() - user.lastDailyReward >= 24 * 60 * 60 * 1000;

  const handleClaim = () => {
    if (!canClaimReward) return;
    setClaiming(true);
    soundEffects.playHomeGoal();
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#EF4444', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6'],
    });
    onClaimDailyReward();
    setTimeout(() => setClaiming(false), 1200);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:py-10 space-y-8 animate-in fade-in duration-300">
      {/* Hero Showcase Card */}
      <div className="relative glass-panel rounded-3xl p-6 sm:p-10 border-purple-500/30 overflow-hidden shadow-2xl">
        {/* Ambient Glows */}
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-pink-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8">
          <div className="text-center md:text-left space-y-3 max-w-lg">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-900/60 border border-purple-500/40 text-[11px] font-bold text-purple-200">
              <Sparkles className="w-3.5 h-3.5 text-pink-400" />
              Next-Gen Multiplayer Board Game
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
              Roll the Dice.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-300 to-indigo-300">
                Rule the Board.
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Experience the world's most thrilling real-time Ludo game. Play with friends across any phone, tablet, or PC with instant live chat and emoji reactions!
            </p>

            {/* Quick Action CTA */}
            <div className="pt-2 flex flex-wrap gap-3 justify-center md:justify-start">
              <button
                onClick={onPlayOnline}
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-sm flex items-center gap-2 shadow-xl shadow-purple-600/40 transition active:scale-95 cursor-pointer"
              >
                <Globe className="w-4 h-4" />
                Play Online Now
              </button>
              <button
                onClick={onPlayWithFriends}
                className="px-5 py-3.5 rounded-2xl glass-card hover:bg-slate-800 text-slate-100 font-bold text-sm flex items-center gap-2 border border-slate-700 transition cursor-pointer"
              >
                <Users className="w-4 h-4 text-purple-400" />
                Play with Friends
              </button>
            </div>
          </div>

          {/* 3D Dice Showcase Visual */}
          <div className="relative shrink-0 flex items-center justify-center">
            <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-3xl bg-gradient-to-tr from-purple-900/80 to-slate-900 border-2 border-purple-500/40 shadow-2xl flex items-center justify-center relative rotate-6 hover:rotate-0 transition-transform duration-500">
              <span className="text-7xl sm:text-8xl select-none filter drop-shadow-2xl">
                🎲
              </span>

              {/* Surrounding Colorful Tokens Badge */}
              <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-red-500 shadow-lg shadow-red-500/50 flex items-center justify-center text-xs font-bold text-white border-2 border-slate-900">
                🔴
              </div>
              <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50 flex items-center justify-center text-xs font-bold text-white border-2 border-slate-900">
                🟢
              </div>
              <div className="absolute -bottom-3 -right-3 w-8 h-8 rounded-full bg-amber-500 shadow-lg shadow-amber-500/50 flex items-center justify-center text-xs font-bold text-white border-2 border-slate-900">
                🟡
              </div>
              <div className="absolute -bottom-3 -left-3 w-8 h-8 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50 flex items-center justify-center text-xs font-bold text-white border-2 border-slate-900">
                🔵
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Guest Progress Notice */}
      {user.isGuest && onOpenAuth && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900/30 via-indigo-900/30 to-pink-900/30 border border-purple-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2.5 text-xs text-slate-300 text-center sm:text-left">
            <Sparkles className="w-4 h-4 text-pink-400 shrink-0" />
            <span>
              Playing as guest. Sign in with Google or Email to preserve your win rate and climb the global leaderboards!
            </span>
          </div>
          <button
            onClick={onOpenAuth}
            className="shrink-0 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-purple-600/30 cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        </div>
      )}

      {/* Main Game Mode Grid */}
      <div className="space-y-4">
        <h2 className="text-sm font-extrabold text-slate-300 uppercase tracking-wider px-1">
          Select Game Mode
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Mode 1: Play Online */}
          <div
            onClick={onPlayOnline}
            className="group glass-card rounded-2xl p-5 hover:bg-slate-800/90 border border-slate-800 hover:border-purple-500/60 transition cursor-pointer flex flex-col justify-between shadow-lg"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white mb-4 shadow-md group-hover:scale-110 transition-transform">
                <Globe className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">Play Online</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Match with real players worldwide in 2-player or 4-player battles.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-bold text-purple-400 group-hover:text-pink-300">
              Quick Match <Play className="w-3.5 h-3.5 ml-1 fill-current" />
            </div>
          </div>

          {/* Mode 2: Play with Friends */}
          <div
            onClick={onPlayWithFriends}
            className="group glass-card rounded-2xl p-5 hover:bg-slate-800/90 border border-slate-800 hover:border-indigo-500/60 transition cursor-pointer flex flex-col justify-between shadow-lg"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white mb-4 shadow-md group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">Play with Friends</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Create a private room with a code or join your friend's invite link.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-bold text-indigo-400 group-hover:text-purple-300">
              Create / Join <Play className="w-3.5 h-3.5 ml-1 fill-current" />
            </div>
          </div>

          {/* Mode 3: Play with Computer (AI) */}
          <div
            onClick={() => onPlayWithComputer('4p')}
            className="group glass-card rounded-2xl p-5 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-500/60 transition cursor-pointer flex flex-col justify-between shadow-lg"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white mb-4 shadow-md group-hover:scale-110 transition-transform">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">Play Computer</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Challenge smart AI opponents locally without waiting for others.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-bold text-cyan-400 group-hover:text-blue-300">
              Single Player <Play className="w-3.5 h-3.5 ml-1 fill-current" />
            </div>
          </div>

          {/* Mode 4: How to Play Tutorial */}
          <div
            onClick={onOpenTutorial}
            className="group glass-card rounded-2xl p-5 hover:bg-slate-800/90 border border-slate-800 hover:border-emerald-500/60 transition cursor-pointer flex flex-col justify-between shadow-lg"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white mb-4 shadow-md group-hover:scale-110 transition-transform">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">How to Play</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Learn dice rules, safe squares, token capturing, and home goals.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-bold text-emerald-400 group-hover:text-teal-300">
              Read Guide <Play className="w-3.5 h-3.5 ml-1 fill-current" />
            </div>
          </div>
        </div>
      </div>

      {/* Daily Reward & Player Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Daily Reward Banner */}
        <div className="glass-panel rounded-3xl p-5 sm:p-6 border-amber-500/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Gift className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Daily Bonus Reward</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {canClaimReward
                  ? 'Claim your free +150 XP bonus today!'
                  : 'Daily bonus claimed! Returns in 24 hours.'}
              </p>
            </div>
          </div>

          <button
            onClick={handleClaim}
            disabled={!canClaimReward || claiming}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 disabled:opacity-40 text-slate-950 font-extrabold text-xs shrink-0 transition shadow-md shadow-amber-500/30 cursor-pointer disabled:cursor-not-allowed"
          >
            {canClaimReward ? 'Claim +150 XP' : 'Claimed ✓'}
          </button>
        </div>

        {/* Player Stats Card */}
        <div className="glass-panel rounded-3xl p-5 sm:p-6 border-slate-700/60 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-400" />
              Career Summary
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {user.wins} Wins • {user.gamesPlayed} Matches • Level {user.level}
            </p>
          </div>

          <button
            onClick={onOpenLeaderboard}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-purple-300 border border-purple-500/30 transition flex items-center gap-1.5"
          >
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            Leaderboard
          </button>
        </div>
      </div>
    </div>
  );
};
