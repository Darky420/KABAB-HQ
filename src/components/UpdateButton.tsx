import React, { useState, useEffect, useRef } from "react";
import {
  Download,
  CheckCircle,
  RefreshCw,
  ArrowUpCircle,
  ExternalLink,
  FileText,
} from "lucide-react";
import {
  checkForUpdates,
  UpdateCheckResult,
  APP_VERSION,
} from "../services/updateService";
import { openUrl } from "@tauri-apps/plugin-opener";

interface UpdateButtonProps {
  onShowChangelog: () => void;
}

const UpdateButton: React.FC<UpdateButtonProps> = ({ onShowChangelog }) => {
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(
    null
  );
  const [checking, setChecking] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check for updates on mount
  useEffect(() => {
    handleCheck();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCheck = async () => {
    setChecking(true);
    const result = await checkForUpdates();
    setUpdateResult(result);
    setChecking(false);
  };

  const handleDownload = async () => {
    if (updateResult?.latestRelease) {
      const url =
        updateResult.latestRelease.downloadUrl ||
        updateResult.latestRelease.htmlUrl;
      await openUrl(url);
    }
  };

  const hasUpdate = updateResult?.updateAvailable || false;

  return (
    <div className="update-btn-wrapper" ref={dropdownRef}>
      {/* Main Button */}
      <button
        className={`update-trigger ${hasUpdate ? "has-update" : ""} ${checking ? "checking" : ""}`}
        onClick={() => setShowDropdown(!showDropdown)}
        title={
          hasUpdate
            ? `Update available: v${updateResult?.latestRelease?.version}`
            : `Up to date — v${APP_VERSION}`
        }
      >
        {checking ? (
          <>
            <RefreshCw size={13} className="spin-icon" />
            <span className="update-label">Checking...</span>
          </>
        ) : hasUpdate ? (
          <>
            <ArrowUpCircle size={13} />
            <span className="update-label">Update</span>
            <span className="update-badge-dot" />
          </>
        ) : (
          <>
            <CheckCircle size={13} />
            <span className="update-label">v{APP_VERSION}</span>
          </>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className="update-dropdown">
          <div className="update-dropdown-header">
            <span className="update-dropdown-title">
              {hasUpdate ? "UPDATE AVAILABLE" : "YOU'RE UP TO DATE"}
            </span>
            <span className="update-dropdown-version">
              Current: v{APP_VERSION}
            </span>
          </div>

          {hasUpdate && updateResult?.latestRelease && (
            <div className="update-dropdown-new">
              <div className="update-new-version">
                <ArrowUpCircle size={16} className="update-new-icon" />
                <div className="update-new-info">
                  <span className="update-new-label">
                    v{updateResult.latestRelease.version}
                  </span>
                  <span className="update-new-name">
                    {updateResult.latestRelease.name}
                  </span>
                </div>
              </div>

              <button className="update-download-btn" onClick={handleDownload}>
                <Download size={14} />
                <span>Download Update</span>
              </button>

              {updateResult.latestRelease.htmlUrl && (
                <button
                  className="update-release-link"
                  onClick={() =>
                    openUrl(
                      updateResult.latestRelease!.htmlUrl
                    )
                  }
                >
                  <ExternalLink size={12} />
                  <span>View Release Notes</span>
                </button>
              )}
            </div>
          )}

          <div className="update-dropdown-actions">
            <button className="update-action-btn" onClick={onShowChangelog}>
              <FileText size={13} />
              <span>Changelog</span>
            </button>
            <button
              className="update-action-btn"
              onClick={() => {
                setShowDropdown(false);
                handleCheck();
              }}
            >
              <RefreshCw size={13} />
              <span>Check Again</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UpdateButton;
