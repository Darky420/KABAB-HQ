import { 
  doc, 
  setDoc, 
  getDoc 
} from "firebase/firestore";
import { db } from "../firebase";
 
export type NotificationLevel = 'all' | 'mentions' | 'nothing';
 
export interface ChannelPreference {
  level: NotificationLevel;
  muteUntil: number | null; // Timestamp in ms
}
 
export const updateChannelPreference = async (
  uid: string, 
  channelId: string, 
  level: NotificationLevel
) => {
  const prefRef = doc(db, "users", uid, "notification_settings", channelId);
  await setDoc(prefRef, { level }, { merge: true });
};
 
export const muteChannel = async (
  uid: string, 
  channelId: string, 
  durationMinutes: number | null
) => {
  const prefRef = doc(db, "users", uid, "notification_settings", channelId);
  const muteUntil = durationMinutes ? Date.now() + durationMinutes * 60000 : (durationMinutes === 0 ? null : -1); 
  // duration 0 = unmute, null = permanent mute (-1)
  
  await setDoc(prefRef, { muteUntil: muteUntil === -1 ? -1 : (muteUntil || null) }, { merge: true });
};
 
export const getChannelPreference = async (
  uid: string, 
  channelId: string
): Promise<ChannelPreference> => {
  const prefRef = doc(db, "users", uid, "notification_settings", channelId);
  const snap = await getDoc(prefRef);
  if (snap.exists()) {
    return snap.data() as ChannelPreference;
  }
  return { level: 'all', muteUntil: null };
};
