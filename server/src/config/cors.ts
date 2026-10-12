const DEV_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"];

// One source of truth for HTTP CORS, the Socket.io handshake and the CSRF origin check.
//
// This used to fall back to `true` (reflect any origin) when CORS_ORIGIN was unset. With
// credentials enabled and a SameSite=None refresh cookie, that let any website call
// /auth/refresh from a victim's browser and read back a valid access token. Now an unset
// value means "local dev only" outside production, and validateEnv refuses to boot a
// production server without it.
export const getAllowedOrigins = (): string[] => {
  const configured = process.env.CORS_ORIGIN?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (configured && configured.length > 0) return configured;
  return process.env.NODE_ENV === "production" ? [] : DEV_ORIGINS;
};

export const isAllowedOrigin = (origin: string): boolean => getAllowedOrigins().includes(origin);
