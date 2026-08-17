import type { Request } from "express";
import rateLimit, { ipKeyGenerator, type Options } from "express-rate-limit";

// The suites register and log in dozens of times from one address; a limiter would make
// them fail for reasons that have nothing to do with the code under test.
const skipInTests = (): boolean => process.env.NODE_ENV === "test";

const baseOptions: Partial<Options> = {
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: skipInTests,
  // Same JSON shape as every other error the API returns, so clients need no special case.
  message: { message: "Too many attempts. Please try again later." },
};

// Keying on IP alone means one attacker brute-forcing a single account locks out everyone
// else behind the same NAT. Keying on IP + email confines the lockout to the account
// actually under attack. ipKeyGenerator normalises IPv6 so a /64 cannot be used to get
// unlimited distinct keys.
const ipAndEmailKey = (req: Request): string => {
  const { email } = (req.body ?? {}) as { email?: string };
  return `${ipKeyGenerator(req.ip ?? "")}:${(email ?? "").trim().toLowerCase()}`;
};

// Targeted brute force: slow guessing against one specific account.
export const loginLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  keyGenerator: ipAndEmailKey,
  // A correct password clears nothing, but it also should not count toward the limit.
  skipSuccessfulRequests: true,
});

// Credential spraying: one guess each against many accounts, which the per-account
// limiter above cannot see. Deliberately high so a shared office address never hits it
// during normal use.
export const loginSprayLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: 100,
  skipSuccessfulRequests: true,
});

// Caps automated signup floods without getting in the way of a real person retrying.
export const registerLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 60 * 1000,
  limit: 10,
});

// Called on every app boot and after each access-token expiry, so this is deliberately
// loose — it exists to stop abuse, not normal use.
export const refreshLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: 60,
});
