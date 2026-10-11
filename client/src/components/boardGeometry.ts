import { PlayerColor } from '../types/index.js';

export interface GridPos {
  row: number;
  col: number;
}

export const CELL_SIZE = 40;
export const BOARD_SIZE = 600;

// The 52 track squares in absolute order (0..51)
export const TRACK_CELLS: GridPos[] = [
  /* 0 - Red Start */ { row: 6, col: 1 },
  /* 1 */ { row: 6, col: 2 },
  /* 2 */ { row: 6, col: 3 },
  /* 3 */ { row: 6, col: 4 },
  /* 4 */ { row: 6, col: 5 },
  /* 5 */ { row: 5, col: 6 },
  /* 6 */ { row: 4, col: 6 },
  /* 7 */ { row: 3, col: 6 },
  /* 8 - Star */ { row: 2, col: 6 },
  /* 9 */ { row: 1, col: 6 },
  /* 10 */ { row: 0, col: 6 },
  /* 11 */ { row: 0, col: 7 },
  /* 12 */ { row: 0, col: 8 },
  /* 13 - Green Start */ { row: 1, col: 8 },
  /* 14 */ { row: 2, col: 8 },
  /* 15 */ { row: 3, col: 8 },
  /* 16 */ { row: 4, col: 8 },
  /* 17 */ { row: 5, col: 8 },
  /* 18 */ { row: 6, col: 9 },
  /* 19 */ { row: 6, col: 10 },
  /* 20 */ { row: 6, col: 11 },
  /* 21 - Star */ { row: 6, col: 12 },
  /* 22 */ { row: 6, col: 13 },
  /* 23 */ { row: 6, col: 14 },
  /* 24 */ { row: 7, col: 14 },
  /* 25 */ { row: 8, col: 14 },
  /* 26 - Yellow Start */ { row: 8, col: 13 },
  /* 27 */ { row: 8, col: 12 },
  /* 28 */ { row: 8, col: 11 },
  /* 29 */ { row: 8, col: 10 },
  /* 30 */ { row: 8, col: 9 },
  /* 31 */ { row: 9, col: 8 },
  /* 32 */ { row: 10, col: 8 },
  /* 33 */ { row: 11, col: 8 },
  /* 34 - Star */ { row: 12, col: 8 },
  /* 35 */ { row: 13, col: 8 },
  /* 36 */ { row: 14, col: 8 },
  /* 37 */ { row: 14, col: 7 },
  /* 38 */ { row: 14, col: 6 },
  /* 39 - Blue Start */ { row: 13, col: 6 },
  /* 40 */ { row: 12, col: 6 },
  /* 41 */ { row: 11, col: 6 },
  /* 42 */ { row: 10, col: 6 },
  /* 43 */ { row: 9, col: 6 },
  /* 44 */ { row: 8, col: 5 },
  /* 45 */ { row: 8, col: 4 },
  /* 46 */ { row: 8, col: 3 },
  /* 47 - Star */ { row: 8, col: 2 },
  /* 48 */ { row: 8, col: 1 },
  /* 49 */ { row: 8, col: 0 },
  /* 50 */ { row: 7, col: 0 },
  /* 51 */ { row: 6, col: 0 },
];

// Home paths for each color (steps 51..55)
export const HOME_PATHS: Record<PlayerColor, GridPos[]> = {
  red: [
    { row: 7, col: 1 },
    { row: 7, col: 2 },
    { row: 7, col: 3 },
    { row: 7, col: 4 },
    { row: 7, col: 5 },
  ],
  green: [
    { row: 1, col: 7 },
    { row: 2, col: 7 },
    { row: 3, col: 7 },
    { row: 4, col: 7 },
    { row: 5, col: 7 },
  ],
  yellow: [
    { row: 7, col: 13 },
    { row: 7, col: 12 },
    { row: 7, col: 11 },
    { row: 7, col: 10 },
    { row: 7, col: 9 },
  ],
  blue: [
    { row: 13, col: 7 },
    { row: 12, col: 7 },
    { row: 11, col: 7 },
    { row: 10, col: 7 },
    { row: 9, col: 7 },
  ],
};

// Pedestals in yard bases (tokens at step -1)
export const YARD_PEDESTALS: Record<PlayerColor, GridPos[]> = {
  red: [
    { row: 1.5, col: 1.5 },
    { row: 1.5, col: 3.5 },
    { row: 3.5, col: 1.5 },
    { row: 3.5, col: 3.5 },
  ],
  green: [
    { row: 1.5, col: 10.5 },
    { row: 1.5, col: 12.5 },
    { row: 3.5, col: 10.5 },
    { row: 3.5, col: 12.5 },
  ],
  yellow: [
    { row: 10.5, col: 10.5 },
    { row: 10.5, col: 12.5 },
    { row: 12.5, col: 10.5 },
    { row: 12.5, col: 12.5 },
  ],
  blue: [
    { row: 10.5, col: 1.5 },
    { row: 10.5, col: 3.5 },
    { row: 12.5, col: 1.5 },
    { row: 12.5, col: 3.5 },
  ],
};

// Home goals (tokens at step 56)
export const HOME_GOALS: Record<PlayerColor, GridPos> = {
  red: { row: 7, col: 6.3 },
  green: { row: 6.3, col: 7 },
  yellow: { row: 7, col: 7.7 },
  blue: { row: 7.7, col: 7 },
};

export const COLOR_OFFSETS: Record<PlayerColor, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

/**
 * Returns pixel {x, y} coordinates for a token given its color, step, and token ID.
 */
export function getTokenCoordinates(color: PlayerColor, step: number, tokenId: number): { x: number; y: number } {
  if (step === -1) {
    const pos = YARD_PEDESTALS[color][tokenId];
    return { x: pos.col * CELL_SIZE + CELL_SIZE / 2, y: pos.row * CELL_SIZE + CELL_SIZE / 2 };
  }

  if (step === 56) {
    const pos = HOME_GOALS[color];
    // Slightly offset tokens within the home triangle
    const offsets = [
      { dx: -6, dy: -6 },
      { dx: 6, dy: -6 },
      { dx: -6, dy: 6 },
      { dx: 6, dy: 6 },
    ];
    const off = offsets[tokenId] || { dx: 0, dy: 0 };
    return {
      x: pos.col * CELL_SIZE + CELL_SIZE / 2 + off.dx,
      y: pos.row * CELL_SIZE + CELL_SIZE / 2 + off.dy,
    };
  }

  if (step >= 51 && step <= 55) {
    const pathIndex = step - 51;
    const pos = HOME_PATHS[color][pathIndex];
    return { x: pos.col * CELL_SIZE + CELL_SIZE / 2, y: pos.row * CELL_SIZE + CELL_SIZE / 2 };
  }

  // On main track
  const absIndex = (COLOR_OFFSETS[color] + step) % 52;
  const pos = TRACK_CELLS[absIndex];
  return { x: pos.col * CELL_SIZE + CELL_SIZE / 2, y: pos.row * CELL_SIZE + CELL_SIZE / 2 };
}
