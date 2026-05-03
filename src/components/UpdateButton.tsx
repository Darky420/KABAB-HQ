import React, { useState, useEffect, useRef } from "react";
import {
  Download,
  CheckCircle,
  RefreshCw,
  ArrowUpCircle,
  ExternalLink,
  Loader2,
} from "lucide-react";
import {
  checkForUpdates,
  UpdateCheckResult,
  APP_VERSION,
} from "../services/updateService";
import { openUrl } from "@tauri-apps/plugin-opener";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";

type InstallState = "idle" | "downloading" | "installing" | "error";

const UpdateButton: React.FC = () => {
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [installState, setInstallState] = useState<InstallState>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const unlistenRef = useRef<UnlistenFn | null>(null);

  // Check for updates on mount
  useEffect(() => {
    handleCheck();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cleanup progress listener on unmount
  useEffect(() => {
    return () => {
      if (unlistenRef.current) unlistenRef.current();
    };
  }, []);

  const handleCheck = async () => {
    setChecking(true);
    const result = await checkForUpdates();
    setUpdateResult(result);
    setChecking(false);
  };

  const handleInstall = async () => {
    if (!updateResult?.latestRelease?.downloadUrl) {
      // No direct download URL — open GitHub release page
      await openUrl(updateResult!.latestRelease!.htmlUrl);
      return;
    }

    setInstallState("downloading");
    setProgress(0);
    setErrorMsg("");

    // Listen to progress events from Rust
    const unlisten = await listen<number>("update-progress", (event) => {
      const pct = event.payload;
      setProgress(pct);
      if (pct >= 100) {
        setInstallState("installing");
      }
    });
    unlistenRef.current = unlisten;

    try {
      await invoke("download_and_install", {
        url: updateResult.latestRelease.downloadUrl,
      });
      // App will exit — this line is never reached normally
    } catch (err) {
      setInstallState("error");
      setErrorMsg(String(err));
      if (unlistenRef.current) {
        unlistenRef.current();
        unlistenRef.current = null;
      }
    }
  };

  const hasUpdate = updateResult?.updateAvailable || false;
  const isBusy = installState === "downloading" || installState === "installing";

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

              {/* Install progress bar */}
              {isBusy && (
                <div className="update-progress-wrap">
                  <div className="update-progress-bar">
                    <div
                      className="update-progress-fill"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="update-progress-label">
                    {installState === "installing"
                      ? "Installing... App will restart"
                      : `Downloading... ${progress}%`}
                  </span>
                </div>
              )}

              {/* Error message */}
              {installState === "error" && (
                <span className="update-error-msg">⚠ {errorMsg}</span>
              )}

              {/* Install button — hidden while busy */}
              {!isBusy && (
                <button
                  className={`update-download-btn ${installState === "error" ? "error" : ""}`}
                  onClick={handleInstall}
                >
                  {installState === "error" ? (
                    <>
                      <RefreshCw size={14} />
                      <span>Retry</span>
                    </>
                  ) : (
                    <>
                      <Download size={14} />
                      <span>Install Update</span>
                    </>
                  )}
                </button>
              )}

              {/* Busy spinner label */}
              {isBusy && (
                <button className="update-download-btn busy" disabled>
                  <Loader2 size={14} className="spin-icon" />
                  <span>
                    {installState === "installing" ? "Installing..." : "Downloading..."}
                  </span>
                </button>
              )}

              {updateResult.latestRelease.htmlUrl && !isBusy && (
                <button
                  className="update-release-link"
                  onClick={() => openUrl(updateResult.latestRelease!.htmlUrl)}
                >
                  <ExternalLink size={12} />
                  <span>View Release Notes</span>
                </button>
              )}
            </div>
          )}

          <div className="update-dropdown-actions">
            <button
              className="update-action-btn"
              onClick={() => {
                setShowDropdown(false);
                handleCheck();
              }}
              disabled={isBusy}
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
