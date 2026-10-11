import React, { useState } from 'react';
import { GameMode } from '../types/index.js';
import { X, Users, KeyRound, Plus, ArrowRight } from 'lucide-react';

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (mode: GameMode) => void;
  onJoinRoom: (code: string) => void;
}

export const JoinRoomModal: React.FC<JoinRoomModalProps> = ({
  isOpen,
  onClose,
  onCreateRoom,
  onJoinRoom,
}) => {
  const [tab, setTab] = useState<'join' | 'create'>('create');
  const [roomCode, setRoomCode] = useState('');
  const [createMode, setCreateMode] = useState<GameMode>('4p');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }
    setError('');
    onJoinRoom(roomCode.trim().toUpperCase());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-md rounded-3xl p-6 sm:p-7 border-purple-500/30 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/60 mb-5">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" />
            <h2 className="text-base font-bold text-white">Play with Friends</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900 rounded-2xl border border-slate-800 mb-5">
          <button
            onClick={() => { setTab('create'); setError(''); }}
            className={`py-2 text-xs font-bold rounded-xl transition ${
              tab === 'create'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Create Room
          </button>
          <button
            onClick={() => { setTab('join'); setError(''); }}
            className={`py-2 text-xs font-bold rounded-xl transition ${
              tab === 'join'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Join with Code
          </button>
        </div>

        {tab === 'create' ? (
          /* Create Room Form */
          <div className="space-y-4">
            <p className="text-xs text-slate-300">
              Pick match format for your private lobby:
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setCreateMode('2p')}
                className={`p-3.5 rounded-2xl border text-center transition ${
                  createMode === '2p'
                    ? 'bg-purple-900/40 border-purple-500 ring-2 ring-purple-500/40'
                    : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <p className="text-sm font-bold text-white">2 Players</p>
                <p className="text-[10px] text-slate-400">Head-to-Head</p>
              </button>

              <button
                type="button"
                onClick={() => setCreateMode('4p')}
                className={`p-3.5 rounded-2xl border text-center transition ${
                  createMode === '4p'
                    ? 'bg-purple-900/40 border-purple-500 ring-2 ring-purple-500/40'
                    : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <p className="text-sm font-bold text-white">4 Players</p>
                <p className="text-[10px] text-slate-400">Classic Battle</p>
              </button>
            </div>

            <button
              onClick={() => onCreateRoom(createMode)}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 transition flex items-center justify-center gap-2 active:scale-98"
            >
              <Plus className="w-4 h-4" />
              Create Private Room
            </button>
          </div>
        ) : (
          /* Join Room Form */
          <form onSubmit={handleJoin} className="space-y-4">
            <p className="text-xs text-slate-300">
              Enter the 6-character room code from your friend:
            </p>

            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={roomCode}
                onChange={e => {
                  setRoomCode(e.target.value.toUpperCase());
                  setError('');
                }}
                maxLength={8}
                placeholder="e.g. STAR42"
                className="w-full bg-slate-900 border border-slate-700 text-white font-mono text-center tracking-widest text-lg font-bold rounded-2xl py-3 pl-9 pr-4 focus:outline-none focus:border-purple-500 transition placeholder:text-slate-600 uppercase"
              />
            </div>

            {error && <p className="text-xs text-rose-400 text-center font-medium">{error}</p>}

            <button
              type="submit"
              disabled={!roomCode.trim()}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white font-bold text-sm shadow-lg shadow-purple-600/30 transition flex items-center justify-center gap-2 active:scale-98"
            >
              <ArrowRight className="w-4 h-4" />
              Enter Room
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
