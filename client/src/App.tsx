import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  UserProfile,
  GameState,
  PlayerColor,
  GameMode,
  Room,
  ChatMessage,
  ReactionPayload,
  GameMove,
} from './types/index.js';
import { Navbar } from './components/Navbar.js';
import { HomeScreen } from './components/HomeScreen.js';
import { LobbyScreen } from './components/LobbyScreen.js';
import { GameScreen } from './components/GameScreen.js';
import { ChatPanel } from './components/ChatPanel.js';
import { ReactionOverlay } from './components/ReactionOverlay.js';
import { VictoryModal } from './components/VictoryModal.js';
import { TutorialModal } from './components/TutorialModal.js';
import { LeaderboardModal } from './components/LeaderboardModal.js';
import { ProfileModal } from './components/ProfileModal.js';
import { MatchmakingModal } from './components/MatchmakingModal.js';
import { JoinRoomModal } from './components/JoinRoomModal.js';
import { AuthModal } from './components/AuthModal.js';
import { LudoClientEngine } from './engine/LudoClientEngine.js';
import { soundEffects } from './audio/SoundEffects.js';
import { onFirebaseAuthStateChanged, logOut, syncFirebaseUserWithBackend } from './firebase/authService.js';

type ScreenView = 'home' | 'lobby' | 'game';

