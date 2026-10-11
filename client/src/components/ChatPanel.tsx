import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, PlayerColor } from '../types/index.js';
import { X, Send, Smile, Volume2, VolumeX } from 'lucide-react';
import { soundEffects } from '../audio/SoundEffects.js';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (text: string, isQuickChat?: boolean) => void;
  onSendReaction: (emoji: string) => void;
  myColor?: PlayerColor;
}

const QUICK_CHATS = [
  'Good luck everyone! 🍀',
  'Nice move! 🎯',
  'Almost there! 🏁',
  'Your turn! ⏰',
  'Well played! 👏',
  'Let\'s play again! 🔄',
];

const REACTION_EMOJIS = ['😂', '😎', '😭', '❤️', '🔥', '🎉', '👍', '👏'];

export const ChatPanel: React.FC<ChatPanelProps> = ({
  isOpen,
  onClose,
  messages,
  onSendMessage,
  onSendReaction,
}) => {
  const [inputText, setInputText] = useState('');
  const [soundMuted, setSoundMuted] = useState(!soundEffects.isEnabled());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const toggleSound = () => {
    const next = !soundMuted;
    setSoundMuted(next);
    soundEffects.setEnabled(!next);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 sm:inset-auto sm:right-6 sm:bottom-6 sm:w-80 sm:max-h-[520px] h-[75vh] sm:h-auto flex flex-col glass-panel rounded-t-3xl sm:rounded-2xl border-slate-700/80 shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <Smile className="w-5 h-5 text-purple-400" />
          <h3 className="font-bold text-sm text-slate-100">Live Match Chat</h3>
          <span className="text-[10px] bg-purple-500/30 text-purple-300 font-semibold px-2 py-0.5 rounded-full">
            Room
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleSound}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            title={soundMuted ? 'Unmute SFX' : 'Mute SFX'}
          >
            {soundMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-slate-300" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Emojis Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900/60 border-b border-slate-800/80 overflow-x-auto gap-1">
        {REACTION_EMOJIS.map(emoji => (
          <button
            key={emoji}
            onClick={() => onSendReaction(emoji)}
            className="text-lg hover:scale-125 transition-transform p-1 rounded-md hover:bg-slate-800 shrink-0"
            title={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2.5 bg-slate-950/40">
        {messages.length === 0 ? (
          <div className="text-center text-xs text-slate-500 py-8">
            Say hello to your fellow players! 🎲
          </div>
        ) : (
          messages.map(msg => {
            const isSystem = msg.senderId === 'system';
            if (isSystem) {
              return (
                <div key={msg.id} className="text-center my-1.5">
                  <span className="text-[11px] bg-slate-800/80 text-purple-300 px-2.5 py-0.5 rounded-full border border-purple-500/20">
                    {msg.text}
                  </span>
                </div>
              );
            }

            return (
              <div key={msg.id} className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <span
                    className={`font-semibold capitalize ${
                      msg.senderColor === 'red'
                        ? 'text-red-400'
                        : msg.senderColor === 'green'
                        ? 'text-emerald-400'
                        : msg.senderColor === 'yellow'
                        ? 'text-amber-400'
                        : 'text-blue-400'
                    }`}
                  >
                    {msg.senderName}
                  </span>
                  <span className="text-[9px] text-slate-500">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="bg-slate-800/90 text-slate-100 text-xs px-3 py-1.5 rounded-xl rounded-tl-sm w-fit max-w-[85%] border border-slate-700/60 break-words shadow-sm">
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Chat Presets */}
      <div className="px-3 py-1.5 bg-slate-900/80 border-t border-slate-800 overflow-x-auto flex gap-1.5 scrollbar-none">
        {QUICK_CHATS.map((qc, i) => (
          <button
            key={i}
            onClick={() => onSendMessage(qc, true)}
            className="text-[11px] bg-slate-800/90 hover:bg-purple-900/50 hover:text-purple-200 text-slate-300 px-2.5 py-1 rounded-full whitespace-nowrap transition border border-slate-700/60"
          >
            {qc}
          </button>
        ))}
      </div>

      {/* Message Input Form */}
      <form onSubmit={handleSend} className="p-2.5 bg-slate-900 border-t border-slate-700/80 flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="Type message..."
          maxLength={150}
          className="flex-1 bg-slate-950 text-slate-100 text-xs rounded-xl px-3 py-2 border border-slate-700 focus:outline-none focus:border-purple-500 transition placeholder:text-slate-500"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white p-2 rounded-xl transition shadow-lg shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
