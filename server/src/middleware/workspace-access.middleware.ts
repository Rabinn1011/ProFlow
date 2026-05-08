import type { NextFunction, Response } from "express";
import mongoose from "mongoose";
import type { RequestWithUser } from "../types/express";
import { Workspace, type WorkspaceRole } from "../models/workspace.model";

const roleRank: Record<WorkspaceRole, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
};

export const requireWorkspaceMember = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const workspaceId = req.params.workspaceId ?? req.params.id;

    if (!userId) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    if (!workspaceId || !mongoose.isValidObjectId(workspaceId)) {
      res.status(400).json({ message: "Invalid workspace id" });
      return;
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      res.status(404).json({ message: "Workspace not found" });
      return;
    }

    const member = workspace.members.find((m) => m.user.toString() === userId);
    if (!member) {
      res.status(403).json({ message: "Not a workspace member" });
      return;
    }

    req.workspace = workspace;
    req.workspaceRole = member.role;
    next();
  } catch (err) {
    next(err as Error);
  }
};

export const requireWorkspaceRole =
  (minRole: WorkspaceRole) =>
  (req: RequestWithUser, res: Response, next: NextFunction): void => {
    const current = req.workspaceRole;
    if (!current) {
      res.status(500).json({ message: "Workspace role not resolved" });
      return;
    }

    if (roleRank[current] < roleRank[minRole]) {
      res.status(403).json({ message: "Insufficient workspace permissions" });
      return;
    }

    next();
  };

