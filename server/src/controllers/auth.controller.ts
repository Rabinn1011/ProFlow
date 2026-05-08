import type { NextFunction, Request, Response } from "express";
import * as jwt from "jsonwebtoken";
import { User } from "../models/user.model";

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const ACCESS_TOKEN_EXPIRES_IN = Number(process.env.ACCESS_TOKEN_EXPIRES_IN_SECONDS ?? 15 * 60);
const REFRESH_TOKEN_EXPIRES_IN = Number(
  process.env.REFRESH_TOKEN_EXPIRES_IN_SECONDS ?? 7 * 24 * 60 * 60,
);
const REFRESH_COOKIE_NAME = "refreshToken";

const mustGetEnv = (name: string, value: string | undefined): string => {
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
};

const signAccessToken = (userId: string, role: string): string => {
  const secret = mustGetEnv("ACCESS_TOKEN_SECRET", ACCESS_TOKEN_SECRET);
  return jwt.sign({ sub: userId, role }, secret, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });
};

const signRefreshToken = (userId: string): string => {
  const secret = mustGetEnv("REFRESH_TOKEN_SECRET", REFRESH_TOKEN_SECRET);
  return jwt.sign({ sub: userId }, secret, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  });
};

const setRefreshCookie = (res: Response, token: string): void => {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password, role = "member" } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      role?: "admin" | "member" | "viewer";
    };

    if (!name || !email || !password) {
      res.status(400).json({ message: "name, email and password are required" });
      return;
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      res.status(409).json({ message: "Email already in use" });
      return;
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
    });

    const token = signAccessToken(user.id, user.role);
    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error as Error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      res.status(400).json({ message: "email and password are required" });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await user.comparePassword(password))) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const accessToken = signAccessToken(user.id, user.role);
    const refreshToken = signRefreshToken(user.id);

    user.refreshToken = refreshToken;
    await user.save();

    setRefreshCookie(res, refreshToken);

    res.status(200).json({
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
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

    const secret = mustGetEnv("REFRESH_TOKEN_SECRET", REFRESH_TOKEN_SECRET);
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

    res.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    next(error as Error);
  }
};
