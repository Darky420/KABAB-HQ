import React, { useState, useEffect, useRef } from "react";
import {
  ChevronDown,
  Bell,
  Pin,
  Users,
  Search,
  PlusCircle,
  Volume2,
  MessageSquare,
  Gamepad2,
  Home,
  Mic,
  Smile,
  Gift,
  Image as ImageIcon,
  LogOut,
  MicOff,
  Headphones
} from "lucide-react";
import { User, signOut } from "firebase/auth";
import { auth } from "../firebase";
import WindowControls from "../components/WindowControls.tsx";
import VoiceFooter from "../components/VoiceFooter";
import { 
  subscribeToMessages, 
  sendMessage, 
  setTypingStatus,
  subscribeToTyping,
  ChatMessage,
  TypingIndicator
} from "../services/chatService";
import { 
  updateVoicePresence, 
  removeVoicePresence, 
  subscribeToVoicePresence, 
  subscribeToGlobalPresence,
  updateGlobalPresence,
  removeGlobalPresence,
  VoiceUser,
  GlobalUser
} from "../services/presenceService";
import { useWebRTC } from "../services/useWebRTC";
import { Timestamp } from "firebase/firestore";
import logo from "../assets/logo.png";
import AudioRenderer from "../components/AudioRenderer.tsx";

interface DashboardScreenProps {
  user: User;
}

const TEXT_CHANNELS = [
  { id: "general", name: "general", desc: "The main hub for the gang." },
  { id: "gaming", name: "gaming", desc: "Talk about your favorite games." },
  { id: "roasts", name: "roasts", desc: "Keep it spicy, but respectful." },
  { id: "music", name: "kabab-music", desc: "Share your beats and hits." },
];

const VOICE_CHANNELS = [
  { id: "lobby", name: "Voice Lobby" },
  { id: "gaming-vc", name: "Gaming VC" },
];

