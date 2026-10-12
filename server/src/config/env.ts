import dotenv from "dotenv";

// Side-effect module: loads .env into process.env at import time.
// Must be the first import in server.ts so that env vars are populated
// before any module that reads them is evaluated.
dotenv.config();

const MIN_SECRET_LENGTH = 32;

// Placeholder values that have appeared in this repo's examples. A deployment still using
// one of them has publicly known signing keys, i.e. anyone can mint tokens for any user.
const KNOWN_WEAK_SECRETS = ["change-me", "changeme", "secret", "test-", "dev-only"];

// Fail at boot rather than at the first request: a misconfigured server that starts
// "fine" and then 500s on login, or worse, starts with forgeable tokens, is harder to
// notice than one that refuses to start.
export const validateEnv = (): void => {
  const problems: string[] = [];
  const isProduction = process.env.NODE_ENV === "production";

  const access = process.env.ACCESS_TOKEN_SECRET ?? "";
  const refresh = process.env.REFRESH_TOKEN_SECRET ?? "";

  if (!access) problems.push("ACCESS_TOKEN_SECRET is not set");
  if (!refresh) problems.push("REFRESH_TOKEN_SECRET is not set");
  if (access && refresh && access === refresh) {
    // Same key for both would let a refresh token pass as an access token and vice versa.
    problems.push("ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET must be different");
  }

  if (isProduction) {
    for (const [name, value] of [
      ["ACCESS_TOKEN_SECRET", access],
      ["REFRESH_TOKEN_SECRET", refresh],
    ] as const) {
      if (value && value.length < MIN_SECRET_LENGTH) {
        problems.push(`${name} must be at least ${MIN_SECRET_LENGTH} characters in production`);
      }
      if (KNOWN_WEAK_SECRETS.some((weak) => value.toLowerCase().includes(weak))) {
        problems.push(`${name} looks like a placeholder; generate a real random secret`);
      }
    }

    // Without an allowlist the API would have to either reject every browser or trust
    // every site with the user's cookies. Neither is acceptable, so refuse to guess.
    if (!process.env.CORS_ORIGIN?.trim()) {
      problems.push("CORS_ORIGIN must be set in production");
    }
  }

  if (problems.length > 0) {
    throw new Error(`Invalid environment configuration:\n  - ${problems.join("\n  - ")}`);
  }
};
