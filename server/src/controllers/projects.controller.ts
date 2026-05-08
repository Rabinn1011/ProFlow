import type { NextFunction, Response } from "express";
import mongoose from "mongoose";
import type { RequestWithUser } from "../types/express";
import { Project } from "../models/project.model";

export const listProjects = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const workspaceId = req.params.workspaceId;
    if (!workspaceId || !mongoose.isValidObjectId(workspaceId)) {
      res.status(400).json({ message: "Invalid workspace id" });
      return;
    }

    const projects = await Project.find({ workspaceId })
      .sort({ updatedAt: -1 })
      .select("_id workspaceId name description createdBy createdAt updatedAt");

    res.status(200).json({
      projects: projects.map((p) => ({
        id: p.id,
        workspaceId: p.workspaceId,
        name: p.name,
        description: p.description,
        createdBy: p.createdBy,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
    });
  } catch (err) {
    next(err as Error);
  }
};

export const createProject = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const workspaceId = req.params.workspaceId;

    if (!userId) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    if (!workspaceId || !mongoose.isValidObjectId(workspaceId)) {
      res.status(400).json({ message: "Invalid workspace id" });
      return;
    }

    const { name, description } = req.body as { name?: string; description?: string | null };
    if (!name || !name.trim()) {
      res.status(400).json({ message: "name is required" });
      return;
    }

    const project = await Project.create({
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
      name: name.trim(),
      description: description?.trim() ? description.trim() : null,
      createdBy: new mongoose.Types.ObjectId(userId),
    });

    res.status(201).json({
      project: {
        id: project.id,
        workspaceId: project.workspaceId,
        name: project.name,
        description: project.description,
        createdBy: project.createdBy,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
    });
  } catch (err) {
    next(err as Error);
  }
};

export const getProject = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { workspaceId, projectId } = req.params;
    if (!workspaceId || !mongoose.isValidObjectId(workspaceId)) {
      res.status(400).json({ message: "Invalid workspace id" });
      return;
    }
    if (!projectId || !mongoose.isValidObjectId(projectId)) {
      res.status(400).json({ message: "Invalid project id" });
      return;
    }

    const project = await Project.findOne({ _id: projectId, workspaceId }).select(
      "_id workspaceId name description createdBy createdAt updatedAt",
    );
    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }

    res.status(200).json({
      project: {
        id: project.id,
        workspaceId: project.workspaceId,
        name: project.name,
        description: project.description,
        createdBy: project.createdBy,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
    });
  } catch (err) {
    next(err as Error);
  }
};

export const updateProject = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { workspaceId, projectId } = req.params;
    if (!workspaceId || !mongoose.isValidObjectId(workspaceId)) {
      res.status(400).json({ message: "Invalid workspace id" });
      return;
    }
    if (!projectId || !mongoose.isValidObjectId(projectId)) {
      res.status(400).json({ message: "Invalid project id" });
      return;
    }

    const { name, description } = req.body as { name?: string; description?: string | null };
    if (!name && typeof description === "undefined") {
      res.status(400).json({ message: "Nothing to update" });
      return;
    }

    const project = await Project.findOne({ _id: projectId, workspaceId });
    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }

    if (name && name.trim()) project.name = name.trim();
    if (typeof description !== "undefined") {
      project.description = description?.trim() ? description.trim() : null;
    }

    await project.save();

    res.status(200).json({
      project: {
        id: project.id,
        workspaceId: project.workspaceId,
        name: project.name,
        description: project.description,
        createdBy: project.createdBy,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
    });
  } catch (err) {
    next(err as Error);
  }
};

export const deleteProject = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { workspaceId, projectId } = req.params;
    if (!workspaceId || !mongoose.isValidObjectId(workspaceId)) {
      res.status(400).json({ message: "Invalid workspace id" });
      return;
    }
    if (!projectId || !mongoose.isValidObjectId(projectId)) {
      res.status(400).json({ message: "Invalid project id" });
      return;
    }

    const project = await Project.findOne({ _id: projectId, workspaceId });
    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }

    await project.deleteOne();
    res.status(204).send();
  } catch (err) {
    next(err as Error);
  }
};

