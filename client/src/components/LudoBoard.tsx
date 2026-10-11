import React from 'react';
import { GameState, PlayerColor, Token } from '../types/index.js';
import {
  CELL_SIZE,
  BOARD_SIZE,
  TRACK_CELLS,
  HOME_PATHS,
  YARD_PEDESTALS,
  getTokenCoordinates,
} from './boardGeometry.js';

interface LudoBoardProps {
  gameState: GameState;
  myColor?: PlayerColor;
  onTokenClick: (tokenId: number) => void;
}

const COLOR_MAP: Record<PlayerColor, { main: string; dark: string; light: string; border: string; glow: string }> = {
  red: { main: '#EF4444', dark: '#B91C1C', light: '#FCA5A5', border: '#DC2626', glow: 'rgba(239, 68, 68, 0.7)' },
  green: { main: '#10B981', dark: '#047857', light: '#6EE7B7', border: '#059669', glow: 'rgba(16, 185, 129, 0.7)' },
  yellow: { main: '#F59E0B', dark: '#B45309', light: '#FCD34D', border: '#D97706', glow: 'rgba(245, 158, 11, 0.7)' },
  blue: { main: '#3B82F6', dark: '#1D4ED8', light: '#93C5FD', border: '#2563EB', glow: 'rgba(59, 130, 246, 0.7)' },
};

// Safe squares indexes in TRACK_CELLS: 4 starts + 4 stars
const STAR_INDICES = [8, 21, 34, 47];
const START_INDICES: Record<number, PlayerColor> = {
  0: 'red',
  13: 'green',
  26: 'yellow',
  39: 'blue',
};

