import bcrypt from "bcrypt";
import { Document, Schema, model } from "mongoose";

export type UserRole = "admin" | "member" | "viewer";

export interface IUser {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  refreshToken?: string;
}

export interface IUserDocument extends IUser, Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const SALT_WORK_FACTOR = 10;

const userSchema = new Schema<IUserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role: {
      type: String,
      enum: ["admin", "member", "viewer"],
      default: "member",
    },
    refreshToken: { type: String, default: null },
  },
  { timestamps: true },
);

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