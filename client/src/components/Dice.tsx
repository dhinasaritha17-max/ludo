import React, { useEffect, useState, useRef } from 'react';
import { PlayerColor } from '../types/index.js';
import { soundEffects } from '../audio/SoundEffects.js';

interface DiceProps {
  value: number | null;
  isRolling: boolean;
  canRoll: boolean;
  activeColor: PlayerColor;
  onRoll: () => void;
}

const COLOR_GLOW: Record<PlayerColor, string> = {
  red: 'border-red-500 shadow-red-500/60 bg-red-950/40 text-red-400 ring-red-500/50',
  green: 'border-emerald-500 shadow-emerald-500/60 bg-emerald-950/40 text-emerald-400 ring-emerald-500/50',
  yellow: 'border-amber-500 shadow-amber-500/60 bg-amber-950/40 text-amber-400 ring-amber-500/50',
  blue: 'border-blue-500 shadow-blue-500/60 bg-blue-950/40 text-blue-400 ring-blue-500/50',
};

// Target 3D rotations [rotateX, rotateY] to display each face (1..6)
const FACE_ROTATIONS: Record<number, [number, number]> = {
  1: [0, 0],
  2: [-90, 0],
  3: [0, -90],
  4: [0, 90],
  5: [90, 0],
  6: [180, 0],
};

const DOT_CONFIGS: Record<number, string[]> = {
  1: ['col-start-2 row-start-2'],
  2: ['col-start-1 row-start-1', 'col-start-3 row-start-3'],
  3: ['col-start-1 row-start-1', 'col-start-2 row-start-2', 'col-start-3 row-start-3'],
  4: ['col-start-1 row-start-1', 'col-start-3 row-start-1', 'col-start-1 row-start-3', 'col-start-3 row-start-3'],
  5: [
    'col-start-1 row-start-1',
    'col-start-3 row-start-1',
    'col-start-2 row-start-2',
    'col-start-1 row-start-3',
    'col-start-3 row-start-3',
  ],
  6: [
    'col-start-1 row-start-1',
    'col-start-1 row-start-2',
    'col-start-1 row-start-3',
    'col-start-3 row-start-1',
    'col-start-3 row-start-2',
    'col-start-3 row-start-3',
  ],
};

const DiceFace: React.FC<{ faceNumber: number; transform: string }> = ({ faceNumber, transform }) => {
  const dots = DOT_CONFIGS[faceNumber] || DOT_CONFIGS[1];
  return (
    <div
      className="absolute inset-0 w-full h-full rounded-2xl bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 border-2 border-slate-300 shadow-md grid grid-cols-3 grid-rows-3 p-2.5 items-center justify-items-center backface-hidden"
      style={{
        transform,
        boxShadow: 'inset 0 2px 4px rgba(255, 255, 255, 0.9), inset 0 -2px 6px rgba(0, 0, 0, 0.15)',
      }}
    >
      {dots.map((pos, idx) => (
        <div
          key={idx}
          className={`w-3.5 h-3.5 rounded-full ${pos} shadow-inner ${
            faceNumber === 1 || faceNumber === 6 ? 'bg-red-600' : 'bg-slate-900'
          }`}
          style={{
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.6), 0 1px 1px rgba(255,255,255,0.4)',
          }}
        />
      ))}
    </div>
  );
};

