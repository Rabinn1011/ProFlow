import { Router } from "express";
import { login, logout, logoutAll, refresh, register } from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { requireTrustedOrigin } from "../middleware/csrf.middleware";
import {
  loginLimiter,
  loginSprayLimiter,
  refreshLimiter,
  registerLimiter,
} from "../middleware/rate-limit.middleware";

const authRouter = Router();

// These routes ride on the refresh cookie, so they are the ones a malicious site could
// trigger from a victim's browser. See csrf.middleware.ts.
authRouter.use(requireTrustedOrigin);

authRouter.post("/register", registerLimiter, register);
// Two layers: per-account guessing, then per-address spraying across many accounts.
authRouter.post("/login", loginLimiter, loginSprayLimiter, login);
authRouter.post("/refresh", refreshLimiter, refresh);
// Logout is deliberately unlimited: never make it hard for someone to end a session.
authRouter.post("/logout", logout);
authRouter.post("/logout-all", requireAuth, logoutAll);

export default authRouter;
