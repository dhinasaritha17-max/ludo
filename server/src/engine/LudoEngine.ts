import crypto from 'crypto';
import { PlayerColor, GameMode, Token, GameState, GameMove, Player } from '../types/index.js';

export const TRACK_LENGTH = 52;
export const HOME_GOAL_STEP = 56;

export const COLOR_START_OFFSETS: Record<PlayerColor, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

// 8 safe squares on standard Ludo board: 4 starts + 4 stars
export const SAFE_SQUARES: number[] = [0, 8, 13, 21, 26, 34, 39, 47];

export class LudoEngine {
  /**
   * Generates a cryptographically secure dice roll from 1 to 6.
   */
  public static rollDice(): number {
    return crypto.randomInt(1, 7);
  }

  /**
   * Initializes a fresh game state.
   */
  public static createInitialState(
    roomId: string,
    roomCode: string,
    mode: GameMode,
    players: Record<PlayerColor, Player | null>,
    turnTimeoutSeconds = 15
  ): GameState {
    const turnOrder: PlayerColor[] = mode === '2p' ? ['red', 'yellow'] : ['red', 'green', 'yellow', 'blue'];

    const tokens: Record<PlayerColor, Token[]> = {
      red: [0, 1, 2, 3].map(id => ({ id, color: 'red', step: -1 })),
      green: [0, 1, 2, 3].map(id => ({ id, color: 'green', step: -1 })),
      yellow: [0, 1, 2, 3].map(id => ({ id, color: 'yellow', step: -1 })),
      blue: [0, 1, 2, 3].map(id => ({ id, color: 'blue', step: -1 })),
    };

    return {
      roomId,
      roomCode,
      mode,
      status: 'in_progress',
      players,
      turnOrder,
      currentTurn: turnOrder[0],
      diceValue: null,
      hasRolled: false,
      consecutiveSixes: 0,
      tokens,
      validMoves: [],
      winner: null,
      rankings: [],
      turnDeadline: Date.now() + turnTimeoutSeconds * 1000,
      lastAction: {
        type: 'game_start',
        description: 'Match started! Red rolls first.',
        timestamp: Date.now(),
      },
      turnTimeoutSeconds,
    };
  }

  /**
   * Converts a token's relative step to the absolute board track index (0..51).
   * Returns -1 if the token is in yard (-1), home stretch (51..55), or goal (56).
   */
  public static getAbsoluteTrackPosition(color: PlayerColor, step: number): number {
    if (step < 0 || step > 50) return -1;
    return (COLOR_START_OFFSETS[color] + step) % TRACK_LENGTH;
  }

  /**
   * Computes the list of valid token IDs (0..3) for the active player given the current dice value.
   */
  public static getValidMoves(state: GameState): number[] {
    if (!state.hasRolled || state.diceValue === null) return [];

    const activeTokens = state.tokens[state.currentTurn];
    const valid: number[] = [];

    for (const token of activeTokens) {
      if (token.step === HOME_GOAL_STEP) {
        // Token is already finished
        continue;
      }

      if (token.step === -1) {
        // Needs a 6 to leave yard
        if (state.diceValue === 6) {
          valid.push(token.id);
        }
      } else {
        // On track or home path: must not overshoot home goal
        const targetStep = token.step + state.diceValue;
        if (targetStep <= HOME_GOAL_STEP) {
          valid.push(token.id);
        }
      }
    }

    return valid;
  }

  /**
   * Applies a dice roll to the game state.
   */
  public static handleDiceRoll(state: GameState, forcedRoll?: number): { state: GameState; autoAdvanced: boolean } {
    if (state.hasRolled || state.status !== 'in_progress') {
      return { state, autoAdvanced: false };
    }

    const roll = forcedRoll ?? this.rollDice();
    const consecutiveSixes = roll === 6 ? state.consecutiveSixes + 1 : 0;

    // Check consecutive 3 sixes penalty
    if (consecutiveSixes === 3) {
      // 3 sixes in a row forfeit the turn!
      const nextTurn = this.getNextTurn(state.turnOrder, state.currentTurn, state.rankings);
      state = {
        ...state,
        diceValue: roll,
        hasRolled: true,
        consecutiveSixes: 0,
        validMoves: [],
        currentTurn: nextTurn,
        turnDeadline: Date.now() + state.turnTimeoutSeconds * 1000,
        lastAction: {
          type: 'penalty_three_sixes',
          description: `${this.capitalize(state.currentTurn)} rolled 3 consecutive sixes! Turn passed to ${this.capitalize(nextTurn)}.`,
          timestamp: Date.now(),
        },
      };
      return { state, autoAdvanced: true };
    }

    state = {
      ...state,
      diceValue: roll,
      hasRolled: true,
      consecutiveSixes,
      turnDeadline: Date.now() + state.turnTimeoutSeconds * 1000,
      lastAction: {
        type: 'dice_rolled',
        description: `${this.capitalize(state.currentTurn)} rolled a ${roll}!`,
        timestamp: Date.now(),
      },
    };

    const validMoves = this.getValidMoves(state);
    state.validMoves = validMoves;

    // If no valid moves exist, auto-advance turn
    if (validMoves.length === 0) {
      const nextTurn = this.getNextTurn(state.turnOrder, state.currentTurn, state.rankings);
      state = {
        ...state,
        hasRolled: false,
        diceValue: roll,
        currentTurn: nextTurn,
        consecutiveSixes: 0,
        validMoves: [],
        turnDeadline: Date.now() + state.turnTimeoutSeconds * 1000,
        lastAction: {
          type: 'no_moves',
          description: `${this.capitalize(state.currentTurn)} rolled ${roll} but has no legal moves. Passing turn to ${this.capitalize(nextTurn)}.`,
          timestamp: Date.now(),
        },
      };
      return { state, autoAdvanced: true };
    }

    return { state, autoAdvanced: false };
  }

