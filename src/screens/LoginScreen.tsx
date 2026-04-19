import React, { useState } from "react";
import { Flame, AtSign, Lock, ShieldCheck, Loader2 } from "lucide-react";
import { auth, googleProvider, discordProvider } from "../firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  OAuthProvider
} from "firebase/auth";


import WindowControls from "../components/WindowControls";
import { start, onUrl } from "@fabianlars/tauri-plugin-oauth";
import { openUrl } from "@tauri-apps/plugin-opener";
import { AUTH_CONFIG } from "../config";
import { generateCodeVerifier, generateCodeChallenge } from "../lib/pkce";


interface LoginScreenProps {
  onLogin: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onLogin();
    } catch (err: any) {
      const code = err?.code || "";
      if (code === "auth/user-not-found" || code === "auth/invalid-credential") {
        setError("Invalid credentials. Check your email/password.");
      } else if (code === "auth/email-already-in-use") {
        setError("Email already registered. Try signing in.");
      } else if (code === "auth/weak-password") {
        setError("Password must be at least 6 characters.");
      } else if (code === "auth/invalid-email") {
        setError("Invalid email format.");
      } else {
        setError(err.message || "Authentication failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: any) => {
    setError("");
    setLoading(true);
    
    // Check if we are in Tauri environment
    const isTauri = !!(window as any).__TAURI_INTERNALS__;

    if (!isTauri) {
      try {
        await signInWithPopup(auth, provider);
        onLogin();
      } catch (err: any) {
        setError(err.message || "Social login failed.");
      } finally {
        setLoading(false);
      }
      return;
    }

    // Tauri-specific Desktop OAuth flow using Auth Code Flow + PKCE
    try {
      // 1. Prepare PKCE
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);

      // 2. Define the response handler
      const processResponse = async (url: string) => {
        try {
          const params = new URLSearchParams(url.split("?")[1]);
          const code = params.get("code");

          if (!code) throw new Error("No authorization code received");

          // 3. Exchange code for token
          let idToken = "";
          let accessToken = "";

          if (provider.providerId === "google.com") {
            const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({
                code,
                client_id: AUTH_CONFIG.google.clientId,
                code_verifier: codeVerifier,
                grant_type: "authorization_code",
                redirect_uri: `http://127.0.0.1:14200`,
              }),
            });
            const data = await tokenResponse.json();
            if (data.error) throw new Error(data.error_description || data.error);
            idToken = data.id_token;
            accessToken = data.access_token;
            
            const credential = GoogleAuthProvider.credential(idToken);
            await signInWithCredential(auth, credential);
          } else {
            // Discord token exchange using PKCE
            const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({
                client_id: AUTH_CONFIG.discord.clientId,
                grant_type: "authorization_code",
                code,
                redirect_uri: `http://127.0.0.1:14200`,
                code_verifier: codeVerifier,
              }),
            });
            const data = await tokenResponse.json();
            if (data.error) throw new Error(data.error_description || data.error);
            accessToken = data.access_token;

            const discordOAuthProvider = new OAuthProvider("discord.com");
            const credential = discordOAuthProvider.credential({
              accessToken: accessToken || ""
            });
            await signInWithCredential(auth, credential);
          }

          onLogin();
        } catch (err: any) {
          console.error("Callback Error:", err);
          setError(`Login processing failed: ${err.message || err}`);
        }
      };

      const unlisten = await onUrl(async (url) => {
        await processResponse(url);
        unlisten(); // Clean up listener
      });

      // 4. Start local server
      const port = await start({ ports: [14200] });
      const redirectUri = `http://127.0.0.1:${port}`;
      
      // 5. Build the Auth URL with PKCE
      let authUrl = "";
      if (provider.providerId === "google.com") {
        authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + 
          `client_id=${AUTH_CONFIG.google.clientId}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `response_type=code&` +
          `scope=openid%20profile%20email&` +
          `code_challenge=${codeChallenge}&` +
          `code_challenge_method=S256`;
      } else {
        // Discord Code Flow with PKCE
        authUrl = `https://discord.com/api/oauth2/authorize?` +
          `client_id=${AUTH_CONFIG.discord.clientId}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `response_type=code&` +
          `scope=identify%20email&` +
          `code_challenge=${codeChallenge}&` +
          `code_challenge_method=S256`;
      }

      await openUrl(authUrl);


    } catch (err: any) {
      console.error("OAuth Error:", err);
      setError(`Login failed: ${err.message || err || "Ensure browser is allowed to redirect."}`);
    } finally {

      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      {/* Custom Titlebar for dragging */}
      <div className="login-titlebar" data-tauri-drag-region>
        <WindowControls />
      </div>
      {/* Logo */}
      <div className="login-logo">
        <Flame size={36} />
      </div>

      {/* Title */}
      <h1 className="login-title">Kabab Gang</h1>
      <p className="login-subtitle">Connection Established // Port: 8080</p>

      {/* Login Card */}
      <form className="login-card" onSubmit={handleSubmit}>
        {/* Decorative side text */}
        <span className="login-side-text left">
          UL_VER: 4.0.2 &nbsp;&nbsp; LATENCY: — MS &nbsp;&nbsp; STATUS: DISCONNECTED
        </span>
        <span className="login-side-text right">
          ENCRYPTION: AES-256 &nbsp;&nbsp; SYSTEMS: NOMINAL &nbsp;&nbsp; LOC: GLOBAL_NET
        </span>

        {/* Error message */}
        {error && (
          <div
            style={{
              background: "rgba(255, 59, 59, 0.1)",
              border: "1px solid var(--cyber-red)",
              borderRadius: 4,
              padding: "10px 14px",
              marginBottom: 20,
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--cyber-red)",
              letterSpacing: 0.5,
            }}
          >
            ⚠ {error}
          </div>
        )}

        {/* Email Field */}
        <div className="login-field">
          <div className="login-field-header">
            <label className="login-field-label">Email Address</label>
            <span className="login-field-tag">[Required]</span>
          </div>
          <div className="login-input-wrap">
            <AtSign size={16} className="icon" />
            <input
              type="email"
              placeholder="OPERATOR@KABABGANG.COM"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="login-field">
          <div className="login-field-header">
            <label className="login-field-label">Security Key</label>
            <span className="login-field-tag">[Encrypted]</span>
          </div>
          <div className="login-input-wrap">
            <Lock size={16} className="icon" />
            <input
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
        </div>

        {/* Forgot */}
        <div className="login-forgot">
          <a href="#">Forgot Password?</a>
        </div>

        {/* Submit */}
        <button type="submit" className="login-btn" disabled={loading}>
          {loading ? (
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
              Connecting...
            </span>
          ) : isSignUp ? (
            "Apply for Membership"
          ) : (
            "Join The Gang"
          )}
        </button>

        <div className="social-login-separator">
          <span>OR CONTINUE WITH</span>
        </div>

        <div className="social-login-grid">
          <button 
            type="button" 
            className="social-btn google"
            onClick={() => handleSocialLogin(googleProvider)}
            disabled={loading}
          >
            Google
          </button>
          <button 
            type="button" 
            className="social-btn discord"
            onClick={() => handleSocialLogin(discordProvider)}
            disabled={loading}
          >
            Discord
          </button>
        </div>

        {/* Toggle Sign-up / Sign-in */}
        <p className="login-signup">
          {isSignUp ? (
            <>
              Already a member?{" "}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setIsSignUp(false);
                  setError("");
                }}
              >
                Sign in
              </a>
            </>
          ) : (
            <>
              New recruit?{" "}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setIsSignUp(true);
                  setError("");
                }}
              >
                Apply for membership
              </a>
            </>
          )}
        </p>
      </form>

      {/* Footer */}
      <div className="login-footer">
        <ShieldCheck size={14} className="shield" />
        <span>Secure Access Protocol Active for Kabab Gang Members Only</span>
        
        {/* Debug Info for Deployment verification */}
        <div style={{ opacity: 0.2, fontSize: '8px', marginTop: '10px', letterSpacing: '1px' }}>
          DEBUG_SIG: {AUTH_CONFIG.google.clientId.substring(0, 5)}...{AUTH_CONFIG.google.clientId.substring(AUTH_CONFIG.google.clientId.length - 8)}
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
