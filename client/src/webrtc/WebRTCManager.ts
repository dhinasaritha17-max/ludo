import { Socket } from 'socket.io-client';
import { PlayerColor, MediaPeerState, MediaSignalPayload } from '../types/index.js';

export interface RemoteParticipant {
  peerId: string;
  userId: string;
  name: string;
  color?: PlayerColor;
  audioEnabled: boolean;
  videoEnabled: boolean;
  stream?: MediaStream;
  isSpeaking: boolean;
  connectionState: RTCPeerConnectionState;
}

export type WebRTCConnectionStatus =
  | 'disconnected'
  | 'requesting_permission'
  | 'connecting'
  | 'connected'
  | 'error';

export interface WebRTCState {
  isInCall: boolean;
  status: WebRTCConnectionStatus;
  errorMessage: string | null;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isLocalSpeaking: boolean;
  localStream: MediaStream | null;
  remoteParticipants: Map<string, RemoteParticipant>;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
];

export class WebRTCManager {
  private socket: Socket | null = null;
  private roomId: string | null = null;
  private myUserId: string = '';
  private myName: string = '';
  private myColor: PlayerColor = 'red';

  private localStream: MediaStream | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private remoteParticipants: Map<string, RemoteParticipant> = new Map();

  // Audio Analysis for speaking activity detection
  private audioContext: AudioContext | null = null;
  private localAnalyser: AnalyserNode | null = null;
  private remoteAnalysers: Map<string, AnalyserNode> = new Map();
  private volumeCheckInterval: number | null = null;

  private isAudioEnabled: boolean = false;
  private isVideoEnabled: boolean = false;
  private isInCall: boolean = false;
  private status: WebRTCConnectionStatus = 'disconnected';
  private errorMessage: string | null = null;
  private isLocalSpeaking: boolean = false;

  private listeners: Set<(state: WebRTCState) => void> = new Set();

  constructor() {}

  public subscribe(listener: (state: WebRTCState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach(fn => fn(state));
  }

  public getState(): WebRTCState {
    return {
      isInCall: this.isInCall,
      status: this.status,
      errorMessage: this.errorMessage,
      isAudioEnabled: this.isAudioEnabled,
      isVideoEnabled: this.isVideoEnabled,
      isLocalSpeaking: this.isLocalSpeaking,
      localStream: this.localStream,
      remoteParticipants: new Map(this.remoteParticipants),
    };
  }

  public init(socket: Socket | null, roomId: string | null, userId: string, name: string, color: PlayerColor) {
    this.socket = socket;
    this.roomId = roomId;
    this.myUserId = userId;
    this.myName = name;
    this.myColor = color;

    if (this.socket) {
      this.setupSocketListeners();
    }
  }

  private setupSocketListeners() {
    if (!this.socket) return;

    this.socket.off('media_existing_peers');
    this.socket.off('media_peer_joined');
    this.socket.off('media_signal');
    this.socket.off('media_state_changed');
    this.socket.off('media_peer_left');

    this.socket.on('media_existing_peers', async ({ peers }: { peers: MediaPeerState[] }) => {
      if (!this.isInCall || !this.localStream) return;

      for (const peer of peers) {
        if (peer.peerId === this.myUserId) continue;
        this.addOrUpdateParticipant(peer);
        await this.createPeerConnection(peer.peerId, true);
      }
      this.status = 'connected';
      this.notify();
    });

    this.socket.on('media_peer_joined', ({ peer }: { peer: MediaPeerState }) => {
      if (!this.isInCall || peer.peerId === this.myUserId) return;
      this.addOrUpdateParticipant(peer);
      this.notify();
    });

    this.socket.on('media_signal', async (payload: MediaSignalPayload) => {
      if (!this.isInCall || payload.toPeerId !== this.myUserId) return;
      await this.handleMediaSignal(payload);
    });

    this.socket.on('media_state_changed', ({ peerId, audioEnabled, videoEnabled }: {
      peerId: string;
      audioEnabled: boolean;
      videoEnabled: boolean;
    }) => {
      const participant = this.remoteParticipants.get(peerId);
      if (participant) {
        participant.audioEnabled = audioEnabled;
        participant.videoEnabled = videoEnabled;
        this.notify();
      }
    });

    this.socket.on('media_peer_left', ({ peerId }: { peerId: string }) => {
      this.removePeer(peerId);
    });
  }

  private addOrUpdateParticipant(peer: MediaPeerState) {
    const existing = this.remoteParticipants.get(peer.peerId);
    if (existing) {
      existing.name = peer.name;
      existing.color = peer.color;
      existing.audioEnabled = peer.audioEnabled;
      existing.videoEnabled = peer.videoEnabled;
    } else {
      this.remoteParticipants.set(peer.peerId, {
        peerId: peer.peerId,
        userId: peer.userId,
        name: peer.name,
        color: peer.color,
        audioEnabled: peer.audioEnabled,
        videoEnabled: peer.videoEnabled,
        isSpeaking: false,
        connectionState: 'new',
      });
    }
  }

  /**
   * Explicitly requests user permission and starts media stream.
   * Voice & Video are OFF by default and will never start without user confirmation.
   */
  public async joinCall(enableAudio: boolean, enableVideo: boolean): Promise<boolean> {
    if (!this.socket || !this.roomId) {
      this.errorMessage = 'Not connected to room server';
      this.status = 'error';
      this.notify();
      return false;
    }

    this.status = 'requesting_permission';
    this.errorMessage = null;
    this.notify();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('WebRTC media devices are not supported by this browser');
      }

      const constraints: MediaStreamConstraints = {
        audio: enableAudio ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } : false,
        video: enableVideo ? {
          width: { ideal: 320, max: 640 },
          height: { ideal: 240, max: 480 },
          frameRate: { ideal: 15, max: 24 },
          facingMode: 'user',
        } : false,
      };

