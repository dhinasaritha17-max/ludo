import React from 'react';
import { X, Dices, Shield, Swords, Trophy, ArrowRight } from 'lucide-react';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const rules = [
    {
      icon: <Dices className="w-6 h-6 text-purple-400" />,
      title: '1. Exit Base on a 6',
      desc: 'All 4 tokens start in your colored yard. Roll a 6 on the dice to release a token onto your starting square! Rolling a 6 also awards an extra roll.',
    },
    {
      icon: <ArrowRight className="w-6 h-6 text-blue-400" />,
      title: '2. Clockwise Navigation',
      desc: 'Tokens navigate 52 squares clockwise around the outer track. When your turn comes, choose any valid token to advance.',
    },
    {
      icon: <Shield className="w-6 h-6 text-emerald-400" />,
      title: '3. Safe Squares Protect You',
      desc: 'Squares marked with a golden Star (★) as well as the 4 colored start squares are Safe Zones. Tokens on safe squares can NEVER be captured!',
    },
    {
      icon: <Swords className="w-6 h-6 text-rose-400" />,
      title: '4. Capture Opponents for Bonus Turns',
      desc: 'If you land on a non-safe square occupied by an opponent, their token is CAPTURED and returned to their yard! You immediately receive an extra turn.',
    },
    {
      icon: <Trophy className="w-6 h-6 text-amber-400" />,
      title: '5. Exact Roll to Reach Home',
      desc: 'Turn into your private colored home corridor. Tokens require an exact roll to enter the final Center Crown. First player to bring all 4 tokens home wins!',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-lg rounded-3xl p-6 sm:p-7 border-slate-700/80 shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-700/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600/30 text-purple-300 flex items-center justify-center">
              🎲
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">How to Play LudoVerse</h2>
              <p className="text-xs text-slate-400">Official Standard International Rules</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Rules Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-1">
          {rules.map((rule, idx) => (
            <div
              key={idx}
              className="flex gap-3.5 p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 transition"
            >
              <div className="p-2.5 rounded-xl bg-slate-800/80 shrink-0 self-start">
                {rule.icon}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-100">{rule.title}</h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{rule.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-700/60">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm transition shadow-lg shadow-purple-600/30"
          >
            Got it, Let's Play!
          </button>
        </div>
      </div>
    </div>
  );
};
