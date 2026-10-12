import { createHash, randomUUID } from "crypto";
import type { NextFunction, Request, Response } from "express";
import * as jwt from "jsonwebtoken";
import mongoose from "mongoose";
import {
  MAX_NAME_LENGTH,
  MAX_PASSWORD_BYTES,
  MAX_SESSIONS_PER_USER,
  MIN_PASSWORD_LENGTH,
  User,
  compareAgainstDummyHash,
  type IUserDocument,
} from "../models/user.model";
import type { RequestWithUser } from "../types/express";

const REFRESH_COOKIE_NAME = "refreshToken";
// The browser only needs to send the refresh cookie to the auth endpoints. Scoping it
// here keeps it off every other API request, where it would only be extra exposure.
const REFRESH_COOKIE_PATH = "/api/auth";

// How long the previous refresh token stays acceptable after a rotation. Long enough to
// absorb two tabs (or React StrictMode's double effect) refreshing at the same instant;
// short enough that a token stolen earlier is useless.
const ROTATION_GRACE_MS = 30 * 1000;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const JWT_ALGORITHM = "HS256";

// Secrets and TTLs are read at call time, not module load time: this module is
// imported through the app/route chain before dotenv has populated process.env,
// so reading them eagerly would capture undefined.
const mustGetEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
};

const accessTokenTtl = (): number =>
  Number(process.env.ACCESS_TOKEN_EXPIRES_IN_SECONDS ?? 15 * 60);

const refreshTokenTtl = (): number =>
  Number(process.env.REFRESH_TOKEN_EXPIRES_IN_SECONDS ?? 7 * 24 * 60 * 60);

const signAccessToken = (userId: string, role: string): string =>
  jwt.sign({ sub: userId, role }, mustGetEnv("ACCESS_TOKEN_SECRET"), {
    algorithm: JWT_ALGORITHM,
    expiresIn: accessTokenTtl(),
  });

// jwtid makes every token unique. Without it, two refreshes in the same second produce
// byte-identical tokens (same sub, sid, iat, exp), and rotation would rotate to itself.
const signRefreshToken = (userId: string, sid: string): string =>
  jwt.sign({ sub: userId, sid }, mustGetEnv("REFRESH_TOKEN_SECRET"), {
    algorithm: JWT_ALGORITHM,
    expiresIn: refreshTokenTtl(),
    jwtid: randomUUID(),
  });

const hashToken = (token: string): string => createHash("sha256").update(token).digest("hex");

type RefreshPayload = { sub?: string; sid?: string };

const verifyRefreshToken = (token: string, ignoreExpiration = false): RefreshPayload | null => {
  try {
    const payload = jwt.verify(token, mustGetEnv("REFRESH_TOKEN_SECRET"), {
      algorithms: [JWT_ALGORITHM],
      ignoreExpiration,
    }) as RefreshPayload;
    if (!payload.sub || !payload.sid || !mongoose.isValidObjectId(payload.sub)) return null;
    return payload;
  } catch {
    return null;
  }
};

const isProduction = (): boolean => process.env.NODE_ENV === "production";

// Whether the browser will treat the client and this API as different sites. That is a
// deployment fact, not a NODE_ENV fact: a docker-compose stack runs "production" with
// both halves on localhost (same site), while a Vercel + Render split is cross-site.
// Cross-site cookies require SameSite=None, which browsers accept only with Secure.
const isCrossSite = (): boolean =>
  typeof process.env.COOKIE_CROSS_SITE === "string"
    ? process.env.COOKIE_CROSS_SITE === "true"
    : isProduction();

// Set and clear must use identical options or clearCookie silently does nothing.
const refreshCookieOptions = () =>
  ({
    httpOnly: true,
    secure: isProduction() || isCrossSite(),
    sameSite: isCrossSite() ? "none" : "strict",
    path: REFRESH_COOKIE_PATH,
  }) as const;

const setRefreshCookie = (res: Response, token: string): void => {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    ...refreshCookieOptions(),
    maxAge: refreshTokenTtl() * 1000,
  });
};

const clearRefreshCookie = (res: Response): void => {
  res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions());
  // Cookies issued before the path was scoped live at "/"; clear those too so an old
  // browser does not keep sending a dead token forever.
  res.clearCookie(REFRESH_COOKIE_NAME, { ...refreshCookieOptions(), path: "/" });
};

const readRefreshCookie = (req: Request): string | null =>
  (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE_NAME] ?? null;

// Starts a new device session: prunes expired ones, then appends, keeping only the most
// recent MAX_SESSIONS_PER_USER so the array cannot grow without bound.
const startSession = async (user: IUserDocument, req: Request, res: Response): Promise<string> => {
  const sid = randomUUID();
  const refreshToken = signRefreshToken(user.id, sid);
  const now = new Date();

  await User.updateOne({ _id: user._id }, { $pull: { sessions: { expiresAt: { $lte: now } } } });
  await User.updateOne(
    { _id: user._id },
    {
      $push: {
        sessions: {
          $each: [
            {
              sid,
              tokenHash: hashToken(refreshToken),
              prevTokenHash: null,
              rotatedAt: now,
              expiresAt: new Date(now.getTime() + refreshTokenTtl() * 1000),
              createdAt: now,
              userAgent: req.get("user-agent")?.slice(0, 256) ?? null,
            },
          ],
          $slice: -MAX_SESSIONS_PER_USER,
        },
      },
    },
  );

  setRefreshCookie(res, refreshToken);
  return signAccessToken(user.id, user.role);
};

const toUserDto = (user: IUserDocument) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
});