  /**
   * Executes a move for the specified token ID.
   */
  public static handleMoveToken(
    state: GameState,
    tokenId: number
  ): { state: GameState; moveResult: GameMove | null; error?: string } {
    if (!state.hasRolled || state.diceValue === null) {
      return { state, moveResult: null, error: 'Must roll dice before moving' };
    }

    if (!state.validMoves.includes(tokenId)) {
      return { state, moveResult: null, error: 'Illegal token move' };
    }

    const playerColor = state.currentTurn;
    const tokens = { ...state.tokens };
    const playerTokens = [...tokens[playerColor]];
    const tokenIndex = playerTokens.findIndex(t => t.id === tokenId);
    const token = { ...playerTokens[tokenIndex] };

    const fromStep = token.step;
    let toStep = fromStep;

    if (fromStep === -1) {
      toStep = 0; // Exits yard to start square
    } else {
      toStep = fromStep + state.diceValue;
    }

    token.step = toStep;
    playerTokens[tokenIndex] = token;
    tokens[playerColor] = playerTokens;

    let capturedToken: { color: PlayerColor; tokenId: number } | undefined = undefined;
    let bonusTurnAwarded = false;
    let reachedHome = false;

    // Check Home Reach
    if (toStep === HOME_GOAL_STEP) {
      reachedHome = true;
      bonusTurnAwarded = true; // Bonus turn for entering home
    }

    // Check Capture on main track
    if (toStep >= 0 && toStep <= 50) {
      const destAbs = this.getAbsoluteTrackPosition(playerColor, toStep);
      const isSafe = SAFE_SQUARES.includes(destAbs);

      if (!isSafe) {
        // Check for opponent tokens at destAbs
        for (const otherColor of state.turnOrder) {
          if (otherColor === playerColor) continue;

          const otherTokens = [...tokens[otherColor]];
          let otherChanged = false;

          for (let i = 0; i < otherTokens.length; i++) {
            const opToken = otherTokens[i];
            if (opToken.step >= 0 && opToken.step <= 50) {
              const opAbs = this.getAbsoluteTrackPosition(otherColor, opToken.step);
              if (opAbs === destAbs) {
                // CAPTURE!
                otherTokens[i] = { ...opToken, step: -1 };
                capturedToken = { color: otherColor, tokenId: opToken.id };
                bonusTurnAwarded = true;
                otherChanged = true;
                break; // In standard Ludo, one capture triggers at a time
              }
            }
          }

          if (otherChanged) {
            tokens[otherColor] = otherTokens;
            break;
          }
        }
      }
    }

    // Check if rolled a 6 (also awards bonus turn)
    if (state.diceValue === 6) {
      bonusTurnAwarded = true;
    }

    // Check player victory condition (all 4 tokens reached home goal)
    const allHome = playerTokens.every(t => t.step === HOME_GOAL_STEP);
    const updatedRankings = [...state.rankings];
    let newWinner = state.winner;
    let isGameOver = false;

    if (allHome && !updatedRankings.includes(playerColor)) {
      updatedRankings.push(playerColor);
      if (!newWinner) {
        newWinner = playerColor;
      }
      // If 2P mode or only 1 player remains without finishing, game ends
      const activeUnfinished = state.turnOrder.filter(c => !updatedRankings.includes(c));
      if (activeUnfinished.length <= 1) {
        if (activeUnfinished.length === 1) {
          updatedRankings.push(activeUnfinished[0]);
        }
        isGameOver = true;
      }
    }

    const moveResult: GameMove = {
      playerColor,
      tokenId,
      fromStep,
      toStep,
      diceValue: state.diceValue,
      capturedToken,
      reachedHome,
      bonusTurnAwarded,
      timestamp: Date.now(),
    };

    let nextTurn = state.currentTurn;
    let actionDesc = `${this.capitalize(playerColor)} moved token ${tokenId + 1} to step ${toStep}.`;

    if (capturedToken) {
      actionDesc = `💥 ${this.capitalize(playerColor)} captured ${this.capitalize(capturedToken.color)}'s token and earned a bonus turn!`;
    } else if (reachedHome) {
      actionDesc = `🏆 ${this.capitalize(playerColor)} brought a token home! Earned a bonus turn!`;
    } else if (state.diceValue === 6) {
      actionDesc = `🎲 ${this.capitalize(playerColor)} rolled a 6 and earned a bonus turn!`;
    }

    if (!bonusTurnAwarded || allHome) {
      nextTurn = this.getNextTurn(state.turnOrder, state.currentTurn, updatedRankings);
      state.consecutiveSixes = 0;
    }

    const nextState: GameState = {
      ...state,
      tokens,
      hasRolled: false,
      diceValue: null,
      validMoves: [],
      currentTurn: isGameOver ? state.currentTurn : nextTurn,
      status: isGameOver ? 'completed' : 'in_progress',
      winner: newWinner,
      rankings: updatedRankings,
      turnDeadline: Date.now() + state.turnTimeoutSeconds * 1000,
      lastAction: {
        type: 'token_moved',
        description: actionDesc,
        timestamp: Date.now(),
      },
    };

    return { state: nextState, moveResult };
  }

