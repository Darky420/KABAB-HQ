import React, { useEffect, useRef } from "react";

interface AudioRendererProps {
  remoteStreams: Map<string, MediaStream>;
}

/**
 * Invisible component that renders and plays remote audio streams.
 */
const AudioRenderer: React.FC<AudioRendererProps> = ({ remoteStreams }) => {
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  useEffect(() => {
    // Add new streams
    Array.from(remoteStreams.entries()).forEach(([uid, stream]) => {
      let audio = audioRefs.current.get(uid);
      if (!audio) {
        audio = new Audio();
        audio.autoplay = true;
        audioRefs.current.set(uid, audio);
      }
      if (audio.srcObject !== stream) {
        audio.srcObject = stream;
      }
    });

    // Cleanup ended streams
    Array.from(audioRefs.current.keys()).forEach((uid) => {
      if (!remoteStreams.has(uid)) {
        const audio = audioRefs.current.get(uid);
        if (audio) {
          audio.srcObject = null;
          audioRefs.current.delete(uid);
        }
      }
    });
  }, [remoteStreams]);

  return null; // This component doesn't render anything UI-wise
};

export default AudioRenderer;