const isString = (value: unknown): value is string => typeof value === "string";

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // `role` is deliberately NOT read from the body: accepting it would let any client
    // self-provision an admin account. New users are always members.
    const { name, email, password } = req.body as Record<string, unknown>;

    if (!isString(name) || !isString(email) || !isString(password) || !name.trim() || !email.trim()) {
      res.status(400).json({ message: "name, email and password are required" });
      return;
    }

    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (trimmedName.length > MAX_NAME_LENGTH) {
      res.status(400).json({ message: `name must be at most ${MAX_NAME_LENGTH} characters` });
      return;
    }
    if (normalizedEmail.length > 254 || !EMAIL_PATTERN.test(normalizedEmail)) {
      res.status(400).json({ message: "email is not valid" });
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      res.status(400).json({ message: `password must be at least ${MIN_PASSWORD_LENGTH} characters` });
      return;
    }
    if (Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES) {
      res.status(400).json({ message: `password must be at most ${MAX_PASSWORD_BYTES} bytes` });
      return;
    }

    const existingUser = await User.findOne({ email: normalizedEmail }).select("_id");
    if (existingUser) {
      res.status(409).json({ message: "Email already in use" });
      return;
    }

    const user = await User.create({
      name: trimmedName,
      email: normalizedEmail,
      password,
      role: "member",
    });

    const accessToken = await startSession(user, req, res);

    res.status(201).json({ accessToken, user: toUserDto(user) });
  } catch (error) {
    // Two signups racing past the findOne above both reach create; the unique index
    // catches the second one, which should read as a conflict, not a server error.
    if ((error as { code?: number }).code === 11000) {
      res.status(409).json({ message: "Email already in use" });
      return;
    }
    next(error as Error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body as Record<string, unknown>;

    if (!isString(email) || !isString(password) || !email || !password) {
      res.status(400).json({ message: "email and password are required" });
      return;
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+password");

    // Always run bcrypt, even for an unknown email, so both failures take the same time.
    const passwordOk = user
      ? await user.comparePassword(password)
      : await compareAgainstDummyHash(password);
    if (!user || !passwordOk) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const accessToken = await startSession(user, req, res);

    res.status(200).json({ accessToken, user: toUserDto(user) });
  } catch (error) {
    next(error as Error);
  }
};

// Every successful refresh rotates the refresh token: the old one stops working and a new
// one is set. If a token that was already rotated away shows up again (outside the short
// grace window), someone is replaying a copy, so the whole session is revoked: the thief
// and the real user are both logged out, and the real user's next login starts clean.
export const refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const incomingRefreshToken = readRefreshCookie(req);
    if (!incomingRefreshToken) {
      res.status(401).json({ message: "Refresh token missing" });
      return;
    }

    const payload = verifyRefreshToken(incomingRefreshToken);
    if (!payload) {
      clearRefreshCookie(res);
      res.status(401).json({ message: "Invalid refresh token" });
      return;
    }
    const { sub: userId, sid } = payload as Required<RefreshPayload>;

    const incomingHash = hashToken(incomingRefreshToken);
    const now = new Date();
    const nextRefreshToken = signRefreshToken(userId, sid);

    // Atomic compare-and-swap: only the request that still holds the current hash wins.
    const rotated = await User.findOneAndUpdate(
      {
        _id: userId,
        sessions: { $elemMatch: { sid, tokenHash: incomingHash, expiresAt: { $gt: now } } },
      },
      {
        $set: {
          "sessions.$.tokenHash": hashToken(nextRefreshToken),
          "sessions.$.prevTokenHash": incomingHash,
          "sessions.$.rotatedAt": now,
          "sessions.$.expiresAt": new Date(now.getTime() + refreshTokenTtl() * 1000),
        },
      },
      { returnDocument: "after", projection: { role: 1 } },
    );

    if (rotated) {
      setRefreshCookie(res, nextRefreshToken);
      res.status(200).json({ accessToken: signAccessToken(userId, rotated.role) });
      return;
    }

    const user = await User.findById(userId).select("+sessions role");
    const session = user?.sessions.find((s) => s.sid === sid);
    if (!user || !session) {
      clearRefreshCookie(res);
      res.status(401).json({ message: "Invalid refresh token" });
      return;
    }

    // Lost a race with a parallel refresh from the same browser. That request already set
    // the new cookie, so hand back an access token and leave the cookie alone.
    const withinGrace = now.getTime() - session.rotatedAt.getTime() < ROTATION_GRACE_MS;
    if (session.prevTokenHash === incomingHash && withinGrace) {
      res.status(200).json({ accessToken: signAccessToken(userId, user.role) });
      return;
    }

    await User.updateOne({ _id: userId }, { $pull: { sessions: { sid } } });
    clearRefreshCookie(res);
    res.status(401).json({ message: "Refresh token reuse detected; please sign in again" });
  } catch (error) {
    next(error as Error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const incomingRefreshToken = readRefreshCookie(req);

    if (incomingRefreshToken) {
      // An expired token still identifies which session to drop.
      const payload = verifyRefreshToken(incomingRefreshToken, true);
      if (payload) {
        await User.updateOne({ _id: payload.sub }, { $pull: { sessions: { sid: payload.sid } } });
      }
    }

    clearRefreshCookie(res);

    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    next(error as Error);
  }
};

// "Sign out everywhere": the one-click response to "I think someone has my account".
// Access tokens already issued still live out their short TTL.
export const logoutAll = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    await User.updateOne({ _id: req.user.id }, { $set: { sessions: [] } });
    clearRefreshCookie(res);

    res.status(200).json({ message: "Signed out of all sessions" });
  } catch (error) {
    next(error as Error);
  }
};
