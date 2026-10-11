import { Server, Socket } from 'socket.io';
import { RoomManager, Room } from '../managers/RoomManager.js';
import { LudoEngine } from '../engine/LudoEngine.js';
import { PlayerColor, GameMode } from '../types/index.js';

export class SocketHandler {
  private io: Server;
  private roomManager: RoomManager;
  private botTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private turnTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(io: Server) {
    this.io = io;
    this.roomManager = RoomManager.getInstance();
    this.init();
  }

  private init() {
    this.io.on('connection', (socket: Socket) => {
      let currentUserId: string | null = null;
      let currentRoomId: string | null = null;

      // Create private room
      socket.on('create_room', ({ mode, user }: { mode: GameMode; user: { id: string; name: string; avatar: string } }) => {
        currentUserId = user.id;
        const room = this.roomManager.createPrivateRoom(user, mode);
        currentRoomId = room.id;
        socket.join(room.id);
        socket.emit('room_created', { room });
      });

      // Join room by code or ID
      socket.on('join_room', ({ roomCodeOrId, user }: { roomCodeOrId: string; user: { id: string; name: string; avatar: string } }) => {
        currentUserId = user.id;
        const result = this.roomManager.joinRoom(roomCodeOrId, user);
        if ('error' in result) {
          socket.emit('error_message', { message: result.error });
          return;
        }

        currentRoomId = result.room.id;
        socket.join(result.room.id);
        this.io.to(result.room.id).emit('room_updated', { room: result.room });
        socket.emit('room_joined', { room: result.room, color: result.color });

        // Announce in chat
        this.roomManager.addChatMessage(
          result.room.id,
          { id: 'system', name: 'System', avatar: 'bell', color: result.color },
          `${user.name} joined the room as ${result.color.toUpperCase()}!`
        );
        this.broadcastChat(result.room.id);
      });

      // Public matchmaking
      socket.on('find_match', ({ mode, user }: { mode: GameMode; user: { id: string; name: string; avatar: string } }) => {
        currentUserId = user.id;
        const room = this.roomManager.findOrCreateMatch(user, mode);
        currentRoomId = room.id;
        socket.join(room.id);

        this.io.to(room.id).emit('room_updated', { room });
        socket.emit('match_found', { room });
      });

      // Add AI Bot to room
      socket.on('add_bot', ({ roomId, color }: { roomId: string; color?: PlayerColor }) => {
        const result = this.roomManager.addBot(roomId, color);
        if ('error' in result) {
          socket.emit('error_message', { message: result.error });
          return;
        }
        this.io.to(roomId).emit('room_updated', { room: result.room });
      });

      // Remove slot
      socket.on('remove_slot', ({ roomId, color }: { roomId: string; color: PlayerColor }) => {
        const result = this.roomManager.removePlayer(roomId, color);
        if ('error' in result) {
          socket.emit('error_message', { message: result.error });
          return;
        }
        this.io.to(roomId).emit('room_updated', { room: result.room });
      });

      // Start match
      socket.on('start_game', ({ roomId }: { roomId: string }) => {
        const result = this.roomManager.startGame(roomId);
        if ('error' in result) {
          socket.emit('error_message', { message: result.error });
          return;
        }

        this.io.to(roomId).emit('game_started', { room: result.room });
        this.setupTurnTimer(result.room);
        this.checkAndTriggerBotTurn(result.room);
      });

      // Roll Dice
      socket.on('roll_dice', ({ roomId }: { roomId: string }) => {
        const room = this.roomManager.getRoom(roomId);
        if (!room || !room.gameState || room.gameState.status !== 'in_progress') return;

        const currentTurnColor = room.gameState.currentTurn;
        const player = room.players[currentTurnColor];

        // Ensure moving player is this socket's user (unless bot)
        if (!player || (player.id !== currentUserId && !player.isBot)) {
          return;
        }

        if (room.gameState.hasRolled) return;

        const rollResult = LudoEngine.handleDiceRoll(room.gameState);
        room.gameState = rollResult.state;

        this.io.to(roomId).emit('game_state_synced', {
          gameState: room.gameState,
          rollResult: room.gameState.diceValue,
          autoAdvanced: rollResult.autoAdvanced,
        });

        this.setupTurnTimer(room);

        // If turn auto-advanced or it's bot's turn, handle it
        this.checkAndTriggerBotTurn(room);
      });

      // Move Token
      socket.on('move_token', ({ roomId, tokenId }: { roomId: string; tokenId: number }) => {
        const room = this.roomManager.getRoom(roomId);
        if (!room || !room.gameState || room.gameState.status !== 'in_progress') return;

        const currentTurnColor = room.gameState.currentTurn;
        const player = room.players[currentTurnColor];

        if (!player || (player.id !== currentUserId && !player.isBot)) {
          return;
        }

        const moveRes = LudoEngine.handleMoveToken(room.gameState, tokenId);
        if (moveRes.error) {
          socket.emit('error_message', { message: moveRes.error });
          return;
        }

        room.gameState = moveRes.state;

        this.io.to(roomId).emit('game_state_synced', {
          gameState: room.gameState,
          moveResult: moveRes.moveResult,
        });

        if (room.gameState.status === 'completed') {
          this.roomManager.handleGameCompletion(room);
          this.io.to(roomId).emit('game_completed', {
            winner: room.gameState.winner,
            rankings: room.gameState.rankings,
            room,
          });
          this.clearTurnTimer(room.id);
        } else {
          this.setupTurnTimer(room);
          this.checkAndTriggerBotTurn(room);
        }
      });

      // In-Game Text Chat
      socket.on('send_chat', ({ roomId, user, text, isQuickChat }: {
        roomId: string;
        user: { id: string; name: string; avatar: string; color?: PlayerColor };
        text: string;
        isQuickChat?: boolean;
      }) => {
        const message = this.roomManager.addChatMessage(roomId, user, text, isQuickChat);
        if (message) {
          this.io.to(roomId).emit('chat_message_received', { message });
        }
      });

      // Real-time Reaction Emojis
      socket.on('send_reaction', ({ roomId, user, emoji }: {
        roomId: string;
        user: { id: string; name: string; avatar: string; color?: PlayerColor };
        emoji: string;
      }) => {
        this.io.to(roomId).emit('reaction_received', {
          roomId,
          senderId: user.id,
          senderName: user.name,
          senderColor: user.color,
          emoji,
          timestamp: Date.now(),
        });
      });

      // Rematch Request
      socket.on('request_rematch', ({ roomId, userId }: { roomId: string; userId: string }) => {
        const room = this.roomManager.getRoom(roomId);
        if (!room) return;

        room.rematchVotes.add(userId);
        const activeHumanCount = Object.values(room.players).filter(p => p && !p.isBot).length;

        this.io.to(roomId).emit('rematch_voted', {
          votes: Array.from(room.rematchVotes),
          requiredVotes: activeHumanCount,
        });

        if (room.rematchVotes.size >= Math.ceil(activeHumanCount / 2)) {
          // Restart match
          const updatedRoom = this.roomManager.restartRematch(roomId);
          if (updatedRoom) {
            this.io.to(roomId).emit('game_started', { room: updatedRoom });
            this.setupTurnTimer(updatedRoom);
            this.checkAndTriggerBotTurn(updatedRoom);
          }
        }
      });

      // Disconnect
      socket.on('disconnect', () => {
        if (currentRoomId && currentUserId) {
          const room = this.roomManager.getRoom(currentRoomId);
          if (room) {
            for (const color of ['red', 'green', 'yellow', 'blue'] as PlayerColor[]) {
              const p = room.players[color];
              if (p && p.id === currentUserId) {
                p.isConnected = false;
                this.io.to(room.id).emit('room_updated', { room });
                this.io.to(room.id).emit('player_disconnected', { color, name: p.name });
                break;
              }
            }
          }
        }
      });
    });
  }

