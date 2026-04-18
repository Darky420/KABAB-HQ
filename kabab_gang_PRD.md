# KABAB GANG — Desktop Chat & Voice App
## Product Requirements Document (PRD)

---

## 1. OVERVIEW

**App Name:** KABAB GANG  
**Type:** Windows Desktop Application  
**Purpose:** A private Discord-style chat + voice app exclusively for the KABAB GANG gaming crew (5 members)  
**Core Philosophy:** Everything Discord has but free, lightweight, and 100% KABAB GANG branded  

---

## 2. TECH STACK

| Layer | Technology | Why |
|---|---|---|
| Desktop Framework | **Tauri (Rust + React)** | 10x lighter than Electron, feels native |
| Frontend | **React + TypeScript** | Fast UI, component-based |
| Styling | **Tailwind CSS** | Quick dark theme styling |
| Real-time Chat | **Firebase Firestore** | Free tier = enough for 5 users forever |
| Voice Calls | **WebRTC (peer-to-peer)** | No server needed, direct connection |
| Auth | **Firebase Auth** | Simple email/password or Google login |
| File Storage | **Firebase Storage** | Free for small files/images |
| Notifications | **Tauri native notifications** | OS-level popups like Discord |

---

## 3. UI LAYOUT — EXACTLY LIKE DISCORD

```
┌─────────────────────────────────────────────────────────┐
│ [KG] │ # channels    │   CHAT AREA          │ MEMBERS  │
│      │                │                      │          │
│ Icon │ # general      │ messages here        │ 🟢 Darky │
│      │ # gaming       │                      │ 🟢 Member2│
│      │ # roasts       │                      │ ⚫ Member3│
│      │ # music        │                      │          │
│      │ ─────────────  │                      │          │
│      │ 🔊 Voice Lobby │ [input box here]     │          │
│      │ 🔊 Gaming VC   │                      │          │
└─────────────────────────────────────────────────────────┘
```

---

## 4. FEATURES

### 4.1 TEXT CHAT
- [ ] Multiple channels: #general, #gaming, #roasts, #kabab-music
- [ ] Real-time messages via Firebase Firestore
- [ ] Custom KABAB GANG emoji set (uploadable by admin)
- [ ] Animated emoji support (free — no Nitro needed)
- [ ] GIF support via Tenor API (free)
- [ ] Image & file sharing (Firebase Storage)
- [ ] Message reactions (emoji react on any message)
- [ ] Edit & delete own messages
- [ ] @mention notifications
- [ ] Unread message indicators (red badge)
- [ ] Message history saved permanently

### 4.2 VOICE CHANNELS
- [ ] Multiple voice rooms: "Voice Lobby", "Gaming VC", "Chill Zone"
- [ ] Peer-to-peer WebRTC — no server cost
- [ ] Mute/unmute mic button
- [ ] Deafen (mute all incoming audio)
- [ ] Speaking indicator (green glow on avatar when talking)
- [ ] Push-to-talk option
- [ ] Voice activity detection
- [ ] See who is in which voice channel

### 4.3 FREE "NITRO" FEATURES
These are all free in KABAB GANG app:
- [ ] **Animated avatars** — GIF profile pictures
- [ ] **Custom status** — "Playing Rocket League", "Eating Kabab 🍢", custom text
- [ ] **Bigger file uploads** — up to 25MB (Firebase Storage free tier)
- [ ] **Custom emoji** — gang can add their own emojis
- [ ] **Profile banner** — custom background image on profile card
- [ ] **Animated emoji in chat** — no restrictions

### 4.4 MEMBER PROFILES
- [ ] Avatar (static or GIF)
- [ ] Custom banner image
- [ ] Status message
- [ ] "Currently Playing" — shows active game
- [ ] KABAB GANG join date
- [ ] Rocket League rank badge (manually set)
- [ ] Click member → popup profile card (like Discord)

### 4.5 KABAB GANG EXCLUSIVE FEATURES
These don't exist in Discord — unique to this app:

- [ ] **Spotify Controller** — built-in Spotify control panel (see Section 4.7 for full details)
- [ ] **Roast Board** — dedicated section where members post roasts, others upvote. Weekly "Most Roasted" trophy 😂
- [ ] **Gang Leaderboard** — Rocket League stats, manually updated. Shows rank, wins, goals
- [ ] **Mood Vote** — "Aaj kya khelna hai?" quick poll — members vote on a game, result shown instantly
- [ ] **KABAB Ticker** — scrolling text at bottom of app showing funny gang messages, inside jokes, announcements

### 4.6 NOTIFICATIONS
- [ ] Windows OS notifications for new messages
- [ ] Sound notifications (custom KABAB GANG notification sound)
- [ ] @mention = loud ping
- [ ] Voice channel join notification ("Darky joined Voice Lobby")
- [ ] Do Not Disturb mode

### 4.7 SPOTIFY CONTROLLER
Spotify runs in background — app controls it via Spotify Web API.

**Setup Required (one time):**
- Create a Spotify Developer App at developer.spotify.com (free)
- Get Client ID + Client Secret
- Add to `.env` file

