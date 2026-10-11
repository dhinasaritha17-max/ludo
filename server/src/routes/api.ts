import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '../db/Database.js';
import { RoomManager } from '../managers/RoomManager.js';

const router = Router();
const db = Database.getInstance();
const roomManager = RoomManager.getInstance();

// Guest authentication / session init
router.post('/auth/guest', (req, res) => {
  const { existingId, username, avatar } = req.body;
  const id = existingId || `guest_${uuidv4().slice(0, 8)}`;

  const randomAvatars = ['dice-king', 'star-master', 'phoenix', 'cyber-bot', 'trophy-hunter'];
  const defaultAvatar = avatar || randomAvatars[Math.floor(Math.random() * randomAvatars.length)];
  const defaultUsername = username || `Player_${id.slice(-4)}`;

  const user = db.upsertUser({
    id,
    username: defaultUsername,
    avatar: defaultAvatar,
    isGuest: true,
  });

  res.json({ success: true, user });
});

// Firebase Authentication sync endpoint
router.post('/auth/firebase', (req, res) => {
  const { uid, email, displayName, photoURL, providerId, guestIdToMigrate } = req.body;

  if (!uid) {
    return res.status(400).json({ error: 'Missing user UID' });
  }

  let existingUser = db.getUser(uid);
  if (!existingUser && email) {
    existingUser = db.getUserByEmail(email);
  }

  const existingGuest = guestIdToMigrate && guestIdToMigrate !== uid ? db.getUser(guestIdToMigrate) : null;

  let finalUsername = displayName;
  if (!finalUsername && email) {
    finalUsername = email.split('@')[0];
  }
  if (!finalUsername) {
    finalUsername = existingUser?.username || existingGuest?.username || `Player_${uid.slice(0, 4)}`;
  }

  const finalAvatar = existingUser?.avatar || existingGuest?.avatar || 'dice-king';
  const gamesPlayed = existingUser ? existingUser.gamesPlayed : (existingGuest ? existingGuest.gamesPlayed : 0);
  const wins = existingUser ? existingUser.wins : (existingGuest ? existingGuest.wins : 0);
  const losses = existingUser ? existingUser.losses : (existingGuest ? existingGuest.losses : 0);
  const xp = existingUser ? existingUser.xp : (existingGuest ? existingGuest.xp : 0);
  const favoriteColor = existingUser?.favoriteColor || existingGuest?.favoriteColor || 'red';

  const user = db.upsertUser({
    id: uid,
    username: finalUsername,
    avatar: finalAvatar,
    isGuest: false,
    email: email || existingUser?.email,
    photoURL: photoURL || existingUser?.photoURL,
    authProvider: providerId === 'google.com' ? 'google' : 'password',
    gamesPlayed,
    wins,
    losses,
    xp,
    favoriteColor,
  });

  res.json({ success: true, user });
});

// Google OAuth integration endpoint
router.post('/auth/google', (req, res) => {
  const { email, name, picture, guestIdToMigrate } = req.body;

  if (!email || !name) {
    return res.status(400).json({ error: 'Missing OAuth profile payload' });
  }

  const userId = `usr_${Buffer.from(email).toString('hex').slice(0, 12)}`;
  let existingGuest = guestIdToMigrate ? db.getUser(guestIdToMigrate) : null;

  const user = db.upsertUser({
    id: userId,
    username: name,
    avatar: picture || 'dice-king',
    isGuest: false,
    email,
    photoURL: picture,
    authProvider: 'google',
    gamesPlayed: existingGuest ? existingGuest.gamesPlayed : undefined,
    wins: existingGuest ? existingGuest.wins : undefined,
    losses: existingGuest ? existingGuest.losses : undefined,
    xp: existingGuest ? existingGuest.xp : undefined,
  });

  res.json({ success: true, user });
});

// Get user profile
router.get('/profile/:id', (req, res) => {
  const user = db.getUser(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ success: true, user });
});

// Update user profile
router.post('/profile/update', (req, res) => {
  const { id, username, avatar, favoriteColor } = req.body;
  if (!id) return res.status(400).json({ error: 'Missing user ID' });

  const updated = db.upsertUser({
    id,
    username,
    avatar,
    favoriteColor,
  });

  res.json({ success: true, user: updated });
});

// Claim daily reward
router.post('/profile/daily-reward', (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'Missing user ID' });

  const user = db.getUser(id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;

  if (user.lastDailyReward && now - user.lastDailyReward < ONE_DAY) {
    const hoursLeft = Math.ceil((ONE_DAY - (now - user.lastDailyReward)) / (60 * 60 * 1000));
    return res.status(400).json({ error: `Daily reward already claimed. Available in ${hoursLeft} hours.` });
  }

  const rewardXp = 150;
  const updated = db.upsertUser({
    id,
    xp: user.xp + rewardXp,
    lastDailyReward: now,
  });

  res.json({ success: true, rewardXp, user: updated });
});

// Get Leaderboard
router.get('/leaderboard', (req, res) => {
  const leaderboard = db.getLeaderboard(30);
  res.json({ success: true, leaderboard });
});

// Get Match History
router.get('/matches', (req, res) => {
  const userId = req.query.userId as string | undefined;
  const matches = db.getMatchHistory(userId, 30);
  res.json({ success: true, matches });
});

// Check room info by room code
router.get('/rooms/:code', (req, res) => {
  const room = roomManager.getRoomByCode(req.params.code);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json({
    success: true,
    room: {
      id: room.id,
      code: room.code,
      mode: room.mode,
      status: room.status,
      playerCount: Object.values(room.players).filter(Boolean).length,
    },
  });
});

export default router;
