import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { UserProfile, subscribeToUserProfile } from "../services/profileService";
import ProfileCard from "./ProfileCard";

interface UserProfileModalProps {
  uid: string;
  onClose: () => void;
  onMessage: (uid: string) => void;
  fallbackData?: { displayName: string; avatarUrl: string };
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ uid, onClose, onMessage, fallbackData }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToUserProfile(uid, (data) => {
      setProfile(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [uid]);

  if (loading) return null;

  // If Firestore profile doesn't exist, create a skeleton from fallback data
  const finalProfile = profile || (fallbackData ? {
    uid,
    displayName: fallbackData.displayName,
    photoURL: fallbackData.avatarUrl,
    bio: "",
    bannerUrl: "",
    statusType: "online",
    statusText: "",
    badges: []
  } as UserProfile : null);

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="user-profile-dialog" onClick={e => e.stopPropagation()}>
        <button className="user-dialog-close" onClick={onClose}>
          <X size={20} />
        </button>
        
        {finalProfile ? (
          <ProfileCard 
            profile={finalProfile} 
            isOwnProfile={false} 
            onMessage={() => onMessage(uid)}
          />
        ) : (
          <div className="profile-not-found">
            <p>User profile not found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfileModal;
