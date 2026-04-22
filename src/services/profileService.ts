import { db, auth } from "../firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { supabase } from "../lib/supabase";
 
export type StatusType = "online" | "away" | "busy" | "invisible";
 
export interface UserBadge {
  id: string;
  label: string;
  icon: string; // Emoji
  color: string;
}
 
export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  bio: string;
  bannerUrl: string;
  statusType: StatusType;
  statusText: string;
  badges: string[]; // IDs of selected badges
}
 
export const KABAB_BADGES: UserBadge[] = [
  { id: "gang_leader", label: "Gang Leader", icon: "👑", color: "var(--cyber-red)" },
  { id: "kabab_chef", label: "Kabab Chef", icon: "🍢", color: "var(--cyber-yellow)" },
  { id: "code_guru", label: "Code Guru", icon: "💻", color: "var(--cyber-green)" },
  { id: "og_member", label: "OG Member", icon: "🤘", color: "var(--cyber-blue)" },
  { id: "bot_master", label: "Bot Master", icon: "🤖", color: "var(--cyber-purple)" }
];
 
export const updateUserProfile = async (uid: string, data: Partial<UserProfile>) => {
  try {
    const userRef = doc(db, "users", uid);
    
    console.log("updateUserProfile: Starting update for", uid);

    // Update Firebase Auth only if data actually changed
    if (auth.currentUser) {
      const { displayName: newName, photoURL: newPhoto } = data;
      const hasNameChanged = newName !== undefined && newName !== auth.currentUser.displayName;
      const hasPhotoChanged = newPhoto !== undefined && newPhoto !== auth.currentUser.photoURL;

      if (hasNameChanged || hasPhotoChanged) {
        console.log("updateUserProfile: Updating Firebase Auth profile...");
        await updateProfile(auth.currentUser, {
          displayName: newName ?? auth.currentUser.displayName,
          photoURL: newPhoto ?? auth.currentUser.photoURL
        });
        console.log("updateUserProfile: ✅ Firebase Auth updated.");
      }
    }

    // Update Firestore for extended info
    console.log("updateUserProfile: 📡 Attempting Firestore write to /users/" + uid);
    
    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Firestore write timed out (10s). Check your Firebase Console rules and if Firestore is initialized.")), 10000)
    );

    await Promise.race([
      setDoc(userRef, {
        ...data,
        updatedAt: new Date().toISOString()
      }, { merge: true }),
      timeoutPromise
    ]);
    
    console.log("updateUserProfile: ✅ Firestore updated successfully.");
  } catch (error: any) {
    console.error("updateUserProfile: ❌ FAILED to save profile:", error.code, error.message);
    throw error;
  }
};
 
export const uploadProfileImage = async (
  uid: string, 
  data: Blob | File, 
  type: "avatar" | "banner"
): Promise<string> => {
  try {
    // If it's a File, use its extension. If Blob, default to jpg (since we compress to jpeg)
    const fileExt = (data as File).name ? (data as File).name.split(".").pop() : "jpg";
    const fileName = `${type}_${Date.now()}.${fileExt}`;
    const filePath = `${uid}/${fileName}`;
    
    // Convert to ArrayBuffer for more reliable upload in Tauri webview
    const arrayBuffer = await data.arrayBuffer();
    
    const { error: uploadError } = await supabase.storage
      .from('user-assets')
      .upload(filePath, arrayBuffer, {
        contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
        upsert: true
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('user-assets')
      .getPublicUrl(filePath);
    
    return publicUrl;
  } catch (error) {
    console.error("Error in uploadProfileImage:", error);
    throw error;
  }
};
 
export const subscribeToUserProfile = (uid: string, callback: (profile: UserProfile | null) => void) => {
  const userRef = doc(db, "users", uid);
  return onSnapshot(userRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as UserProfile);
    } else {
      callback(null);
    }
  });
};
 
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const userRef = doc(db, "users", uid);
  const docSnap = await getDoc(userRef);
  return docSnap.exists() ? (docSnap.data() as UserProfile) : null;
};
