import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  increment,
  DocumentSnapshot,
  QueryDocumentSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebaseConfig.js';
import { UserProfile, Room, MatchRecord, LeaderboardEntry, PlayerColor, Player } from '../types/index.js';

// ============================================================================
// 1. Player Data Management (Collection: 'users')
// ============================================================================

/**
 * Retrieves a player profile from Firestore or returns null.
 */
export async function getPlayerProfileFromFirestore(userId: string): Promise<UserProfile | null> {
  try {
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return null;
    return snap.data() as UserProfile;
  } catch (error) {
    console.error(`[Firestore] Failed to get user profile ${userId}:`, error);
    return null;
  }
}

/**
 * Creates or updates player profile in Firestore.
 * Automatically computes winRate, level, and updates lastActive timestamp.
 */
export async function savePlayerProfileToFirestore(
  profile: Partial<UserProfile> & { id: string }
): Promise<UserProfile> {
  const userRef = doc(db, 'users', profile.id);

  return await runTransaction(db, async transaction => {
    const snap = await transaction.get(userRef);
    const existing = snap.exists() ? (snap.data() as UserProfile) : null;

    const gamesPlayed = profile.gamesPlayed ?? existing?.gamesPlayed ?? 0;
    const wins = profile.wins ?? existing?.wins ?? 0;
    const losses = profile.losses ?? existing?.losses ?? 0;
    const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;
    const xp = profile.xp ?? existing?.xp ?? 0;
    const level = Math.floor(xp / 300) + 1;
    const coins = profile.coins ?? existing?.coins ?? 500;

    const merged: UserProfile = {
      id: profile.id,
      username: profile.username ?? existing?.username ?? `Player_${profile.id.slice(0, 4)}`,
      avatar: profile.avatar ?? existing?.avatar ?? 'dice-king',
      isGuest: profile.isGuest ?? existing?.isGuest ?? false,
      email: profile.email ?? existing?.email,
      photoURL: profile.photoURL ?? existing?.photoURL,
      authProvider: profile.authProvider ?? existing?.authProvider ?? (profile.isGuest ? 'guest' : 'password'),
      gamesPlayed,
      wins,
      losses,
      winRate,
      favoriteColor: profile.favoriteColor ?? existing?.favoriteColor ?? 'red',
      coins,
      xp,
      level,
      lastActive: Date.now(),
      lastDailyReward: profile.lastDailyReward ?? existing?.lastDailyReward,
      createdAt: existing?.createdAt ?? Date.now(),
    };

    transaction.set(userRef, merged, { merge: true });

    // Keep denormalized leaderboard document synced
    const leaderboardRef = doc(db, 'leaderboards', profile.id);
    transaction.set(
      leaderboardRef,
      {
        userId: merged.id,
        username: merged.username,
        avatar: merged.avatar,
        wins: merged.wins,
        gamesPlayed: merged.gamesPlayed,
        winRate: merged.winRate,
        coins: merged.coins,
        xp: merged.xp,
        updatedAt: Date.now(),
      },
      { merge: true }
    );

    return merged;
  });
}

/**
 * Subscribes to real-time changes on a user's profile.
 */
export function subscribeToPlayerProfile(
  userId: string,
  callback: (profile: UserProfile | null) => void
): Unsubscribe {
  const userRef = doc(db, 'users', userId);
  return onSnapshot(
    userRef,
    snapshot => {
      if (snapshot.exists()) {
        callback(snapshot.data() as UserProfile);
      } else {
        callback(null);
      }
    },
    error => {
      console.warn(`[Firestore] Profile listener error for ${userId}:`, error);
    }
  );
}

/**
 * Atomically claims daily reward (+150 XP, +200 Coins) in Firestore.
 */
export async function claimDailyRewardInFirestore(userId: string): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
  const userRef = doc(db, 'users', userId);

  try {
    return await runTransaction(db, async transaction => {
      const snap = await transaction.get(userRef);
      if (!snap.exists()) {
        return { success: false, error: 'User profile not found' };
      }

      const user = snap.data() as UserProfile;
      const now = Date.now();
      const ONE_DAY = 24 * 60 * 60 * 1000;

      if (user.lastDailyReward && now - user.lastDailyReward < ONE_DAY) {
        const hoursLeft = Math.ceil((ONE_DAY - (now - user.lastDailyReward)) / (60 * 60 * 1000));
        return { success: false, error: `Daily reward available in ${hoursLeft} hours.` };
      }

      const updatedCoins = (user.coins || 500) + 200;
      const updatedXp = user.xp + 150;
      const updatedLevel = Math.floor(updatedXp / 300) + 1;

      const updated: UserProfile = {
        ...user,
        coins: updatedCoins,
        xp: updatedXp,
        level: updatedLevel,
        lastDailyReward: now,
        lastActive: now,
      };

      transaction.update(userRef, {
        coins: updatedCoins,
        xp: updatedXp,
        level: updatedLevel,
        lastDailyReward: now,
        lastActive: now,
      });

      const lbRef = doc(db, 'leaderboards', userId);
      transaction.set(lbRef, { xp: updatedXp, coins: updatedCoins, updatedAt: now }, { merge: true });

      return { success: true, user: updated };
    });
  } catch (err: any) {
    console.error('[Firestore] Error claiming daily reward:', err);
    return { success: false, error: err.message || 'Failed to claim daily reward' };
  }
}

