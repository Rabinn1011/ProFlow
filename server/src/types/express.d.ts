import type { Request } from "express";
import type { IWorkspaceDocument } from "../models/workspace.model";
import type { Server as SocketIOServer } from "socket.io";

export interface RequestWithUser extends Request {
  user?: {
    id: string;
    role: "admin" | "member" | "viewer";
  };
  workspace?: IWorkspaceDocument;
  workspaceRole?: "owner" | "admin" | "member" | "viewer";
}

declare module "express-serve-static-core" {
  interface Application {
    get(name: "io"): SocketIOServer;
    set(name: "io", value: SocketIOServer): this;
  }
}
