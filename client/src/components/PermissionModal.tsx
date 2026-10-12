import React, { useState } from 'react';
import { Mic, Video, Volume2, ShieldCheck, X } from 'lucide-react';

interface PermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (enableAudio: boolean, enableVideo: boolean) => void;
}

export const PermissionModal: React.FC<PermissionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [enableAudio, setEnableAudio] = useState(true);
  const [enableVideo, setEnableVideo] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md p-6 bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden glass-card">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 bg-purple-600/20 border border-purple-500/40 rounded-2xl text-purple-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-white">Join Live Voice & Video</h3>
            <p className="text-xs text-slate-400">Speak and see opponents during your match</p>
          </div>
        </div>

        {/* Privacy Note */}
        <div className="p-3.5 mb-5 rounded-2xl bg-purple-950/30 border border-purple-500/20 text-xs text-purple-200 leading-relaxed">
          <strong className="font-semibold text-purple-300">Privacy Notice: </strong>
          Camera and microphone are completely optional and OFF by default. Your device will only be accessed when you choose to connect.
        </div>

        {/* Options */}
        <div className="space-y-3 mb-6">
          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 transition cursor-pointer">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${enableAudio ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700/40 text-slate-400'}`}>
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-200">Microphone (Voice Chat)</p>
                <p className="text-[11px] text-slate-400">Allow players to hear you talk</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={enableAudio}
              onChange={e => setEnableAudio(e.target.checked)}
              className="w-5 h-5 rounded accent-purple-600 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 transition cursor-pointer">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${enableVideo ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-700/40 text-slate-400'}`}>
                <Video className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-200">Camera (Video Chat)</p>
                <p className="text-[11px] text-slate-400">Show your live video tile</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={enableVideo}
              onChange={e => setEnableVideo(e.target.checked)}
              className="w-5 h-5 rounded accent-purple-600 cursor-pointer"
            />
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => onConfirm(enableAudio, enableVideo)}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 transition active:scale-98"
          >
            {enableAudio && enableVideo
              ? 'Connect Voice & Video'
              : enableAudio
              ? 'Connect Voice Only'
              : enableVideo
              ? 'Connect Video Only'
              : 'Join as Listener'}
          </button>

          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl text-slate-400 hover:text-slate-200 text-xs font-semibold hover:bg-slate-800/50 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
