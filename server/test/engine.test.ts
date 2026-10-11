import { describe, it } from 'node:test';
import assert from 'node:assert';
import { LudoEngine, HOME_GOAL_STEP, SAFE_SQUARES } from '../src/engine/LudoEngine.js';
import { Player, PlayerColor } from '../src/types/index.js';

function createMockPlayers(): Record<PlayerColor, Player | null> {
  return {
    red: { id: 'p1', name: 'Alice', avatar: 'avatar1', color: 'red', isHost: true, isBot: false, isConnected: true, ready: true },
    green: { id: 'p2', name: 'Bob', avatar: 'avatar2', color: 'green', isHost: false, isBot: false, isConnected: true, ready: true },
    yellow: { id: 'p3', name: 'Charlie', avatar: 'avatar3', color: 'yellow', isHost: false, isBot: true, isConnected: true, ready: true },
    blue: { id: 'p4', name: 'Diana', avatar: 'avatar4', color: 'blue', isHost: false, isBot: true, isConnected: true, ready: true },
  };
}

describe('LudoEngine Core Rules', () => {
  it('should initialize game state with all tokens in yard (-1)', () => {
    const players = createMockPlayers();
    const state = LudoEngine.createInitialState('room1', 'CODE12', '4p', players);

    assert.strictEqual(state.status, 'in_progress');
    assert.strictEqual(state.currentTurn, 'red');
    assert.strictEqual(state.hasRolled, false);
    assert.strictEqual(state.diceValue, null);

    for (const color of ['red', 'green', 'yellow', 'blue'] as PlayerColor[]) {
      assert.strictEqual(state.tokens[color].length, 4);
      for (const t of state.tokens[color]) {
        assert.strictEqual(t.step, -1);
      }
    }
  });

  it('should require a 6 to exit the yard', () => {
    const players = createMockPlayers();
    let state = LudoEngine.createInitialState('room1', 'CODE12', '4p', players);

    // Roll a 4 - no tokens can move out of yard
    const roll4 = LudoEngine.handleDiceRoll(state, 4);
    assert.strictEqual(roll4.autoAdvanced, true); // Auto-advanced turn since 0 moves
    assert.strictEqual(roll4.state.currentTurn, 'green'); // Passed to Green!

    // Reset turn to Red for testing a 6 roll
    state = { ...state, currentTurn: 'red', hasRolled: false, diceValue: null };
    const roll6 = LudoEngine.handleDiceRoll(state, 6);
    assert.strictEqual(roll6.autoAdvanced, false);
    assert.deepStrictEqual(roll6.state.validMoves, [0, 1, 2, 3]);

    // Move token 0 out of yard
    const moveRes = LudoEngine.handleMoveToken(roll6.state, 0);
    assert.strictEqual(moveRes.error, undefined);
    assert.strictEqual(moveRes.state.tokens.red[0].step, 0);
    // Rolling a 6 awards a bonus turn, so currentTurn remains red!
    assert.strictEqual(moveRes.state.currentTurn, 'red');
  });

  it('should correctly capture an opponent token on non-safe square and award bonus turn', () => {
    const players = createMockPlayers();
    let state = LudoEngine.createInitialState('room1', 'CODE12', '4p', players);

    // Position Green's token at absolute square 14 (Green start is 13, relative step 1 = abs 14)
    state.tokens.green[0].step = 1; // Green relative step 1 is abs track pos 14
    // Position Red's token at relative step 10 (abs track 10)
    state.tokens.red[0].step = 10;
    state.currentTurn = 'red';

    // Red rolls a 4 (10 + 4 = 14)
    const rollRes = LudoEngine.handleDiceRoll(state, 4);
    assert.strictEqual(rollRes.autoAdvanced, false);
    assert.ok(rollRes.state.validMoves.includes(0));

    // Execute move
    const moveRes = LudoEngine.handleMoveToken(rollRes.state, 0);
    assert.strictEqual(moveRes.error, undefined);
    assert.strictEqual(moveRes.state.tokens.red[0].step, 14);
    // Green's token should be captured back to yard (-1)
    assert.strictEqual(moveRes.state.tokens.green[0].step, -1);
    assert.ok(moveRes.moveResult?.capturedToken);
    assert.strictEqual(moveRes.moveResult.capturedToken?.color, 'green');
    // Capturing awards a bonus turn!
    assert.strictEqual(moveRes.state.currentTurn, 'red');
  });

  it('should NOT capture opponent token on safe squares (e.g., star at abs 8)', () => {
    const players = createMockPlayers();
    let state = LudoEngine.createInitialState('room1', 'CODE12', '4p', players);

    // Star square at abs 8 is safe
    assert.ok(SAFE_SQUARES.includes(8));

    // Blue at step 21: (39 + 21) % 52 = 60 % 52 = 8
    state.tokens.blue[0].step = 21;
    // Red at relative step 5, rolls 3 -> relative step 8
    state.tokens.red[0].step = 5;
    state.currentTurn = 'red';

    const rollRes = LudoEngine.handleDiceRoll(state, 3);
    const moveRes = LudoEngine.handleMoveToken(rollRes.state, 0);

    assert.strictEqual(moveRes.state.tokens.red[0].step, 8);
    // Blue token is safe and must NOT be captured!
    assert.strictEqual(moveRes.state.tokens.blue[0].step, 21);
    assert.strictEqual(moveRes.moveResult?.capturedToken, undefined);
  });

  it('should require exact roll to reach home goal (step 56) and reject overshoots', () => {
    const players = createMockPlayers();
    let state = LudoEngine.createInitialState('room1', 'CODE12', '4p', players);

    // Red token at step 54 (needs exactly 2 to reach 56)
    state.tokens.red[0].step = 54;
    state.currentTurn = 'red';

    // Roll a 3 (54 + 3 = 57 > 56, illegal overshoot)
    const roll3 = LudoEngine.handleDiceRoll(state, 3);
    assert.ok(!roll3.state.validMoves.includes(0));

    // Reset and roll exact 2
    state = { ...state, currentTurn: 'red', hasRolled: false, diceValue: null };
    const roll2 = LudoEngine.handleDiceRoll(state, 2);
    assert.ok(roll2.state.validMoves.includes(0));

    const moveRes = LudoEngine.handleMoveToken(roll2.state, 0);
    assert.strictEqual(moveRes.state.tokens.red[0].step, HOME_GOAL_STEP);
    assert.strictEqual(moveRes.moveResult?.reachedHome, true);
    // Entering home awards bonus turn!
    assert.strictEqual(moveRes.state.currentTurn, 'red');
  });

  it('should penalize 3 consecutive sixes by forfeiting the turn', () => {
    const players = createMockPlayers();
    let state = LudoEngine.createInitialState('room1', 'CODE12', '4p', players);
    state.tokens.red[0].step = 10;
    state.currentTurn = 'red';

    // 1st six
    state = LudoEngine.handleDiceRoll(state, 6).state;
    state = LudoEngine.handleMoveToken(state, 0).state;
    assert.strictEqual(state.currentTurn, 'red');
    assert.strictEqual(state.consecutiveSixes, 1);

    // 2nd six
    state = LudoEngine.handleDiceRoll(state, 6).state;
    state = LudoEngine.handleMoveToken(state, 0).state;
    assert.strictEqual(state.currentTurn, 'red');
    assert.strictEqual(state.consecutiveSixes, 2);

    // 3rd six
    const roll3 = LudoEngine.handleDiceRoll(state, 6);
    assert.strictEqual(roll3.autoAdvanced, true);
    assert.strictEqual(roll3.state.currentTurn, 'green'); // Turn forfeited to next player!
    assert.strictEqual(roll3.state.consecutiveSixes, 0);
  });
});
