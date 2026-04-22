import React from "react";
import { Camera, MessageSquare } from "lucide-react";
import { UserProfile, KABAB_BADGES } from "../services/profileService";

interface ProfileCardProps {
  profile: Partial<UserProfile>;
  isOwnProfile?: boolean;
  onEditBanner?: () => void;
  onMessage?: () => void;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ profile, isOwnProfile, onEditBanner, onMessage }) => {
  const bannerStyle = {
    backgroundImage: `url(${profile.bannerUrl || "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=1000"})`
  };

  const avatarUrl = profile.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.uid || "Kabab"}`;

  return (
    <div className="discord-card">
      <div 
        className="card-banner" 
        style={bannerStyle} 
        onClick={isOwnProfile ? onEditBanner : undefined}
      >
        {isOwnProfile && (
          <div className="banner-overlay">
            <Camera size={24} />
          </div>
        )}
      </div>
      
      <div className="card-header">
        <div className="avatar-wrapper">
          <img src={avatarUrl} alt="Avatar" />
          <div className={`preview-status-dot ${profile.statusType || "online"}`} />
        </div>
        <div className="card-badges">
          {profile.badges?.map(bid => {
            const badge = KABAB_BADGES.find(b => b.id === bid);
            return badge ? <span key={bid} title={badge.label}>{badge.icon}</span> : null;
          })}
        </div>
      </div>

      <div className="card-body">
        <div className="card-main-info">
          <div className="card-title-row">
            <h3>{profile.displayName || "Anonymous User"}</h3>
            {!isOwnProfile && onMessage && (
              <button className="card-action-btn" onClick={onMessage} title="Message">
                <MessageSquare size={16} />
              </button>
            )}
          </div>
          <p className="card-status-text">
            {profile.statusText ? `💭 ${profile.statusText}` : "No status set"}
          </p>
        </div>
        
        <div className="card-sep" />
        
        <div className="card-section">
          <h4>ABOUT ME</h4>
          <p>{profile.bio || "This user hasn't set a bio yet. They are likely busy eating kababs."}</p>
        </div>
      </div>
    </div>
  );
};

export default ProfileCard;
