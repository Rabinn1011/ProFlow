import type { NextFunction, Request, Response } from "express";
import * as jwt from "jsonwebtoken";
import {
  MAX_NAME_LENGTH,
  MAX_PASSWORD_BYTES,
  MIN_PASSWORD_LENGTH,
  User,
  compareAgainstDummyHash,
  type IUserDocument,
} from "../models/user.model";

const REFRESH_COOKIE_NAME = "refreshToken";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    expiresIn: accessTokenTtl(),
  });

const signRefreshToken = (userId: string): string =>
  jwt.sign({ sub: userId }, mustGetEnv("REFRESH_TOKEN_SECRET"), {
    expiresIn: refreshTokenTtl(),
  });

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
  }) as const;

const setRefreshCookie = (res: Response, token: string): void => {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    ...refreshCookieOptions(),
    maxAge: refreshTokenTtl() * 1000,
  });
};

// updateOne rather than save(): login must not re-run schema validation on an account
// created under older rules (e.g. a shorter password minimum).
const issueTokens = async (user: IUserDocument, res: Response): Promise<string> => {
  const refreshToken = signRefreshToken(user.id);
  await User.updateOne({ _id: user._id }, { $set: { refreshToken } });
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

    const accessToken = await issueTokens(user, res);

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

    const accessToken = await issueTokens(user, res);

    res.status(200).json({ accessToken, user: toUserDto(user) });
  } catch (error) {
    next(error as Error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const incomingRefreshToken =
      (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE_NAME] ?? null;

    if (!incomingRefreshToken) {
      res.status(401).json({ message: "Refresh token missing" });
      return;
    }

    const secret = mustGetEnv("REFRESH_TOKEN_SECRET");
    const payload = jwt.verify(incomingRefreshToken, secret) as { sub: string };
    const user = await User.findById(payload.sub);

    if (!user || user.refreshToken !== incomingRefreshToken) {
      res.status(401).json({ message: "Invalid refresh token" });
      return;
    }

    const accessToken = signAccessToken(user.id, user.role);
    res.status(200).json({ accessToken });
  } catch (error) {
    next(error as Error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const incomingRefreshToken =
      (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE_NAME] ?? null;

    if (incomingRefreshToken) {
      await User.findOneAndUpdate(
        { refreshToken: incomingRefreshToken },
        { $unset: { refreshToken: 1 } },
      );
    }

    res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions());

    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    next(error as Error);
  }
};
