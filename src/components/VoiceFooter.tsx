import React from "react";
import { Mic, MicOff, Headphones, PhoneOff, SignalHigh, Info, Activity } from "lucide-react";

interface VoiceFooterProps {
  onDisconnect: () => void;
  channelName: string;
  isMuted: boolean;
  setIsMuted: (val: boolean) => void;
  isDeafened: boolean;
  setIsDeafened: (val: boolean) => void;
}

const VoiceFooter: React.FC<VoiceFooterProps> = ({ 
  onDisconnect, 
  channelName,
  isMuted,
  setIsMuted,
  isDeafened,
  setIsDeafened
}) => {


  return (
    <div className="voice-footer">
      <div className="voice-status">
        <div className="voice-info-main">
          <div className="voice-conn-status">
            <SignalHigh size={16} className="conn-icon green" />
            <span className="status-label">Voice Connected</span>
          </div>
          <span className="channel-label">{channelName} / Kabab Server</span>
        </div>
        
        <div className="voice-header-actions">
           <button title="Connection Info"><Info size={16} /></button>
        </div>
      </div>

      <div className="voice-footer-controls">
        <div className="voice-activity-wrap">
          <Activity size={16} className="activity-icon" />
          <span className="activity-label">Kabab HQ</span>
        </div>
        
        <div className="voice-actions-row">
          <button 
            className={`voice-btn ${isMuted ? "active" : ""}`}
            onClick={() => setIsMuted(!isMuted)}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
          <button 
            className={`voice-btn ${isDeafened ? "active" : ""}`}
            onClick={() => setIsDeafened(!isDeafened)}
            title={isDeafened ? "Undeafen" : "Deafen"}
          >
            <Headphones size={18} />
          </button>
          <button 
            className="voice-btn disconnect"
            onClick={onDisconnect}
            title="Disconnect"
          >
            <PhoneOff size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceFooter;
