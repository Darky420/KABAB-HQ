import React, { useState } from "react";
import { X, Check, Camera, Image as ImageIcon, Loader2, User, Eye } from "lucide-react";
import { UserProfile, KABAB_BADGES, updateUserProfile, uploadProfileImage } from "../services/profileService";
import { compressImage } from "../utils/imageUtils";
import ProfileCard from "./ProfileCard";
 
interface ProfileModalProps {
  uid: string;
  initialProfile: UserProfile | null;
  onClose: () => void;
}
 
const ProfileModal: React.FC<ProfileModalProps> = ({ uid, initialProfile, onClose }) => {
  const avatarInputRef = React.useRef<HTMLInputElement>(null);
  const bannerInputRef = React.useRef<HTMLInputElement>(null);
 
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    displayName: initialProfile?.displayName || "",
    bio: initialProfile?.bio || "",
    photoURL: initialProfile?.photoURL || "",
    bannerUrl: initialProfile?.bannerUrl || "",
    statusType: initialProfile?.statusType || "online",
    statusText: initialProfile?.statusText || "",
    badges: initialProfile?.badges || []
  });
 
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [errorHeader, setErrorHeader] = useState<string | null>(null);
  const [avatarSuccess, setAvatarSuccess] = useState(false);

  const handleSave = async () => {
    if (isUploadingAvatar || isUploadingBanner) return;
    setIsSaving(true);
    setErrorHeader(null);
    try {
      await updateUserProfile(uid, formData);
      onClose();
    } catch (err: any) {
      console.error("Failed to save profile:", err);
      setErrorHeader(err.message || "Something went wrong while saving.");
    } finally {
      setIsSaving(false);
    }
  };
 
  const toggleBadge = (badgeId: string) => {
    setFormData(prev => ({
      ...prev,
      badges: prev.badges?.includes(badgeId)
        ? prev.badges.filter(id => id !== badgeId)
        : [...(prev.badges || []), badgeId].slice(0, 3)
    }));
  };
 
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "avatar" | "banner") => {
    const file = e.target.files?.[0];
    if (!file) return;
 
    if (file.size > 10 * 1024 * 1024) {
      alert("Image is way too large! Max 10MB allowed for optimization.");
      return;
    }
 
    if (type === "avatar") setIsUploadingAvatar(true);
    else setIsUploadingBanner(true);
    setErrorHeader(null);

    try {
      console.log(`Starting ${type} upload for user ${uid}...`);
      const maxWidth = type === "avatar" ? 512 : 1200;
      const maxHeight = type === "avatar" ? 512 : 600;
      const compressedBlob = await compressImage(file, maxWidth, maxHeight, 0.85);
      console.log(`Compression done. Original: ${file.size}B → Compressed: ${compressedBlob.size}B`);

      const rawUrl = await uploadProfileImage(uid, compressedBlob, type);
      // Cache-bust so browser doesn't serve the old cached image
      const url = `${rawUrl}?t=${Date.now()}`;
      console.log(`${type} upload success! URL: ${url}`);

      const updatedField = type === "avatar" ? { photoURL: url } : { bannerUrl: url };

      // Update local form state
      setFormData(prev => ({ ...prev, ...updatedField }));

      // ✅ Auto-save to Firestore immediately — no need to click "Save Changes" for images
      await updateUserProfile(uid, updatedField);
      console.log(`${type} auto-saved to Firestore ✅`);

      if (type === "avatar") {
        setAvatarSuccess(true);
        setTimeout(() => setAvatarSuccess(false), 3000);
      }
    } catch (err: any) {
      console.error("Upload failed in ProfileModal:", err);
      setErrorHeader(`Upload failed: ${err.message || "Check Supabase Storage permissions"}`);
    } finally {
      if (type === "avatar") setIsUploadingAvatar(false);
      else setIsUploadingBanner(false);
      if (e.target) e.target.value = "";
    }
  };
 
  return (
    <div className="profile-modal-overlay">
      <div className="profile-modal">
        <header className="modal-header">
          <div className="header-titles">
            <h2>User Settings</h2>
            <p>Customize your Kabab Gang identity</p>
          </div>
          <button onClick={onClose} className="close-btn"><X size={20} /></button>
        </header>
 
        <div className="modal-body">
          <div className="modal-sidebar">
            <button 
              type="button"
              className={activeTab === "edit" ? "active" : ""} 
              onClick={() => setActiveTab("edit")}
            >
              <User size={18} />
              Profiles
            </button>
            <button 
              type="button"
              className={activeTab === "preview" ? "active" : ""} 
              onClick={() => setActiveTab("preview")}
            >
              <Eye size={18} />
              Live Preview
            </button>
            <div className="sidebar-sep" />
            <div className="sidebar-info">
              <span>Account Status: Verified</span>
            </div>
          </div>
 
          <div className="modal-content">
            {activeTab === "edit" && (
              <div className="edit-profile-view">
                <section>
                  <label>Display Name</label>
                  <input 
                    type="text" 
                    value={formData.displayName} 
                    onChange={e => setFormData({...formData, displayName: e.target.value})} 
                  />
                </section>
 
                <section>
                  <label>About Me</label>
                  <textarea 
                    value={formData.bio} 
                    maxLength={190}
                    placeholder="Tell us about yourself..."
                    onChange={e => setFormData({...formData, bio: e.target.value})} 
                  />
                  <span className="char-count">{formData.bio?.length}/190</span>
                </section>
 
                <div className="grid-2-col">
                  <section>
                    <label>Profile Image</label>
                    <input 
                      type="file" 
                      hidden 
                      ref={avatarInputRef} 
                      accept="image/*" 
                      onChange={e => handleImageUpload(e, "avatar")} 
                    />
                    <button 
                      className={`upload-trigger-btn ${avatarSuccess ? "success" : ""}`}
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                    >
                      {isUploadingAvatar 
                        ? <Loader2 className="animate-spin" size={16} /> 
                        : avatarSuccess 
                          ? <Check size={16} />
                          : <Camera size={16} />}
                      {isUploadingAvatar ? "Uploading..." : avatarSuccess ? "Saved!" : "Change Avatar"}
                    </button>
                  </section>
                  <section>
                    <label>Profile Banner</label>
                    <input 
                      type="file" 
                      hidden 
                      ref={bannerInputRef} 
                      accept="image/*" 
                      onChange={e => handleImageUpload(e, "banner")} 
                    />
                    <button 
                      className="upload-trigger-btn" 
                      onClick={() => bannerInputRef.current?.click()}
                      disabled={isUploadingBanner}
                    >
                      {isUploadingBanner ? <Loader2 className="animate-spin" size={16} /> : <ImageIcon size={16} />}
                      {isUploadingBanner ? "Uploading..." : "Change Banner"}
                    </button>
                  </section>
                </div>
 
                <section>
                  <label>Status Text</label>
                  <input 
                    type="text" 
                    value={formData.statusText} 
                    placeholder="What's happening?"
                    onChange={e => setFormData({...formData, statusText: e.target.value})} 
                  />
                </section>
 
                <section>
                  <label>Kabab Gang Badges (Max 3)</label>
                  <div className="badge-selector">
                    {KABAB_BADGES.map(badge => (
                      <div 
                        key={badge.id}
                        className={`badge-item ${formData.badges?.includes(badge.id) ? "selected" : ""}`}
                        onClick={() => toggleBadge(badge.id)}
                        style={{'--badge-color': badge.color} as any}
                      >
                        <span className="badge-icon">{badge.icon}</span>
                        <span className="badge-label">{badge.label}</span>
                        {formData.badges?.includes(badge.id) && <Check size={12} className="check" />}
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}
 
            {activeTab === "preview" && (
              <div className="preview-profile-view">
                <ProfileCard 
                  profile={formData} 
                  isOwnProfile={true} 
                  onEditBanner={() => bannerInputRef.current?.click()} 
                />
              </div>
            )}
          </div>
        </div>
 
        <footer className="modal-footer">
          {errorHeader && <div className="modal-error-toast">{errorHeader}</div>}
          <button className="cancel-btn" onClick={onClose} disabled={isSaving}>Cancel</button>
          <button 
            className="save-btn" 
            onClick={handleSave} 
            disabled={isSaving || isUploadingAvatar || isUploadingBanner}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </footer>
      </div>
    </div>
  );
};
 
export default ProfileModal;
