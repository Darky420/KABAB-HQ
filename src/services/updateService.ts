/**
 * Update Service — Checks GitHub releases for new app versions.
 * Uses the GitHub API to compare current version against latest release.
 */

// App constants
export const APP_VERSION = "0.2.0";
export const GITHUB_OWNER = "Darky420";
export const GITHUB_REPO = "KABAB-HQ";

export interface ReleaseInfo {
  version: string;
  tagName: string;
  name: string;
  body: string; // markdown changelog
  publishedAt: string;
  downloadUrl: string | null; // .msi or .exe asset URL
  htmlUrl: string; // GitHub release page URL
}

export interface UpdateCheckResult {
  updateAvailable: boolean;
  currentVersion: string;
  latestRelease: ReleaseInfo | null;
}

/**
 * Parse version string "x.y.z" into comparable numbers
 */
function parseVersion(version: string): number[] {
  return version
    .replace(/^v/, "")
    .split(".")
    .map((n) => parseInt(n, 10));
}

/**
 * Compare two version strings. Returns:
 *  1 if a > b
 * -1 if a < b
 *  0 if equal
 */
function compareVersions(a: string, b: string): number {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  const len = Math.max(pa.length, pb.length);

  for (let i = 0; i < len; i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }

  return 0;
}

/**
 * Fetch the latest release from GitHub API
 */
export async function checkForUpdates(): Promise<UpdateCheckResult> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!response.ok) {
      // No releases found or rate limited
      return {
        updateAvailable: false,
        currentVersion: APP_VERSION,
        latestRelease: null,
      };
    }

    const data = await response.json();

    // Find Windows installer asset (.msi or .exe)
    const windowsAsset = data.assets?.find(
      (asset: { name: string }) =>
        asset.name.endsWith(".msi") ||
        asset.name.endsWith(".exe") ||
        asset.name.endsWith(".nsis.zip")
    );

    const latestRelease: ReleaseInfo = {
      version: data.tag_name?.replace(/^v/, "") || "0.0.0",
      tagName: data.tag_name || "",
      name: data.name || "",
      body: data.body || "",
      publishedAt: data.published_at || "",
      downloadUrl: windowsAsset?.browser_download_url || null,
      htmlUrl: data.html_url || "",
    };

    const updateAvailable =
      compareVersions(latestRelease.version, APP_VERSION) > 0;

    return {
      updateAvailable,
      currentVersion: APP_VERSION,
      latestRelease,
    };
  } catch (error) {
    console.error("[UpdateService] Failed to check for updates:", error);
    return {
      updateAvailable: false,
      currentVersion: APP_VERSION,
      latestRelease: null,
    };
  }
}

/**
 * Get the changelog for the current version (hardcoded for known versions)
 */
export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  categories: {
    label: string;
    icon: string;
    items: string[];
  }[];
}

export function getChangelog(): ChangelogEntry[] {
  return [
    {
      version: "0.2.0",
      date: "2026-04-19",
      title: "COMMS UPGRADE",
      categories: [
        {
          label: "New Features",
          icon: "🔥",
          items: [
            "In-app update checker — never miss a new release",
            "Changelog viewer with full version history",
            "Version badge in the top navigation bar",
          ],
        },
        {
          label: "Improvements",
          icon: "⚡",
          items: [
            "Replaced search bar with update status indicator",
            "Auto-check for updates on app launch",
            "One-click download for new releases",
          ],
        },
        {
          label: "Under the Hood",
          icon: "🔧",
          items: [
            "GitHub Releases API integration",
            "Version comparison utility",
            "Persistent changelog tracking with localStorage",
          ],
        },
      ],
    },
    {
      version: "0.1.0",
      date: "2026-04-17",
      title: "GENESIS DROP",
      categories: [
        {
          label: "Core Features",
          icon: "🎯",
          items: [
            "Firebase Authentication (Google + Discord OAuth)",
            "Real-time text chat powered by Firestore",
            "Multiple text channels: general, gaming, roasts, kabab-music",
            "Live typing indicators",
          ],
        },
        {
          label: "Voice System",
          icon: "🎙️",
          items: [
            "WebRTC voice channels with peer-to-peer audio",
            "Voice Lobby & Gaming VC channels",
            "Real-time speaking indicators with glow effect",
            "Mute & Deafen controls with visual feedback",
          ],
        },
        {
          label: "UI/UX",
          icon: "🎨",
          items: [
            "Discord-style layout with server, channel & members sidebars",
            "Custom frameless window with drag region",
            "Cyber-red dark theme with JetBrains Mono typography",
            "Online presence system with real-time member list",
          ],
        },
        {
          label: "Infrastructure",
          icon: "🏗️",
          items: [
            "Tauri v2 desktop wrapper (Rust backend)",
            "Firebase Firestore for data persistence",
            "GitHub Actions CI/CD pipeline for releases",
            "Modular service architecture",
          ],
        },
      ],
    },
  ];
}

/**
 * Check if the user has seen the changelog for the current version
 */
export function hasSeenChangelog(version: string): boolean {
  const seen = localStorage.getItem("kabab_seen_changelog");
  return seen === version;
}

/**
 * Mark the current version's changelog as seen
 */
export function markChangelogSeen(version: string): void {
  localStorage.setItem("kabab_seen_changelog", version);
}
