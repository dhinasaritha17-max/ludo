export type PlayerColor = 'red' | 'green' | 'yellow' | 'blue';

export type GameMode = '2p' | '4p';

export type GameStatus = 'waiting' | 'in_progress' | 'completed';

export interface Token {
  id: number; // 0, 1, 2, 3
  color: PlayerColor;
  step: number; // -1 = yard, 0..50 = main track, 51..55 = home stretch, 56 = home goal
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  color: PlayerColor;
  isHost: boolean;
  isBot: boolean;
  isConnected: boolean;
  ready: boolean;
}

export interface GameMove {
  playerColor: PlayerColor;
  tokenId: number;
  fromStep: number;
  toStep: number;
  diceValue: number;
  capturedToken?: {
    color: PlayerColor;
    tokenId: number;
  };
  reachedHome?: boolean;
  bonusTurnAwarded?: boolean;
  timestamp: number;
}

export interface GameState {
  roomId: string;
  roomCode: string;
  mode: GameMode;
  status: GameStatus;
  players: Record<PlayerColor, Player | null>;
  turnOrder: PlayerColor[];
  currentTurn: PlayerColor;
  diceValue: number | null;
  hasRolled: boolean;
  consecutiveSixes: number;
  tokens: Record<PlayerColor, Token[]>;
  validMoves: number[]; // Token IDs that can legally move
  winner: PlayerColor | null;
  rankings: PlayerColor[];
  turnDeadline: number;
  lastAction: {
    type: string;
    description: string;
    timestamp: number;
  } | null;
  turnTimeoutSeconds: number;
  turnCount?: number;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderColor?: PlayerColor;
  senderAvatar: string;
  text: string;
  isQuickChat?: boolean;
  timestamp: number;
}

export interface ReactionPayload {
  roomId: string;
  senderId: string;
  senderName: string;
  senderColor?: PlayerColor;
  emoji: string;
  timestamp: number;
}

export interface UserProfile {
  id: string;
  username: string;
  avatar: string;
  isGuest: boolean;
  email?: string;
  photoURL?: string;
  authProvider?: 'google' | 'password' | 'guest';
  gamesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  favoriteColor: PlayerColor;
  coins: number;
  xp: number;
  level: number;
  lastActive: number;
  lastDailyReward?: number;
  createdAt: number;
}

export interface MatchPlayerSummary {
  id: string;
  name: string;
  avatar?: string;
  color: PlayerColor;
  isBot: boolean;
  rank: number;
  coinsGained?: number;
  xpGained?: number;
}

export interface MatchRecord {
  id: string;
  roomId?: string;
  roomCode?: string;
  mode: GameMode;
  winner: PlayerColor;
  winnerId?: string;
  winnerName?: string;
  durationSeconds?: number;
  playerIds: string[];
  players: MatchPlayerSummary[];
  turnsCount?: number;
  startedAt?: number;
  endedAt?: number;
  status?: 'completed' | 'cancelled';
  timestamp: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar: string;
  wins: number;
  gamesPlayed: number;
  winRate: number;
  coins?: number;
  xp: number;
}

export interface Room {
  id: string;
  code: string;
  mode: GameMode;
  isPrivate: boolean;
  status: 'waiting' | 'in_progress' | 'completed';
  hostId: string;
  players: Record<PlayerColor, Player | null>;
  gameState: GameState | null;
  chatMessages: ChatMessage[];
  createdAt: number;
  matchStartTime?: number;
  rematchVotes?: Set<string> | string[];
}

export interface MediaPeerState {
  peerId: string;
  userId: string;
  name: string;
  color?: PlayerColor;
  audioEnabled: boolean;
  videoEnabled: boolean;
}

export interface MediaSignalPayload {
  roomId: string;
  fromPeerId: string;
  toPeerId: string;
  signal: {
    type: 'offer' | 'answer' | 'candidate';
    sdp?: any;
    candidate?: any;
  };
}

