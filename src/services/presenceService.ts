import { 
  collection, 
  setDoc, 
  deleteDoc, 
  doc, 
  onSnapshot,
  serverTimestamp,
  query
} from "firebase/firestore";
import { db } from "../firebase";

export interface VoiceUser {
  uid: string;
  displayName: string;
  avatarUrl: string;
  channelId: string;
  isMuted: boolean;
  isDeafened: boolean;
}

const VOICE_PRESENCE_COLLECTION = "voice_presence";
const GLOBAL_PRESENCE_COLLECTION = "online_status";

export interface GlobalUser {
  uid: string;
  displayName: string;
  avatarUrl: string;
  lastSeen: any;
  status: "online" | "away" | "busy" | "invisible";
  badges?: string[];
}

export const updateVoicePresence = async (
  user: Omit<VoiceUser, "">,
  status: "joining" | "leaving"
) => {
  const presenceRef = doc(db, VOICE_PRESENCE_COLLECTION, user.uid);
  if (status === "joining") {
    await setDoc(presenceRef, {
      ...user,
      lastActive: serverTimestamp()
    });
  } else {
    await deleteDoc(presenceRef);
  }
};

export const updateGlobalPresence = async (
  user: { uid: string; displayName: string; avatarUrl: string; badges?: string[] },
  status: "online" | "away" | "busy" | "invisible" = "online"
) => {
  const presenceRef = doc(db, GLOBAL_PRESENCE_COLLECTION, user.uid);
  
  if (status === "invisible") {
    await deleteDoc(presenceRef);
  } else {
    await setDoc(presenceRef, {
      uid: user.uid,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      status: status,
      badges: user.badges || [],
      lastSeen: serverTimestamp()
    }, { merge: true });
  }
};

export const removeVoicePresence = async (uid: string) => {
  const presenceRef = doc(db, VOICE_PRESENCE_COLLECTION, uid);
  await deleteDoc(presenceRef);
};

export const removeGlobalPresence = async (uid: string) => {
  const presenceRef = doc(db, GLOBAL_PRESENCE_COLLECTION, uid);
  await deleteDoc(presenceRef);
};

export const subscribeToVoicePresence = (callback: (users: VoiceUser[]) => void) => {
  const q = query(collection(db, VOICE_PRESENCE_COLLECTION));
  
  return onSnapshot(q, (snapshot) => {
    const users: VoiceUser[] = snapshot.docs.map(doc => doc.data() as VoiceUser);
    callback(users);
  });
};

export const subscribeToGlobalPresence = (callback: (users: GlobalUser[]) => void) => {
  const q = query(collection(db, GLOBAL_PRESENCE_COLLECTION));
  
  return onSnapshot(q, (snapshot) => {
    const users: GlobalUser[] = snapshot.docs.map(doc => doc.data() as GlobalUser);
    callback(users);
  });
};
