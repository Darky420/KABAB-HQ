import { useState, useEffect } from "react";
import "./App.css";
import LoginScreen from "./screens/LoginScreen";
import DashboardScreen from "./screens/DashboardScreen";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "./firebase";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div
        style={{
          width: "100%",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "#ff3b3b",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 14,
          letterSpacing: 2,
          textTransform: "uppercase",
        }}
      >
        Establishing Secure Connection...
      </div>
    );
  }

  return user ? (
    <DashboardScreen user={user} />
  ) : (
    <LoginScreen onLogin={() => {}} />
  );
}

export default App;