  /**
   * Advances turn order, skipping players who have already finished all tokens.
   */
  public static getNextTurn(
    turnOrder: PlayerColor[],
    currentTurn: PlayerColor,
    rankings: PlayerColor[]
  ): PlayerColor {
    const currentIndex = turnOrder.indexOf(currentTurn);
    for (let i = 1; i <= turnOrder.length; i++) {
      const candidate = turnOrder[(currentIndex + i) % turnOrder.length];
      if (!rankings.includes(candidate)) {
        return candidate;
      }
    }
    return currentTurn;
  }

  /**
   * Smart AI decision engine: selects the best legal token to move.
   * Priority:
   * 1. Winning move (reach home goal step 56)
   * 2. Capture an opponent's token
   * 3. Exit yard to track on a 6
   * 4. Escape an active capture threat on an unsafe square
   * 5. Enter the protected home stretch (steps 51..55)
   * 6. Advance token closest to home
   * 7. Any legal fallback
   */
  public static chooseBestMove(state: GameState): number | null {
    const validMoves = state.validMoves;
    if (validMoves.length === 0 || state.diceValue === null) return null;
    if (validMoves.length === 1) return validMoves[0];

    const color = state.currentTurn;
    const tokens = state.tokens[color];
    const dice = state.diceValue;

    let bestMove = validMoves[0];
    let highestScore = -Infinity;

    for (const tokenId of validMoves) {
      const token = tokens.find(t => t.id === tokenId)!;
      let score = 0;

      const fromStep = token.step;
      const toStep = fromStep === -1 ? 0 : fromStep + dice;

      // 1. Winning token reaches goal: +1000 pts
      if (toStep === HOME_GOAL_STEP) {
        score += 1000;
      }

      // 2. Capture an opponent: +600 pts
      if (toStep >= 0 && toStep <= 50) {
        const destAbs = this.getAbsoluteTrackPosition(color, toStep);
        if (!SAFE_SQUARES.includes(destAbs)) {
          for (const opColor of state.turnOrder) {
            if (opColor === color) continue;
            for (const opToken of state.tokens[opColor]) {
              if (opToken.step >= 0 && opToken.step <= 50) {
                if (this.getAbsoluteTrackPosition(opColor, opToken.step) === destAbs) {
                  score += 600;
                  break;
                }
              }
            }
          }
        }
      }

      // 3. Exit yard to start square: +400 pts
      if (fromStep === -1 && toStep === 0) {
        score += 400;
      }

      // 4. Enter safe square or home stretch: +200 pts
      if (toStep > 50) {
        score += 250;
      } else {
        const destAbs = this.getAbsoluteTrackPosition(color, toStep);
        if (SAFE_SQUARES.includes(destAbs)) {
          score += 200;
        }
      }

      // 5. Escape danger (if current square is unsafe and opponent is behind us within 1..6 squares)
      if (fromStep >= 0 && fromStep <= 50) {
        const currAbs = this.getAbsoluteTrackPosition(color, fromStep);
        if (!SAFE_SQUARES.includes(currAbs)) {
          for (const opColor of state.turnOrder) {
            if (opColor === color) continue;
            for (const opToken of state.tokens[opColor]) {
              if (opToken.step >= 0 && opToken.step <= 50) {
                const opAbs = this.getAbsoluteTrackPosition(opColor, opToken.step);
                const dist = (currAbs - opAbs + TRACK_LENGTH) % TRACK_LENGTH;
                if (dist >= 1 && dist <= 6) {
                  score += 180; // Escaping danger is urgent
                  break;
                }
              }
            }
          }
        }
      }

      // 6. Prefer moving tokens further along the track
      score += toStep * 2;

      if (score > highestScore) {
        highestScore = score;
        bestMove = tokenId;
      }
    }

    return bestMove;
  }

  private static capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