const DashboardScreen: React.FC<DashboardScreenProps> = ({ user }) => {
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeChannelId, setActiveChannelId] = useState("general");
  const [activeVoiceChannelId, setActiveVoiceChannelId] = useState<string | null>(null);
  const [isVoiceConnected, setIsVoiceConnected] = useState(false);
  const [voiceUsers, setVoiceUsers] = useState<VoiceUser[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<GlobalUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { remoteStreams, speakingUsers } = useWebRTC(activeVoiceChannelId, user.uid, isMuted);

  const activeChannel = TEXT_CHANNELS.find(c => c.id === activeChannelId) || TEXT_CHANNELS[0];
  const activeVoiceChannel = VOICE_CHANNELS.find(c => c.id === activeVoiceChannelId);

  // Check provider for avatar logic
  const providerId = user.providerData[0]?.providerId || "";
  const isDiscordUser = providerId === "discord.com";

  // Display name from email
  const displayName =
    user.displayName || user.email?.split("@")[0]?.toUpperCase() || "OPERATOR";

  // Listen to Firestore messages in real-time
  useEffect(() => {
    const unsubscribe = subscribeToMessages(activeChannelId, (msgs) => {
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [activeChannelId]);

  // Listen to Typing Indicators
  useEffect(() => {
    const unsubscribe = subscribeToTyping(activeChannelId, (users) => {
      // Exclude self from typing list
      setTypingUsers(users.filter(u => u.uid !== user.uid));
    });

    return () => unsubscribe();
  }, [activeChannelId, user.uid]);

  // Listen to Global Presence
  useEffect(() => {
    const avatarUrl = getAvatarUrl(user.uid, user.photoURL);
    updateGlobalPresence({ uid: user.uid, displayName, avatarUrl }, "online");

    const unsubscribe = subscribeToGlobalPresence((users) => {
      setOnlineUsers(users);
    });

    return () => {
      unsubscribe();
      // Optional: we can keep presence until logout or use heartbeats
      // For now, let's keep it simple
    };
  }, [user.uid, displayName]);

  // Listen to Voice Presence in real-time
  useEffect(() => {
    const unsubscribe = subscribeToVoicePresence((users) => {
      setVoiceUsers(users);
    });

    // Cleanup on window close
    const cleanup = () => {
      if (activeVoiceChannelId) {
        removeVoicePresence(user.uid);
      }
      removeGlobalPresence(user.uid);
    };
    window.addEventListener("beforeunload", cleanup);

    return () => {
      unsubscribe();
      window.removeEventListener("beforeunload", cleanup);
    };
  }, [activeVoiceChannelId, user.uid]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message to Firestore
  // Update Voice Presence when Mute/Deafen changes
  useEffect(() => {
    if (activeVoiceChannelId) {
      const avatarUrl = getAvatarUrl(user.uid, user.photoURL);
      updateVoicePresence({
        uid: user.uid,
        displayName,
        avatarUrl,
        channelId: activeVoiceChannelId,
        isMuted,
        isDeafened
      }, "joining");
    }
  }, [isMuted, isDeafened, activeVoiceChannelId, user.uid, displayName, user.photoURL]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const text = inputValue;
    setInputValue("");
    
    // Clear typing status immediately on send
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setTypingStatus(activeChannelId, { uid: user.uid, displayName }, false);

    await sendMessage(activeChannelId, { uid: user.uid, displayName }, text);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);

    // Update typing status in Firestore
    setTypingStatus(activeChannelId, { uid: user.uid, displayName }, true);

    // Debounce: clear typing status after delay
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setTypingStatus(activeChannelId, { uid: user.uid, displayName }, false);
    }, 1500);
  };

  const handleJoinVoice = async (channelId: string) => {
    setActiveVoiceChannelId(channelId);
    setIsVoiceConnected(true);
    
    // Update Presence
    await updateVoicePresence(
      { 
        uid: user.uid, 
        displayName, 
        avatarUrl: getAvatarUrl(user.uid, user.photoURL),
        channelId: channelId,
        isMuted,
        isDeafened
      }, 
      "joining"
    );
  };

  const handleDisconnectVoice = async () => {
    setIsVoiceConnected(false);
    setActiveVoiceChannelId(null);
    await removeVoicePresence(user.uid);
  };

  // Format timestamp
  const formatTime = (ts: Timestamp | null) => {
    if (!ts) return "JUST NOW";
    const d = ts.toDate();
    const hours = d.getHours().toString().padStart(2, "0");
    const mins = d.getMinutes().toString().padStart(2, "0");
    return `TODAY ${hours}:${mins}`;
  };

  const getAvatarUrl = (uid: string, photoURL?: string | null) => {
    if (photoURL && (isDiscordUser || photoURL.includes("discordapp"))) return photoURL;
    const num = Math.abs(uid.charCodeAt(0) * 7 + uid.charCodeAt(1) * 3) % 70;
    return `https://i.pravatar.cc/150?img=${num}`;
  };

  const handleLogout = async () => {
    if (activeVoiceChannelId) {
      await removeVoicePresence(user.uid);
    }
    await removeGlobalPresence(user.uid);
    await signOut(auth);
  };

  return (
    <div className="dashboard-wrapper">
      {/* Hidden Audio Elements for WebRTC */}
      <AudioRenderer remoteStreams={remoteStreams} />
      
      {/* ===== TOP NAVIGATION ===== */}
      <nav className="top-nav" data-tauri-drag-region>
        <div className="top-nav-left">
          <div className="top-nav-logo-wrap">
            <img src={logo} alt="Kabab HQ" className="top-nav-logo" />
            <span className="top-nav-brand">KABAB HQ</span>
          </div>
          <div className="top-nav-links">
            <span className="top-nav-link active">Dashboard</span>
            <span className="top-nav-link">Friends</span>
            <span className="top-nav-link">Explore</span>
          </div>
        </div>
        <div className="top-nav-right">
          <div className="top-nav-search">
            <Search size={14} />
            <input type="text" placeholder="SEARCH GANG..." />
          </div>
          <button 
            className={`top-nav-btn voice ${isVoiceConnected ? "active" : ""}`}
            onClick={() => isVoiceConnected ? handleDisconnectVoice() : handleJoinVoice(VOICE_CHANNELS[0].id)}
          >
            {isVoiceConnected ? `Connected: ${activeVoiceChannel?.name}` : "Join Voice"}
          </button>
          <button className="top-nav-btn invite">Invite</button>
          <WindowControls />
        </div>
      </nav>

      {/* ===== MAIN CONTENT ===== */}
      <div className="main-content">
        {/* -- Server Sidebar -- */}
        <nav className="server-sidebar">
          <div className="server-icon active" title="Kabab Gang">
            <img src={logo} alt="KG" className="sidebar-logo" />
          </div>
          <div className="server-separator" />
          <div className="server-icon" title="Gaming Lounge">
            <MessageSquare size={32} />
          </div>
          <div className="server-icon" title="Home">
            <Home size={32} />
          </div>
          <div className="server-icon" title="Gamepad">
            <Gamepad2 size={32} />
          </div>
          <div className="server-separator" />
          <div className="server-icon add-server" title="Add Server">
            <PlusCircle size={32} />
          </div>
        </nav>

        {/* -- Channel Sidebar -- */}
        <aside className="channel-sidebar">
          <div className="server-header">
            <h2>Kabab Server</h2>
            <ChevronDown size={16} color="var(--text-muted)" />
          </div>

          <div className="channel-scroll-area">
            <div className="channels-group">
              <div className="category-header">
                <ChevronDown size={12} className="chevron" />
                <h3>Text Channels</h3>
              </div>
              {TEXT_CHANNELS.map((ch) => (
                <div 
                  key={ch.id} 
                  className={`channel ${activeChannelId === ch.id ? "active" : ""}`}
                  onClick={() => setActiveChannelId(ch.id)}
                >
                  <span className="hash">#</span> {ch.name}
                </div>
              ))}
            </div>

            <div className="channels-group">
              <div className="category-header">
                <ChevronDown size={12} className="chevron" />
                <h3>Voice Channels</h3>
              </div>
              {VOICE_CHANNELS.map((ch) => (
                <div key={ch.id}>
                  <div 
                    className={`channel ${activeVoiceChannelId === ch.id ? "active" : ""}`}
                    onClick={() => handleJoinVoice(ch.id)}
                  >
                    <Volume2 size={14} className="icon" /> {ch.name}
                  </div>
                  
                  {/* Participant List (Discord Style) */}
                  <div className="voice-participants">
                    {voiceUsers
                      .filter(vu => vu.channelId === ch.id)
                      .map(vu => (
                        <div className={`voice-user ${
                          speakingUsers.has(vu.uid) && !vu.isMuted ? "speaking" : ""
                        } ${vu.isMuted && vu.isDeafened ? "deafened" : vu.isMuted ? "muted" : ""}`} key={vu.uid}>
                          <img src={vu.avatarUrl} alt="avatar" />
                          <span>{vu.displayName}</span>
                          {vu.isMuted && <MicOff size={14} className="status-icon muted" />}
                          {vu.isDeafened && <Headphones size={14} className="status-icon deafened" />}
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {isVoiceConnected && activeVoiceChannel && (
            <VoiceFooter 
              onDisconnect={handleDisconnectVoice} 
              channelName={activeVoiceChannel.name} 
              isMuted={isMuted}
              setIsMuted={setIsMuted}
              isDeafened={isDeafened}
              setIsDeafened={setIsDeafened}
            />
          )}

          <div className="user-controls">
            <div className="user-info">
              <div className="user-avatar">
                <img src={getAvatarUrl(user.uid, user.photoURL)} alt="avatar" />
                <div className="status online" />
              </div>
              <div className="user-details">
                <span className="username">{displayName}</span>
                <span className="user-id">{user.email?.split("@")[0] || ""}</span>
              </div>
            </div>
            <div className="user-actions">
              <button title="Microphone"><Mic size={14} /></button>
              <button title="Logout" onClick={handleLogout}><LogOut size={14} /></button>
            </div>
          </div>

        </aside>

        {/* ===== CHAT AREA ===== */}
        <main className="chat-area">
          <header className="chat-header">
            <div className="channel-info">
              <span className="hash">#</span>
              <span className="channel-name">{activeChannel.name}</span>
              <span className="channel-desc">{activeChannel.desc}</span>
            </div>
            <div className="header-actions">
              <button title="Notification Settings"><Bell size={20} /></button>
              <button title="Pinned Messages"><Pin size={20} /></button>
              <button title="Member List"><Users size={20} /></button>
            </div>
          </header>

          <div className="chat-messages">
            {messages.length === 0 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 12, opacity: 0.4 }}>
                <MessageSquare size={48} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, textTransform: "uppercase", letterSpacing: 2 }}>
                  No messages in #{activeChannel.name} yet.
                </span>
              </div>
            )}

            {messages.map((msg) => (
              <div className="message" key={msg.id}>
                <img className="message-avatar" src={getAvatarUrl(msg.uid)} alt="avatar" />
                <div className="message-content">
                  <div className="message-header">
                    <span className="msg-username" style={msg.uid === user.uid ? { color: "var(--cyber-green)" } : undefined}>
                      {msg.displayName}
                    </span>
                    <span className="msg-timestamp">{formatTime(msg.createdAt)}</span>
                  </div>
                  <div className="msg-text">{msg.text}</div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-wrapper">
            <form className="chat-input" onSubmit={handleSendMessage}>
              <button type="button" className="add-file-btn"><PlusCircle size={18} /></button>
              <input
                type="text"
                placeholder={`Message #${activeChannel.name}`}
                value={inputValue}
                onChange={handleInputChange}
              />
              <div className="typing-indicator-area">
                {typingUsers.length > 0 && (
                  <span className="typing-text">
                    {typingUsers.map(u => u.displayName).join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
                  </span>
                )}
              </div>
              <div className="chat-input-actions">
                <button type="button" title="GIF"><ImageIcon size={16} /></button>
                <button type="button" title="Gift"><Gift size={16} /></button>
                <button type="button" title="Emoji"><Smile size={16} /></button>
              </div>
            </form>
          </div>
        </main>

        <aside className="members-sidebar">
          <div className="members-section">
            <h3>Online — {onlineUsers.length}</h3>
            {onlineUsers.map((u) => (
              <div className="member" key={u.uid}>
                <div className="member-avatar">
                  <img src={u.avatarUrl} alt="avatar" />
                  <div className={`status ${u.status}`} />
                </div>
                <div className="member-info">
                  <span className={`member-name ${u.uid === user.uid ? "admin" : ""}`}>
                    {u.displayName}
                  </span>
                  <span className="member-activity">{u.status === "online" ? "Active" : u.status}</span>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default DashboardScreen;
