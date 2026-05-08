import type { NextFunction, Request, Response } from "express";
import * as jwt from "jsonwebtoken";
import type { UserRole } from "../models/user.model";
import type { RequestWithUser } from "../types/express";

type AccessTokenPayload = {
  sub: string;
  role: UserRole;
};

const getBearerToken = (req: Request): string | null => {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
};

export const requireAuth = (req: RequestWithUser, res: Response, next: NextFunction): void => {
  try {
    const token = getBearerToken(req);
    if (!token) {
      res.status(401).json({ message: "Missing access token" });
      return;
    }

    const secret = process.env.ACCESS_TOKEN_SECRET;
    if (!secret) {
      res.status(500).json({ message: "ACCESS_TOKEN_SECRET is not configured" });
      return;
    }

    const payload = jwt.verify(token, secret) as AccessTokenPayload;
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired access token" });
  }
};

export const requireRole =
  (...roles: UserRole[]) =>
  (req: RequestWithUser, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    next();
  };

