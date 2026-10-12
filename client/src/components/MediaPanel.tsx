import React, { useEffect, useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Minimize2,
  Maximize2,
  Users,
  Radio,
  AlertCircle,
} from 'lucide-react';
import { PlayerColor } from '../types/index.js';
import { RemoteParticipant, WebRTCState } from '../webrtc/WebRTCManager.js';

interface MediaPanelProps {
  webrtcState: WebRTCState;
  myColor?: PlayerColor;
  myUserName: string;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onLeaveCall: () => void;
}

const COLOR_BORDER: Record<PlayerColor, string> = {
  red: 'border-red-500 shadow-red-500/30',
  green: 'border-emerald-500 shadow-emerald-500/30',
  yellow: 'border-amber-500 shadow-amber-500/30',
  blue: 'border-blue-500 shadow-blue-500/30',
};

const COLOR_BG: Record<PlayerColor, string> = {
  red: 'bg-red-500/20 text-red-300',
  green: 'bg-emerald-500/20 text-emerald-300',
  yellow: 'bg-amber-500/20 text-amber-300',
  blue: 'bg-blue-500/20 text-blue-300',
};

// Video Tile for Local Player
const LocalVideoTile: React.FC<{
  stream: MediaStream | null;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isSpeaking: boolean;
  userName: string;
  color?: PlayerColor;
}> = ({ stream, isVideoEnabled, isAudioEnabled, isSpeaking, userName, color = 'red' }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, isVideoEnabled]);

  return (
    <div
      className={`relative rounded-2xl overflow-hidden bg-slate-900 border-2 transition-all duration-300 aspect-video w-32 sm:w-40 flex items-center justify-center shrink-0 shadow-lg ${
        isSpeaking ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-950 scale-102' : 'border-slate-700/80'
      } ${COLOR_BORDER[color]}`}
    >
      {isVideoEnabled && stream && stream.getVideoTracks().length > 0 ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover scale-x-[-1]"
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-1 p-2">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black ${COLOR_BG[color]} ${
              isSpeaking ? 'animate-pulse scale-110 ring-2 ring-emerald-400' : ''
            }`}
          >
            {userName.slice(0, 2).toUpperCase()}
          </div>
          <span className="text-[10px] text-slate-400 font-medium truncate max-w-[80px]">Camera Off</span>
        </div>
      )}

      {/* Badges Overlay */}
      <div className="absolute top-1.5 right-1.5 flex items-center gap-1 z-10">
        <span
          className={`p-1 rounded-md text-[10px] ${
            isAudioEnabled ? 'bg-emerald-500/80 text-white' : 'bg-rose-500/80 text-white'
          }`}
          title={isAudioEnabled ? 'Microphone Active' : 'Microphone Muted'}
        >
          {isAudioEnabled ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
        </span>
        <span
          className={`p-1 rounded-md text-[10px] ${
            isVideoEnabled ? 'bg-purple-500/80 text-white' : 'bg-slate-800/80 text-slate-400'
          }`}
          title={isVideoEnabled ? 'Camera Active' : 'Camera Off'}
        >
          {isVideoEnabled ? <Video className="w-3 h-3" /> : <VideoOff className="w-3 h-3" />}
        </span>
      </div>

      {/* Name Label */}
      <div className="absolute bottom-1 left-1.5 right-1.5 bg-slate-950/70 backdrop-blur-xs rounded-md px-1.5 py-0.5 flex items-center justify-between text-[10px] font-bold text-slate-200">
        <span className="truncate max-w-[70px]">{userName} (You)</span>
        <span className={`text-[8px] font-extrabold uppercase ${COLOR_BG[color]} px-1 rounded`}>
          {color}
        </span>
      </div>
    </div>
  );
};

// Video Tile for Remote Participant
const RemoteVideoTile: React.FC<{
  participant: RemoteParticipant;
}> = ({ participant }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const color = participant.color || 'blue';

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream, participant.videoEnabled]);

  return (
    <div
      className={`relative rounded-2xl overflow-hidden bg-slate-900 border-2 transition-all duration-300 aspect-video w-32 sm:w-40 flex items-center justify-center shrink-0 shadow-lg ${
        participant.isSpeaking
          ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-950 scale-102'
          : 'border-slate-700/80'
      } ${COLOR_BORDER[color]}`}
    >
      {participant.videoEnabled && participant.stream && participant.stream.getVideoTracks().length > 0 ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-1 p-2">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black ${COLOR_BG[color]} ${
              participant.isSpeaking ? 'animate-pulse scale-110 ring-2 ring-emerald-400' : ''
            }`}
          >
            {participant.name.slice(0, 2).toUpperCase()}
          </div>
          <span className="text-[10px] text-slate-400 font-medium truncate max-w-[80px]">Camera Off</span>
        </div>
      )}

      {/* Badges Overlay */}
      <div className="absolute top-1.5 right-1.5 flex items-center gap-1 z-10">
        <span
          className={`p-1 rounded-md text-[10px] ${
            participant.audioEnabled ? 'bg-emerald-500/80 text-white' : 'bg-rose-500/80 text-white'
          }`}
          title={participant.audioEnabled ? 'Microphone Active' : 'Microphone Muted'}
        >
          {participant.audioEnabled ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
        </span>
        <span
          className={`p-1 rounded-md text-[10px] ${
            participant.videoEnabled ? 'bg-purple-500/80 text-white' : 'bg-slate-800/80 text-slate-400'
          }`}
          title={participant.videoEnabled ? 'Camera Active' : 'Camera Off'}
        >
          {participant.videoEnabled ? <Video className="w-3 h-3" /> : <VideoOff className="w-3 h-3" />}
        </span>
      </div>

      {/* Name Label */}
      <div className="absolute bottom-1 left-1.5 right-1.5 bg-slate-950/70 backdrop-blur-xs rounded-md px-1.5 py-0.5 flex items-center justify-between text-[10px] font-bold text-slate-200">
        <span className="truncate max-w-[70px]">{participant.name}</span>
        <span className={`text-[8px] font-extrabold uppercase ${COLOR_BG[color]} px-1 rounded`}>
          {color}
        </span>
      </div>
    </div>
  );
};

