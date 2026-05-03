import React, { useEffect, useRef } from "react";

interface AudioRendererProps {
  remoteStreams: Map<string, MediaStream>;
}

const AudioElement: React.FC<{ stream: MediaStream }> = ({ stream }) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.srcObject = stream;
      audioRef.current.play().catch(err => {
        console.error("Audio playback failed:", err);
      });
    }
  }, [stream]);

  return <audio ref={audioRef} autoPlay />;
};

/**
 * Invisible component that renders and plays remote audio streams.
 */
const AudioRenderer: React.FC<AudioRendererProps> = ({ remoteStreams }) => {
  return (
    <div style={{ display: "none" }}>
      {Array.from(remoteStreams.entries()).map(([uid, stream]) => (
        <AudioElement key={uid} stream={stream} />
      ))}
    </div>
  );
};

export default AudioRenderer;
