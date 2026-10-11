import React from 'react';
import { ReactionPayload } from '../types/index.js';

interface ReactionOverlayProps {
  reactions: ReactionPayload[];
}

export const ReactionOverlay: React.FC<ReactionOverlayProps> = ({ reactions }) => {
  if (reactions.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {reactions.map((r, idx) => {
        // Random horizontal jitter for organic feel
        const leftPercent = 20 + ((idx * 27 + 13) % 60);

        return (
          <div
            key={`${r.timestamp}-${idx}`}
            className="absolute bottom-16 flex flex-col items-center animate-float select-none transition-all"
            style={{
              left: `${leftPercent}%`,
              animation: 'floatUp 2.5s ease-out forwards',
            }}
          >
            <div className="text-4xl sm:text-5xl drop-shadow-xl animate-bounce">
              {r.emoji}
            </div>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full mt-1 bg-slate-900/90 shadow-md border ${
                r.senderColor === 'red'
                  ? 'text-red-400 border-red-500/50'
                  : r.senderColor === 'green'
                  ? 'text-emerald-400 border-emerald-500/50'
                  : r.senderColor === 'yellow'
                  ? 'text-amber-400 border-amber-500/50'
                  : 'text-blue-400 border-blue-500/50'
              }`}
            >
              {r.senderName}
            </span>
          </div>
        );
      })}

      <style>{`
        @keyframes floatUp {
          0% {
            opacity: 0;
            transform: translateY(40px) scale(0.6);
          }
          20% {
            opacity: 1;
            transform: translateY(0) scale(1.1);
          }
          80% {
            opacity: 1;
            transform: translateY(-160px) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-240px) scale(0.8);
          }
        }
      `}</style>
    </div>
  );
};