// ============================================================================
// 2. Ludo Game Room & Match Recovery (Collection: 'rooms')
// ============================================================================

/**
 * Saves or updates a game room snapshot into Firestore.
 * Supports active game status, token positions, dice values, and player roster.
 */
export async function syncRoomToFirestore(room: Room): Promise<void> {
  try {
    const roomRef = doc(db, 'rooms', room.id);
    const playerIds = Object.values(room.players)
      .filter((p): p is Player => p !== null && !p.isBot)
      .map(p => p.id);

    await setDoc(
      roomRef,
      {
        id: room.id,
        code: room.code,
        mode: room.mode,
        isPrivate: room.isPrivate,
        status: room.status,
        hostId: room.hostId,
        players: room.players,
        playerIds,
        gameState: room.gameState,
        createdAt: room.createdAt,
        matchStartTime: room.matchStartTime || null,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error(`[Firestore] Failed to sync room ${room.id}:`, error);
  }
}

/**
 * Retrieves an active unfinished room that the player was participating in.
 * Enables reconnection and match state recovery.
 */
export async function getActiveMatchForUser(userId: string): Promise<Room | null> {
  try {
    const roomsRef = collection(db, 'rooms');
    const q = query(
      roomsRef,
      where('playerIds', 'array-contains', userId),
      where('status', '==', 'in_progress'),
      limit(1)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const data = snapshot.docs[0].data();
    return {
      id: data.id,
      code: data.code,
      mode: data.mode,
      isPrivate: data.isPrivate,
      status: data.status,
      hostId: data.hostId,
      players: data.players,
      gameState: data.gameState,
      chatMessages: [],
      createdAt: data.createdAt,
      matchStartTime: data.matchStartTime,
      rematchVotes: new Set(),
    };
  } catch (error) {
    console.warn(`[Firestore] Active match lookup for ${userId}:`, error);
    return null;
  }
}

/**
 * Finds room data by its 6-character room code.
 */
export async function getRoomByCodeFromFirestore(code: string): Promise<Room | null> {
  try {
    const roomsRef = collection(db, 'rooms');
    const q = query(roomsRef, where('code', '==', code.toUpperCase()), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const data = snapshot.docs[0].data();
    return {
      id: data.id,
      code: data.code,
      mode: data.mode,
      isPrivate: data.isPrivate,
      status: data.status,
      hostId: data.hostId,
      players: data.players,
      gameState: data.gameState,
      chatMessages: [],
      createdAt: data.createdAt,
      matchStartTime: data.matchStartTime,
      rematchVotes: new Set(),
    };
  } catch (error) {
    console.warn(`[Firestore] Room code lookup ${code}:`, error);
    return null;
  }
}

// ============================================================================
// 3. Match History & Atomic Stats Processing (Collection: 'matches')
// ============================================================================

/**
 * Saves completed match record and atomically updates all players' statistics
 * and coins/XP to prevent duplicate match results and race conditions.
 */
export async function recordCompletedMatchInFirestore(match: MatchRecord): Promise<void> {
  try {
    const matchRef = doc(db, 'matches', match.id);

    await runTransaction(db, async transaction => {
      // 1. Check if match is already recorded to prevent duplicate counting
      const existingMatch = await transaction.get(matchRef);
      if (existingMatch.exists()) {
        return;
      }

      // 2. Write match record document
      transaction.set(matchRef, {
        ...match,
        recordedAt: Date.now(),
      });

      // 3. Update active room status to completed
      if (match.roomId) {
        const roomRef = doc(db, 'rooms', match.roomId);
        transaction.set(
          roomRef,
          {
            status: 'completed',
            winnerId: match.winnerId,
            winnerColor: match.winner,
            completedAt: Date.now(),
          },
          { merge: true }
        );
      }

      // 4. Atomically update player profiles
      for (const p of match.players) {
        if (p.isBot) continue;

        const userRef = doc(db, 'users', p.id);
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) continue;

        const u = userSnap.data() as UserProfile;
        const isWinner = p.rank === 1;
        const newGamesPlayed = (u.gamesPlayed || 0) + 1;
        const newWins = isWinner ? (u.wins || 0) + 1 : (u.wins || 0);
        const newLosses = isWinner ? (u.losses || 0) : (u.losses || 0) + 1;
        const newWinRate = Math.round((newWins / newGamesPlayed) * 100);

        const xpGain = isWinner ? 100 : 30;
        const coinGain = isWinner ? 150 : 50;

        const newXp = (u.xp || 0) + xpGain;
        const newLevel = Math.floor(newXp / 300) + 1;
        const newCoins = (u.coins || 500) + coinGain;

        transaction.update(userRef, {
          gamesPlayed: newGamesPlayed,
          wins: newWins,
          losses: newLosses,
          winRate: newWinRate,
          xp: newXp,
          level: newLevel,
          coins: newCoins,
          lastActive: Date.now(),
        });

        // Update leaderboard entry
        const lbRef = doc(db, 'leaderboards', p.id);
        transaction.set(
          lbRef,
          {
            userId: p.id,
            username: u.username,
            avatar: u.avatar,
            wins: newWins,
            gamesPlayed: newGamesPlayed,
            winRate: newWinRate,
            coins: newCoins,
            xp: newXp,
            updatedAt: Date.now(),
          },
          { merge: true }
        );
      }
    });
  } catch (error) {
    console.error(`[Firestore] Failed to record match ${match.id}:`, error);
  }
}

/**
 * Fetches paginated match history for a specific player.
 * @param userId - Target user ID
 * @param pageSize - Number of match records per page (default 10)
 * @param lastDoc - Optional last document snapshot from previous page for pagination
 */
export async function getPlayerMatchHistoryFromFirestore(
  userId: string,
  pageSize = 10,
  lastDoc: QueryDocumentSnapshot | null = null
): Promise<{ matches: MatchRecord[]; lastDoc: QueryDocumentSnapshot | null; hasMore: boolean }> {
  try {
    const matchesRef = collection(db, 'matches');
    let q = query(
      matchesRef,
      where('playerIds', 'array-contains', userId),
      orderBy('timestamp', 'desc'),
      limit(pageSize)
    );

    if (lastDoc) {
      q = query(
        matchesRef,
        where('playerIds', 'array-contains', userId),
        orderBy('timestamp', 'desc'),
        startAfter(lastDoc),
        limit(pageSize)
      );
    }

    const snap = await getDocs(q);
    const matches: MatchRecord[] = snap.docs.map(d => d.data() as MatchRecord);
    const newLastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
    const hasMore = snap.docs.length === pageSize;

    return { matches, lastDoc: newLastDoc, hasMore };
  } catch (error) {
    console.error(`[Firestore] Match history query error for ${userId}:`, error);
    return { matches: [], lastDoc: null, hasMore: false };
  }
}

// ============================================================================
// 4. Global Leaderboard (Collection: 'leaderboards')
// ============================================================================

/**
 * Real-time subscription to global leaderboard entries ordered by wins then XP.
 */
export function subscribeToGlobalLeaderboard(
  limitCount = 30,
  callback: (entries: LeaderboardEntry[]) => void
): Unsubscribe {
  const lbRef = collection(db, 'leaderboards');
  const q = query(lbRef, orderBy('wins', 'desc'), orderBy('xp', 'desc'), limit(limitCount));

  return onSnapshot(
    q,
    snapshot => {
      const entries: LeaderboardEntry[] = snapshot.docs.map((d, index) => {
        const data = d.data();
        return {
          rank: index + 1,
          userId: data.userId || d.id,
          username: data.username || 'Player',
          avatar: data.avatar || 'dice-king',
          wins: data.wins || 0,
          gamesPlayed: data.gamesPlayed || 0,
          winRate: data.winRate || 0,
          coins: data.coins || 500,
          xp: data.xp || 0,
        };
      });
      callback(entries);
    },
    error => {
      console.warn('[Firestore] Global leaderboard listener error:', error);
    }
  );
}

/**
 * One-shot query for top leaderboard entries.
 */
export async function getGlobalLeaderboard(limitCount = 30): Promise<LeaderboardEntry[]> {
  try {
    const lbRef = collection(db, 'leaderboards');
    const q = query(lbRef, orderBy('wins', 'desc'), orderBy('xp', 'desc'), limit(limitCount));
    const snap = await getDocs(q);

    return snap.docs.map((d, index) => {
      const data = d.data();
      return {
        rank: index + 1,
        userId: data.userId || d.id,
        username: data.username || 'Player',
        avatar: data.avatar || 'dice-king',
        wins: data.wins || 0,
        gamesPlayed: data.gamesPlayed || 0,
        winRate: data.winRate || 0,
        coins: data.coins || 500,
        xp: data.xp || 0,
      };
    });
  } catch (error) {
    console.error('[Firestore] Failed to fetch leaderboard:', error);
    return [];
  }
}