**Solo Mode (default):**
- [ ] Currently playing track name + artist + album art displayed
- [ ] Progress bar showing track position
- [ ] Play / Pause button
- [ ] Previous / Next track buttons
- [ ] Volume slider
- [ ] Heart/Save track button
- [ ] Opens Spotify in background if not already running
- [ ] Compact bar at bottom of app — expands on click

**Gang Sync Mode:**
- [ ] "🎵 Share with Gang" button — posts currently playing song as a message in #kabab-music channel automatically
- [ ] Message format: *"🎵 Darky is listening to: [Song Name] — [Artist] → [Spotify Link]"*
- [ ] Gang members see the link, one click opens same track in their Spotify
- [ ] Optional: "Now Playing" status auto-updates member profile — shows song name under their name in members list

**UI placement:**
```
┌─────────────────────────────────────────────────────────┐
│          MAIN APP LAYOUT                                 │
├─────────────────────────────────────────────────────────┤
│ 🎵 Blinding Lights — The Weeknd  ⏮ ⏸ ⏭  🔊──●───  📤 │
└─────────────────────────────────────────────────────────┘
         ↑ Spotify bar always visible at bottom
```

**Tech:** Spotify Web API + PKCE OAuth flow (no backend server needed)

---

## 5. DESIGN SYSTEM

### Colors
```css
--bg-primary: #0f0f0f;       /* Main background */
--bg-secondary: #1a1a1a;     /* Sidebar background */
--bg-tertiary: #242424;      /* Card/input background */
--accent-red: #FF3B3B;       /* KABAB GANG red */
--accent-green: #00FF87;     /* Online/active green */
--text-primary: #FFFFFF;     /* Main text */
--text-secondary: #A0A0A0;   /* Muted text */
--border: #2e2e2e;           /* Subtle borders */
```

### Typography
- **Headings:** Rajdhani Bold or Barlow Condensed
- **Body:** Inter or DM Sans
- **Code/tags:** JetBrains Mono

### Logo Placement
- Top-left corner — KABAB GANG logo with flame/kebab icon
- App icon (taskbar): KABAB GANG logo

---

## 6. SCREENS / PAGES

1. **Login Screen** — KABAB GANG branded, email + password, "Join the Gang" button
2. **Main App** — Full Discord-style layout (described above)
3. **Profile Modal** — Click any member to see their profile card
4. **Settings Panel** — Audio devices, notifications, theme, profile edit
5. **Roast Board Page** — Dedicated fun section
6. **Leaderboard Page** — Gang Rocket League stats
7. **Spotify Controller** — Expandable music bar at bottom of app

---

## 7. FIREBASE STRUCTURE

```
/users
  /{userId}
    name, avatar, status, banner, currentGame, rlRank

/channels
  /general /gaming /roasts /kabab-music
    /messages
      /{messageId}
        content, authorId, timestamp, reactions, attachments

/voice
  /{channelId}
    /participants
      /{userId}: { joinedAt, muted, deafened }

/roastBoard
  /{roastId}
    content, authorId, votes, timestamp

/leaderboard
  /{userId}
    rlRank, wins, goals, mvpCount

/moodVote
  currentPoll: { question, options, votes, expiresAt }
```

---

## 8. CURSOR AGENT RULES

When building this app in Cursor, follow these rules:

1. **Always use Tauri v2** — not Electron
2. **Firebase config** goes in `.env` file — never hardcode keys
3. **WebRTC signaling** — use Firebase Firestore as the signaling server (no extra backend needed)
4. **One component per file** — keep React components small and focused
5. **Dark theme only** — no light mode
6. **Mobile responsive NOT needed** — this is Windows desktop only
7. **Start with chat first** — get messages working before voice
8. **Voice = WebRTC mesh** — for 5 users, mesh topology is fine (no SFU needed)
9. **Test with 2 windows** — open app twice locally to simulate 2 users
10. **Tauri commands** for anything that needs OS access (notifications, file system)

---

## 9. BUILD ORDER (Step by Step)

**Phase 1 — Foundation**
1. Setup Tauri + React + TypeScript project
2. Firebase project setup (Auth + Firestore + Storage)
3. Login screen
4. Basic layout (3-column Discord style)

**Phase 2 — Chat**
5. Channel list in sidebar
6. Real-time messages with Firestore
7. Message input with emoji picker
8. Image/file upload
9. Reactions + edit/delete

**Phase 3 — Voice**
10. WebRTC setup with Firebase signaling
11. Voice channel UI
12. Mute/deafen controls
13. Speaking indicators

**Phase 4 — Gang Features**
14. Member profiles + profile cards
15. Custom status + animated avatars
16. Spotify Controller (Solo Mode first, then Gang Sync)
17. Roast Board
18. Leaderboard
19. Mood Vote
20. KABAB Ticker

---

## 10. ESTIMATED COST

| Service | Cost |
|---|---|
| Firebase Free Tier | **$0/month** |
| WebRTC (P2P) | **$0/month** |
| Tauri (open source) | **$0** |
| Tenor GIF API | **$0 (free tier)** |
| **TOTAL** | **$0/month** |

✅ Completely free for 5 members forever.

---

*Built for KABAB GANG. By Darky. © 2026*