  /**
   * Sets up 15-second AFK countdown timer for active turn.
   */
  private setupTurnTimer(room: Room) {
    this.clearTurnTimer(room.id);
    if (!room.gameState || room.gameState.status !== 'in_progress') return;

    const timer = setTimeout(() => {
      this.handleTurnTimeout(room.id);
    }, 16000);
    timer.unref();

    this.turnTimers.set(room.id, timer);
  }

  private clearTurnTimer(roomId: string) {
    const existing = this.turnTimers.get(roomId);
    if (existing) {
      clearTimeout(existing);
      this.turnTimers.delete(roomId);
    }
  }

  /**
   * When turn timer expires, auto-roll or auto-move to prevent stalling.
   */
  private handleTurnTimeout(roomId: string) {
    const room = this.roomManager.getRoom(roomId);
    if (!room || !room.gameState || room.gameState.status !== 'in_progress') return;

    if (!room.gameState.hasRolled) {
      // Auto-roll
      const rollRes = LudoEngine.handleDiceRoll(room.gameState);
      room.gameState = rollRes.state;

      this.io.to(roomId).emit('game_state_synced', {
        gameState: room.gameState,
        rollResult: room.gameState.diceValue,
        autoAdvanced: rollRes.autoAdvanced,
      });

      if (!rollRes.autoAdvanced && room.gameState.validMoves.length > 0) {
        // Auto-select best move after short delay
        setTimeout(() => {
          this.handleTurnTimeout(roomId);
        }, 1500);
      } else {
        this.setupTurnTimer(room);
        this.checkAndTriggerBotTurn(room);
      }
    } else {
      // Auto-move best token
      const bestMove = LudoEngine.chooseBestMove(room.gameState);
      if (bestMove !== null) {
        const moveRes = LudoEngine.handleMoveToken(room.gameState, bestMove);
        room.gameState = moveRes.state;

        this.io.to(roomId).emit('game_state_synced', {
          gameState: room.gameState,
          moveResult: moveRes.moveResult,
        });

        if (room.gameState.status === 'completed') {
          this.roomManager.handleGameCompletion(room);
          this.io.to(roomId).emit('game_completed', {
            winner: room.gameState.winner,
            rankings: room.gameState.rankings,
            room,
          });
          this.clearTurnTimer(room.id);
        } else {
          this.setupTurnTimer(room);
          this.checkAndTriggerBotTurn(room);
        }
      }
    }
  }

