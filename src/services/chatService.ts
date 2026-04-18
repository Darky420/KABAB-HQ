import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  serverTimestamp,
  Timestamp,
  doc,
  setDoc,
  deleteDoc
} from "firebase/firestore";
import { db } from "../firebase";

export interface ChatMessage {
  id: string;
  uid: string;
  displayName: string;
  text: string;
  createdAt: Timestamp | null;
  channelId: string;
}

export const subscribeToMessages = (channelId: string, callback: (messages: ChatMessage[]) => void) => {
  // Fetch latest messages ordered by time
  const q = query(
    collection(db, "messages"),
    orderBy("createdAt", "asc"),
    limit(200) // Increase limit slightly as we filter client-side
  );

  return onSnapshot(q, (snapshot) => {
    const msgs: ChatMessage[] = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<ChatMessage, "id">),
      }))
      // Filter by channelId on the client side to avoid index requirement
      .filter((msg) => msg.channelId === channelId);
    
    callback(msgs);
  });
};


export const sendMessage = async (
  channelId: string, 
  user: { uid: string; displayName: string }, 
  text: string
) => {
  if (!text.trim()) return;

  await addDoc(collection(db, "messages"), {
    uid: user.uid,
    displayName: user.displayName,
    text: text,
    channelId: channelId,
    createdAt: serverTimestamp(),
  });
};

export interface TypingIndicator {
  uid: string;
  displayName: string;
  isTyping: boolean;
}

export const setTypingStatus = async (
  channelId: string,
  user: { uid: string; displayName: string },
  isTyping: boolean
) => {
  const typingRef = doc(db, "typing_indicators", `${channelId}_${user.uid}`);
  if (isTyping) {
    await setDoc(typingRef, {
      uid: user.uid,
      displayName: user.displayName,
      channelId,
      isTyping: true,
      lastActive: serverTimestamp()
    });
  } else {
    await deleteDoc(typingRef);
  }
};

export const subscribeToTyping = (channelId: string, callback: (users: TypingIndicator[]) => void) => {
  const q = query(
    collection(db, "typing_indicators"),
    limit(50)
  );

  return onSnapshot(q, (snapshot) => {
    const typingUsers = snapshot.docs
      .map(doc => doc.data() as TypingIndicator & { channelId: string })
      .filter(data => data.channelId === channelId && data.isTyping);
    
    callback(typingUsers);
  });
};
