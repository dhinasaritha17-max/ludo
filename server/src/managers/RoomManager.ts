import { v4 as uuidv4 } from 'uuid';
import { PlayerColor, GameMode, Player, GameState, ChatMessage, ReactionPayload } from '../types/index.js';
import { LudoEngine } from '../engine/LudoEngine.js';
import { Database } from '../db/Database.js';

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
  rematchVotes: Set<string>;
}

export class RoomManager {
  private static instance: RoomManager;
  private rooms: Map<string, Room> = new Map(); // roomId -> Room
  private roomCodeMap: Map<string, string> = new Map(); // roomCode -> roomId
  private userToRoomMap: Map<string, string> = new Map(); // userId -> roomId
  private db: Database;

  private constructor() {
    this.db = Database.getInstance();
  }

  public static getInstance(): RoomManager {
    if (!RoomManager.instance) {
      RoomManager.instance = new RoomManager();
    }
    return RoomManager.instance;
  }

  /**
   * Generates an easy-to-read 6-character alphanumeric room code.
   */
  public generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    do {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.roomCodeMap.has(code));
    return code;
  }

  /**
   * Creates a new private room.
   */
  public createPrivateRoom(hostUser: { id: string; name: string; avatar: string }, mode: GameMode = '4p'): Room {
    const roomId = uuidv4();
    const code = this.generateRoomCode();

    const hostColor: PlayerColor = 'red';
    const players: Record<PlayerColor, Player | null> = {
      red: {
        id: hostUser.id,
        name: hostUser.name,
        avatar: hostUser.avatar,
        color: hostColor,
        isHost: true,
        isBot: false,
        isConnected: true,
        ready: true,
      },
      green: null,
      yellow: null,
      blue: null,
    };

    const room: Room = {
      id: roomId,
      code,
      mode,
      isPrivate: true,
      status: 'waiting',
      hostId: hostUser.id,
      players,
      gameState: null,
      chatMessages: [],
      createdAt: Date.now(),
      rematchVotes: new Set(),
    };

    this.rooms.set(roomId, room);
    this.roomCodeMap.set(code, roomId);
    this.userToRoomMap.set(hostUser.id, roomId);

    return room;
  }

  /**
   * Joins an existing room by code or ID.
   */
  public joinRoom(roomCodeOrId: string, user: { id: string; name: string; avatar: string }): { room: Room; color: PlayerColor } | { error: string } {
    let roomId = this.roomCodeMap.get(roomCodeOrId.toUpperCase()) || roomCodeOrId;
    const room = this.rooms.get(roomId);

    if (!room) {
      return { error: 'Room not found. Please check your room code.' };
    }

    // Check if user is already in this room (reconnection)
    for (const color of ['red', 'green', 'yellow', 'blue'] as PlayerColor[]) {
      const p = room.players[color];
      if (p && p.id === user.id) {
        p.isConnected = true;
        this.userToRoomMap.set(user.id, room.id);
        return { room, color };
      }
    }

    if (room.status !== 'waiting') {
      return { error: 'Game is already in progress in this room.' };
    }

    // Find first available slot according to game mode
    const availableColors: PlayerColor[] = room.mode === '2p' ? ['red', 'yellow'] : ['red', 'green', 'yellow', 'blue'];
    let assignedColor: PlayerColor | null = null;

    for (const color of availableColors) {
      if (!room.players[color]) {
        assignedColor = color;
        break;
      }
    }

    if (!assignedColor) {
      return { error: 'Room is already full.' };
    }

    room.players[assignedColor] = {
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      color: assignedColor,
      isHost: false,
      isBot: false,
      isConnected: true,
      ready: true,
    };

    this.userToRoomMap.set(user.id, room.id);
    return { room, color: assignedColor };
  }

  /**
   * Adds an AI bot to a specified color slot in waiting room.
   */
  public addBot(roomId: string, requestedColor?: PlayerColor): { room: Room; color: PlayerColor } | { error: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { error: 'Room not found' };
    if (room.status !== 'waiting') return { error: 'Cannot add bot to an active game' };

    const availableColors: PlayerColor[] = room.mode === '2p' ? ['red', 'yellow'] : ['red', 'green', 'yellow', 'blue'];
    let targetColor = requestedColor;

    if (!targetColor || room.players[targetColor]) {
      targetColor = availableColors.find(c => !room.players[c]);
    }

    if (!targetColor) return { error: 'No available slots for bot' };

    const botNames = ['RoboPawn', 'CyberDice', 'NovaBot', 'TitanAI'];
    const botAvatars = ['cyber-bot', 'phoenix', 'dice-king', 'star-master'];
    const randomIdx = Math.floor(Math.random() * botNames.length);

    room.players[targetColor] = {
      id: `bot_${uuidv4().slice(0, 6)}`,
      name: `${botNames[randomIdx]} (AI)`,
      avatar: botAvatars[randomIdx],
      color: targetColor,
      isHost: false,
      isBot: true,
      isConnected: true,
      ready: true,
    };

    return { room, color: targetColor };
  }

  /**
   * Removes a player or bot from a room.
   */
  public removePlayer(roomId: string, color: PlayerColor): { room: Room } | { error: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { error: 'Room not found' };
    if (room.status !== 'waiting') return { error: 'Cannot remove player while match is active' };

    const p = room.players[color];
    if (p && !p.isBot) {
      this.userToRoomMap.delete(p.id);
    }
    room.players[color] = null;
    return { room };
  }

  /**
   * Starts the match in a waiting room.
   */
  public startGame(roomId: string): { room: Room } | { error: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { error: 'Room not found' };

    const requiredColors: PlayerColor[] = room.mode === '2p' ? ['red', 'yellow'] : ['red', 'green', 'yellow', 'blue'];

    // Ensure all required slots are filled (by real players or bots)
    for (const color of requiredColors) {
      if (!room.players[color]) {
        return { error: `Slot for ${color} must be filled with a player or bot before starting.` };
      }
    }

    room.gameState = LudoEngine.createInitialState(room.id, room.code, room.mode, room.players);
    room.status = 'in_progress';
    room.matchStartTime = Date.now();

    return { room };
  }

  /**
   * Public matchmaking queue: finds or creates a public room.
   */
  public findOrCreateMatch(user: { id: string; name: string; avatar: string }, mode: GameMode = '4p'): Room {
    // Check if any open public room has a slot
    for (const room of this.rooms.values()) {
      if (!room.isPrivate && room.status === 'waiting' && room.mode === mode) {
        const joinRes = this.joinRoom(room.id, user);
        if (!('error' in joinRes)) {
          return joinRes.room;
        }
      }
    }

    // Create a new public room
    const roomId = uuidv4();
    const code = this.generateRoomCode();
    const hostColor: PlayerColor = 'red';

    const players: Record<PlayerColor, Player | null> = {
      red: {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        color: hostColor,
        isHost: true,
        isBot: false,
        isConnected: true,
        ready: true,
      },
      green: null,
      yellow: null,
      blue: null,
    };

    const room: Room = {
      id: roomId,
      code,
      mode,
      isPrivate: false,
      status: 'waiting',
      hostId: user.id,
      players,
      gameState: null,
      chatMessages: [],
      createdAt: Date.now(),
      rematchVotes: new Set(),
    };

    this.rooms.set(roomId, room);
    this.roomCodeMap.set(code, roomId);
    this.userToRoomMap.set(user.id, roomId);

    return room;
  }

  /**
   * Adds chat message with XSS sanitization and length restriction.
   */
  public addChatMessage(
    roomId: string,
    sender: { id: string; name: string; avatar: string; color?: PlayerColor },
    text: string,
    isQuickChat = false
  ): ChatMessage | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    // Sanitize message: strip HTML tags and limit length to 200 chars
    const cleanText = text.replace(/<[^>]*>?/gm, '').trim().slice(0, 200);
    if (!cleanText) return null;

    const message: ChatMessage = {
      id: uuidv4(),
      roomId,
      senderId: sender.id,
      senderName: sender.name,
      senderColor: sender.color,
      senderAvatar: sender.avatar,
      text: cleanText,
      isQuickChat,
      timestamp: Date.now(),
    };

    room.chatMessages.push(message);
    if (room.chatMessages.length > 100) {
      room.chatMessages.shift(); // Retain last 100 messages
    }

    return message;
  }

  /**
   * Records match outcome into database when game completes.
   */
  public handleGameCompletion(room: Room) {
    if (!room.gameState || room.gameState.status !== 'completed' || !room.gameState.winner) return;

    const winnerColor = room.gameState.winner;
    const winnerPlayer = room.players[winnerColor];
    if (!winnerPlayer) return;

    const duration = room.matchStartTime ? Math.round((Date.now() - room.matchStartTime) / 1000) : 60;

    const playerList = Object.values(room.players)
      .filter((p): p is Player => p !== null)
      .map(p => {
        const rankIndex = room.gameState!.rankings.indexOf(p.color);
        const rank = rankIndex !== -1 ? rankIndex + 1 : room.gameState!.rankings.length + 1;
        return {
          id: p.id,
          name: p.name,
          color: p.color,
          isBot: p.isBot,
          rank,
        };
      });

    this.db.recordMatch({
      id: uuidv4(),
      roomCode: room.code,
      mode: room.mode,
      winner: winnerColor,
      winnerId: winnerPlayer.id,
      winnerName: winnerPlayer.name,
      durationSeconds: duration,
      players: playerList,
      timestamp: Date.now(),
    });
  }

  /**
   * Resets room for a rematch.
   */
  public restartRematch(roomId: string): Room | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    room.gameState = LudoEngine.createInitialState(room.id, room.code, room.mode, room.players);
    room.status = 'in_progress';
    room.matchStartTime = Date.now();
    room.rematchVotes.clear();

    return room;
  }

  public getRoom(roomId: string): Room | null {
    return this.rooms.get(roomId) || null;
  }

  public getRoomByCode(code: string): Room | null {
    const roomId = this.roomCodeMap.get(code.toUpperCase());
    return roomId ? this.rooms.get(roomId) || null : null;
  }

  public getRoomByUserId(userId: string): Room | null {
    const roomId = this.userToRoomMap.get(userId);
    return roomId ? this.rooms.get(roomId) || null : null;
  }
}
