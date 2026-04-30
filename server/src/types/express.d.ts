import type { Request } from "express";

export interface RequestWithUser extends Request {
  user?: {
    id: string;
    role: "owner" | "admin" | "member";
  };
}
