"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.refresh = exports.login = exports.register = void 0;
const jwt = __importStar(require("jsonwebtoken"));
const user_model_1 = require("../models/user.model");
const REFRESH_COOKIE_NAME = "refreshToken";
// Secrets and TTLs are read at call time, not module load time: this module is
// imported through the app/route chain before dotenv has populated process.env,
// so reading them eagerly would capture undefined.
const mustGetEnv = (name) => {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is not configured`);
    }
    return value;
};
const accessTokenTtl = () => Number(process.env.ACCESS_TOKEN_EXPIRES_IN_SECONDS ?? 15 * 60);
const refreshTokenTtl = () => Number(process.env.REFRESH_TOKEN_EXPIRES_IN_SECONDS ?? 7 * 24 * 60 * 60);
const signAccessToken = (userId, role) => jwt.sign({ sub: userId, role }, mustGetEnv("ACCESS_TOKEN_SECRET"), {
    expiresIn: accessTokenTtl(),
});
const signRefreshToken = (userId) => jwt.sign({ sub: userId }, mustGetEnv("REFRESH_TOKEN_SECRET"), {
    expiresIn: refreshTokenTtl(),
});
const setRefreshCookie = (res, token) => {
    res.cookie(REFRESH_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: refreshTokenTtl() * 1000,
    });
};
const register = async (req, res, next) => {
    try {
        const { name, email, password, role = "member" } = req.body;
        if (!name || !email || !password) {
            res.status(400).json({ message: "name, email and password are required" });
            return;
        }
        const existingUser = await user_model_1.User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            res.status(409).json({ message: "Email already in use" });
            return;
        }
        const user = await user_model_1.User.create({
            name,
            email,
            password,
            role,
        });
        const accessToken = signAccessToken(user.id, user.role);
        const refreshToken = signRefreshToken(user.id);
        user.refreshToken = refreshToken;
        await user.save();
        setRefreshCookie(res, refreshToken);
        res.status(201).json({
            accessToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.register = register;
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ message: "email and password are required" });
            return;
        }
        const user = await user_model_1.User.findOne({ email: email.toLowerCase() });
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
    }
    catch (error) {
        next(error);
    }
};
exports.login = login;
const refresh = async (req, res, next) => {
    try {
        const incomingRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME] ?? null;
        if (!incomingRefreshToken) {
            res.status(401).json({ message: "Refresh token missing" });
            return;
        }
        const secret = mustGetEnv("REFRESH_TOKEN_SECRET");
        const payload = jwt.verify(incomingRefreshToken, secret);
        const user = await user_model_1.User.findById(payload.sub);
        if (!user || user.refreshToken !== incomingRefreshToken) {
            res.status(401).json({ message: "Invalid refresh token" });
            return;
        }
        const accessToken = signAccessToken(user.id, user.role);
        res.status(200).json({ accessToken });
    }
    catch (error) {
        next(error);
    }
};
exports.refresh = refresh;
const logout = async (req, res, next) => {
    try {
        const incomingRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME] ?? null;
        if (incomingRefreshToken) {
            await user_model_1.User.findOneAndUpdate({ refreshToken: incomingRefreshToken }, { $unset: { refreshToken: 1 } });
        }
        res.clearCookie(REFRESH_COOKIE_NAME, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
        });
        res.status(200).json({ message: "Logged out successfully" });
    }
    catch (error) {
        next(error);
    }
};
exports.logout = logout;
