import fs from 'fs';
import path from 'path';
import { UserProfile, LeaderboardEntry, PlayerColor, GameMode, MatchRecord } from '../types/index.js';

interface DatabaseSchema {
  users: Record<string, UserProfile>;
  matches: MatchRecord[];
}

export class Database {
  private static instance: Database;
  private filePath: string;
  private data: DatabaseSchema;

  private constructor() {
    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.filePath = path.join(dataDir, 'ludoverse.json');
    this.data = this.loadData();
    this.seedDefaultLeaderboardIfEmpty();
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  private loadData(): DatabaseSchema {
    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        return JSON.parse(raw);
      } catch (err) {
        console.error('Failed to parse database file, resetting to empty', err);
      }
    }
    return { users: {}, matches: [] };
  }

  private persist() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist database file', err);
    }
  }

  private seedDefaultLeaderboardIfEmpty() {
    if (Object.keys(this.data.users).length === 0) {
      const seeded: Array<Partial<UserProfile>> = [
        { id: 'usr_cosmic', username: 'CosmicRoller', avatar: 'dice-king', gamesPlayed: 142, wins: 98, losses: 44, winRate: 69, favoriteColor: 'red', xp: 4850, level: 16 },
        { id: 'usr_starlight', username: 'StarGazer_99', avatar: 'star-master', gamesPlayed: 110, wins: 72, losses: 38, winRate: 65, favoriteColor: 'yellow', xp: 3500, level: 12 },
        { id: 'usr_phoenix', username: 'PhoenixFire', avatar: 'phoenix', gamesPlayed: 95, wins: 59, losses: 36, winRate: 62, favoriteColor: 'green', xp: 2900, level: 10 },
        { id: 'usr_quantum', username: 'QuantumPawn', avatar: 'cyber-bot', gamesPlayed: 80, wins: 48, losses: 32, winRate: 60, favoriteColor: 'blue', xp: 2350, level: 8 },
        { id: 'usr_ludoking', username: 'LudoTitan', avatar: 'trophy-hunter', gamesPlayed: 65, wins: 38, losses: 27, winRate: 58, favoriteColor: 'red', xp: 1900, level: 7 },
      ];

      for (const u of seeded) {
        this.data.users[u.id!] = {
          id: u.id!,
          username: u.username!,
          avatar: u.avatar!,
          isGuest: false,
          gamesPlayed: u.gamesPlayed!,
          wins: u.wins!,
          losses: u.losses!,
          winRate: u.winRate!,
          favoriteColor: u.favoriteColor!,
          coins: 1000,
          xp: u.xp!,
          level: u.level!,
          lastActive: Date.now(),
          createdAt: Date.now() - 86400000 * 30,
        };
      }
      this.persist();
    }
  }

  public getUser(userId: string): UserProfile | null {
    return this.data.users[userId] || null;
  }

  public getUserByEmail(email: string): UserProfile | null {
    if (!email) return null;
    const target = email.toLowerCase().trim();
    for (const id in this.data.users) {
      if (this.data.users[id].email?.toLowerCase().trim() === target) {
        return this.data.users[id];
      }
    }
    return null;
  }

  public upsertUser(user: Partial<UserProfile> & { id: string }): UserProfile {
    const existing = this.data.users[user.id];
    const gamesPlayed = user.gamesPlayed ?? existing?.gamesPlayed ?? 0;
    const wins = user.wins ?? existing?.wins ?? 0;
    const losses = user.losses ?? existing?.losses ?? 0;
    const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;
    const coins = user.coins ?? existing?.coins ?? 500;
    const xp = user.xp ?? existing?.xp ?? 0;
    const level = Math.floor(xp / 300) + 1;
    const lastActive = user.lastActive ?? Date.now();

    const updated: UserProfile = {
      id: user.id,
      username: user.username ?? existing?.username ?? `Player_${user.id.slice(0, 4)}`,
      avatar: user.avatar ?? existing?.avatar ?? 'dice-king',
      isGuest: user.isGuest ?? existing?.isGuest ?? true,
      email: user.email ?? existing?.email,
      photoURL: user.photoURL ?? existing?.photoURL,
      authProvider: user.authProvider ?? existing?.authProvider ?? (user.isGuest ? 'guest' : 'password'),
      gamesPlayed,
      wins,
      losses,
      winRate,
      favoriteColor: user.favoriteColor ?? existing?.favoriteColor ?? 'red',
      coins,
      xp,
      level,
      lastActive,
      lastDailyReward: user.lastDailyReward ?? existing?.lastDailyReward,
      createdAt: existing?.createdAt ?? Date.now(),
    };

    this.data.users[user.id] = updated;
    this.persist();
    return updated;
  }

  public claimDailyReward(userId: string): { success: boolean; user?: UserProfile; error?: string } {
    const user = this.getUser(userId);
    if (!user) return { success: false, error: 'User not found' };

    const now = Date.now();
    const ONE_DAY = 24 * 60 * 60 * 1000;

    if (user.lastDailyReward && now - user.lastDailyReward < ONE_DAY) {
      const hoursLeft = Math.ceil((ONE_DAY - (now - user.lastDailyReward)) / (60 * 60 * 1000));
      return { success: false, error: `Daily reward already claimed. Available in ${hoursLeft} hours.` };
    }

    const updated = this.upsertUser({
      id: userId,
      coins: (user.coins || 500) + 200,
      xp: user.xp + 150,
      lastDailyReward: now,
      lastActive: now,
    });

    return { success: true, user: updated };
  }

  public recordMatch(match: MatchRecord) {
    this.data.matches.unshift(match);
    if (this.data.matches.length > 200) {
      this.data.matches.pop();
    }

    // Update player statistics
    for (const p of match.players) {
      if (p.isBot) continue;
      const user = this.getUser(p.id);
      if (user) {
        const isWinner = p.rank === 1;
        const xpGain = isWinner ? 100 : 30;
        const coinGain = isWinner ? 150 : 50;
        p.xpGained = xpGain;
        p.coinsGained = coinGain;

        this.upsertUser({
          id: p.id,
          gamesPlayed: user.gamesPlayed + 1,
          wins: isWinner ? user.wins + 1 : user.wins,
          losses: isWinner ? user.losses : user.losses + 1,
          coins: user.coins + coinGain,
          xp: user.xp + xpGain,
          lastActive: Date.now(),
        });
      }
    }

    this.persist();
  }

  public getLeaderboard(limit = 20): LeaderboardEntry[] {
    const users = Object.values(this.data.users);
    users.sort((a, b) => b.wins - a.wins || b.xp - a.xp);

    return users.slice(0, limit).map((u, index) => ({
      rank: index + 1,
      userId: u.id,
      username: u.username,
      avatar: u.avatar,
      wins: u.wins,
      gamesPlayed: u.gamesPlayed,
      winRate: u.winRate,
      coins: u.coins,
      xp: u.xp,
    }));
  }

  public getMatchHistory(userId?: string, limit = 20): MatchRecord[] {
    if (!userId) {
      return this.data.matches.slice(0, limit);
    }
    return this.data.matches
      .filter(m => m.players.some(p => p.id === userId))
      .slice(0, limit);
  }
}

export const database = Database.getInstance();
