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
} from "lucide-react";
import { User, signOut } from "firebase/auth";
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import WindowControls from "../components/WindowControls.tsx";
import VoiceFooter from "../components/VoiceFooter";

interface DashboardScreenProps {
  user: User;
}

interface ChatMessage {
  id: string;
  uid: string;
  displayName: string;
  text: string;
  createdAt: Timestamp | null;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ user }) => {
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isVoiceConnected, setIsVoiceConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check provider for avatar logic
  const providerId = user.providerData[0]?.providerId || "";
  const isDiscordUser = providerId === "discord.com";

  // Display name from email
  const displayName =
    user.displayName || user.email?.split("@")[0]?.toUpperCase() || "OPERATOR";

  // Listen to Firestore messages in real-time
  useEffect(() => {
    const q = query(
      collection(db, "messages"),
      orderBy("createdAt", "asc"),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: ChatMessage[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<ChatMessage, "id">),
      }));
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message to Firestore
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const text = inputValue;
    setInputValue("");

    await addDoc(collection(db, "messages"), {
      uid: user.uid,
      displayName: displayName,
      text: text,
      createdAt: serverTimestamp(),
    });
  };

  // Format timestamp
  const formatTime = (ts: Timestamp | null) => {
    if (!ts) return "JUST NOW";
    const d = ts.toDate();
    const hours = d.getHours().toString().padStart(2, "0");
    const mins = d.getMinutes().toString().padStart(2, "0");
    return `TODAY ${hours}:${mins}`;
  };

  // Simple avatar color from uid
  // Avatar logic: Discord photo vs Cyber Preset
  const getAvatarUrl = (uid: string, photoURL?: string | null) => {
    if (photoURL && (isDiscordUser || photoURL.includes("discordapp"))) return photoURL;
    const num = Math.abs(uid.charCodeAt(0) * 7 + uid.charCodeAt(1) * 3) % 70;
    return `https://i.pravatar.cc/150?img=${num}`;
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <div className="dashboard-wrapper">
      {/* ===== TOP NAVIGATION ===== */}
      <nav className="top-nav" data-tauri-drag-region>
        <div className="top-nav-left">
          <span className="top-nav-brand">Kabab Gang Chat</span>
          <div className="top-nav-links">
            <span className="top-nav-link active">Dashboard</span>
            <span className="top-nav-link">Friends</span>
            <span className="top-nav-link">Explore</span>
          </div>
        </div>
        <div className="top-nav-right">
          <div className="top-nav-search">
            <Search size={12} />
            <input type="text" placeholder="SEARCH GANG..." />
          </div>
          <button 
            className={`top-nav-btn voice ${isVoiceConnected ? "active" : ""}`}
            onClick={() => setIsVoiceConnected(true)}
          >
            {isVoiceConnected ? "Connected" : "Join Voice"}
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
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              KG
            </span>
          </div>
          <div className="server-separator" />
          <div className="server-icon" title="Gaming Lounge">
            <MessageSquare size={18} />
          </div>
          <div className="server-icon" title="Home">
            <Home size={18} />
          </div>
          <div className="server-icon" title="Gamepad">
            <Gamepad2 size={18} />
          </div>
          <div className="server-separator" />
          <div className="server-icon add-server" title="Add Server">
            <PlusCircle size={18} />
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
              <h3>Text Channels</h3>
              <div className="channel active">
                <span className="hash">#</span> general
              </div>
              <div className="channel">
                <span className="hash">#</span> gaming
              </div>
              <div className="channel">
                <span className="hash">#</span> roasts
              </div>
              <div className="channel">
                <span className="hash">#</span> kabab-music
              </div>
            </div>

            <div className="channels-group">
              <h3>Voice Channels</h3>
              <div className="channel">
                <Volume2 size={14} className="icon" /> Voice Lobby
              </div>
              <div className="channel">
                <Volume2 size={14} className="icon" /> Gaming VC
              </div>
            </div>
          </div>

          {/* -- User Panel -- */}
          <div className="user-controls">
            <div className="user-info">
              <div className="user-avatar">
                <img src={getAvatarUrl(user.uid, user.photoURL)} alt="avatar" />
                <div className="status online" />
              </div>
              <div className="user-details">
                <span className="username">{displayName}</span>
                <span className="user-id">
                  {user.email?.split("@")[0] || ""}
                </span>
              </div>
            </div>
            <div className="user-actions">
              <button title="Microphone">
                <Mic size={14} />
              </button>
              <button title="Logout" onClick={handleLogout}>
                <LogOut size={14} />
              </button>
            </div>
          </div>

          {/* Voice Connection Footer */}
          {isVoiceConnected && (
            <VoiceFooter onDisconnect={() => setIsVoiceConnected(false)} />
          )}
        </aside>

        {/* ===== CHAT AREA ===== */}
        <main className="chat-area">
          <header className="chat-header">
            <div className="channel-info">
              <span className="hash">#</span>
              <span className="channel-name">General</span>
              <span className="channel-desc">
                The main hub for the gang.
              </span>
            </div>
            <div className="header-actions">
              <button title="Notification Settings">
                <Bell size={16} />
              </button>
              <button title="Pinned Messages">
                <Pin size={16} />
              </button>
              <button title="Member List">
                <Users size={16} />
              </button>
            </div>
          </header>

          <div className="chat-messages">
            {/* Welcome message */}
            {messages.length === 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: 1,
                  gap: 12,
                  opacity: 0.4,
                }}
              >
                <MessageSquare size={48} />
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                    textTransform: "uppercase",
                    letterSpacing: 2,
                  }}
                >
                  No messages yet. Start the conversation!
                </span>
              </div>
            )}

            {messages.map((msg) => (
              <div className="message" key={msg.id}>
                <img
                  className="message-avatar"
                  src={getAvatarUrl(msg.uid)}
                  alt="avatar"
                />
                <div className="message-content">
                  <div className="message-header">
                    <span
                      className="msg-username"
                      style={
                        msg.uid === user.uid
                          ? { color: "var(--cyber-green)" }
                          : undefined
                      }
                    >
                      {msg.displayName}
                    </span>
                    <span className="msg-timestamp">
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>
                  <div className="msg-text">{msg.text}</div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-wrapper">
            <form className="chat-input" onSubmit={handleSendMessage}>
              <button type="button" className="add-file-btn">
                <PlusCircle size={18} />
              </button>
              <input
                type="text"
                placeholder="Message #general"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
              <div className="chat-input-actions">
                <button type="button" title="GIF">
                  <ImageIcon size={16} />
                </button>
                <button type="button" title="Gift">
                  <Gift size={16} />
                </button>
                <button type="button" title="Emoji">
                  <Smile size={16} />
                </button>
              </div>
            </form>
          </div>
        </main>

        {/* ===== MEMBERS SIDEBAR ===== */}
        <aside className="members-sidebar">
          <h3>Members</h3>
          <h3>Online — 1</h3>
          <div className="member">
            <div className="member-avatar">
              <img src={getAvatarUrl(user.uid, user.photoURL)} alt="avatar" />
              <div className="status online" />
            </div>
            <div className="member-info">
              <span className="member-name admin">{displayName}</span>
              <span className="member-activity">Online</span>
            </div>
          </div>
        </aside>
      </div>

    </div>
  );
};

export default DashboardScreen;