      let stream: MediaStream;
      if (!enableAudio && !enableVideo) {
        // Audio & video off initially (listening/watching only)
        stream = new MediaStream();
      } else {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      }

      this.localStream = stream;
      this.isAudioEnabled = enableAudio;
      this.isVideoEnabled = enableVideo;
      this.isInCall = true;
      this.status = 'connecting';

      // Setup audio analysis for local microphone
      this.setupAudioAnalysis();

      // Emit join event to server
      const peerState: MediaPeerState = {
        peerId: this.myUserId,
        userId: this.myUserId,
        name: this.myName,
        color: this.myColor,
        audioEnabled: enableAudio,
        videoEnabled: enableVideo,
      };

      this.socket.emit('media_join', {
        roomId: this.roomId,
        peer: peerState,
      });

      this.notify();
      return true;
    } catch (err: unknown) {
      console.warn('[WebRTC] Media permission or device error:', err);
      let friendlyError = 'Could not access media devices. Check permissions.';
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          friendlyError = 'Microphone/Camera permission denied. Please allow device access in browser settings.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          friendlyError = 'No camera or microphone hardware found on this device.';
        }
      }
      this.errorMessage = friendlyError;
      this.status = 'error';
      this.isInCall = false;
      this.notify();
      return false;
    }
  }

  /**
   * Creates an RTCPeerConnection for a remote peer.
   */
  private async createPeerConnection(peerId: string, isInitiator: boolean): Promise<RTCPeerConnection> {
    const existing = this.peerConnections.get(peerId);
    if (existing) {
      return existing;
    }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.peerConnections.set(peerId, pc);

    // Add local tracks if available
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }

    pc.onicecandidate = event => {
      if (event.candidate && this.socket && this.roomId) {
        this.socket.emit('media_signal', {
          roomId: this.roomId,
          fromPeerId: this.myUserId,
          toPeerId: peerId,
          signal: {
            type: 'candidate',
            candidate: event.candidate,
          },
        });
      }
    };

    pc.ontrack = event => {
      const participant = this.remoteParticipants.get(peerId);
      if (participant) {
        const stream = event.streams[0] || new MediaStream([event.track]);
        participant.stream = stream;

        // Setup audio analysis on remote stream
        if (event.track.kind === 'audio') {
          this.setupRemoteAudioAnalysis(peerId, stream);
        }
        this.notify();
      }
    };

    pc.onconnectionstatechange = () => {
      const participant = this.remoteParticipants.get(peerId);
      if (participant) {
        participant.connectionState = pc.connectionState;
        this.notify();
      }
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.removePeer(peerId);
      }
    };

    if (isInitiator) {
      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        await pc.setLocalDescription(offer);

        if (this.socket && this.roomId) {
          this.socket.emit('media_signal', {
            roomId: this.roomId,
            fromPeerId: this.myUserId,
            toPeerId: peerId,
            signal: {
              type: 'offer',
              sdp: pc.localDescription,
            },
          });
        }
      } catch (err) {
        console.error(`[WebRTC] Failed to create offer for ${peerId}:`, err);
      }
    }

    return pc;
  }

  private async handleMediaSignal(payload: MediaSignalPayload) {
    const { fromPeerId, signal } = payload;
    let pc = this.peerConnections.get(fromPeerId);

    if (signal.type === 'offer') {
      if (!pc) {
        pc = await this.createPeerConnection(fromPeerId, false);
      }
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        if (this.socket && this.roomId) {
          this.socket.emit('media_signal', {
            roomId: this.roomId,
            fromPeerId: this.myUserId,
            toPeerId: fromPeerId,
            signal: {
              type: 'answer',
              sdp: pc.localDescription,
            },
          });
        }
      } catch (err) {
        console.error(`[WebRTC] Error handling offer from ${fromPeerId}:`, err);
      }
    } else if (signal.type === 'answer') {
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        } catch (err) {
          console.error(`[WebRTC] Error setting remote description from ${fromPeerId}:`, err);
        }
      }
    } else if (signal.type === 'candidate') {
      if (pc && signal.candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        } catch (err) {
          console.error(`[WebRTC] Error adding ICE candidate from ${fromPeerId}:`, err);
        }
      }
    }
  }

  /**
   * Toggles microphone audio on/off.
   */
  public async toggleAudio(): Promise<boolean> {
    if (!this.isInCall) return false;

    if (!this.localStream) {
      this.localStream = new MediaStream();
    }

    const audioTracks = this.localStream.getAudioTracks();

    if (audioTracks.length > 0) {
      const nextState = !this.isAudioEnabled;
      audioTracks.forEach(track => {
        track.enabled = nextState;
      });
      this.isAudioEnabled = nextState;
    } else {
      // Need to acquire microphone track
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
        const newTrack = stream.getAudioTracks()[0];
        if (newTrack) {
          this.localStream.addTrack(newTrack);
          this.peerConnections.forEach(pc => {
            pc.addTrack(newTrack, this.localStream!);
          });
          this.isAudioEnabled = true;
          this.setupAudioAnalysis();
        }
      } catch (err) {
        console.error('[WebRTC] Failed to acquire microphone track:', err);
        return false;
      }
    }

    // Sync toggle state to other players
    if (this.socket && this.roomId) {
      this.socket.emit('media_state_change', {
        roomId: this.roomId,
        peerId: this.myUserId,
        audioEnabled: this.isAudioEnabled,
        videoEnabled: this.isVideoEnabled,
      });
    }

    this.notify();
    return this.isAudioEnabled;
  }

  /**
   * Toggles camera video on/off.
   */
  public async toggleVideo(): Promise<boolean> {
    if (!this.isInCall) return false;

    if (!this.localStream) {
      this.localStream = new MediaStream();
    }

    const videoTracks = this.localStream.getVideoTracks();

    if (videoTracks.length > 0) {
      const nextState = !this.isVideoEnabled;
      videoTracks.forEach(track => {
        track.enabled = nextState;
      });
      this.isVideoEnabled = nextState;
    } else {
      // Need to acquire camera track
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 320, max: 640 },
            height: { ideal: 240, max: 480 },
            facingMode: 'user',
          },
        });
        const newTrack = stream.getVideoTracks()[0];
        if (newTrack) {
          this.localStream.addTrack(newTrack);
          this.peerConnections.forEach(pc => {
            pc.addTrack(newTrack, this.localStream!);
          });
          this.isVideoEnabled = true;
        }
      } catch (err) {
        console.error('[WebRTC] Failed to acquire camera track:', err);
        return false;
      }
    }

    // Sync toggle state to other players
    if (this.socket && this.roomId) {
      this.socket.emit('media_state_change', {
        roomId: this.roomId,
        peerId: this.myUserId,
        audioEnabled: this.isAudioEnabled,
        videoEnabled: this.isVideoEnabled,
      });
    }

    this.notify();
    return this.isVideoEnabled;
  }

  /**
   * Leaves voice/video call and releases all camera and microphone hardware.
   */
  public leaveCall() {
    if (this.socket && this.roomId && this.isInCall) {
      this.socket.emit('media_leave', {
        roomId: this.roomId,
        peerId: this.myUserId,
      });
    }

    // Stop local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Close all peer connections
    this.peerConnections.forEach(pc => pc.close());
    this.peerConnections.clear();
    this.remoteParticipants.clear();

    // Close audio analysers
    if (this.volumeCheckInterval) {
      clearInterval(this.volumeCheckInterval);
      this.volumeCheckInterval = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch (_) {}
      this.audioContext = null;
    }
    this.localAnalyser = null;
    this.remoteAnalysers.clear();

    this.isInCall = false;
    this.isAudioEnabled = false;
    this.isVideoEnabled = false;
    this.isLocalSpeaking = false;
    this.status = 'disconnected';
    this.errorMessage = null;

    this.notify();
  }

  private removePeer(peerId: string) {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerId);
    }
    this.remoteParticipants.delete(peerId);
    this.remoteAnalysers.delete(peerId);
    this.notify();
  }

  /**
   * Sets up real-time audio volume detection for speaking pulse indicators.
   */
  private setupAudioAnalysis() {
    if (!this.localStream || this.localStream.getAudioTracks().length === 0) return;

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!this.audioContext) {
        this.audioContext = new AudioCtx();
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const source = this.audioContext.createMediaStreamSource(this.localStream);
      const analyser = this.audioContext.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      this.localAnalyser = analyser;

      if (!this.volumeCheckInterval) {
        this.volumeCheckInterval = window.setInterval(() => this.checkSpeakingVolumes(), 120);
      }
    } catch (e) {
      console.warn('[WebRTC] Audio analysis not supported:', e);
    }
  }

  private setupRemoteAudioAnalysis(peerId: string, stream: MediaStream) {
    try {
      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.audioContext = new AudioCtx();
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const source = this.audioContext.createMediaStreamSource(stream);
      const analyser = this.audioContext.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      this.remoteAnalysers.set(peerId, analyser);

      if (!this.volumeCheckInterval) {
        this.volumeCheckInterval = window.setInterval(() => this.checkSpeakingVolumes(), 120);
      }
    } catch (e) {
      console.warn(`[WebRTC] Remote audio analysis error for ${peerId}:`, e);
    }
  }

  private checkSpeakingVolumes() {
    let changed = false;

    // Check local speaking
    if (this.localAnalyser && this.isAudioEnabled) {
      const data = new Uint8Array(this.localAnalyser.frequencyBinCount);
      this.localAnalyser.getByteFrequencyData(data);
      const sum = data.reduce((a, b) => a + b, 0);
      const avg = sum / data.length;
      const isSpeaking = avg > 14;
      if (isSpeaking !== this.isLocalSpeaking) {
        this.isLocalSpeaking = isSpeaking;
        changed = true;
      }
    } else if (this.isLocalSpeaking) {
      this.isLocalSpeaking = false;
      changed = true;
    }

    // Check remote peers speaking
    this.remoteAnalysers.forEach((analyser, peerId) => {
      const participant = this.remoteParticipants.get(peerId);
      if (participant && participant.audioEnabled) {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const sum = data.reduce((a, b) => a + b, 0);
        const avg = sum / data.length;
        const isSpeaking = avg > 14;
        if (isSpeaking !== participant.isSpeaking) {
          participant.isSpeaking = isSpeaking;
          changed = true;
        }
      }
    });

    if (changed) {
      this.notify();
    }
  }
}

export const webrtcManager = new WebRTCManager();
