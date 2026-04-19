import React, { useEffect, useRef } from "react";
import { X, Zap, Tag } from "lucide-react";
import {
  getChangelog,
  APP_VERSION,
  markChangelogSeen,
  ChangelogEntry,
} from "../services/updateService";

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose }) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const changelog = getChangelog();

  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    markChangelogSeen(APP_VERSION);
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      handleClose();
    }
  };

  return (
    <div
      className="changelog-overlay"
      ref={overlayRef}
      onClick={handleOverlayClick}
    >
      <div className="changelog-modal">
        {/* Header */}
        <div className="changelog-header">
          <div className="changelog-header-left">
            <Zap size={18} className="changelog-icon" />
            <div className="changelog-header-text">
              <h2>What's New</h2>
              <span className="changelog-version-badge">v{APP_VERSION}</span>
            </div>
          </div>
          <button className="changelog-close" onClick={handleClose}>
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="changelog-body">
          {changelog.map((entry: ChangelogEntry, idx: number) => (
            <div
              className={`changelog-release ${idx === 0 ? "latest" : ""}`}
              key={entry.version}
            >
              {/* Release Header */}
              <div className="changelog-release-header">
                <div className="changelog-release-tag">
                  <Tag size={12} />
                  <span>v{entry.version}</span>
                </div>
                <span className="changelog-release-title">{entry.title}</span>
                <span className="changelog-release-date">{entry.date}</span>
              </div>

              {/* Categories */}
              <div className="changelog-categories">
                {entry.categories.map((cat) => (
                  <div className="changelog-category" key={cat.label}>
                    <div className="changelog-category-header">
                      <span className="changelog-category-icon">
                        {cat.icon}
                      </span>
                      <span className="changelog-category-label">
                        {cat.label}
                      </span>
                    </div>
                    <ul className="changelog-items">
                      {cat.items.map((item, i) => (
                        <li key={i}>
                          <span className="changelog-bullet" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Separator between releases */}
              {idx < changelog.length - 1 && (
                <div className="changelog-separator" />
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="changelog-footer">
          <span className="changelog-footer-text">
            KABAB HQ — Built with 🔥 by the Gang
          </span>
          <button className="changelog-dismiss-btn" onClick={handleClose}>
            Got it, let's go
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChangelogModal;