export const MediaPanel: React.FC<MediaPanelProps> = ({
  webrtcState,
  myColor = 'red',
  myUserName,
  onToggleAudio,
  onToggleVideo,
  onLeaveCall,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const { isInCall, isAudioEnabled, isVideoEnabled, localStream, remoteParticipants, isLocalSpeaking, errorMessage } = webrtcState;

  if (!isInCall) return null;

  const participantsList = Array.from(remoteParticipants.values());
  const totalCallers = 1 + participantsList.length;

  return (
    <div
      className={`fixed z-40 transition-all duration-300 ${
        isMinimized
          ? 'bottom-4 left-4 right-4 sm:right-auto sm:w-auto'
          : 'bottom-3 sm:bottom-6 inset-x-2 sm:inset-x-auto sm:right-6 sm:w-auto max-w-[95vw]'
      }`}
    >
      {/* Minimized Pill Bar */}
      {isMinimized ? (
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl glass-panel bg-slate-900/95 border-purple-500/40 shadow-2xl">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-slate-200">
              Live Call ({totalCallers})
            </span>
          </div>

          <div className="h-4 w-px bg-slate-700 mx-1" />

          {/* Quick Mic Toggle */}
          <button
            onClick={onToggleAudio}
            className={`p-1.5 rounded-lg transition ${
              isAudioEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
            }`}
            title={isAudioEnabled ? 'Mute Mic' : 'Unmute Mic'}
          >
            {isAudioEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
          </button>

          {/* Quick Video Toggle */}
          <button
            onClick={onToggleVideo}
            className={`p-1.5 rounded-lg transition ${
              isVideoEnabled ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-800 text-slate-400'
            }`}
            title={isVideoEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
          >
            {isVideoEnabled ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
          </button>

          {/* Expand */}
          <button
            onClick={() => setIsMinimized(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Expand Video Panel"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          {/* Hangup */}
          <button
            onClick={onLeaveCall}
            className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition shadow-sm"
            title="Leave Call"
          >
            <PhoneOff className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        /* Full Expanded Panel */
        <div className="glass-panel rounded-3xl border border-slate-700/80 shadow-2xl p-3 bg-slate-900/95 flex flex-col gap-2.5 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-1 pb-1 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold text-slate-200">
                Live Video & Voice ({totalCallers})
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsMinimized(true)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                title="Minimize Video Panel"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                onClick={onLeaveCall}
                className="p-1.5 text-rose-400 hover:text-white hover:bg-rose-600 rounded-lg transition"
                title="Leave Call"
              >
                <PhoneOff className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Error notice if any */}
          {errorMessage && (
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-[11px] text-rose-300">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{errorMessage}</span>
            </div>
          )}

          {/* Video / Avatar Tiles Grid */}
          <div className="flex gap-2 overflow-x-auto py-1 max-w-full scrollbar-none items-center">
            {/* Local Player Tile */}
            <LocalVideoTile
              stream={localStream}
              isVideoEnabled={isVideoEnabled}
              isAudioEnabled={isAudioEnabled}
              isSpeaking={isLocalSpeaking}
              userName={myUserName}
              color={myColor}
            />

            {/* Remote Participants */}
            {participantsList.map(peer => (
              <RemoteVideoTile key={peer.peerId} participant={peer} />
            ))}

            {participantsList.length === 0 && (
              <div className="px-3 py-4 text-center rounded-2xl bg-slate-950/40 border border-dashed border-slate-800 text-[11px] text-slate-400 flex flex-col items-center justify-center min-w-[130px]">
                <Users className="w-5 h-5 text-slate-500 mb-1" />
                <span>Waiting for opponents to join call...</span>
              </div>
            )}
          </div>

          {/* Bottom Toolbar */}
          <div className="flex items-center justify-center gap-2 pt-1 border-t border-slate-800/80">
            {/* Audio Toggle */}
            <button
              onClick={onToggleAudio}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition shadow-sm ${
                isAudioEnabled
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  : 'bg-rose-600 hover:bg-rose-500 text-white'
              }`}
            >
              {isAudioEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
              <span>{isAudioEnabled ? 'Mute' : 'Unmute'}</span>
            </button>

            {/* Video Toggle */}
            <button
              onClick={onToggleVideo}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition shadow-sm ${
                isVideoEnabled
                  ? 'bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
            >
              {isVideoEnabled ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
              <span>{isVideoEnabled ? 'Stop Video' : 'Start Video'}</span>
            </button>

            {/* Leave Call */}
            <button
              onClick={onLeaveCall}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 font-bold text-xs transition shadow-sm"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              <span>Leave</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
