import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { PlayerColor, Player } from '../types/index.js';
import { Trophy, RotateCcw, Home, Award } from 'lucide-react';
import { soundEffects } from '../audio/SoundEffects.js';

interface VictoryModalProps {
  winner: PlayerColor;
  players: Record<PlayerColor, Player | null>;
  rankings: PlayerColor[];
  myColor?: PlayerColor;
  rematchVotes: string[];
  requiredVotes: number;
  onRequestRematch: () => void;
  onGoHome: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  winner,
  players,
  rankings,
  myColor,
  rematchVotes,
  requiredVotes,
  onRequestRematch,
  onGoHome,
}) => {
  const winnerPlayer = players[winner];
  const isMe = myColor === winner;

  useEffect(() => {
    soundEffects.playVictory();

    // Trigger fireworks confetti explosion
    const duration = 3.5 * 1000;
    const end = Date.now() + duration;

    const interval: ReturnType<typeof setInterval> = setInterval(() => {
      if (Date.now() > end) {
        return clearInterval(interval);
      }
      confetti({
        startVelocity: 30,
        spread: 360,
        ticks: 60,
        origin: { x: Math.random(), y: Math.random() - 0.2 },
        colors: ['#EF4444', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6'],
      });
    }, 300);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="glass-panel w-full max-w-md rounded-3xl p-6 sm:p-8 text-center border-purple-500/30 shadow-2xl relative overflow-hidden">
        {/* Glow ambient circle */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-purple-600/30 rounded-full blur-3xl pointer-events-none" />

        {/* Big Golden Trophy */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center shadow-lg shadow-amber-500/30 mb-4 animate-bounce">
          <Trophy className="w-12 h-12 sm:w-14 sm:h-14 text-slate-950" />
        </div>

        {/* Victory Headline */}
        <h2 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-400">
          {isMe ? 'VICTORY IS YOURS!' : 'MATCH COMPLETED!'}
        </h2>
        <p className="text-sm font-semibold text-slate-300 mt-1">
          <span className="font-extrabold text-white capitalize">{winnerPlayer?.name || winner}</span>{' '}
          ruled the board! 👑
        </p>

        {/* XP Bonus Card */}
        <div className="my-5 p-3 rounded-2xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-center gap-3">
          <Award className="w-5 h-5 text-purple-400" />
          <span className="text-sm font-bold text-purple-200">
            {isMe ? '+100 XP Earned!' : '+30 XP Match Bonus'}
          </span>
        </div>

        {/* Final Podium Table */}
        <div className="space-y-2 mb-6 text-left">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            Final Standings
          </h4>
          {rankings.map((color, index) => {
            const p = players[color];
            return (
              <div
                key={color}
                className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-bold text-amber-400 text-sm">#{index + 1}</span>
                  <span
                    className={`w-3 h-3 rounded-full ${
                      color === 'red' ? 'bg-red-500' : color === 'green' ? 'bg-emerald-500' : color === 'yellow' ? 'bg-amber-500' : 'bg-blue-500'
                    }`}
                  />
                  <span className="font-semibold text-slate-200">{p?.name || color}</span>
                </div>
                <span className="text-[11px] text-slate-400 capitalize">{color}</span>
              </div>
            );
          })}
        </div>

        {/* Rematch & Navigation Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onRequestRematch}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            Rematch ({rematchVotes.length}/{requiredVotes})
          </button>
          <button
            onClick={onGoHome}
            className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm flex items-center justify-center gap-2 transition"
          >
            <Home className="w-4 h-4" />
            Home
          </button>
        </div>
      </div>
    </div>
  );
};
