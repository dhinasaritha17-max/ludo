import React, { useState, useEffect } from 'react';
import { GameMode } from '../types/index.js';
import { Globe, X, Bot, Users } from 'lucide-react';

interface MatchmakingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFindMatch: (mode: GameMode) => void;
  onStartOfflineAI: (mode: GameMode) => void;
}

export const MatchmakingModal: React.FC<MatchmakingModalProps> = ({
  isOpen,
  onClose,
  onFindMatch,
  onStartOfflineAI,
}) => {
  const [mode, setMode] = useState<GameMode>('4p');
  const [isSearching, setIsSearching] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isSearching) {
      setSeconds(0);
      timer = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isSearching]);

  if (!isOpen) return null;

  const handleStartSearch = () => {
    setIsSearching(true);
    onFindMatch(mode);
  };

  const handleCancel = () => {
    setIsSearching(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-md rounded-3xl p-6 sm:p-7 border-purple-500/30 shadow-2xl relative text-center">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/60 mb-5">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-purple-400" />
            <h2 className="text-base font-bold text-white">Online Matchmaking</h2>
          </div>
          <button
            onClick={handleCancel}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSearching ? (
          /* Radar Scanning Animation */
          <div className="py-6 space-y-6">
            <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-purple-500/40 animate-ping" />
              <div className="absolute inset-2 rounded-full border border-pink-500/30 animate-pulse" />
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/50">
                <Globe className="w-8 h-8 text-white animate-spin" style={{ animationDuration: '6s' }} />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Searching for opponents...</h3>
              <p className="text-xs text-slate-400 mt-1">
                Queue Time: <span className="font-mono text-purple-300 font-bold">{seconds}s</span>
              </p>
            </div>

            {/* Instant AI Fill Option */}
            {seconds >= 3 && (
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-700 animate-in fade-in">
                <p className="text-xs text-slate-300 mb-2">Want to jump straight into action?</p>
                <button
                  onClick={() => onStartOfflineAI(mode)}
                  className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition"
                >
                  <Bot className="w-4 h-4" />
                  Fill with Smart AI Bots
                </button>
              </div>
            )}

            <button
              onClick={handleCancel}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
            >
              Cancel Matchmaking
            </button>
          </div>
        ) : (
          /* Mode Selector & Action */
          <div className="space-y-5">
            <p className="text-xs text-slate-300">
              Select player count to match with players worldwide:
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMode('2p')}
                className={`p-4 rounded-2xl border text-center transition ${
                  mode === '2p'
                    ? 'bg-purple-900/40 border-purple-500 ring-2 ring-purple-500/40'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <Users className="w-6 h-6 text-purple-400 mx-auto mb-1.5" />
                <p className="text-sm font-bold text-white">2 Players</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Red vs Yellow Duel</p>
              </button>

              <button
                onClick={() => setMode('4p')}
                className={`p-4 rounded-2xl border text-center transition ${
                  mode === '4p'
                    ? 'bg-purple-900/40 border-purple-500 ring-2 ring-purple-500/40'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <Users className="w-6 h-6 text-pink-400 mx-auto mb-1.5" />
                <p className="text-sm font-bold text-white">4 Players</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Classic 4-Way Battle</p>
              </button>
            </div>

            <button
              onClick={handleStartSearch}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 transition active:scale-98"
            >
              Find Match Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
