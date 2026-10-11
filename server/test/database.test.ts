import { describe, it } from 'node:test';
import assert from 'node:assert';
import { database } from '../src/db/Database.js';
import { MatchRecord } from '../src/types/index.js';

describe('Database and Player Progression Service', () => {
  it('should initialize and upsert user with starting coins and statistics', () => {
    const testId = `test_player_${Date.now()}`;
    const user = database.upsertUser({
      id: testId,
      username: 'LudoMaster',
      avatar: 'dice-king',
    });

    assert.strictEqual(user.id, testId);
    assert.strictEqual(user.username, 'LudoMaster');
    assert.strictEqual(user.coins, 500);
    assert.strictEqual(user.wins, 0);
    assert.strictEqual(user.gamesPlayed, 0);
    assert.strictEqual(user.level, 1);
  });

  it('should record match and accurately update player coins, XP, and stats without duplicate distortion', () => {
    const p1Id = `winner_${Date.now()}`;
    const p2Id = `runnerup_${Date.now()}`;

    const u1 = database.upsertUser({ id: p1Id, username: 'PlayerOne', coins: 500, xp: 0 });
    const u2 = database.upsertUser({ id: p2Id, username: 'PlayerTwo', coins: 500, xp: 0 });

    const matchId = `match_${Date.now()}`;
    const match: MatchRecord = {
      id: matchId,
      roomId: 'room_123',
      roomCode: 'ABCD',
      mode: '2p',
      winner: 'red',
      winnerId: p1Id,
      winnerName: 'PlayerOne',
      durationSeconds: 180,
      playerIds: [p1Id, p2Id],
      players: [
        { id: p1Id, name: 'PlayerOne', color: 'red', isBot: false, rank: 1 },
        { id: p2Id, name: 'PlayerTwo', color: 'yellow', isBot: false, rank: 2 },
      ],
      turnsCount: 24,
      timestamp: Date.now(),
    };

    database.recordMatch(match);

    const updatedP1 = database.getUser(p1Id);
    const updatedP2 = database.getUser(p2Id);

    assert.ok(updatedP1);
    assert.ok(updatedP2);
    // Winner gains +150 coins, +100 XP, 1 win
    assert.strictEqual(updatedP1.wins, 1);
    assert.strictEqual(updatedP1.gamesPlayed, 1);
    assert.strictEqual(updatedP1.coins, 650);
    assert.strictEqual(updatedP1.xp, 100);

    // Runner-up gains +50 coins, +30 XP, 1 loss
    assert.strictEqual(updatedP2.losses, 1);
    assert.strictEqual(updatedP2.gamesPlayed, 1);
    assert.strictEqual(updatedP2.coins, 550);
    assert.strictEqual(updatedP2.xp, 30);
  });

  it('should generate leaderboard sorted by wins and XP', () => {
    const lb = database.getLeaderboard(10);
    assert.ok(Array.isArray(lb));
    assert.ok(lb.length > 0);

    for (let i = 0; i < lb.length - 1; i++) {
      const current = lb[i];
      const next = lb[i + 1];
      const condition = current.wins > next.wins || (current.wins === next.wins && current.xp >= next.xp);
      assert.ok(condition, `Leaderboard must be sorted descending: #${i + 1} vs #${i + 2}`);
    }
  });

  it('should claim daily reward atomically with cooldown enforcement', () => {
    const testId = `daily_user_${Date.now()}`;
    database.upsertUser({ id: testId, username: 'DailyPlayer', coins: 500, xp: 0 });

    const firstClaim = database.claimDailyReward(testId);
    assert.strictEqual(firstClaim.success, true);
    assert.strictEqual(firstClaim.user?.coins, 700); // 500 + 200
    assert.strictEqual(firstClaim.user?.xp, 150);

    // Attempting to claim again immediately should be rejected
    const secondClaim = database.claimDailyReward(testId);
    assert.strictEqual(secondClaim.success, false);
    assert.ok(secondClaim.error?.includes('hours'));
  });
});