export const Dice: React.FC<DiceProps> = ({ value, isRolling, canRoll, activeColor, onRoll }) => {
  const [rotation, setRotation] = useState<[number, number]>([0, 0]);
  const [internalRolling, setInternalRolling] = useState(false);
  const animFrameRef = useRef<number | null>(null);

  // Synchronize 3D cube face with dice outcome
  useEffect(() => {
    if (isRolling) {
      setInternalRolling(true);
      let angleX = 0;
      let angleY = 0;

      const tumble = () => {
        angleX += 32;
        angleY += 45;
        setRotation([angleX, angleY]);
        animFrameRef.current = requestAnimationFrame(tumble);
      };
      animFrameRef.current = requestAnimationFrame(tumble);

      return () => {
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
          animFrameRef.current = null;
        }
      };
    } else {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      setInternalRolling(false);
      const targetVal = value && value >= 1 && value <= 6 ? value : 6;
      const base = FACE_ROTATIONS[targetVal] || [0, 0];
      // Add full revolution offset so it spins into final position smoothly
      setRotation(prev => [
        Math.round(prev[0] / 360) * 360 + base[0],
        Math.round(prev[1] / 360) * 360 + base[1],
      ]);
    }
  }, [isRolling, value]);

  const handleRollClick = () => {
    if (!canRoll || isRolling || internalRolling) return;
    onRoll();
  };

  const rollingActive = isRolling || internalRolling;

  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className="relative">
        {/* Glow Halo around active rolling player */}
        {canRoll && !rollingActive && (
          <div
            className={`absolute -inset-2 rounded-3xl opacity-75 blur-md animate-pulse ${
              activeColor === 'red'
                ? 'bg-red-500'
                : activeColor === 'green'
                ? 'bg-emerald-500'
                : activeColor === 'yellow'
                ? 'bg-amber-500'
                : 'bg-blue-500'
            }`}
          />
        )}

        <button
          onClick={handleRollClick}
          disabled={!canRoll || rollingActive}
          className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-3xl p-2.5 border-2 transition-all duration-300 select-none shadow-2xl flex items-center justify-center ${
            canRoll
              ? `cursor-pointer hover:scale-105 active:scale-95 ${COLOR_GLOW[activeColor]} ring-4 ring-white/30`
              : 'cursor-not-allowed opacity-85 border-slate-700/80 bg-slate-900/90 shadow-slate-950/60'
          }`}
          aria-label="Roll Dice"
          style={{ perspective: '800px' }}
        >
          {/* 3D Dice Cube Container */}
          <div
            className="w-14 h-14 sm:w-16 sm:h-16 relative"
            style={{
              transformStyle: 'preserve-3d',
              transform: `rotateX(${rotation[0]}deg) rotateY(${rotation[1]}deg)`,
              transition: rollingActive ? 'none' : 'transform 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            }}
          >
            {/* 6 Cube Faces */}
            {/* Face 1: Front */}
            <DiceFace faceNumber={1} transform="translateZ(28px) sm:translateZ(32px)" />
            {/* Face 2: Top */}
            <DiceFace faceNumber={2} transform="rotateX(90deg) translateZ(28px) sm:translateZ(32px)" />
            {/* Face 3: Right */}
            <DiceFace faceNumber={3} transform="rotateY(90deg) translateZ(28px) sm:translateZ(32px)" />
            {/* Face 4: Left */}
            <DiceFace faceNumber={4} transform="rotateY(-90deg) translateZ(28px) sm:translateZ(32px)" />
            {/* Face 5: Bottom */}
            <DiceFace faceNumber={5} transform="rotateX(-90deg) translateZ(28px) sm:translateZ(32px)" />
            {/* Face 6: Back */}
            <DiceFace faceNumber={6} transform="rotateX(180deg) translateZ(28px) sm:translateZ(32px)" />
          </div>

          {/* "ROLL!" Action Badge */}
          {canRoll && !rollingActive && (
            <span className="absolute -top-3 -right-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-black tracking-wider px-2.5 py-0.5 rounded-full shadow-lg shadow-purple-500/50 animate-bounce">
              ROLL!
            </span>
          )}
        </button>
      </div>

      {/* Status Prompt Text */}
      <span className="text-xs font-bold tracking-wide text-slate-300 flex items-center gap-1.5">
        {rollingActive ? (
          <span className="flex items-center gap-1 text-purple-300 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
            Rolling...
          </span>
        ) : canRoll ? (
          <span className="text-emerald-400 font-extrabold animate-pulse">Your Turn • Tap Dice</span>
        ) : value ? (
          <span className="text-slate-200">
            Rolled <strong className="text-purple-400 text-sm font-black">{value}</strong>
          </span>
        ) : (
          <span className="text-slate-400">Waiting for turn...</span>
        )}
      </span>
    </div>
  );
};
