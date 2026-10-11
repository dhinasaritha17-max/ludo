import React, { useState } from 'react';
import { PlayerColor, Room } from '../types/index.js';
import { Copy, Check, Users, Crown, Bot, UserPlus, Play, ArrowLeft } from 'lucide-react';

interface LobbyScreenProps {
  room: Room;
  currentUserId: string;
  onAddBot: (color?: PlayerColor) => void;
  onRemoveSlot: (color: PlayerColor) => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
}

const AVATAR_EMOJIS: Record<string, string> = {
  'dice-king': '👑',
  'star-master': '⭐',
  'phoenix': '🔥',
  'cyber-bot': '🤖',
  'trophy-hunter': '🏆',
  'ninja': '🥷',
  'wizard': '🧙‍♂️',
  'dragon': '🐉',
};

const COLOR_CONFIG: Record<PlayerColor, {
  name: string;
  bg: string;
  border: string;
  badge: string;
  text: string;
}> = {
  red: { name: 'Red', bg: 'from-red-950/60 to-slate-900', border: 'border-red-500/60', badge: 'bg-red-500', text: 'text-red-400' },
  green: { name: 'Green', bg: 'from-emerald-950/60 to-slate-900', border: 'border-emerald-500/60', badge: 'bg-emerald-500', text: 'text-emerald-400' },
  yellow: { name: 'Yellow', bg: 'from-amber-950/60 to-slate-900', border: 'border-amber-500/60', badge: 'bg-amber-500', text: 'text-amber-400' },
  blue: { name: 'Blue', bg: 'from-blue-950/60 to-slate-900', border: 'border-blue-500/60', badge: 'bg-blue-500', text: 'text-blue-400' },
};

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  room,
  currentUserId,
  onAddBot,
  onRemoveSlot,
  onStartGame,
  onLeaveRoom,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const isHost = room.hostId === currentUserId;
  const activeColors: PlayerColor[] = room.mode === '2p' ? ['red', 'yellow'] : ['red', 'green', 'yellow', 'blue'];

  const allFilled = activeColors.every(c => room.players[c] !== null);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}?join=${room.code}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="w-full max-w-xl mx-auto p-4 sm:p-6 space-y-6 animate-in fade-in duration-300">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onLeaveRoom}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Leave Room
        </button>
        <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-900/50 text-purple-300 border border-purple-500/30">
          {room.mode.toUpperCase()} Match
        </span>
      </div>

      {/* Room Code Card */}
      <div className="glass-panel rounded-3xl p-6 text-center border-purple-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/10 rounded-full blur-2xl pointer-events-none" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
          Private Room Code
        </p>
        <div className="text-4xl sm:text-5xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-300 to-indigo-400 my-2 select-all font-mono">
          {room.code}
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Share this code with friends or copy the invite link below.
        </p>

        {/* Share Action Buttons */}
        <div className="flex justify-center gap-2.5">
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedCode ? 'Code Copied!' : 'Copy Code'}
          </button>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-xs font-bold text-purple-300 border border-purple-500/40 transition"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Users className="w-3.5 h-3.5" />}
            {copiedLink ? 'Link Copied!' : 'Share Link'}
          </button>
        </div>
      </div>

      {/* Player Slots */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-slate-200">
            Player Slots ({Object.values(room.players).filter(Boolean).length}/{activeColors.length})
          </h3>
          {isHost && !allFilled && (
            <button
              onClick={() => onAddBot()}
              className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 hover:text-cyan-300 px-3 py-1 rounded-xl bg-cyan-950/40 border border-cyan-800/50 transition"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add AI Bot
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {activeColors.map(color => {
            const player = room.players[color];
            const cfg = COLOR_CONFIG[color];

            if (!player) {
              return (
                <div
                  key={color}
                  className="glass-card rounded-2xl p-4 border border-dashed border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 text-sm">
                      ?
                    </div>
                    <div>
                      <p className={`text-xs font-bold ${cfg.text}`}>{cfg.name}</p>
                      <p className="text-[11px] text-slate-500">Waiting for player...</p>
                    </div>
                  </div>

                  {isHost && (
                    <button
                      onClick={() => onAddBot(color)}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center gap-1"
                    >
                      <Bot className="w-3 h-3 text-cyan-400" />
                      +Bot
                    </button>
                  )}
                </div>
              );
            }

            return (
              <div
                key={color}
                className={`glass-card rounded-2xl p-4 bg-gradient-to-br ${cfg.bg} border ${cfg.border} flex items-center justify-between shadow-lg`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-11 h-11 rounded-full bg-slate-900 flex items-center justify-center text-xl shadow-inner border border-white/10">
                      {AVATAR_EMOJIS[player.avatar] || '🎲'}
                    </div>
                    <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${cfg.badge}`} />
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs sm:text-sm font-bold text-white truncate max-w-[120px]">
                        {player.name}
                      </p>
                      {player.isHost && <span title="Host"><Crown className="w-3.5 h-3.5 text-amber-400" /></span>}
                      {player.isBot && <span title="Computer"><Bot className="w-3.5 h-3.5 text-cyan-400" /></span>}
                    </div>
                    <p className={`text-[11px] font-semibold ${cfg.text}`}>{cfg.name}</p>
                  </div>
                </div>

                {isHost && player.id !== currentUserId && (
                  <button
                    onClick={() => onRemoveSlot(color)}
                    className="text-[11px] text-slate-400 hover:text-rose-400 px-2 py-1 rounded-md hover:bg-slate-800 transition"
                  >
                    Remove
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Start Game Action for Host */}
      <div className="pt-2">
        {isHost ? (
          <button
            onClick={onStartGame}
            disabled={!allFilled}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-xl shadow-purple-600/30 transition active:scale-98 cursor-pointer disabled:cursor-not-allowed"
          >
            <Play className="w-5 h-5 fill-current" />
            {allFilled ? 'Start Match Now' : 'Fill All Slots to Start'}
          </button>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center text-xs text-slate-300 flex items-center justify-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            Waiting for room host to start the game...
          </div>
        )}
      </div>
    </div>
  );
};
