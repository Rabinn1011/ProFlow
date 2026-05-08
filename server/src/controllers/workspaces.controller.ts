import type { NextFunction, Response } from "express";
import mongoose from "mongoose";
import type { RequestWithUser } from "../types/express";
import { Workspace } from "../models/workspace.model";

export const listWorkspaces = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const workspaces = await Workspace.find({ "members.user": userId })
      .sort({ updatedAt: -1 })
      .select("_id name createdBy members createdAt updatedAt");

    res.status(200).json({
      workspaces: workspaces.map((w) => ({
        id: w.id,
        name: w.name,
        createdBy: w.createdBy,
        members: w.members.map((m) => ({ user: m.user, role: m.role, joinedAt: m.joinedAt })),
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
      })),
    });
  } catch (err) {
    next(err as Error);
  }
};

export const createWorkspace = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const { name } = req.body as { name?: string };
    if (!name || !name.trim()) {
      res.status(400).json({ message: "name is required" });
      return;
    }

    const workspace = await Workspace.create({
      name: name.trim(),
      createdBy: new mongoose.Types.ObjectId(userId),
      members: [{ user: new mongoose.Types.ObjectId(userId), role: "owner", joinedAt: new Date() }],
    });

    res.status(201).json({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        createdBy: workspace.createdBy,
        members: workspace.members.map((m) => ({ user: m.user, role: m.role, joinedAt: m.joinedAt })),
        createdAt: workspace.createdAt,
        updatedAt: workspace.updatedAt,
      },
    });
  } catch (err) {
    next(err as Error);
  }
};

export const getWorkspace = async (
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

    res.status(200).json({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        createdBy: workspace.createdBy,
        members: workspace.members.map((m) => ({ user: m.user, role: m.role, joinedAt: m.joinedAt })),
        createdAt: workspace.createdAt,
        updatedAt: workspace.updatedAt,
      },
    });
  } catch (err) {
    next(err as Error);
  }
};

export const updateWorkspace = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { name } = req.body as { name?: string };
    if (!name || !name.trim()) {
      res.status(400).json({ message: "name is required" });
      return;
    }

    const workspace = req.workspace;
    if (!workspace) {
      res.status(500).json({ message: "Workspace not resolved" });
      return;
    }

    workspace.name = name.trim();
    await workspace.save();

    res.status(200).json({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        createdBy: workspace.createdBy,
        members: workspace.members.map((m) => ({ user: m.user, role: m.role, joinedAt: m.joinedAt })),
        createdAt: workspace.createdAt,
        updatedAt: workspace.updatedAt,
      },
    });
  } catch (err) {
    next(err as Error);
  }
};

export const deleteWorkspace = async (
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

    await workspace.deleteOne();
    res.status(204).send();
  } catch (err) {
    next(err as Error);
  }
};

