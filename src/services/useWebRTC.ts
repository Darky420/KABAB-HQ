import { useEffect, useRef, useState } from "react";
import { subscribeToSignals, sendSignal, clearSignals } from "./voiceService";
import { subscribeToVoicePresence } from "./presenceService";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export const useWebRTC = (channelId: string | null, myUid: string, isMuted: boolean) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set());
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const analysers = useRef<Map<string, AnalyserNode>>(new Map());
  const audioCtx = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!channelId) {
      // Disconnect logic
      peerConnections.current.forEach(pc => pc.close());
      peerConnections.current.clear();
      setRemoteStreams(new Map());
      if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
        setLocalStream(null);
      }
      analysers.current.clear();
      setSpeakingUsers(new Set());
      return;
    }

    const monitorVolume = () => {
      if (!audioCtx.current) audioCtx.current = new AudioContext();
      
      const newSpeaking = new Set<string>();
      const threshold = 15; // Tuning parameter

      analysers.current.forEach((analyser, uid) => {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        const volume = dataArray.reduce((a, b) => a + b) / dataArray.length;
        
        if (volume > threshold && !isMuted) {
          newSpeaking.add(uid);
        }
      });

      setSpeakingUsers(prev => {
        if (prev.size === 0 && newSpeaking.size === 0) return prev;
        // Simple comparison to avoid unnecessary state updates
        const isEqual = prev.size === newSpeaking.size && [...prev].every(u => newSpeaking.has(u));
        return isEqual ? prev : newSpeaking;
      });

      requestAnimationFrame(monitorVolume);
    };

    const setupAnalyser = (stream: MediaStream, uid: string) => {
      if (!audioCtx.current) audioCtx.current = new AudioContext();
      const source = audioCtx.current.createMediaStreamSource(stream);
      const analyser = audioCtx.current.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analysers.current.set(uid, analyser);
    };

    const startVoice = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setLocalStream(stream);
        setupAnalyser(stream, myUid);
        monitorVolume();

        // Listen for signals
        const unsubscribeSignals = subscribeToSignals(channelId, myUid, async (signal) => {
          const { from, type, payload } = signal;

          if (type === "offer") {
            const pc = createPeerConnection(from, stream);
            await pc.setRemoteDescription(new RTCSessionDescription(payload));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            sendSignal(channelId, { type: "answer", from: myUid, to: from, payload: answer });
          } else if (type === "answer") {
            const pc = peerConnections.current.get(from);
            if (pc) await pc.setRemoteDescription(new RTCSessionDescription(payload));
          } else if (type === "candidate") {
            const pc = peerConnections.current.get(from);
            if (pc) await pc.addIceCandidate(new RTCIceCandidate(payload));
          }
        });

        // Listen for new people joining to initiate connections
        const unsubscribePresence = subscribeToVoicePresence((users) => {
          users.forEach(async (user) => {
            if (user.uid !== myUid && user.channelId === channelId && !peerConnections.current.has(user.uid)) {
              // We found someone in our channel. Let's send an offer!
              const pc = createPeerConnection(user.uid, stream);
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              sendSignal(channelId, { type: "offer", from: myUid, to: user.uid, payload: offer });
            }
          });
        });

        return () => {
          unsubscribeSignals();
          unsubscribePresence();
          clearSignals(channelId, myUid);
        };
      } catch (err) {
        console.error("Failed to get audio stream:", err);
      }
    };

    const createPeerConnection = (peerUid: string, stream: MediaStream) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnections.current.set(peerUid, pc);

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal(channelId, { type: "candidate", from: myUid, to: peerUid, payload: event.candidate });
        }
      };

      pc.ontrack = (event) => {
        const stream = event.streams[0];
        setRemoteStreams(prev => {
          const next = new Map(prev);
          next.set(peerUid, stream);
          return next;
        });
        setupAnalyser(stream, peerUid);
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "disconnected" || pc.connectionState === "closed") {
          setRemoteStreams(prev => {
            const next = new Map(prev);
            next.delete(peerUid);
            return next;
          });
          peerConnections.current.delete(peerUid);
        }
      };

      return pc;
    };

    startVoice();
  }, [channelId, myUid]);

  useEffect(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
      });
    }
  }, [isMuted, localStream]);

  return { localStream, remoteStreams, speakingUsers };
};
