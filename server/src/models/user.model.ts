import bcrypt from "bcrypt";
import { Document, Schema, model } from "mongoose";

export type UserRole = "admin" | "member" | "viewer";

// One entry per signed-in device. The refresh token itself is never stored, only its
// SHA-256: a leaked database dump then contains nothing that can be replayed as a cookie.
export interface IUserSession {
  sid: string;
  tokenHash: string;
  // The hash this session held before its last rotation. Two tabs refreshing at the same
  // moment both send the old cookie; the loser is recognised by this within a short grace
  // window instead of being treated as a stolen-token replay.
  prevTokenHash: string | null;
  rotatedAt: Date;
  expiresAt: Date;
  createdAt: Date;
  userAgent: string | null;
}

export interface IUser {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  sessions: IUserSession[];
}

export interface IUserDocument extends IUser, Document {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export const MAX_NAME_LENGTH = 80;
export const MIN_PASSWORD_LENGTH = 8;
// bcrypt silently ignores everything past 72 bytes, so a longer "password" would give a
// false sense of strength. Rejecting it is more honest than truncating it.
export const MAX_PASSWORD_BYTES = 72;
export const MAX_SESSIONS_PER_USER = 10;

// 12 is the current OWASP-ish floor for bcrypt. Tests register hundreds of users, so they
// use the minimum cost; the hashing code path is identical either way.
const SALT_WORK_FACTOR = process.env.NODE_ENV === "test" ? 4 : 12;

// Login compares against this when the email is unknown, so "no such user" costs the same
// bcrypt time as "wrong password" and response timing cannot be used to enumerate accounts.
let dummyHash: Promise<string> | null = null;
export const compareAgainstDummyHash = async (candidatePassword: string): Promise<false> => {
  dummyHash ??= bcrypt.hash("timing-equaliser-not-a-real-password", SALT_WORK_FACTOR);
  await bcrypt.compare(candidatePassword, await dummyHash);
  return false;
};

const userSessionSchema = new Schema<IUserSession>(
  {
    sid: { type: String, required: true },
    tokenHash: { type: String, required: true },
    prevTokenHash: { type: String, default: null },
    rotatedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, required: true },
    userAgent: { type: String, default: null, maxlength: 256 },
  },
  { _id: false },
);

const userSchema = new Schema<IUserDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: MAX_NAME_LENGTH },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    // select: false so no query can leak the hash by forgetting a projection; the login
    // path opts in explicitly with .select("+password").
    password: { type: String, required: true, minlength: MIN_PASSWORD_LENGTH, select: false },
    role: {
      type: String,
      enum: ["admin", "member", "viewer"],
      default: "member",
    },
    sessions: { type: [userSessionSchema], default: [], select: false },
  },
  { timestamps: true },
);

userSchema.index({ "sessions.sid": 1 });

userSchema.pre<IUserDocument>("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(SALT_WORK_FACTOR);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (
  candidatePassword: string,
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = model<IUserDocument>("User", userSchema);
