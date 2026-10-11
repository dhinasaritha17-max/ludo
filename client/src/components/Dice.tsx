import React from 'react';
import { PlayerColor } from '../types/index.js';

interface DiceProps {
  value: number | null;
  isRolling: boolean;
  canRoll: boolean;
  activeColor: PlayerColor;
  onRoll: () => void;
}

const COLOR_GLOW: Record<PlayerColor, string> = {
  red: 'border-red-500 shadow-red-500/50 bg-red-950/40',
  green: 'border-emerald-500 shadow-emerald-500/50 bg-emerald-950/40',
  yellow: 'border-amber-500 shadow-amber-500/50 bg-amber-950/40',
  blue: 'border-blue-500 shadow-blue-500/50 bg-blue-950/40',
};

const DOT_POSITIONS: Record<number, string[]> = {
  1: ['col-start-2 row-start-2'],
  2: ['col-start-1 row-start-1', 'col-start-3 row-start-3'],
  3: ['col-start-1 row-start-1', 'col-start-2 row-start-2', 'col-start-3 row-start-3'],
  4: ['col-start-1 row-start-1', 'col-start-3 row-start-1', 'col-start-1 row-start-3', 'col-start-3 row-start-3'],
  5: ['col-start-1 row-start-1', 'col-start-3 row-start-1', 'col-start-2 row-start-2', 'col-start-1 row-start-3', 'col-start-3 row-start-3'],
  6: [
    'col-start-1 row-start-1', 'col-start-1 row-start-2', 'col-start-1 row-start-3',
    'col-start-3 row-start-1', 'col-start-3 row-start-2', 'col-start-3 row-start-3',
  ],
};

export const Dice: React.FC<DiceProps> = ({ value, isRolling, canRoll, activeColor, onRoll }) => {
  const displayValue = value || 6;
  const dots = DOT_POSITIONS[displayValue] || DOT_POSITIONS[6];

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={canRoll && !isRolling ? onRoll : undefined}
        disabled={!canRoll || isRolling}
        className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl p-3 border-2 transition-all duration-300 select-none shadow-xl flex items-center justify-center ${
          canRoll
            ? `cursor-pointer hover:scale-105 active:scale-95 ${COLOR_GLOW[activeColor]} ring-4 ring-white/20 animate-pulse`
            : 'cursor-not-allowed opacity-80 border-slate-700 bg-slate-900/80 shadow-slate-950/50'
        } ${isRolling ? 'animate-dice-shake' : ''}`}
        aria-label="Roll Dice"
      >
        {/* Dice Body with Gradient */}
        <div className="w-full h-full rounded-xl bg-gradient-to-br from-slate-100 to-slate-300 shadow-inner grid grid-cols-3 grid-rows-3 p-2.5 items-center justify-items-center">
          {dots.map((pos, idx) => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-slate-900 shadow-md ${pos}`}
            />
          ))}
        </div>

        {/* Can Roll Badge */}
        {canRoll && !isRolling && (
          <span className="absolute -top-3 -right-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-lg animate-bounce">
            ROLL!
          </span>
        )}
      </button>

      {/* Status Prompt */}
      <span className="text-xs font-semibold tracking-wide text-slate-300">
        {isRolling
          ? 'Rolling...'
          : canRoll
          ? 'Tap to Roll'
          : value
          ? `Rolled ${value}`
          : 'Waiting...'}
      </span>
    </div>
  );
};
