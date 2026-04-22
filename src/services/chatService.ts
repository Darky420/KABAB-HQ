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
  deleteDoc,
  updateDoc
} from "firebase/firestore";
import { db } from "../firebase";
 
export const getDMChannelId = (uid1: string, uid2: string) => {
  return `dm_${[uid1, uid2].sort().join("_")}`;
};

export interface ChatMessage {
  id: string;
  uid: string;
  displayName: string;
  photoURL?: string; // Cache the avatar URL at time of sending
  text: string;
  createdAt: Timestamp | null;
  channelId: string;
  isPinned?: boolean;
  type?: 'text' | 'gif' | 'sticker';
  imageUrl?: string;
  replyTo?: {
    messageId: string;
    displayName: string;
    text: string;
  };
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
  uid: string, 
  displayName: string, 
  text: string,
  type: 'text' | 'gif' | 'sticker' = 'text',
  imageUrl?: string,
  photoURL?: string,
  replyTo?: { messageId: string; displayName: string; text: string }
) => {
  const messagesRef = collection(db, "messages");
  await addDoc(messagesRef, {
    channelId,
    uid,
    displayName,
    photoURL: photoURL || null,
    text,
    type,
    imageUrl: imageUrl || null,
    replyTo: replyTo || null,
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
 
export const togglePinMessage = async (messageId: string, isPinned: boolean) => {
  const msgRef = doc(db, "messages", messageId);
  await updateDoc(msgRef, { isPinned });
};
 
export const deleteMessage = async (messageId: string) => {
  const msgRef = doc(db, "messages", messageId);
  await deleteDoc(msgRef);
};
 
export const editMessage = async (messageId: string, newText: string) => {
  const msgRef = doc(db, "messages", messageId);
  await updateDoc(msgRef, { 
    text: newText,
    isEdited: true, // Mark as edited
    editedAt: serverTimestamp()
  });
};
