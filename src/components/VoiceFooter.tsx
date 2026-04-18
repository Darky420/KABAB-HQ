import React, { useState } from "react";
import { Mic, MicOff, Headphones, PhoneOff, SignalHigh, SignalLow, SignalMedium } from "lucide-react";

interface VoiceFooterProps {
  onDisconnect: () => void;
}

const VoiceFooter: React.FC<VoiceFooterProps> = ({ onDisconnect }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [signal] = useState(3); // 1-3

  return (
    <div className="voice-footer">
      <div className="voice-status">
        <div className="signal-icon">
          {signal === 3 && <SignalHigh size={14} className="green" />}
          {signal === 2 && <SignalMedium size={14} className="yellow" />}
          {signal === 1 && <SignalLow size={14} className="red" />}
        </div>
        <div className="voice-info">
          <span className="status-label">VOICE CONNECTED</span>
          <span className="channel-label">General / Kabab Server</span>
        </div>
      </div>

      <div className="voice-controls">
        <button 
          className={`voice-btn ${isMuted ? "active" : ""}`}
          onClick={() => setIsMuted(!isMuted)}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
        </button>
        <button 
          className={`voice-btn ${isDeafened ? "active" : ""}`}
          onClick={() => setIsDeafened(!isDeafened)}
          title={isDeafened ? "Undeafen" : "Deafen"}
        >
          <Headphones size={16} />
        </button>
        <button 
          className="voice-btn disconnect"
          onClick={onDisconnect}
          title="Disconnect"
        >
          <PhoneOff size={16} />
        </button>
      </div>
    </div>
  );
};

export default VoiceFooter;