export const LudoBoard: React.FC<LudoBoardProps> = ({ gameState, myColor, onTokenClick }) => {
  const isMyTurn = gameState.status === 'in_progress' && (myColor ? gameState.currentTurn === myColor : true);
  const activeColor = gameState.currentTurn;

  // Flatten and group all tokens to compute multi-token offset clustering on same square
  const allTokens: Token[] = [];
  (['red', 'green', 'yellow', 'blue'] as PlayerColor[]).forEach(color => {
    if (gameState.tokens[color]) {
      allTokens.push(...gameState.tokens[color]);
    }
  });

  // Calculate clustering on main track
  const trackOccupants: Record<number, Token[]> = {};
  allTokens.forEach(t => {
    if (t.step >= 0 && t.step <= 50) {
      const offsets: Record<PlayerColor, number> = { red: 0, green: 13, yellow: 26, blue: 39 };
      const abs = (offsets[t.color] + t.step) % 52;
      trackOccupants[abs] = trackOccupants[abs] || [];
      trackOccupants[abs].push(t);
    }
  });

  return (
    <div className="relative flex justify-center items-center select-none w-full max-w-[560px] mx-auto p-2">
      <svg
        viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`}
        className="w-full h-auto drop-shadow-2xl rounded-2xl overflow-hidden border-4 border-slate-800 bg-slate-900"
        style={{ aspectRatio: '1 / 1' }}
      >
        <defs>
          {/* Base Yard Gradients */}
          <linearGradient id="grad-red" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F87171" />
            <stop offset="100%" stopColor="#DC2626" />
          </linearGradient>
          <linearGradient id="grad-green" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="grad-yellow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FBBF24" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
          <linearGradient id="grad-blue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>

          {/* Token 3D Gradients */}
          <radialGradient id="token-red" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FCA5A5" />
            <stop offset="60%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#991B1B" />
          </radialGradient>
          <radialGradient id="token-green" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#A7F3D0" />
            <stop offset="60%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#065F46" />
          </radialGradient>
          <radialGradient id="token-yellow" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="60%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#92400E" />
          </radialGradient>
          <radialGradient id="token-blue" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#BFDBFE" />
            <stop offset="60%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1E40AF" />
          </radialGradient>

          {/* Filter for glowing eligible tokens */}
          <filter id="glow-filter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Board Background */}
        <rect width={BOARD_SIZE} height={BOARD_SIZE} fill="#0F172A" />

        {/* 1. YARD BASES (6x6 cells each = 240x240 px) */}
        {/* Red Yard (Top-Left) */}
        <g id="yard-red">
          <rect x={0} y={0} width={240} height={240} fill="url(#grad-red)" />
          <rect x={30} y={30} width={180} height={180} rx={16} fill="#1E293B" stroke="#DC2626" strokeWidth={3} />
          {YARD_PEDESTALS.red.map((p, i) => (
            <circle
              key={i}
              cx={p.col * CELL_SIZE + CELL_SIZE / 2}
              cy={p.row * CELL_SIZE + CELL_SIZE / 2}
              r={20}
              fill="#0F172A"
              stroke="#EF4444"
              strokeWidth={2}
            />
          ))}
          <text x={120} y={125} fill="#EF4444" fontSize={16} fontWeight="bold" textAnchor="middle" opacity={0.6}>
            RED
          </text>
        </g>

        {/* Green Yard (Top-Right) */}
        <g id="yard-green">
          <rect x={360} y={0} width={240} height={240} fill="url(#grad-green)" />
          <rect x={390} y={30} width={180} height={180} rx={16} fill="#1E293B" stroke="#059669" strokeWidth={3} />
          {YARD_PEDESTALS.green.map((p, i) => (
            <circle
              key={i}
              cx={p.col * CELL_SIZE + CELL_SIZE / 2}
              cy={p.row * CELL_SIZE + CELL_SIZE / 2}
              r={20}
              fill="#0F172A"
              stroke="#10B981"
              strokeWidth={2}
            />
          ))}
          <text x={480} y={125} fill="#10B981" fontSize={16} fontWeight="bold" textAnchor="middle" opacity={0.6}>
            GREEN
          </text>
        </g>

        {/* Yellow Yard (Bottom-Right) */}
        <g id="yard-yellow">
          <rect x={360} y={360} width={240} height={240} fill="url(#grad-yellow)" />
          <rect x={390} y={390} width={180} height={180} rx={16} fill="#1E293B" stroke="#D97706" strokeWidth={3} />
          {YARD_PEDESTALS.yellow.map((p, i) => (
            <circle
              key={i}
              cx={p.col * CELL_SIZE + CELL_SIZE / 2}
              cy={p.row * CELL_SIZE + CELL_SIZE / 2}
              r={20}
              fill="#0F172A"
              stroke="#F59E0B"
              strokeWidth={2}
            />
          ))}
          <text x={480} y={485} fill="#F59E0B" fontSize={16} fontWeight="bold" textAnchor="middle" opacity={0.6}>
            YELLOW
          </text>
        </g>

        {/* Blue Yard (Bottom-Left) */}
        <g id="yard-blue">
          <rect x={0} y={360} width={240} height={240} fill="url(#grad-blue)" />
          <rect x={30} y={390} width={180} height={180} rx={16} fill="#1E293B" stroke="#2563EB" strokeWidth={3} />
          {YARD_PEDESTALS.blue.map((p, i) => (
            <circle
              key={i}
              cx={p.col * CELL_SIZE + CELL_SIZE / 2}
              cy={p.row * CELL_SIZE + CELL_SIZE / 2}
              r={20}
              fill="#0F172A"
              stroke="#3B82F6"
              strokeWidth={2}
            />
          ))}
          <text x={120} y={485} fill="#3B82F6" fontSize={16} fontWeight="bold" textAnchor="middle" opacity={0.6}>
            BLUE
          </text>
        </g>

        {/* 2. MAIN 52-CELL TRACK */}
        {TRACK_CELLS.map((cell, idx) => {
          const isStart = START_INDICES[idx];
          const isStar = STAR_INDICES.includes(idx);
          const cellColor = isStart ? COLOR_MAP[isStart].main : '#1E293B';
          const strokeColor = '#334155';

          return (
            <g key={`track-${idx}`}>
              <rect
                x={cell.col * CELL_SIZE}
                y={cell.row * CELL_SIZE}
                width={CELL_SIZE}
                height={CELL_SIZE}
                fill={cellColor}
                stroke={strokeColor}
                strokeWidth={1}
                rx={4}
              />
              {/* Star on safe cells */}
              {isStar && (
                <text
                  x={cell.col * CELL_SIZE + CELL_SIZE / 2}
                  y={cell.row * CELL_SIZE + CELL_SIZE / 2 + 5}
                  fontSize={18}
                  fill="#FCD34D"
                  textAnchor="middle"
                >
                  ★
                </text>
              )}
              {/* Start square indicator */}
              {isStart && !isStar && (
                <text
                  x={cell.col * CELL_SIZE + CELL_SIZE / 2}
                  y={cell.row * CELL_SIZE + CELL_SIZE / 2 + 5}
                  fontSize={14}
                  fill="#FFFFFF"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  ▶
                </text>
              )}
            </g>
          );
        })}

        {/* 3. HOME PATH CORRIDORS (steps 51..55) */}
        {(['red', 'green', 'yellow', 'blue'] as PlayerColor[]).map(color => (
          <g key={`home-path-${color}`}>
            {HOME_PATHS[color].map((cell, idx) => (
              <rect
                key={idx}
                x={cell.col * CELL_SIZE}
                y={cell.row * CELL_SIZE}
                width={CELL_SIZE}
                height={CELL_SIZE}
                fill={COLOR_MAP[color].main}
                stroke="#0F172A"
                strokeWidth={1.5}
                rx={4}
              />
            ))}
          </g>
        ))}

        {/* 4. CENTER HOME TRIANGLES */}
        {/* Red Home Triangle (pointing right) */}
        <polygon points="240,240 240,360 300,300" fill={COLOR_MAP.red.main} />
        {/* Green Home Triangle (pointing down) */}
        <polygon points="240,240 360,240 300,300" fill={COLOR_MAP.green.main} />
        {/* Yellow Home Triangle (pointing left) */}
        <polygon points="360,240 360,360 300,300" fill={COLOR_MAP.yellow.main} />
        {/* Blue Home Triangle (pointing up) */}
        <polygon points="240,360 360,360 300,300" fill={COLOR_MAP.blue.main} />

        {/* Center Golden Star / Crown Emblem */}
        <circle cx={300} cy={300} r={22} fill="#0F172A" stroke="#F59E0B" strokeWidth={2.5} />
        <text x={300} y={306} fontSize={18} fill="#FCD34D" textAnchor="middle">
          👑
        </text>

        {/* 5. TOKENS LAYER */}
        {(['red', 'green', 'yellow', 'blue'] as PlayerColor[]).map(color => {
          const tokens = gameState.tokens[color] || [];

          return tokens.map(token => {
            const coords = getTokenCoordinates(color, token.step, token.id);
            const isEligible = isMyTurn && activeColor === color && gameState.validMoves.includes(token.id);

            // Compute offset if multiple tokens share the same track square
            let offsetX = 0;
            let offsetY = 0;
            if (token.step >= 0 && token.step <= 50) {
              const offsets: Record<PlayerColor, number> = { red: 0, green: 13, yellow: 26, blue: 39 };
              const abs = (offsets[color] + token.step) % 52;
              const occupants = trackOccupants[abs] || [];
              if (occupants.length > 1) {
                const occupantIndex = occupants.findIndex(t => t.color === color && t.id === token.id);
                if (occupantIndex === 1) { offsetX = 7; offsetY = -7; }
                else if (occupantIndex === 2) { offsetX = -7; offsetY = 7; }
                else if (occupantIndex === 3) { offsetX = 7; offsetY = 7; }
                else { offsetX = -7; offsetY = -7; }
              }
            }

            const posX = coords.x + offsetX;
            const posY = coords.y + offsetY;

            return (
              <g
                key={`${color}-${token.id}`}
                onClick={() => isEligible && onTokenClick(token.id)}
                className={`transition-all duration-300 ${isEligible ? 'cursor-pointer' : ''}`}
                style={{ transformOrigin: `${posX}px ${posY}px` }}
              >
                {/* Eligible Active Glow Ring */}
                {isEligible && (
                  <circle
                    cx={posX}
                    cy={posY}
                    r={19}
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth={3}
                    className="animate-ping opacity-75"
                  />
                )}

                {/* Outer Shadow Ring */}
                <circle cx={posX} cy={posY + 2} r={15} fill="rgba(0, 0, 0, 0.45)" />

                {/* Main 3D Token Body */}
                <circle
                  cx={posX}
                  cy={posY}
                  r={15}
                  fill={`url(#token-${color})`}
                  stroke={isEligible ? '#FFFFFF' : COLOR_MAP[color].border}
                  strokeWidth={isEligible ? 2.5 : 1.5}
                />

                {/* Inner Decorative Bevel Ring */}
                <circle cx={posX} cy={posY} r={8} fill="none" stroke="rgba(255, 255, 255, 0.55)" strokeWidth={1.5} />

                {/* Center Core Dot or Token ID */}
                <circle cx={posX} cy={posY} r={3} fill="#FFFFFF" />

                {/* Token Label for easy accessibility */}
                <title>{`${color.toUpperCase()} Token ${token.id + 1} (Step: ${token.step === -1 ? 'Yard' : token.step === 56 ? 'Home' : token.step})`}</title>
              </g>
            );
          });
        })}
      </svg>
    </div>
  );
};
