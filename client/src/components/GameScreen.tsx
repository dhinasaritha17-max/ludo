import React, { useState, useEffect } from 'react';
import { GameState, PlayerColor, Player, GameMove } from '../types/index.js';
import { LudoBoard } from './LudoBoard.js';
import { Dice } from './Dice.js';
import { PlayerCard } from './PlayerCard.js';
import { MessageSquare, ArrowLeft, Info, Video, Mic, Radio } from 'lucide-react';
import { soundEffects } from '../audio/SoundEffects.js';
import { MediaPanel } from './MediaPanel.js';
import { PermissionModal } from './PermissionModal.js';
import { WebRTCState } from '../webrtc/WebRTCManager.js';

interface GameScreenProps {
  gameState: GameState;
  myColor?: PlayerColor;
  myUserName: string;
  unreadChatCount: number;
  lastMove?: GameMove | null;
  isMultiplayerRolling?: boolean;
  onRollDice: () => void;
  onMoveToken: (tokenId: number) => void;
  onOpenChat: () => void;
  onSendReaction: (emoji: string) => void;
  onLeaveGame: () => void;
  webrtcState: WebRTCState;
  onJoinCall: (enableAudio: boolean, enableVideo: boolean) => void;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onLeaveCall: () => void;
}

const QUICK_EMOJIS = ['😂', '😎', '😭', '❤️', '🔥', '🎉', '👍', '👏'];