export const App: React.FC = () => {
  // User Profile State
  const [user, setUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('ludoverse_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse cached user', e);
      }
    }
    const guestId = `guest_${Math.random().toString(36).slice(2, 10)}`;
    return {
      id: guestId,
      username: `Player_${guestId.slice(-4)}`,
      avatar: 'dice-king',
      isGuest: true,
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      favoriteColor: 'red',
      xp: 0,
      level: 1,
      createdAt: Date.now(),
    };
  });

  // Navigation State
  const [currentView, setCurrentView] = useState<ScreenView>('home');
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Room & Game State
  const [room, setRoom] = useState<Room | null>(null);
  const [myColor, setMyColor] = useState<PlayerColor>('red');
  const [gameState, setGameState] = useState<GameState | null>(null);

  // Chat & Reactions
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [reactions, setReactions] = useState<ReactionPayload[]>([]);

  // Modals
  const [isMatchmakingOpen, setIsMatchmakingOpen] = useState(false);
  const [isJoinRoomOpen, setIsJoinRoomOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isVictoryOpen, setIsVictoryOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Rematch Votes
  const [rematchVotes, setRematchVotes] = useState<string[]>([]);
  const [requiredRematchVotes, setRequiredRematchVotes] = useState(1);

  // Socket reference
  const socketRef = useRef<Socket | null>(null);
  const offlineBotTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize User on Backend if Guest
  useEffect(() => {
    if (user.isGuest) {
      fetch('/api/auth/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          existingId: user.id,
          username: user.username,
          avatar: user.avatar,
        }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.user) {
            setUser(data.user);
            localStorage.setItem('ludoverse_user', JSON.stringify(data.user));
          }
        })
        .catch(err => console.log('Backend sync offline fallback ready', err));
    }
  }, []);

  // Synchronize Firebase Authentication state
  useEffect(() => {
    const unsubscribe = onFirebaseAuthStateChanged(async firebaseUser => {
      if (firebaseUser) {
        try {
          const currentGuestId = user.isGuest ? user.id : undefined;
          const synced = await syncFirebaseUserWithBackend(firebaseUser, currentGuestId);
          setUser(synced);
          localStorage.setItem('ludoverse_user', JSON.stringify(synced));
        } catch (err) {
          console.error('Failed to sync Firebase authenticated user:', err);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Initialize Socket.IO connection
  useEffect(() => {
    const socketUrl = window.location.hostname === 'localhost' ? 'http://localhost:3001' : window.location.origin;
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 10,
    });
    socketRef.current = socket;

    socket.on('room_created', ({ room }: { room: Room }) => {
      setRoom(room);
      setMyColor('red');
      setCurrentView('lobby');
      setIsJoinRoomOpen(false);
    });

    socket.on('room_joined', ({ room, color }: { room: Room; color: PlayerColor }) => {
      setRoom(room);
      setMyColor(color);
      setCurrentView('lobby');
      setIsJoinRoomOpen(false);
      setIsMatchmakingOpen(false);
    });

    socket.on('match_found', ({ room }: { room: Room }) => {
      setRoom(room);
      // Determine my color in this room
      for (const col of ['red', 'green', 'yellow', 'blue'] as PlayerColor[]) {
        if (room.players[col]?.id === user.id) {
          setMyColor(col);
          break;
        }
      }
      setIsMatchmakingOpen(false);
      setCurrentView('lobby');
    });

    socket.on('room_updated', ({ room }: { room: Room }) => {
      setRoom(room);
    });

    socket.on('game_started', ({ room }: { room: Room }) => {
      setRoom(room);
      setGameState(room.gameState);
      setCurrentView('game');
      setIsVictoryOpen(false);
      setRematchVotes([]);
    });

    socket.on('game_state_synced', ({ gameState, rollResult, moveResult }: {
      gameState: GameState;
      rollResult?: number;
      moveResult?: GameMove;
    }) => {
      setGameState(gameState);

      if (rollResult) {
        soundEffects.playDiceResult(rollResult);
      }

      if (moveResult) {
        if (moveResult.capturedToken) {
          soundEffects.playCapture();
        } else if (moveResult.reachedHome) {
          soundEffects.playHomeGoal();
        } else {
          soundEffects.playTokenHop();
        }
      }
    });

    socket.on('chat_message_received', ({ message }: { message: ChatMessage }) => {
      setChatMessages(prev => [...prev, message]);
      soundEffects.playNotification();
      if (!isChatOpen) {
        setUnreadChatCount(c => c + 1);
      }
    });

    socket.on('reaction_received', (payload: ReactionPayload) => {
      setReactions(prev => [...prev.slice(-10), payload]);
      soundEffects.playReaction();
      setTimeout(() => {
        setReactions(prev => prev.filter(r => r.timestamp !== payload.timestamp));
      }, 3000);
    });

    socket.on('rematch_voted', ({ votes, requiredVotes }: { votes: string[]; requiredVotes: number }) => {
      setRematchVotes(votes);
      setRequiredRematchVotes(requiredVotes);
    });

    socket.on('game_completed', ({ winner, room }: { winner: PlayerColor; room: Room }) => {
      setRoom(room);
      setIsVictoryOpen(true);
      // Refresh profile stats
      fetch(`/api/profile/${user.id}`)
        .then(res => res.json())
        .then(d => {
          if (d.success) {
            setUser(d.user);
            localStorage.setItem('ludoverse_user', JSON.stringify(d.user));
          }
        })
        .catch(console.error);
    });

    return () => {
      socket.disconnect();
    };
  }, [user.id, isChatOpen]);

  // Handle URL Invite Link (?join=ROOMCODE)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');
    if (joinCode && socketRef.current) {
      socketRef.current.emit('join_room', {
        roomCodeOrId: joinCode.toUpperCase(),
        user: { id: user.id, name: user.username, avatar: user.avatar },
      });
      // Clean URL param
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [user]);

  // Online Multiplayer Handlers
  const handleCreateRoom = (mode: GameMode) => {
    setIsOfflineMode(false);
    socketRef.current?.emit('create_room', {
      mode,
      user: { id: user.id, name: user.username, avatar: user.avatar },
    });
  };

  const handleJoinRoom = (code: string) => {
    setIsOfflineMode(false);
    socketRef.current?.emit('join_room', {
      roomCodeOrId: code,
      user: { id: user.id, name: user.username, avatar: user.avatar },
    });
  };

  const handleFindMatch = (mode: GameMode) => {
    setIsOfflineMode(false);
    socketRef.current?.emit('find_match', {
      mode,
      user: { id: user.id, name: user.username, avatar: user.avatar },
    });
  };

  const handleAddBot = (color?: PlayerColor) => {
    if (room) {
      socketRef.current?.emit('add_bot', { roomId: room.id, color });
    }
  };

  const handleRemoveSlot = (color: PlayerColor) => {
    if (room) {
      socketRef.current?.emit('remove_slot', { roomId: room.id, color });
    }
  };

  const handleStartOnlineGame = () => {
    if (room) {
      socketRef.current?.emit('start_game', { roomId: room.id });
    }
  };

  const handleOnlineRollDice = () => {
    if (room) {
      socketRef.current?.emit('roll_dice', { roomId: room.id });
    }
  };

  const handleOnlineMoveToken = (tokenId: number) => {
    if (room) {
      socketRef.current?.emit('move_token', { roomId: room.id, tokenId });
    }
  };

  const handleSendChat = (text: string, isQuickChat?: boolean) => {
    if (isOfflineMode) {
      // Local chat in offline mode
      const newMsg: ChatMessage = {
        id: Math.random().toString(),
        roomId: 'offline',
        senderId: user.id,
        senderName: user.username,
        senderColor: myColor,
        senderAvatar: user.avatar,
        text,
        isQuickChat,
        timestamp: Date.now(),
      };
      setChatMessages(prev => [...prev, newMsg]);
      return;
    }

    if (room) {
      socketRef.current?.emit('send_chat', {
        roomId: room.id,
        user: { id: user.id, name: user.username, avatar: user.avatar, color: myColor },
        text,
        isQuickChat,
      });
    }
  };

  const handleSendReaction = (emoji: string) => {
    if (isOfflineMode) {
      const payload: ReactionPayload = {
        roomId: 'offline',
        senderId: user.id,
        senderName: user.username,
        senderColor: myColor,
        emoji,
        timestamp: Date.now(),
      };
      setReactions(prev => [...prev, payload]);
      soundEffects.playReaction();
      setTimeout(() => {
        setReactions(prev => prev.filter(r => r.timestamp !== payload.timestamp));
      }, 3000);
      return;
    }

    if (room) {
      socketRef.current?.emit('send_reaction', {
        roomId: room.id,
        user: { id: user.id, name: user.username, avatar: user.avatar, color: myColor },
        emoji,
      });
    }
  };

  const handleRequestRematch = () => {
    if (isOfflineMode) {
      handleStartOfflinePractice(gameState?.mode || '4p');
      setIsVictoryOpen(false);
      return;
    }
    if (room) {
      socketRef.current?.emit('request_rematch', { roomId: room.id, userId: user.id });
    }
  };

  // Offline / Single Player Practice Mode
  const handleStartOfflinePractice = (mode: GameMode = '4p') => {
    setIsOfflineMode(true);
    setIsMatchmakingOpen(false);
    setMyColor('red');

    const botPlayers = [
      { name: 'RoboPawn', avatar: 'cyber-bot' },
      { name: 'NovaAI', avatar: 'phoenix' },
      { name: 'TitanBot', avatar: 'star-master' },
    ];

    const playersRecord: Record<PlayerColor, any> = {
      red: {
        id: user.id,
        name: user.username,
        avatar: user.avatar,
        color: 'red',
        isHost: true,
        isBot: false,
        isConnected: true,
        ready: true,
      },
      green: mode === '4p' ? {
        id: 'bot_green',
        name: `${botPlayers[0].name} (AI)`,
        avatar: botPlayers[0].avatar,
        color: 'green',
        isHost: false,
        isBot: true,
        isConnected: true,
        ready: true,
      } : null,
      yellow: {
        id: 'bot_yellow',
        name: `${botPlayers[1].name} (AI)`,
        avatar: botPlayers[1].avatar,
        color: 'yellow',
        isHost: false,
        isBot: true,
        isConnected: true,
        ready: true,
      },
      blue: mode === '4p' ? {
        id: 'bot_blue',
        name: `${botPlayers[2].name} (AI)`,
        avatar: botPlayers[2].avatar,
        color: 'blue',
        isHost: false,
        isBot: true,
        isConnected: true,
        ready: true,
      } : null,
    };

    const initial = LudoClientEngine.createInitialState('local_practice', 'PRACTICE', mode, playersRecord);
    setGameState(initial);
    setCurrentView('game');
    setIsVictoryOpen(false);
  };

  // Offline Bot Loop
  useEffect(() => {
    if (!isOfflineMode || !gameState || gameState.status !== 'in_progress') return;

    const currentTurn = gameState.currentTurn;
    const player = gameState.players[currentTurn];

    if (!player || !player.isBot) return;

    if (offlineBotTimeoutRef.current) clearTimeout(offlineBotTimeoutRef.current);

    offlineBotTimeoutRef.current = setTimeout(() => {
      if (!gameState.hasRolled) {
        // Bot Rolls
        const rollRes = LudoClientEngine.handleDiceRoll(gameState);
        soundEffects.playDiceResult(rollRes.state.diceValue || 6);
        setGameState(rollRes.state);

        if (!rollRes.autoAdvanced && rollRes.state.validMoves.length > 0) {
          offlineBotTimeoutRef.current = setTimeout(() => {
            const bestMove = LudoClientEngine.chooseBestMove(rollRes.state);
            if (bestMove !== null) {
              const moveRes = LudoClientEngine.handleMoveToken(rollRes.state, bestMove);
              if (moveRes.moveResult?.capturedToken) {
                soundEffects.playCapture();
              } else if (moveRes.moveResult?.reachedHome) {
                soundEffects.playHomeGoal();
              } else {
                soundEffects.playTokenHop();
              }
              setGameState(moveRes.state);

              if (moveRes.state.status === 'completed') {
                setIsVictoryOpen(true);
              }
            }
          }, 800);
        }
      }
    }, 900);

    return () => {
      if (offlineBotTimeoutRef.current) clearTimeout(offlineBotTimeoutRef.current);
    };
  }, [isOfflineMode, gameState]);

  // Offline Token & Roll Handlers
  const handleOfflineRollDice = () => {
    if (!gameState || gameState.hasRolled) return;
    const rollRes = LudoClientEngine.handleDiceRoll(gameState);
    soundEffects.playDiceResult(rollRes.state.diceValue || 6);
    setGameState(rollRes.state);
  };

  const handleOfflineMoveToken = (tokenId: number) => {
    if (!gameState || !gameState.hasRolled) return;
    const moveRes = LudoClientEngine.handleMoveToken(gameState, tokenId);
    if (moveRes.moveResult?.capturedToken) {
      soundEffects.playCapture();
    } else if (moveRes.moveResult?.reachedHome) {
      soundEffects.playHomeGoal();
    } else {
      soundEffects.playTokenHop();
    }
    setGameState(moveRes.state);

    if (moveRes.state.status === 'completed') {
      setIsVictoryOpen(true);
    }
  };

  // User Profile Update
  const handleUpdateUser = (updated: Partial<UserProfile>) => {
    fetch('/api/profile/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: user.id, ...updated }),
    })
      .then(res => res.json())
      .then(d => {
        if (d.success) {
          setUser(d.user);
          localStorage.setItem('ludoverse_user', JSON.stringify(d.user));
        }
      })
      .catch(console.error);
  };

  // Daily Reward Claim
  const handleClaimDailyReward = () => {
    fetch('/api/profile/daily-reward', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: user.id }),
    })
      .then(res => res.json())
      .then(d => {
        if (d.success) {
          setUser(d.user);
          localStorage.setItem('ludoverse_user', JSON.stringify(d.user));
        }
      })
      .catch(console.error);
  };

  // Handle Sign Out from Firebase
  const handleSignOut = async () => {
    try {
      await logOut();
    } catch (e) {
      console.error('Sign out error', e);
    }
    const guestId = `guest_${Math.random().toString(36).slice(2, 10)}`;
    const guestUser: UserProfile = {
      id: guestId,
      username: `Player_${guestId.slice(-4)}`,
      avatar: 'dice-king',
      isGuest: true,
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      favoriteColor: 'red',
      xp: 0,
      level: 1,
      createdAt: Date.now(),
    };
    setUser(guestUser);
    localStorage.setItem('ludoverse_user', JSON.stringify(guestUser));
    setIsProfileOpen(false);
  };

  // Handle Authentication Success
  const handleAuthSuccess = (authenticatedUser: UserProfile) => {
    setUser(authenticatedUser);
    localStorage.setItem('ludoverse_user', JSON.stringify(authenticatedUser));
    setIsAuthOpen(false);
  };

  // Reset Session
  const handleResetSession = () => {
    localStorage.removeItem('ludoverse_user');
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-purple-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        user={user}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        onOpenTutorial={() => setIsTutorialOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      {/* Main Screen Content */}
      <main className="flex-1 flex flex-col items-center justify-center">
        {currentView === 'home' && (
          <HomeScreen
            user={user}
            onPlayOnline={() => setIsMatchmakingOpen(true)}
            onPlayWithFriends={() => setIsJoinRoomOpen(true)}
            onPlayWithComputer={mode => handleStartOfflinePractice(mode)}
            onOpenTutorial={() => setIsTutorialOpen(true)}
            onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
            onClaimDailyReward={handleClaimDailyReward}
            onOpenAuth={() => setIsAuthOpen(true)}
          />
        )}

        {currentView === 'lobby' && room && (
          <LobbyScreen
            room={room}
            currentUserId={user.id}
            onAddBot={handleAddBot}
            onRemoveSlot={handleRemoveSlot}
            onStartGame={handleStartOnlineGame}
            onLeaveRoom={() => setCurrentView('home')}
          />
        )}

        {currentView === 'game' && gameState && (
          <GameScreen
            gameState={gameState}
            myColor={myColor}
            unreadChatCount={unreadChatCount}
            onRollDice={isOfflineMode ? handleOfflineRollDice : handleOnlineRollDice}
            onMoveToken={isOfflineMode ? handleOfflineMoveToken : handleOnlineMoveToken}
            onOpenChat={() => {
              setIsChatOpen(true);
              setUnreadChatCount(0);
            }}
            onSendReaction={handleSendReaction}
            onLeaveGame={() => {
              if (window.confirm('Are you sure you want to leave this match?')) {
                setCurrentView('home');
              }
            }}
          />
        )}
      </main>

      {/* Floating Reaction Bursts Overlay */}
      <ReactionOverlay reactions={reactions} />

      {/* Live Match Chat Sheet */}
      <ChatPanel
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={chatMessages}
        onSendMessage={handleSendChat}
        onSendReaction={handleSendReaction}
        myColor={myColor}
      />

      {/* Matchmaking Queue Modal */}
      <MatchmakingModal
        isOpen={isMatchmakingOpen}
        onClose={() => setIsMatchmakingOpen(false)}
        onFindMatch={handleFindMatch}
        onStartOfflineAI={handleStartOfflinePractice}
      />

      {/* Join / Create Private Room Modal */}
      <JoinRoomModal
        isOpen={isJoinRoomOpen}
        onClose={() => setIsJoinRoomOpen(false)}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
      />

      {/* Player Profile Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
        onUpdateUser={handleUpdateUser}
        onResetSession={handleResetSession}
        onOpenAuth={() => setIsAuthOpen(true)}
        onSignOut={handleSignOut}
      />

      {/* Firebase Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentGuestId={user.isGuest ? user.id : undefined}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Leaderboard Modal */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        currentUserId={user.id}
      />

      {/* How to Play Tutorial Modal */}
      <TutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
      />

      {/* Victory Celebration Modal */}
      {isVictoryOpen && gameState?.winner && (
        <VictoryModal
          winner={gameState.winner}
          players={gameState.players}
          rankings={gameState.rankings}
          myColor={myColor}
          rematchVotes={rematchVotes}
          requiredVotes={requiredRematchVotes}
          onRequestRematch={handleRequestRematch}
          onGoHome={() => {
            setIsVictoryOpen(false);
            setCurrentView('home');
          }}
        />
      )}
    </div>
  );
};

export default App;
