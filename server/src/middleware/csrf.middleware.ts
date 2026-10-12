import type { NextFunction, Request, Response } from "express";
import { isAllowedOrigin } from "../config/cors";

// /auth/refresh and /auth/logout authenticate with a cookie, and in a cross-site
// deployment that cookie is SameSite=None, so the browser attaches it to requests that
// any website triggers. CORS stops that site *reading* the response, but not the request
// from running. Browsers always send Origin on cross-origin POSTs, so rejecting unknown
// origins here closes the gap. Non-browser clients (curl, tests) send no Origin and have
// no ambient cookies to abuse, so they pass.
export const requireTrustedOrigin = (req: Request, res: Response, next: NextFunction): void => {
  const origin = req.headers.origin;
  if (origin && !isAllowedOrigin(origin)) {
    res.status(403).json({ message: "Origin not allowed" });
    return;
  }
  next();
};
