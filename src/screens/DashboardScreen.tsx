import React, { useState, useEffect, useRef } from "react";
import {
  ChevronDown,
  ChevronRight,
  Bell,
  Pin,
  Users,
  PlusCircle,
  Volume2,
  MessageSquare,
  Smile,
  LogOut,
  MicOff,
  Headphones,
  Settings,
  Sparkles,
  Search,
  Reply,
  FileText
} from "lucide-react";
import { User, signOut } from "firebase/auth";
import { auth } from "../firebase";
import WindowControls from "../components/WindowControls.tsx";
import VoiceFooter from "../components/VoiceFooter";
import UpdateButton from "../components/UpdateButton";
import ChangelogModal from "../components/ChangelogModal";
import { 
  subscribeToMessages, 
  sendMessage, 
  setTypingStatus,
  subscribeToTyping,
  getDMChannelId,
  togglePinMessage,
  deleteMessage,
  editMessage,
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
import { APP_VERSION, hasSeenChangelog } from "../services/updateService";
import { Timestamp } from "firebase/firestore";
import { 
  getChannelPreference, 
  muteChannel, 
  updateChannelPreference, 
  ChannelPreference, 
  NotificationLevel 
} from "../services/notificationService";
import { 
  searchGifs, 
  fetchTrendingGifs, 
  STICKERS_LIBRARY, 
  GifObject 
} from "../services/mediaService";
import {
  UserProfile,
  subscribeToUserProfile,
  updateUserProfile,
  StatusType,
  KABAB_BADGES
} from "../services/profileService";

import ProfileModal from "../components/ProfileModal";
import UserProfileModal from "../components/UserProfileModal";
import MessageContextMenu from "../components/MessageContextMenu";
import ConfirmModal from "../components/ConfirmModal";
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
  const [showUserQuickProfile, setShowUserQuickProfile] = useState<string | null>(null);
  const [isVoiceConnected, setIsVoiceConnected] = useState(false);
  const [voiceUsers, setVoiceUsers] = useState<VoiceUser[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<GlobalUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const [showMembers, setShowMembers] = useState(true);
  const [showPinned, setShowPinned] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaTab, setMediaTab] = useState<"emoji" | "gif" | "sticker">("emoji");
  const [gifs, setGifs] = useState<GifObject[]>([]);
  const [gifSearch, setGifSearch] = useState("");
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false); 
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [channelPref, setChannelPref] = useState<ChannelPreference>({ level: 'all', muteUntil: null });
  const [viewMode, setViewMode] = useState<"server" | "dm">("server");
  const [selectedDMUser, setSelectedDMUser] = useState<GlobalUser | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [showChangelog, setShowChangelog] = useState(() => !hasSeenChangelog(APP_VERSION));
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, msg: ChatMessage } | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { remoteStreams, speakingUsers } = useWebRTC(activeVoiceChannelId, user.uid, isMuted);

  const activeChannel = TEXT_CHANNELS.find(c => c.id === activeChannelId) || {
    id: activeChannelId,
    name: selectedDMUser?.displayName || "Private Chat",
    desc: selectedDMUser ? `Private conversation with ${selectedDMUser.displayName}` : "Direct Message"
  };
  const activeVoiceChannel = VOICE_CHANNELS.find(c => c.id === activeVoiceChannelId);

  // Display name from email
  const displayName =
    user.displayName || user.email?.split("@")[0]?.toUpperCase() || "OPERATOR";


  // Fetch notification preference
  useEffect(() => {
    getChannelPreference(user.uid, activeChannelId).then(setChannelPref);
  }, [activeChannelId, user.uid]);
 
  // Fetch GIFs when tab opens
  useEffect(() => {
    if (showMediaPicker && mediaTab === "gif") {
      fetchTrendingGifs().then(setGifs);
    }
  }, [showMediaPicker, mediaTab]);
 
  // GIF Search
  useEffect(() => {
    if (mediaTab === "gif") {
      const timeout = setTimeout(() => {
        searchGifs(gifSearch).then(setGifs);
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [gifSearch, mediaTab]);
 
  // Subscribe to extended profile data (Bio, Banner, Badges, etc.)
  useEffect(() => {
    const unsubscribe = subscribeToUserProfile(user.uid, (data) => {
      setUserProfile(data);
    });
    return () => unsubscribe();
  }, [user.uid]);
 
  // Listen to Firestore messages in real-time
  useEffect(() => {
    const unsubscribe = subscribeToMessages(activeChannelId, (msgs: ChatMessage[]) => {
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

  // Update Global Presence when profile or name changes
  useEffect(() => {
    const avatarUrl = userProfile?.photoURL || getAvatarUrl(user.uid, user.photoURL, displayName);
    const status = userProfile?.statusType || "online";
    console.log("Syncing presence for", user.uid, "with avatar:", avatarUrl, "Status:", status);
    updateGlobalPresence({ uid: user.uid, displayName, avatarUrl, badges: userProfile?.badges || [] }, status as any);
  }, [user.uid, displayName, userProfile?.photoURL, user.photoURL, userProfile?.statusType, userProfile?.badges]);

  // Listen to Global Presence (Keep the subscription separate)
  useEffect(() => {
    const unsubscribe = subscribeToGlobalPresence((users) => {
      setOnlineUsers(users);
    });

    return () => {
      unsubscribe();
    };
  }, []);

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
      const avatarUrl = userProfile?.photoURL || getAvatarUrl(user.uid, user.photoURL, displayName);
      updateVoicePresence({
        uid: user.uid,
        displayName,
        avatarUrl,
        channelId: activeVoiceChannelId,
        isMuted,
        isDeafened,
        status: userProfile?.statusType || "online" // Pass status to voice presence too
      } as any, "joining");
    }
  }, [isMuted, isDeafened, activeVoiceChannelId, user.uid, displayName, user.photoURL, userProfile?.photoURL, userProfile?.statusType]);
 
  const handleUserClick = (u: any) => {
    // Ab direct DM open karne ke bajaye, profile modal kholain gay
    setShowUserQuickProfile(u.uid);
  };
 
  const handleOpenDMFromProfile = (targetUid: string) => {
    const targetUser = onlineUsers.find(u => u.uid === targetUid);
    if (!targetUser) return;
 
    const dmId = getDMChannelId(user.uid, targetUser.uid);
    setActiveChannelId(dmId);
    setShowUserQuickProfile(null); // Close profile modal
    setViewMode("dm");
    setSelectedDMUser(targetUser);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const text = inputValue;
    setInputValue("");
    
    // Clear typing status immediately on send
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setTypingStatus(activeChannelId, { uid: user.uid, displayName }, false);

    const avatarUrl = userProfile?.photoURL || getAvatarUrl(user.uid, user.photoURL, displayName);
    
    const replyData = replyingTo ? {
      messageId: replyingTo.id,
      displayName: replyingTo.displayName,
      text: replyingTo.text
    } : undefined;

    await sendMessage(activeChannelId, user.uid, displayName, text, 'text', undefined, avatarUrl, replyData);
    setReplyingTo(null);
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
        avatarUrl: getAvatarUrl(user.uid, user.photoURL, displayName),
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
 
  const handleTogglePin = async (msgId: string, currentStatus: boolean) => {
    try {
      await togglePinMessage(msgId, !currentStatus);
    } catch (err) {
      console.error("Failed to pin message:", err);
    }
  };
 
  const handleUpdatePref = async (level: NotificationLevel) => {
    setChannelPref(prev => ({ ...prev, level }));
    await updateChannelPreference(user.uid, activeChannelId, level);
  };
 
  const handleMute = async (duration: number | null) => {
    const muteUntil = duration ? Date.now() + duration * 60000 : (duration === 0 ? null : -1);
    setChannelPref(prev => ({ ...prev, muteUntil: muteUntil === -1 ? -1 : (muteUntil || null) }));
    await muteChannel(user.uid, activeChannelId, duration);
    setShowNotificationMenu(false);
  };
 
  const handleSendMedia = async (type: 'gif' | 'sticker', url: string) => {
    const avatarUrl = userProfile?.photoURL || getAvatarUrl(user.uid, user.photoURL, displayName);
    
    const replyData = replyingTo ? {
      messageId: replyingTo.id,
      displayName: replyingTo.displayName,
      text: replyingTo.text
    } : undefined;

    await sendMessage(activeChannelId, user.uid, displayName, "", type, url, avatarUrl, replyData);
    setReplyingTo(null);
    setShowMediaPicker(false);
  };

  const handleStatusChange = async (status: StatusType) => {
    try {
      await updateUserProfile(user.uid, { statusType: status });
      setShowStatusMenu(false);
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };
 
  const addEmoji = (emoji: string) => {
    setInputValue(prev => prev + emoji);
  };
 
  const isMutedNow = channelPref.muteUntil === -1 || (channelPref.muteUntil && channelPref.muteUntil > Date.now());

  // Format timestamp
  const formatTime = (ts: Timestamp | null) => {
    if (!ts) return "JUST NOW";
    const d = ts.toDate();
    const hours = d.getHours().toString().padStart(2, "0");
    const mins = d.getMinutes().toString().padStart(2, "0");
    return `TODAY ${hours}:${mins}`;
  };

  const getAvatarUrl = (uid: string, photoURL?: string | null, name?: string | null) => {
    if (photoURL) return photoURL;
    if (name) {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
    }
    return `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`;
  };

  const handleLogout = async () => {
    if (activeVoiceChannelId) {
      await removeVoicePresence(user.uid);
    }
    await removeGlobalPresence(user.uid);
    await signOut(auth);
  };
 
  // Message Actions
  const handleMessageContextMenu = (e: React.MouseEvent, msg: ChatMessage) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, msg });
  };
 
  const handleEditInit = (msg: ChatMessage) => {
    setEditingMessageId(msg.id);
    setEditValue(msg.text);
  };
 
  const handleSaveEdit = async () => {
    if (!editingMessageId || !editValue.trim()) return;
    await editMessage(editingMessageId, editValue.trim());
    setEditingMessageId(null);
    setEditValue("");
  };
 
  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditValue("");
  };
 
  const handleDelete = async (msgId: string) => {
    setConfirmDeleteId(msgId);
  };
 
  const handleConfirmDelete = async () => {
    if (confirmDeleteId) {
      await deleteMessage(confirmDeleteId);
      setConfirmDeleteId(null);
    }
  };
 
  const handleReplyInit = (msg: ChatMessage) => {
    setReplyingTo(msg);
  };
 
  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
  };
 
  const handleTogglePinAction = async (msgId: string, currentPinned: boolean) => {
    await togglePinMessage(msgId, !currentPinned);
  };

  return (
    <div className="dashboard-wrapper">
      {/* Hidden Audio Elements for WebRTC */}
      <AudioRenderer remoteStreams={remoteStreams} />
      
      {/* ===== TOP NAVIGATION ===== */}
      <nav className="top-nav" data-tauri-drag-region>
        <div className="top-nav-left">
          <div className="top-nav-links">
            <span className="top-nav-link active">Dashboard</span>
          </div>
        </div>

        <div className="top-nav-logo-wrap">
          <img src={logo} alt="Kabab HQ" className="top-nav-logo" />
          <span className="top-nav-brand">KABAB HQ</span>
        </div>

        <div className="top-nav-right">
          <button 
            className="top-nav-btn changelog-nav-btn" 
            onClick={() => setShowChangelog(true)}
            title="View Changelog"
          >
            <FileText size={13} />
            <span>Changelog</span>
          </button>
          <UpdateButton />
          <WindowControls />
        </div>
      </nav>

      {/* ===== MAIN CONTENT ===== */}
      <div className="main-content">
        {/* -- Server Sidebar -- */}
        <nav className="server-sidebar">
          <div 
            className={`server-icon ${viewMode === "server" ? "active" : ""}`} 
            title="Kabab Gang"
            onClick={() => setViewMode("server")}
          >
            <img src={logo} alt="KG" className="sidebar-logo" />
          </div>
          <div className="server-separator" />
          <div 
            className={`server-icon ${viewMode === "dm" ? "active" : ""}`} 
            title="Direct Messages"
            onClick={() => setViewMode("dm")}
          >
            <MessageSquare size={32} />
          </div>
        </nav>

        {/* -- Channel Sidebar -- */}
        <aside className="channel-sidebar">
          <div className="server-header">
            <h2>{viewMode === "server" ? "Kabab Server" : "Direct Messages"}</h2>
            <ChevronDown size={16} color="var(--text-muted)" />
          </div>
 
          <div className="channel-scroll-area">
            {viewMode === "server" ? (
              <>
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
              </>
            ) : (
              <div className="channels-group">
                <div className="category-header">
                  <ChevronDown size={12} className="chevron" />
                  <h3>Direct Messages</h3>
                </div>
                {/* For simple app, just show all online users here too or those we have chats with */}
                {onlineUsers.filter(u => u.uid !== user.uid).map((u) => (
                  <div 
                    key={u.uid} 
                    className={`channel dm-channel ${selectedDMUser?.uid === u.uid ? "active" : ""}`}
                    onClick={() => handleUserClick(u)}
                  >
                    <div className="dm-avatar">
                      <img src={u.avatarUrl} alt="avatar" />
                      <div className={`status ${u.status}`} />
                    </div>
                    <span className="dm-name">{u.displayName}</span>
                  </div>
                ))}
              </div>
            )}
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

          <div className="user-controls" onClick={() => setShowProfileModal(true)} style={{ cursor: "pointer" }}>
            <div className="user-info">
              <div className="user-avatar">
                <img src={userProfile?.photoURL || getAvatarUrl(user.uid, user.photoURL, displayName)} alt="avatar" />
                <div className={`status ${userProfile?.statusType || 'online'}`} />
              </div>
              <div className="user-details">
                <span className="username">{userProfile?.displayName || displayName}</span>
                <span className="user-id">@{user.email?.split("@")[0] || "kabab_gang"}</span>
              </div>
            </div>
            <div className="user-actions">
              <div style={{ position: "relative" }}>
                <button 
                  type="button"
                  title="Status" 
                  className={`status-indicator-btn ${showStatusMenu ? "active" : ""}`}
                  onClick={(e) => { e.stopPropagation(); setShowStatusMenu(!showStatusMenu); }}
                >
                  <Sparkles size={14} style={{ color: "var(--cyber-yellow)" }} />
                </button>

                {showStatusMenu && (
                  <div className="status-quick-menu" onClick={(e) => e.stopPropagation()}>
                    <button className="status-option" onClick={(e) => { e.stopPropagation(); handleStatusChange("online"); }}>
                      <div className="presence-blob online" />
                      <span>Online</span>
                    </button>
                    <button className="status-option" onClick={(e) => { e.stopPropagation(); handleStatusChange("away"); }}>
                      <div className="presence-blob away" />
                      <span>Away</span>
                    </button>
                    <button className="status-option" onClick={(e) => { e.stopPropagation(); handleStatusChange("busy"); }}>
                      <div className="presence-blob busy" />
                      <span>Busy</span>
                    </button>
                    <button className="status-option" onClick={(e) => { e.stopPropagation(); handleStatusChange("invisible"); }}>
                      <div className="presence-blob invisible" />
                      <span>Invisible</span>
                    </button>
                  </div>
                )}
              </div>
              <button type="button" title="Settings" onClick={(e) => { e.stopPropagation(); setShowProfileModal(true); }}><Settings size={14} /></button>
              <button type="button" title="Logout" onClick={(e) => { e.stopPropagation(); handleLogout(); }}><LogOut size={14} /></button>
            </div>
          </div>

        </aside>

        {/* ===== CHAT AREA ===== */}
        <main className="chat-area">
          <header className="chat-header">
            <div className="channel-info">
              {viewMode === "server" ? <span className="hash">#</span> : <div className="dm-status-dot online" />}
              <span className="channel-name">{activeChannel.name}</span>
              <span className="channel-desc">{activeChannel.desc}</span>
            </div>
            <div className="header-actions">
              <div style={{ position: "relative" }}>
                <button 
                  title="Notification Settings" 
                  onClick={() => setShowNotificationMenu(!showNotificationMenu)}
                  className={showNotificationMenu || isMutedNow ? "active" : ""}
                >
                  <Bell size={20} />
                  {isMutedNow && <div className="mute-indicator" />}
                </button>
 
                {showNotificationMenu && (
                  <div className="notification-dropdown">
                    <div className="dropdown-section">
                      <div className="menu-item has-submenu">
                        <span>Mute Channel</span>
                        <ChevronRight size={14} />
                        <div className="flyout-menu">
                          <button onClick={() => handleMute(15)}>For 15 Minutes</button>
                          <button onClick={() => handleMute(60)}>For 1 Hour</button>
                          <button onClick={() => handleMute(180)}>For 3 Hours</button>
                          <button onClick={() => handleMute(480)}>For 8 Hours</button>
                          <button onClick={() => handleMute(1440)}>For 24 Hours</button>
                          <button onClick={() => handleMute(null)}>Until I turn it back on</button>
                          {isMutedNow && (
                            <button className="unmute-btn" onClick={() => handleMute(0)}>Unmute</button>
                          )}
                        </div>
                      </div>
                    </div>
 
                    <div className="dropdown-separator" />
 
                    <div className="dropdown-section">
                      <label className="pref-item">
                        <input 
                          type="radio" 
                          name="notif" 
                          checked={channelPref.level === 'all'} 
                          onChange={() => handleUpdatePref('all')} 
                        />
                        <div className="radio-custom" />
                        <div className="pref-details">
                          <span className="pref-title">All Messages</span>
                          <span className="pref-desc">Get alerts for every message.</span>
                        </div>
                      </label>
 
                      <label className="pref-item">
                        <input 
                          type="radio" 
                          name="notif" 
                          checked={channelPref.level === 'mentions'} 
                          onChange={() => handleUpdatePref('mentions')} 
                        />
                        <div className="radio-custom" />
                        <div className="pref-details">
                          <span className="pref-title">Only @mentions</span>
                          <span className="pref-desc">Only get alerts when mentioned.</span>
                        </div>
                      </label>
 
                      <label className="pref-item">
                        <input 
                          type="radio" 
                          name="notif" 
                          checked={channelPref.level === 'nothing'} 
                          onChange={() => handleUpdatePref('nothing')} 
                        />
                        <div className="radio-custom" />
                        <div className="pref-details">
                          <span className="pref-title">Nothing</span>
                          <span className="pref-desc">No alerts for this channel.</span>
                        </div>
                      </label>
                    </div>
                  </div>
                )}
              </div>
              <button 
                title="Pinned Messages" 
                onClick={() => setShowPinned(!showPinned)}
                className={showPinned ? "active" : ""}
              >
                <Pin size={20} />
              </button>
              <button 
                title="Member List" 
                onClick={() => setShowMembers(!showMembers)}
                className={showMembers ? "active" : ""}
              >
                <Users size={20} />
              </button>
            </div>
          </header>

          <div className="chat-messages">
            {messages.length === 0 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 12, opacity: 0.4 }}>
                <MessageSquare size={48} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, textTransform: "uppercase", letterSpacing: 2 }}>
                  {viewMode === "server" 
                    ? `No messages in #${activeChannel.name} yet.` 
                    : `This is the start of your private chat with @${activeChannel.name}.`}
                </span>
              </div>
            )}

            {messages.map((msg) => (
              <div 
                className={`kabab-chat-message-item ${msg.isPinned ? "is-pinned" : ""} ${msg.type === 'gif' || msg.type === 'sticker' ? 'media-msg' : ''}`} 
                key={msg.id}
                onContextMenu={(e) => handleMessageContextMenu(e, msg)}
              >
                {msg.replyTo && (
                  <div className="message-reply-context">
                    <div className="reply-line" />
                    <div className="reply-context-text">
                      <span className="reply-context-user">@{msg.replyTo.displayName}</span>
                      {msg.replyTo.text}
                    </div>
                  </div>
                )}
                <img 
                  className="message-avatar" 
                  src={
                    // For own messages, always use the live Firestore profile photo so avatar updates instantly
                    msg.uid === user.uid
                      ? (userProfile?.photoURL || getAvatarUrl(user.uid, user.photoURL, msg.displayName))
                      : getAvatarUrl(msg.uid, msg.photoURL, msg.displayName)
                  } 
                  alt="avatar" 
                />
                <div className="message-content">
                  <div className="message-header">
                    <span className="msg-username" style={msg.uid === user.uid ? { color: "var(--cyber-green)" } : undefined}>
                      {msg.displayName}
                    </span>
                    <span className="msg-timestamp">{formatTime(msg.createdAt)}</span>
                  </div>
                  {editingMessageId === msg.id ? (
                    <div className="edit-container">
                      <input 
                        className="message-edit-input"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit();
                          if (e.key === "Escape") handleCancelEdit();
                        }}
                        autoFocus
                      />
                      <div className="edit-actions">
                        press <span className="edit-cancel" onClick={handleCancelEdit}>escape to cancel</span> • <span className="edit-save" onClick={handleSaveEdit}>enter to save</span>
                      </div>
                    </div>
                  ) : msg.type === 'gif' || msg.type === 'sticker' ? (
                    <div className={`msg-media ${msg.type}`}>
                      <img src={msg.imageUrl} alt={msg.type} />
                    </div>
                  ) : (
                    <div className="msg-text">
                      {msg.text}
                      {(msg as any).isEdited && <span className="edited-tag">(edited)</span>}
                    </div>
                  )}
                </div>
 
                <div className="message-hover-actions">
                  <button 
                    title={msg.isPinned ? "Unpin Message" : "Pin Message"}
                    onClick={() => handleTogglePinAction(msg.id, msg.isPinned || false)}
                  >
                    <Pin size={14} style={{ fill: msg.isPinned ? "var(--cyber-red)" : "none" }} />
                  </button>
                  <button title="Reply" onClick={() => handleReplyInit(msg)}>
                    <Reply size={14} />
                  </button>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-wrapper">
            {replyingTo && (
              <div className="reply-preview-bar">
                <div className="reply-preview-content">
                  <span className="reply-to-user">Replying to {replyingTo.displayName}</span>
                  <span className="reply-to-text">{replyingTo.text}</span>
                </div>
                <div className="close-reply" onClick={() => setReplyingTo(null)}>
                  <PlusCircle size={16} style={{ transform: 'rotate(45deg)' }} />
                </div>
              </div>
            )}
            <form className="chat-input" onSubmit={handleSendMessage}>
              <button type="button" className="add-file-btn"><PlusCircle size={18} /></button>
              <input
                type="text"
                placeholder={viewMode === "server" ? `Message #${activeChannel.name}` : `Message @${activeChannel.name}`}
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
              <div className="input-actions">
              <button 
                type="button"
                title="GIFs" 
                onClick={() => { setMediaTab("gif"); setShowMediaPicker(!showMediaPicker); }}
                className={showMediaPicker && mediaTab === "gif" ? "active" : ""}
              >
                <div className="gif-icon-box">GIF</div>
              </button>
              <button 
                type="button"
                title="Stickers" 
                onClick={() => { setMediaTab("sticker"); setShowMediaPicker(!showMediaPicker); }}
                className={showMediaPicker && mediaTab === "sticker" ? "active" : ""}
              >
                <Smile size={20} />
              </button>
              <button 
                type="button"
                title="Emoji" 
                onClick={() => { setMediaTab("emoji"); setShowMediaPicker(!showMediaPicker); }}
                className={showMediaPicker && mediaTab === "emoji" ? "active" : ""}
              >
                <Smile size={20} style={{ color: "var(--cyber-green)" }} />
              </button>
 
              {showMediaPicker && (
                <div className="media-picker">
                  <div className="picker-tabs">
                    <button className={mediaTab === "gif" ? "active" : ""} onClick={() => setMediaTab("gif")}>GIFs</button>
                    <button className={mediaTab === "sticker" ? "active" : ""} onClick={() => setMediaTab("sticker")}>Stickers</button>
                    <button className={mediaTab === "emoji" ? "active" : ""} onClick={() => setMediaTab("emoji")}>Emoji</button>
                  </div>
                  
                  <div className="picker-search">
                    <Search size={16} />
                    <input 
                      type="text" 
                      placeholder={mediaTab === "gif" ? "Search Tenor..." : "Search..."} 
                      value={mediaTab === "gif" ? gifSearch : ""}
                      onChange={(e) => setGifSearch(e.target.value)}
                    />
                  </div>
 
                  <div className="picker-content">
                    {mediaTab === "gif" && (
                      <div className="gif-grid">
                        {gifs.map(g => (
                          <img key={g.id} src={g.previewUrl} alt={g.title} onClick={() => handleSendMedia('gif', g.url)} />
                        ))}
                      </div>
                    )}
                    {mediaTab === "sticker" && (
                      <div className="sticker-grid">
                        {STICKERS_LIBRARY.map(s => (
                          <img key={s.id} src={s.url} alt={s.name} title={s.name} onClick={() => handleSendMedia('sticker', s.url)} />
                        ))}
                      </div>
                    )}
                    {mediaTab === "emoji" && (
                      <div className="emoji-grid">
                        {["😂","🤣","❤️","😍","🙏","🔥","👍","✨","😭","🙌","😊","🤔","🚀","💻","⚡","🔥","🎉","💀","👑","💯"].map(e => (
                          <span key={e} onClick={() => addEmoji(e)}>{e}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            </form>
          </div>
        </main>

        {showMembers && (
          <aside className="members-sidebar">
            <div className="members-section">
              <h3>Online — {onlineUsers.length}</h3>
              {onlineUsers.map((u) => (
                <div 
                  className={`member ${selectedDMUser?.uid === u.uid ? "active" : ""}`} 
                  key={u.uid}
                  onClick={() => handleUserClick(u)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="member-avatar">
                    <img src={u.avatarUrl} alt="avatar" />
                    <div className={`status ${u.status}`} />
                  </div>
                  <div className="member-info">
                    <span className={`member-name ${u.uid === user.uid ? "admin" : ""}`}>
                      {u.displayName}
                    </span>
                    <span className="member-activity">{u.status === "online" ? "Active" : u.status}</span>
                    {u.badges && u.badges.length > 0 && (
                      <div className="member-roles">
                        {u.badges.map(badgeId => {
                          const badge = KABAB_BADGES.find(b => b.id === badgeId);
                          if (!badge) return null;
                          return (
                            <span 
                              key={badge.id} 
                              className="member-role-badge" 
                              style={{ borderColor: `${badge.color}40`, color: badge.color, backgroundColor: `${badge.color}10` }}
                              title={badge.label}
                            >
                              <span className="role-dot" style={{ backgroundColor: badge.color }}></span>
                              {badge.label}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>

      {/* Changelog Modal */}
      <ChangelogModal
        isOpen={showChangelog}
        onClose={() => setShowChangelog(false)}
      />
 
      {/* Pinned Messages Modal */}
      {showPinned && (
        <div className="pinned-modal-overlay" onClick={() => setShowPinned(false)}>
          <div className="pinned-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pinned-header">
              <Pin size={20} className="icon" />
              <h2>Pinned Messages — #{activeChannel.name}</h2>
              <button className="close-btn" onClick={() => setShowPinned(false)}>×</button>
            </div>
            <div className="pinned-scroll-area">
              {messages.filter(m => m.isPinned).length === 0 ? (
                <div className="pinned-empty">
                  <div className="empty-icon"><Pin size={40} /></div>
                  <p>No pinned messages in this channel yet.</p>
                </div>
              ) : (
                messages.filter(m => m.isPinned).map(msg => (
                  <div className="pinned-item" key={msg.id}>
                    <div className="pinned-item-header">
                      <img src={getAvatarUrl(msg.uid, msg.photoURL, msg.displayName)} alt="avatar" />
                      <span className="username">{msg.displayName}</span>
                      <span className="time">{formatTime(msg.createdAt)}</span>
                    </div>
                    <div className="pinned-item-text">{msg.text}</div>
                    <button 
                      className="unpin-action" 
                      onClick={() => handleTogglePin(msg.id, true)}
                    >
                      Unpin
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showProfileModal && (
        <ProfileModal 
          uid={user.uid} 
          initialProfile={userProfile} 
          onClose={() => setShowProfileModal(false)} 
        />
      )}
 
      {showUserQuickProfile && (
        <UserProfileModal 
          uid={showUserQuickProfile} 
          onClose={() => setShowUserQuickProfile(null)} 
          onMessage={handleOpenDMFromProfile}
          fallbackData={onlineUsers.find(u => u.uid === showUserQuickProfile)}
        />
      )}
      {/* Context Menu */}
      {contextMenu && (
        <MessageContextMenu 
          {...contextMenu}
          isOwnMessage={contextMenu.msg.uid === user.uid}
          onClose={() => setContextMenu(null)}
          onCopy={() => handleCopyText(contextMenu.msg.text)}
          onEdit={() => handleEditInit(contextMenu.msg)}
          onDelete={() => handleDelete(contextMenu.msg.id)}
          onReply={() => handleReplyInit(contextMenu.msg)}
          onPin={() => handleTogglePinAction(contextMenu.msg.id, contextMenu.msg.isPinned || false)}
          isPinned={contextMenu.msg.isPinned || false}
        />
      )}

      {/* Confirmation Modal */}
      {confirmDeleteId && (
        <ConfirmModal 
          title="Delete Message"
          message="Are you sure you want to permanently delete this message? This action cannot be undone."
          confirmText="Delete Message"
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDeleteId(null)}
          variant="danger"
        />
      )}
    </div>
  );
};

export default DashboardScreen;
