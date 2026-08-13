import type { NextFunction, Response } from "express";
import mongoose from "mongoose";
import type { RequestWithUser } from "../types/express";
import { User } from "../models/user.model";
import { Task } from "../models/task.model";
import type { IWorkspaceDocument, WorkspaceRole } from "../models/workspace.model";
import { canManageMember, isWorkspaceRole, roleRank } from "../lib/workspaceRoles";

const countOwners = (workspace: IWorkspaceDocument): number =>
  workspace.members.filter((m) => m.role === "owner").length;

// members[] holds only user ids; the UI needs names and emails, so join them here rather
// than making the client fetch each user.
const serializeMembers = async (workspace: IWorkspaceDocument) => {
  const users = await User.find({ _id: { $in: workspace.members.map((m) => m.user) } }).select(
    "_id name email",
  );
  const byId = new Map(users.map((u) => [u.id as string, u]));

  return workspace.members.map((member) => {
    const user = byId.get(member.user.toString());
    return {
      userId: member.user.toString(),
      name: user?.name ?? "Unknown user",
      email: user?.email ?? "",
      role: member.role,
      joinedAt: member.joinedAt,
    };
  });
};

export const listMembers = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const workspace = req.workspace;
    if (!workspace) {
      res.status(500).json({ message: "Workspace not resolved" });
      return;
    }

    res.status(200).json({ members: await serializeMembers(workspace) });
  } catch (err) {
    next(err as Error);
  }
};

export const addMember = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const workspace = req.workspace;
    const actorRole = req.workspaceRole;
    if (!workspace || !actorRole) {
      res.status(500).json({ message: "Workspace not resolved" });
      return;
    }

    const { email, role = "member" } = req.body as { email?: string; role?: WorkspaceRole };

    if (!email || !email.trim()) {
      res.status(400).json({ message: "email is required" });
      return;
    }
    if (!isWorkspaceRole(role)) {
      res.status(400).json({ message: "Invalid role" });
      return;
    }
    if (roleRank[role] > roleRank[actorRole]) {
      res.status(403).json({ message: "You cannot assign a role above your own" });
      return;
    }

    // v1 keeps this simple: no pending invites, so the person must already have an account.
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select("_id");
    if (!user) {
      res.status(404).json({ message: "No account with that email" });
      return;
    }

    const alreadyMember = workspace.members.some((m) => m.user.toString() === user.id);
    if (alreadyMember) {
      res.status(409).json({ message: "That person is already a member" });
      return;
    }

    workspace.members.push({
      user: new mongoose.Types.ObjectId(user.id as string),
      role,
      joinedAt: new Date(),
    });
    await workspace.save();

    res.status(201).json({ members: await serializeMembers(workspace) });
  } catch (err) {
    next(err as Error);
  }
};

export const updateMemberRole = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const workspace = req.workspace;
    const actorRole = req.workspaceRole;
    if (!workspace || !actorRole) {
      res.status(500).json({ message: "Workspace not resolved" });
      return;
    }

    const { userId } = req.params as { userId?: string };
    const { role } = req.body as { role?: WorkspaceRole };

    if (!userId || !mongoose.isValidObjectId(userId)) {
      res.status(400).json({ message: "Invalid user id" });
      return;
    }
    if (!isWorkspaceRole(role)) {
      res.status(400).json({ message: "Invalid role" });
      return;
    }

    const member = workspace.members.find((m) => m.user.toString() === userId);
    if (!member) {
      res.status(404).json({ message: "That person is not a member" });
      return;
    }

    if (!canManageMember(actorRole, member.role)) {
      res.status(403).json({ message: "You cannot change that member's role" });
      return;
    }
    if (roleRank[role] > roleRank[actorRole]) {
      res.status(403).json({ message: "You cannot assign a role above your own" });
      return;
    }
    // Without this a workspace can be left with no owner, and nobody able to delete it.
    if (member.role === "owner" && role !== "owner" && countOwners(workspace) === 1) {
      res.status(400).json({ message: "A workspace must always have at least one owner" });
      return;
    }

    member.role = role;
    await workspace.save();

    res.status(200).json({ members: await serializeMembers(workspace) });
  } catch (err) {
    next(err as Error);
  }
};

export const removeMember = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const workspace = req.workspace;
    const actorRole = req.workspaceRole;
    const actorId = req.user?.id;
    if (!workspace || !actorRole) {
      res.status(500).json({ message: "Workspace not resolved" });
      return;
    }

    const { userId } = req.params as { userId?: string };
    if (!userId || !mongoose.isValidObjectId(userId)) {
      res.status(400).json({ message: "Invalid user id" });
      return;
    }

    const member = workspace.members.find((m) => m.user.toString() === userId);
    if (!member) {
      res.status(404).json({ message: "That person is not a member" });
      return;
    }

    // Leaving yourself is always allowed; removing someone else follows the rank rules.
    const isSelf = actorId === userId;
    if (!isSelf && !canManageMember(actorRole, member.role)) {
      res.status(403).json({ message: "You cannot remove that member" });
      return;
    }
    if (member.role === "owner" && countOwners(workspace) === 1) {
      res.status(400).json({ message: "A workspace must always have at least one owner" });
      return;
    }

    workspace.members = workspace.members.filter((m) => m.user.toString() !== userId);
    await workspace.save();

    // Otherwise their tasks keep pointing at someone who can no longer see the workspace.
    await Task.updateMany(
      { workspaceId: workspace._id, assigneeId: userId },
      { $set: { assigneeId: null } },
    );

    res.status(200).json({ members: await serializeMembers(workspace) });
  } catch (err) {
    next(err as Error);
  }
};
