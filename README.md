# 🚀 KABAB-HQ

A premium desktop application designed for the **Kabab Gang** gaming crew. Built with Tauri, React, and Firebase for high-performance communication and real-time synchronization.

## 🛠 Tech Stack
- **Core:** [Tauri](https://tauri.app/) (Rust)
- **Frontend:** React + Vite + TypeScript
- **Backend:** Firebase (Auth, Firestore, Hosting)
- **Icons:** Lucide React
- **Styling:** Vanilla CSS (Cyberpunk/Dark Aesthetic)

## 📋 Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/) (Latest stable)
- [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (Windows)

## ⚙️ Environment Variables
Create a `.env` file in the root directory with the following variables:
```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# OAuth Client IDs
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_DISCORD_CLIENT_ID=your_discord_client_id
```

## 🚀 Getting Started

### 1. Installation
```bash
npm install
```

### 2. Run Development Mode
```bash
npm run tauri dev
```

### 3. Build for Production
```bash
npm run tauri build
```

## 🛡 Security
This application uses **Secure Access Protocols** and **OAuth 2.0** for membership authentication. Ensure the system browser is allowed to redirect for Desktop Login to function.

---
*Created by [Darky](https://github.com/Darky420)*
