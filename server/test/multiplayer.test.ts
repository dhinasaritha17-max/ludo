import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import { SocketHandler } from '../src/sockets/SocketHandler.js';
import { Room } from '../src/managers/RoomManager.js';

describe('Multiplayer Real-Time Synchronization', () => {
  let server: http.Server;
  let ioServer: Server;
  let port: number;
  let client1: ClientSocketType;
  let client2: ClientSocketType;
  let client3: ClientSocketType;
  let client4: ClientSocketType;

  before(async () => {
    const app = express();
    server = http.createServer(app);
    ioServer = new Server(server, { cors: { origin: '*' } });
    new SocketHandler(ioServer);

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        port = typeof addr === 'object' && addr ? addr.port : 3999;
        resolve();
      });
    });
  });

  after(async () => {
    client1?.disconnect();
    client2?.disconnect();
    client3?.disconnect();
    client4?.disconnect();
    await new Promise<void>((resolve) => ioServer.close(() => resolve()));
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('should support 4 independent players joining a room and synchronizing real-time state', async () => {
    const serverUrl = `http://localhost:${port}`;

    // 1. Connect Client 1 (Alice)
    client1 = ClientSocket(serverUrl, { transports: ['websocket'] });
    await new Promise((res) => client1.on('connect', res));

    // 2. Client 1 creates a private room
    const roomCreatedPromise = new Promise<{ room: Room }>((resolve) => {
      client1.on('room_created', resolve);
    });

    client1.emit('create_room', {
      mode: '4p',
      user: { id: 'usr_alice', name: 'Alice', avatar: 'dice-king' },
    });

    const { room } = await roomCreatedPromise;
    assert.ok(room.code);
    assert.strictEqual(room.players.red?.name, 'Alice');

    // 3. Connect Client 2 (Bob) and join via room code
    client2 = ClientSocket(serverUrl, { transports: ['websocket'] });
    await new Promise((res) => client2.on('connect', res));

    const client2JoinPromise = new Promise<{ room: Room; color: string }>((resolve) => {
      client2.on('room_joined', resolve);
    });

    client2.emit('join_room', {
      roomCodeOrId: room.code,
      user: { id: 'usr_bob', name: 'Bob', avatar: 'phoenix' },
    });

    const joinRes2 = await client2JoinPromise;
    assert.strictEqual(joinRes2.color, 'green'); // Assigned Green

    // 4. Connect Client 3 (Charlie)
    client3 = ClientSocket(serverUrl, { transports: ['websocket'] });
    await new Promise((res) => client3.on('connect', res));

    const client3JoinPromise = new Promise<{ room: Room; color: string }>((resolve) => {
      client3.on('room_joined', resolve);
    });

    client3.emit('join_room', {
      roomCodeOrId: room.code,
      user: { id: 'usr_charlie', name: 'Charlie', avatar: 'star-master' },
    });

    const joinRes3 = await client3JoinPromise;
    assert.strictEqual(joinRes3.color, 'yellow'); // Assigned Yellow

    // 5. Connect Client 4 (Diana)
    client4 = ClientSocket(serverUrl, { transports: ['websocket'] });
    await new Promise((res) => client4.on('connect', res));

    const client4JoinPromise = new Promise<{ room: Room; color: string }>((resolve) => {
      client4.on('room_joined', resolve);
    });

    client4.emit('join_room', {
      roomCodeOrId: room.code,
      user: { id: 'usr_diana', name: 'Diana', avatar: 'cyber-bot' },
    });

    const joinRes4 = await client4JoinPromise;
    assert.strictEqual(joinRes4.color, 'blue'); // Assigned Blue

    // 6. Test In-Game Live Chat Delivery
    const chatPromise = new Promise<{ message: any }>((resolve) => {
      client4.on('chat_message_received', resolve);
    });

    client1.emit('send_chat', {
      roomId: room.id,
      user: { id: 'usr_alice', name: 'Alice', avatar: 'dice-king', color: 'red' },
      text: 'Good luck everyone!',
    });

    const { message } = await chatPromise;
    assert.strictEqual(message.text, 'Good luck everyone!');
    assert.strictEqual(message.senderName, 'Alice');

    // 7. Test Emoji Reaction Broadcasting
    const reactionPromise = new Promise<{ emoji: string; senderName: string }>((resolve) => {
      client1.on('reaction_received', resolve);
    });

    client2.emit('send_reaction', {
      roomId: room.id,
      user: { id: 'usr_bob', name: 'Bob', avatar: 'phoenix', color: 'green' },
      emoji: '🔥',
    });

    const reactionPayload = await reactionPromise;
    assert.strictEqual(reactionPayload.emoji, '🔥');
    assert.strictEqual(reactionPayload.senderName, 'Bob');

    // 8. Start Game
    const gameStartPromise = new Promise<{ room: Room }>((resolve) => {
      client3.on('game_started', resolve);
    });

    client1.emit('start_game', { roomId: room.id });
    const started = await gameStartPromise;

    assert.strictEqual(started.room.status, 'in_progress');
    assert.ok(started.room.gameState);
    assert.strictEqual(started.room.gameState.currentTurn, 'red');

    // 9. Alice Rolls Dice
    const diceRollPromise = new Promise<{ gameState: any; rollResult?: number }>((resolve) => {
      client2.on('game_state_synced', resolve);
    });

    client1.emit('roll_dice', { roomId: room.id });
    const syncState = await diceRollPromise;

    assert.ok(syncState.rollResult && syncState.rollResult >= 1 && syncState.rollResult <= 6);
    if (syncState.rollResult === 6) {
      assert.strictEqual(syncState.gameState.currentTurn, 'red');
      assert.strictEqual(syncState.gameState.hasRolled, true);
    } else {
      // Non-6 with all tokens in yard auto-advances turn to Green!
      assert.strictEqual(syncState.gameState.currentTurn, 'green');
      assert.strictEqual(syncState.gameState.hasRolled, false);
    }
  });
});
