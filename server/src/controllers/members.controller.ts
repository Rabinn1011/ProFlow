import type { NextFunction, Response } from "express";
import mongoose from "mongoose";
import type { RequestWithUser } from "../types/express";
import { User } from "../models/user.model";
import { Task } from "../models/task.model";
import { Workspace, type IWorkspaceDocument, type WorkspaceRole } from "../models/workspace.model";
import { canManageMember, isWorkspaceRole, roleRank } from "../lib/workspaceRoles";

// Every membership change below is a single conditional update rather than
// load-modify-save. With save(), two requests that both read the workspace before either
// wrote could interleave: two owners demoting each other at once would each see "another
// owner exists" and leave the workspace with none, and a concurrent add and remove could
// silently undo each other. Putting the precondition in the update's filter makes MongoDB
// enforce it atomically; if it no longer holds, nothing is written.

// Matches only if some owner other than `userId` exists, i.e. `userId` is not the last one.
const anotherOwnerExists = (userId: string) => ({
  members: { $elemMatch: { role: "owner", user: { $ne: new mongoose.Types.ObjectId(userId) } } },
});

// Matches only if `userId` still holds `role`, so a rank check made against the request's
// snapshot cannot be applied to a member whose role changed in the meantime.
const memberStillHasRole = (userId: string, role: WorkspaceRole) => ({
  members: { $elemMatch: { user: new mongoose.Types.ObjectId(userId), role } },
});

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

const reloadAndSerialize = async (workspaceId: unknown) => {
  const fresh = await Workspace.findById(workspaceId);
  return fresh ? serializeMembers(fresh) : [];
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

    const { email, role = "member" } = req.body as { email?: unknown; role?: unknown };

    if (typeof email !== "string" || !email.trim()) {
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

    const userObjectId = new mongoose.Types.ObjectId(user.id as string);
    const result = await Workspace.updateOne(
      { _id: workspace._id, "members.user": { $ne: userObjectId } },
      { $push: { members: { user: userObjectId, role, joinedAt: new Date() } } },
    );
    if (result.modifiedCount === 0) {
      res.status(409).json({ message: "That person is already a member" });
      return;
    }

    res.status(201).json({ members: await reloadAndSerialize(workspace._id) });
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
    const { role } = req.body as { role?: unknown };

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

    const demotingOwner = member.role === "owner" && role !== "owner";
    const result = await Workspace.updateOne(
      {
        $and: [
          { _id: workspace._id },
          memberStillHasRole(userId, member.role),
          // Without this a workspace can be left with no owner, and nobody able to delete it.
          ...(demotingOwner ? [anotherOwnerExists(userId)] : []),
        ],
      },
      { $set: { "members.$[target].role": role } },
      { arrayFilters: [{ "target.user": new mongoose.Types.ObjectId(userId) }] },
    );

    if (result.matchedCount === 0) {
      res.status(demotingOwner ? 400 : 409).json({
        message: demotingOwner
          ? "A workspace must always have at least one owner"
          : "That member changed while you were editing; refresh and try again",
      });
      return;
    }

    res.status(200).json({ members: await reloadAndSerialize(workspace._id) });
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

    const result = await Workspace.updateOne(
      {
        $and: [
          { _id: workspace._id },
          memberStillHasRole(userId, member.role),
          ...(member.role === "owner" ? [anotherOwnerExists(userId)] : []),
        ],
      },
      { $pull: { members: { user: new mongoose.Types.ObjectId(userId) } } },
    );

    if (result.matchedCount === 0) {
      res.status(member.role === "owner" ? 400 : 409).json({
        message:
          member.role === "owner"
            ? "A workspace must always have at least one owner"
            : "That member changed while you were editing; refresh and try again",
      });
      return;
    }

    // Otherwise their tasks keep pointing at someone who can no longer see the workspace.
    await Task.updateMany(
      { workspaceId: workspace._id, assigneeId: userId },
      { $set: { assigneeId: null } },
    );

    res.status(200).json({ members: await reloadAndSerialize(workspace._id) });
  } catch (err) {
    next(err as Error);
  }
};
