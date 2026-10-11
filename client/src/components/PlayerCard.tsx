import React from 'react';
import { Player, PlayerColor, Token } from '../types/index.js';
import { Crown, WifiOff, Bot } from 'lucide-react';

interface PlayerCardProps {
  color: PlayerColor;
  player: Player | null;
  isActiveTurn: boolean;
  tokens: Token[];
  turnDeadline: number;
  totalTurnSeconds: number;
}

const COLOR_STYLES: Record<PlayerColor, {
  border: string;
  bg: string;
  badge: string;
  text: string;
  glow: string;
}> = {
  red: {
    border: 'border-red-500',
    bg: 'from-red-950/40 to-slate-900',
    badge: 'bg-red-500 text-white',
    text: 'text-red-400',
    glow: 'shadow-red-500/40 ring-2 ring-red-500',
  },
  green: {
    border: 'border-emerald-500',
    bg: 'from-emerald-950/40 to-slate-900',
    badge: 'bg-emerald-500 text-white',
    text: 'text-emerald-400',
    glow: 'shadow-emerald-500/40 ring-2 ring-emerald-500',
  },
  yellow: {
    border: 'border-amber-500',
    bg: 'from-amber-950/40 to-slate-900',
    badge: 'bg-amber-500 text-slate-950 font-bold',
    text: 'text-amber-400',
    glow: 'shadow-amber-500/40 ring-2 ring-amber-500',
  },
  blue: {
    border: 'border-blue-500',
    bg: 'from-blue-950/40 to-slate-900',
    badge: 'bg-blue-500 text-white',
    text: 'text-blue-400',
    glow: 'shadow-blue-500/40 ring-2 ring-blue-500',
  },
};

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

export const PlayerCard: React.FC<PlayerCardProps> = ({
  color,
  player,
  isActiveTurn,
  tokens,
  turnDeadline,
  totalTurnSeconds,
}) => {
  const styles = COLOR_STYLES[color];

  if (!player) {
    return (
      <div className="glass-card rounded-xl p-2.5 sm:p-3 border border-slate-800 opacity-40 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 text-xs">
          —
        </div>
        <div>
          <p className="text-xs font-medium text-slate-400 capitalize">{color}</p>
          <p className="text-[10px] text-slate-500">Empty</p>
        </div>
      </div>
    );
  }

  const finishedCount = tokens.filter(t => t.step === 56).length;
  const inYardCount = tokens.filter(t => t.step === -1).length;
  const onTrackCount = tokens.length - finishedCount - inYardCount;

  // Turn time remaining percent
  const now = Date.now();
  const remainingMs = Math.max(0, turnDeadline - now);
  const percent = Math.min(100, Math.max(0, (remainingMs / (totalTurnSeconds * 1000)) * 100));

  return (
    <div
      className={`relative glass-card rounded-xl p-2.5 sm:p-3 bg-gradient-to-br ${styles.bg} border transition-all duration-300 ${
        isActiveTurn ? `${styles.border} ${styles.glow} scale-[1.02]` : 'border-slate-800/80'
      }`}
    >
      <div className="flex items-center gap-2.5">
        {/* Avatar with Turn Ring */}
        <div className="relative">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-800 flex items-center justify-center text-lg shadow-inner border border-white/10">
            {AVATAR_EMOJIS[player.avatar] || '🎲'}
          </div>

          {/* Color Indicator Badge */}
          <span
            className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
              color === 'red' ? 'bg-red-500' : color === 'green' ? 'bg-emerald-500' : color === 'yellow' ? 'bg-amber-500' : 'bg-blue-500'
            }`}
          />
        </div>

        {/* Player Name and Badges */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs sm:text-sm font-bold text-slate-100 truncate">
              {player.name}
            </span>
            {player.isHost && (
              <span title="Host"><Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" /></span>
            )}
            {player.isBot && (
              <span title="Computer Opponent"><Bot className="w-3.5 h-3.5 text-cyan-400 shrink-0" /></span>
            )}
            {!player.isConnected && !player.isBot && (
              <span title="Disconnected"><WifiOff className="w-3.5 h-3.5 text-rose-500 shrink-0" /></span>
            )}
          </div>

          {/* Token Mini-Status Badges */}
          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-300">
            <span title="In Home Goal">🏆 {finishedCount}/4</span>
            <span title="On Track">🛤️ {onTrackCount}</span>
            <span title="In Base">🏠 {inYardCount}</span>
          </div>
        </div>
      </div>

      {/* Active Turn Progress Bar */}
      {isActiveTurn && (
        <div className="w-full bg-slate-800/80 rounded-full h-1 mt-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              percent < 30 ? 'bg-rose-500' : percent < 60 ? 'bg-amber-400' : 'bg-purple-500'
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </div>
  );
};
