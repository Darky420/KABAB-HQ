export const AUTH_CONFIG = {
  google: {
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || "",
    clientSecret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET || "",
  },

  discord: {
    clientId: import.meta.env.VITE_DISCORD_CLIENT_ID || "",
  }
};

