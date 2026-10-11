import React, { useState, useEffect } from 'react';
import { LeaderboardEntry } from '../types/index.js';
import { X, Trophy, Medal, Flame, Sparkles } from 'lucide-react';
import { subscribeToGlobalLeaderboard } from '../firebase/firestoreService.js';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
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

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ isOpen, onClose, currentUserId }) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);

    // 1. Subscribe to Real-Time Cloud Firestore Leaderboard
    const unsubscribe = subscribeToGlobalLeaderboard(30, (firestoreEntries) => {
      if (firestoreEntries && firestoreEntries.length > 0) {
        setEntries(firestoreEntries);
        setLoading(false);
      } else {
        // Fallback to local server API if Firestore is empty or initializing
        fetch('/api/leaderboard')
          .then(res => res.json())
          .then(data => {
            if (data.success && data.leaderboard) {
              setEntries(data.leaderboard);
            }
          })
          .catch(err => console.error('Fallback leaderboard load error:', err))
          .finally(() => setLoading(false));
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-lg rounded-3xl p-6 sm:p-7 border-slate-700/80 shadow-2xl relative max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-700/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Global Leaderboard</h2>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-slate-400">Ranked by Wins & XP in Cloud Firestore</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2 pr-1">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading rankings...</div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">No matches recorded yet.</div>
          ) : (
            entries.map((entry, idx) => {
              const isTop3 = idx < 3;
              const isCurrentUser = entry.userId === currentUserId;

              return (
                <div
                  key={entry.userId}
                  className={`flex items-center justify-between p-3 rounded-2xl transition border ${
                    isCurrentUser
                      ? 'bg-purple-900/40 border-purple-500/80 shadow-md shadow-purple-500/20'
                      : isTop3
                      ? 'bg-slate-900/80 border-amber-500/30'
                      : 'bg-slate-900/50 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Rank Badge */}
                    <div className="w-7 text-center font-extrabold text-sm">
                      {idx === 0 ? (
                        <span className="text-amber-400 text-base">🥇</span>
                      ) : idx === 1 ? (
                        <span className="text-slate-300 text-base">🥈</span>
                      ) : idx === 2 ? (
                        <span className="text-amber-600 text-base">🥉</span>
                      ) : (
                        <span className="text-slate-500">#{idx + 1}</span>
                      )}
                    </div>

                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-base border border-slate-700">
                      {AVATAR_EMOJIS[entry.avatar] || '🎲'}
                    </div>

                    {/* Name */}
                    <div>
                      <p className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                        {entry.username}
                        {isCurrentUser && (
                          <span className="text-[10px] bg-purple-500 text-white px-1.5 py-0.2 rounded-full font-bold">
                            You
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {entry.gamesPlayed} Matches • Level {Math.floor(entry.xp / 300) + 1}
                      </p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="text-right">
                    <p className="text-xs font-extrabold text-amber-400 flex items-center justify-end gap-1">
                      <Medal className="w-3.5 h-3.5 text-amber-400" />
                      {entry.wins} Wins
                    </p>
                    <p className="text-[10px] text-slate-400 flex items-center justify-end gap-1">
                      <Flame className="w-3 h-3 text-rose-400" />
                      {entry.winRate}% Win Rate
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
