import { 
  collection, 
  addDoc, 
  onSnapshot, 
  deleteDoc, 
  getDocs,
  query,
  where
} from "firebase/firestore";
import { db } from "../firebase";

const SIGNAL_COLLECTION = "voice_signals";

export interface SignalData {
  type: "offer" | "answer" | "candidate";
  from: string;
  to: string;
  payload: any;
}

/**
 * WebRTC Signaling Service using Firestore
 * This handles the "handshake" between peers for P2P voice.
 */
export const sendSignal = async (channelId: string, signal: SignalData) => {
  const channelRef = collection(db, SIGNAL_COLLECTION, channelId, "signals");
  await addDoc(channelRef, {
    ...signal,
    timestamp: new Date().getTime()
  });
};

export const subscribeToSignals = (channelId: string, myUid: string, onSignal: (signal: any) => void) => {
  const q = query(
    collection(db, SIGNAL_COLLECTION, channelId, "signals"),
    where("to", "==", myUid)
  );

  return onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        onSignal(change.doc.data());
        // Clean up signal after processing
        deleteDoc(change.doc.ref);
      }
    });
  });
};

export const clearSignals = async (channelId: string, myUid: string) => {
  const q = query(
    collection(db, SIGNAL_COLLECTION, channelId, "signals"),
    where("from", "==", myUid)
  );
  const snapshot = await getDocs(q);
  snapshot.forEach(doc => deleteDoc(doc.ref));
};
