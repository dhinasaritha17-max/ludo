import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, PlayerColor } from '../types/index.js';
import { X, Send, Smile, Volume2, VolumeX, Trash2, Zap } from 'lucide-react';
import { soundEffects } from '../audio/SoundEffects.js';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (text: string, isQuickChat?: boolean) => void;
  onSendReaction: (emoji: string) => void;
  onClearChat?: () => void;
  myColor?: PlayerColor;
}

const QUICK_CHATS = [
  'Good luck everyone! 🍀',
  'Nice move! 🎯',
  'Almost there! 🏁',
  'Your turn! ⏰',
  'Unbelievable roll! 🎲',
  'Well played! 👏',
  'Good game! 🤝',
  'Rematch after this? 🔥',
];

const EMOJI_PALETTES = [
  { label: 'Reactions', emojis: ['😂', '😎', '😭', '❤️', '🔥', '🎉', '👍', '👏'] },
  { label: 'Playful', emojis: ['🥳', '🤯', '😱', '🤔', '😴', '🍀', '👑', '🎯'] },
];

export const ChatPanel: React.FC<ChatPanelProps> = ({
  isOpen,
  onClose,
  messages,
  onSendMessage,
  onSendReaction,
  onClearChat,
  myColor,
}) => {
  const [inputText, setInputText] = useState('');
  const [soundMuted, setSoundMuted] = useState(!soundEffects.isEnabled());
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeTab, setActiveTab] = useState<'quick' | 'emojis'>('quick');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
    setShowEmojiPicker(false);
  };

  const handleInsertEmoji = (emoji: string) => {
    setInputText(prev => prev + emoji);
  };

  const toggleSound = () => {
    const next = !soundMuted;
    setSoundMuted(next);
    soundEffects.setEnabled(!next);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 sm:inset-auto sm:right-6 sm:bottom-6 sm:w-88 sm:max-h-[560px] h-[78vh] sm:h-auto flex flex-col glass-panel rounded-t-3xl sm:rounded-3xl border-slate-700/80 shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/95 border-b border-slate-700/60">
        <div className="flex items-center gap-2">
          <Smile className="w-5 h-5 text-purple-400" />
          <h3 className="font-bold text-sm text-slate-100">Live Match Chat</h3>
          <span className="text-[10px] bg-purple-500/20 border border-purple-500/30 text-purple-300 font-semibold px-2 py-0.5 rounded-full">
            Room
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {onClearChat && messages.length > 0 && (
            <button
              onClick={onClearChat}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-slate-800 transition"
              title="Clear Local Messages"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

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
            title="Close Chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Reaction Emoji Burst Ribbon */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900/70 border-b border-slate-800 overflow-x-auto gap-1 scrollbar-none">
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 shrink-0 mr-1 flex items-center gap-1">
          <Zap className="w-3 h-3 text-amber-400" /> Burst:
        </span>
        {EMOJI_PALETTES[0].emojis.map(emoji => (
          <button
            key={emoji}
            onClick={() => onSendReaction(emoji)}
            className="text-base sm:text-lg hover:scale-130 active:scale-95 transition-transform p-1 rounded-lg hover:bg-slate-800 shrink-0"
            title={`Burst ${emoji} across the board`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2.5 bg-slate-950/50">
        {messages.length === 0 ? (
          <div className="text-center text-xs text-slate-500 py-10 flex flex-col items-center gap-2">
            <span className="text-2xl">🎲</span>
            <p>No messages yet. Say hello or tap a quick message!</p>
          </div>
        ) : (
          messages.map(msg => {
            const isSystem = msg.senderId === 'system';
            if (isSystem) {
              return (
                <div key={msg.id} className="text-center my-1.5">
                  <span className="text-[10px] bg-slate-800/90 text-purple-300 px-3 py-1 rounded-full border border-purple-500/20 font-medium shadow-sm">
                    {msg.text}
                  </span>
                </div>
              );
            }

            const isMe = myColor && msg.senderColor === myColor;

            return (
              <div key={msg.id} className={`flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 px-1">
                  <span
                    className={`font-bold capitalize ${
                      msg.senderColor === 'red'
                        ? 'text-red-400'
                        : msg.senderColor === 'green'
                        ? 'text-emerald-400'
                        : msg.senderColor === 'yellow'
                        ? 'text-amber-400'
                        : 'text-blue-400'
                    }`}
                  >
                    {msg.senderName} {isMe ? '(You)' : ''}
                  </span>
                  <span className="text-[9px] text-slate-500">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div
                  className={`text-xs px-3.5 py-2 rounded-2xl w-fit max-w-[85%] break-words shadow-sm ${
                    isMe
                      ? 'bg-purple-600 text-white rounded-tr-xs'
                      : 'bg-slate-800/95 text-slate-100 rounded-tl-xs border border-slate-700/60'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Tabs for Quick Chats & Emoji Drawer */}
      <div className="bg-slate-900 border-t border-slate-800">
        <div className="flex items-center justify-between px-3 pt-2 text-[11px] font-bold">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('quick')}
              className={`pb-1 border-b-2 transition ${
                activeTab === 'quick' ? 'border-purple-500 text-purple-300' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Quick Messages
            </button>
            <button
              onClick={() => setActiveTab('emojis')}
              className={`pb-1 border-b-2 transition ${
                activeTab === 'emojis' ? 'border-purple-500 text-purple-300' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Emoji Tray
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'quick' ? (
          <div className="px-3 py-2 overflow-x-auto flex gap-1.5 scrollbar-none">
            {QUICK_CHATS.map((qc, i) => (
              <button
                key={i}
                onClick={() => onSendMessage(qc, true)}
                className="text-[11px] bg-slate-800/90 hover:bg-purple-900/40 hover:text-purple-200 hover:border-purple-500/40 text-slate-300 px-3 py-1 rounded-full whitespace-nowrap transition border border-slate-700/60"
              >
                {qc}
              </button>
            ))}
          </div>
        ) : (
          <div className="p-2.5 grid grid-cols-8 gap-1.5 max-h-24 overflow-y-auto">
            {EMOJI_PALETTES.flatMap(p => p.emojis).map((emoji, idx) => (
              <button
                key={idx}
                onClick={() => handleInsertEmoji(emoji)}
                className="text-lg hover:bg-slate-800 p-1 rounded-lg text-center transition"
                title={`Add ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Message Input Form */}
      <form onSubmit={handleSend} className="p-2.5 bg-slate-900 border-t border-slate-700/80 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab(prev => (prev === 'emojis' ? 'quick' : 'emojis'))}
          className="p-2 rounded-xl text-slate-400 hover:text-purple-300 hover:bg-slate-800 transition shrink-0"
          title="Toggle Emojis"
        >
          <Smile className="w-4 h-4" />
        </button>

        <input
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="Type message to room..."
          maxLength={200}
          className="flex-1 bg-slate-950 text-slate-100 text-xs rounded-xl px-3 py-2 border border-slate-700 focus:outline-none focus:border-purple-500 transition placeholder:text-slate-500"
        />

        <button
          type="submit"
          disabled={!inputText.trim()}
          className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white p-2 rounded-xl transition shadow-lg shrink-0 cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
