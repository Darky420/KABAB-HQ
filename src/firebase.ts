import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, OAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA6QFABeGY2Y0oMKz_CqzO7nx4D7xxFSMs",
  authDomain: "kabab-gang-launcher.firebaseapp.com",
  projectId: "kabab-gang-launcher",
  storageBucket: "kabab-gang-launcher.firebasestorage.app",
  messagingSenderId: "100750247935",
  appId: "1:100750247935:web:0bcabb0faa0e046cadc9ca",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export const discordProvider = new OAuthProvider("discord.com");

export default app;
