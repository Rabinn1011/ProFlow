import { Router } from "express";
import { login, logout, refresh, register } from "../controllers/auth.controller";
import {
  loginLimiter,
  loginSprayLimiter,
  refreshLimiter,
  registerLimiter,
} from "../middleware/rate-limit.middleware";

const authRouter = Router();

authRouter.post("/register", registerLimiter, register);
// Two layers: per-account guessing, then per-address spraying across many accounts.
authRouter.post("/login", loginLimiter, loginSprayLimiter, login);
authRouter.post("/refresh", refreshLimiter, refresh);
// Logout is deliberately unlimited: never make it hard for someone to end a session.
authRouter.post("/logout", logout);

export default authRouter;