export const GameScreen: React.FC<GameScreenProps> = ({
  gameState,
  myColor,
  myUserName,
  unreadChatCount,
  lastMove,
  isMultiplayerRolling = false,
  onRollDice,
  onMoveToken,
  onOpenChat,
  onSendReaction,
  onLeaveGame,
  webrtcState,
  onJoinCall,
  onToggleAudio,
  onToggleVideo,
  onLeaveCall,
}) => {
  const [localRolling, setLocalRolling] = useState(false);
  const [isBoardAnimating, setIsBoardAnimating] = useState(false);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);

  const activeColor = gameState.currentTurn;
  const isMyTurn = myColor ? activeColor === myColor : true;
  const isRolling = localRolling || isMultiplayerRolling;
  const canRoll = isMyTurn && !gameState.hasRolled && gameState.status === 'in_progress' && !isBoardAnimating;
  const canMove = isMyTurn && gameState.hasRolled && gameState.validMoves.length > 0 && !isBoardAnimating;

  // Clear local rolling state when diceValue arrives
  useEffect(() => {
    if (gameState.hasRolled) {
      setLocalRolling(false);
    }
  }, [gameState.hasRolled, gameState.diceValue]);

  const handleDiceRoll = () => {
    if (!canRoll || isRolling) return;
    setLocalRolling(true);
    soundEffects.playDiceShake();
    onRollDice();

    // Safety timeout in case of network latency
    setTimeout(() => {
      setLocalRolling(false);
    }, 1500);
  };

  const handleTokenClick = (tokenId: number) => {
    if (!canMove || isBoardAnimating) return;
    onMoveToken(tokenId);
  };

  const getActionBannerText = (): string => {
    const activePlayer = gameState.players[activeColor];
    const name = isMyTurn ? 'Your' : `${activePlayer?.name || activeColor}'s`;

    if (isBoardAnimating) {
      return '🏃 Moving token along the board...';
    }

    if (!gameState.hasRolled) {
      return isMyTurn ? '🎲 Your turn! Tap the dice to roll.' : `Waiting for ${activePlayer?.name || activeColor} to roll...`;
    }

    if (canMove) {
      return `✨ Rolled a ${gameState.diceValue}! Select a glowing token to move.`;
    }

    if (gameState.lastAction) {
      return gameState.lastAction.description;
    }

    return `${name} turn in progress.`;
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-2 sm:px-4 py-3 sm:py-6 flex flex-col items-center select-none animate-in fade-in duration-300 relative">
      {/* Top Header Bar */}
      <div className="w-full flex items-center justify-between mb-3 px-2">
        <button
          onClick={onLeaveGame}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Leave Match
        </button>

        <div className="flex items-center gap-2">
          {gameState.roomCode && (
            <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-900 text-purple-300 border border-slate-800">
              Room: {gameState.roomCode}
            </span>
          )}

          {/* Optional Voice & Video Call Trigger */}
          {!webrtcState.isInCall ? (
            <button
              onClick={() => setIsPermissionModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition cursor-pointer"
              title="Join Voice & Video Chat"
            >
              <Video className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Voice & Video</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="hidden sm:inline">Call Live</span>
            </div>
          )}

          {/* Chat Drawer Toggle Button */}
          <button
            onClick={onOpenChat}
            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 text-xs font-bold transition cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Chat</span>
            {unreadChatCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center -top-1 -right-1 absolute animate-pulse">
                {unreadChatCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
      <div className="w-full max-w-xl mx-auto mb-3 px-4 py-2 rounded-2xl glass-panel text-center border-slate-700/60 shadow-lg">
        <p className="text-xs sm:text-sm font-bold text-slate-200 flex items-center justify-center gap-2">
          <Info className="w-4 h-4 text-purple-400 shrink-0" />
          {getActionBannerText()}
        </p>
      </div>

      {/* Main Game Layout */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-4 gap-4 items-center">
        {/* Left Side: Top-Left (Red) & Bottom-Left (Blue) Players */}
        <div className="hidden lg:flex flex-col gap-4">
          <PlayerCard
            color="red"
            player={gameState.players.red}
            isActiveTurn={activeColor === 'red'}
            tokens={gameState.tokens.red || []}
            turnDeadline={gameState.turnDeadline}
            totalTurnSeconds={gameState.turnTimeoutSeconds}
          />
          <PlayerCard
            color="blue"
            player={gameState.players.blue}
            isActiveTurn={activeColor === 'blue'}
            tokens={gameState.tokens.blue || []}
            turnDeadline={gameState.turnDeadline}
            totalTurnSeconds={gameState.turnTimeoutSeconds}
          />
        </div>

        {/* Center: Ludo Board & Dice */}
        <div className="lg:col-span-2 flex flex-col items-center">
          {/* Mobile Top Players Row */}
          <div className="grid grid-cols-2 gap-2 w-full max-w-md lg:hidden mb-2">
            <PlayerCard
              color="red"
              player={gameState.players.red}
              isActiveTurn={activeColor === 'red'}
              tokens={gameState.tokens.red || []}
              turnDeadline={gameState.turnDeadline}
              totalTurnSeconds={gameState.turnTimeoutSeconds}
            />
            <PlayerCard
              color="green"
              player={gameState.players.green}
              isActiveTurn={activeColor === 'green'}
              tokens={gameState.tokens.green || []}
              turnDeadline={gameState.turnDeadline}
              totalTurnSeconds={gameState.turnTimeoutSeconds}
            />
          </div>

          {/* Scalable SVG Ludo Board with Box-by-Box Step Animation */}
          <LudoBoard
            gameState={gameState}
            myColor={myColor}
            onTokenClick={handleTokenClick}
            lastMove={lastMove}
            onAnimationStateChange={setIsBoardAnimating}
          />

          {/* Mobile Bottom Players Row */}
          <div className="grid grid-cols-2 gap-2 w-full max-w-md lg:hidden mt-2">
            <PlayerCard
              color="blue"
              player={gameState.players.blue}
              isActiveTurn={activeColor === 'blue'}
              tokens={gameState.tokens.blue || []}
              turnDeadline={gameState.turnDeadline}
              totalTurnSeconds={gameState.turnTimeoutSeconds}
            />
            <PlayerCard
              color="yellow"
              player={gameState.players.yellow}
              isActiveTurn={activeColor === 'yellow'}
              tokens={gameState.tokens.yellow || []}
              turnDeadline={gameState.turnDeadline}
              totalTurnSeconds={gameState.turnTimeoutSeconds}
            />
          </div>

          {/* Bottom Interactive Controls: 3D Dice & Quick Reactions */}
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md">
            <Dice
              value={gameState.diceValue}
              isRolling={isRolling}
              canRoll={canRoll}
              activeColor={activeColor}
              onRoll={handleDiceRoll}
            />

            {/* Quick Emoji Reaction Pill Bar */}
            <div className="flex items-center gap-1.5 p-2 rounded-2xl glass-card border border-slate-800">
              {QUICK_EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => onSendReaction(emoji)}
                  className="text-xl sm:text-2xl hover:scale-130 active:scale-95 transition-transform p-1 rounded-lg hover:bg-slate-800/80 cursor-pointer"
                  title={`React ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Top-Right (Green) & Bottom-Right (Yellow) Players */}
        <div className="hidden lg:flex flex-col gap-4">
          <PlayerCard
            color="green"
            player={gameState.players.green}
            isActiveTurn={activeColor === 'green'}
            tokens={gameState.tokens.green || []}
            turnDeadline={gameState.turnDeadline}
            totalTurnSeconds={gameState.turnTimeoutSeconds}
          />
          <PlayerCard
            color="yellow"
            player={gameState.players.yellow}
            isActiveTurn={activeColor === 'yellow'}
            tokens={gameState.tokens.yellow || []}
            turnDeadline={gameState.turnDeadline}
            totalTurnSeconds={gameState.turnTimeoutSeconds}
          />
        </div>
      </div>

      {/* Floating Video & Voice Chat Panel */}
      <MediaPanel
        webrtcState={webrtcState}
        myColor={myColor}
        myUserName={myUserName}
        onToggleAudio={onToggleAudio}
        onToggleVideo={onToggleVideo}
        onLeaveCall={onLeaveCall}
      />

      {/* Permission Request Modal */}
      <PermissionModal
        isOpen={isPermissionModalOpen}
        onClose={() => setIsPermissionModalOpen(false)}
        onConfirm={(audio, video) => {
          setIsPermissionModalOpen(false);
          onJoinCall(audio, video);
        }}
      />
    </div>
  );
};