  /**
   * Checks if current turn belongs to an AI bot, and executes their roll and move naturally.
   */
  private checkAndTriggerBotTurn(room: Room) {
    if (!room.gameState || room.gameState.status !== 'in_progress') return;

    const currentTurnColor = room.gameState.currentTurn;
    const player = room.players[currentTurnColor];

    if (!player || !player.isBot) return;

    // Clear any pending bot timeout for this room
    const existing = this.botTimeouts.get(room.id);
    if (existing) clearTimeout(existing);

    // Realistic bot decision delay: 900ms
    const rollTimeout = setTimeout(() => {
      if (!room.gameState || room.gameState.status !== 'in_progress' || room.gameState.currentTurn !== currentTurnColor) return;

      if (!room.gameState.hasRolled) {
        const rollRes = LudoEngine.handleDiceRoll(room.gameState);
        room.gameState = rollRes.state;

        this.io.to(room.id).emit('game_state_synced', {
          gameState: room.gameState,
          rollResult: room.gameState.diceValue,
          autoAdvanced: rollRes.autoAdvanced,
        });

        if (!rollRes.autoAdvanced && room.gameState.validMoves.length > 0) {
          // Bot selects best token move after 800ms
          const moveTimeout = setTimeout(() => {
            if (!room.gameState || room.gameState.currentTurn !== currentTurnColor) return;

            const bestToken = LudoEngine.chooseBestMove(room.gameState);
            if (bestToken !== null) {
              const moveRes = LudoEngine.handleMoveToken(room.gameState, bestToken);
              room.gameState = moveRes.state;

              this.io.to(room.id).emit('game_state_synced', {
                gameState: room.gameState,
                moveResult: moveRes.moveResult,
              });

              if (room.gameState.status === 'completed') {
                this.roomManager.handleGameCompletion(room);
                this.io.to(room.id).emit('game_completed', {
                  winner: room.gameState.winner,
                  rankings: room.gameState.rankings,
                  room,
                });
                this.clearTurnTimer(room.id);
              } else {
                this.setupTurnTimer(room);
                this.checkAndTriggerBotTurn(room);
              }
            }
          }, 800);
          moveTimeout.unref();

          this.botTimeouts.set(room.id, moveTimeout);
        } else {
          this.setupTurnTimer(room);
          this.checkAndTriggerBotTurn(room);
        }
      }
    }, 900);
    rollTimeout.unref();

    this.botTimeouts.set(room.id, rollTimeout);
  }

  private broadcastChat(roomId: string) {
    const room = this.roomManager.getRoom(roomId);
    if (room) {
      this.io.to(roomId).emit('chat_history', { messages: room.chatMessages });
    }
  }
}
