import type { NextFunction, Response } from "express";
import mongoose from "mongoose";
import type { RequestWithUser } from "../types/express";
import { Project } from "../models/project.model";
import { Task, type TaskStatus } from "../models/task.model";

const normalizeStatus = (value: unknown): TaskStatus | null => {
  if (value === "todo" || value === "in_progress" || value === "done") return value;
  return null;
};

export const listTasks = async (
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

    const status = normalizeStatus(req.query.status);
    const filter: Record<string, unknown> = { workspaceId, projectId };
    if (status) filter.status = status;

    const tasks = await Task.find(filter)
      .sort({ status: 1, position: 1, updatedAt: -1 })
      .select(
        "_id workspaceId projectId title description status position assigneeId dueDate createdBy createdAt updatedAt",
      );

    res.status(200).json({
      tasks: tasks.map((t) => ({
        id: t.id,
        workspaceId: t.workspaceId,
        projectId: t.projectId,
        title: t.title,
        description: t.description,
        status: t.status,
        position: t.position,
        assigneeId: t.assigneeId,
        dueDate: t.dueDate,
        createdBy: t.createdBy,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
    });
  } catch (err) {
    next(err as Error);
  }
};

export const createTask = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { workspaceId, projectId } = req.params;

    if (!userId) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }
    if (!workspaceId || !mongoose.isValidObjectId(workspaceId)) {
      res.status(400).json({ message: "Invalid workspace id" });
      return;
    }
    if (!projectId || !mongoose.isValidObjectId(projectId)) {
      res.status(400).json({ message: "Invalid project id" });
      return;
    }

    const project = await Project.findOne({ _id: projectId, workspaceId }).select("_id");
    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }

    const { title, description, status, position } = req.body as {
      title?: string;
      description?: string | null;
      status?: TaskStatus;
      position?: number;
    };
    if (!title || !title.trim()) {
      res.status(400).json({ message: "title is required" });
      return;
    }

    const normalizedStatus = normalizeStatus(status) ?? "todo";

    const task = await Task.create({
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
      projectId: new mongoose.Types.ObjectId(projectId),
      title: title.trim(),
      description: description?.trim() ? description.trim() : null,
      status: normalizedStatus,
      position: typeof position === "number" ? position : Date.now(),
      createdBy: new mongoose.Types.ObjectId(userId),
    });

    res.status(201).json({
      task: {
        id: task.id,
        workspaceId: task.workspaceId,
        projectId: task.projectId,
        title: task.title,
        description: task.description,
        status: task.status,
        position: task.position,
        assigneeId: task.assigneeId,
        dueDate: task.dueDate,
        createdBy: task.createdBy,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      },
    });
  } catch (err) {
    next(err as Error);
  }
};

export const updateTask = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { workspaceId, projectId, taskId } = req.params;
    if (!workspaceId || !mongoose.isValidObjectId(workspaceId)) {
      res.status(400).json({ message: "Invalid workspace id" });
      return;
    }
    if (!projectId || !mongoose.isValidObjectId(projectId)) {
      res.status(400).json({ message: "Invalid project id" });
      return;
    }
    if (!taskId || !mongoose.isValidObjectId(taskId)) {
      res.status(400).json({ message: "Invalid task id" });
      return;
    }

    const { title, description, status, assigneeId, dueDate } = req.body as {
      title?: string;
      description?: string | null;
      status?: TaskStatus;
      assigneeId?: string | null;
      dueDate?: string | null;
    };

    const task = await Task.findOne({ _id: taskId, workspaceId, projectId });
    if (!task) {
      res.status(404).json({ message: "Task not found" });
      return;
    }

    if (typeof title !== "undefined") {
      if (!title?.trim()) {
        res.status(400).json({ message: "title cannot be empty" });
        return;
      }
      task.title = title.trim();
    }
    if (typeof description !== "undefined") {
      task.description = description?.trim() ? description.trim() : null;
    }
    if (typeof status !== "undefined") {
      const normalized = normalizeStatus(status);
      if (!normalized) {
        res.status(400).json({ message: "Invalid status" });
        return;
      }
      task.status = normalized;
    }
    if (typeof assigneeId !== "undefined") {
      if (assigneeId === null) task.assigneeId = null;
      else if (!mongoose.isValidObjectId(assigneeId)) {
        res.status(400).json({ message: "Invalid assigneeId" });
        return;
      } else task.assigneeId = new mongoose.Types.ObjectId(assigneeId);
    }
    if (typeof dueDate !== "undefined") {
      if (dueDate === null) task.dueDate = null;
      else {
        const d = new Date(dueDate);
        if (Number.isNaN(d.getTime())) {
          res.status(400).json({ message: "Invalid dueDate" });
          return;
        }
        task.dueDate = d;
      }
    }

    await task.save();

    res.status(200).json({
      task: {
        id: task.id,
        workspaceId: task.workspaceId,
        projectId: task.projectId,
        title: task.title,
        description: task.description,
        status: task.status,
        position: task.position,
        assigneeId: task.assigneeId,
        dueDate: task.dueDate,
        createdBy: task.createdBy,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      },
    });
  } catch (err) {
    next(err as Error);
  }
};

export const deleteTask = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { workspaceId, projectId, taskId } = req.params;
    if (!workspaceId || !mongoose.isValidObjectId(workspaceId)) {
      res.status(400).json({ message: "Invalid workspace id" });
      return;
    }
    if (!projectId || !mongoose.isValidObjectId(projectId)) {
      res.status(400).json({ message: "Invalid project id" });
      return;
    }
    if (!taskId || !mongoose.isValidObjectId(taskId)) {
      res.status(400).json({ message: "Invalid task id" });
      return;
    }

    const task = await Task.findOne({ _id: taskId, workspaceId, projectId });
    if (!task) {
      res.status(404).json({ message: "Task not found" });
      return;
    }

    await task.deleteOne();
    res.status(204).send();
  } catch (err) {
    next(err as Error);
  }
};

export const moveTask = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { workspaceId, projectId, taskId } = req.params;
    if (!workspaceId || !mongoose.isValidObjectId(workspaceId)) {
      res.status(400).json({ message: "Invalid workspace id" });
      return;
    }
    if (!projectId || !mongoose.isValidObjectId(projectId)) {
      res.status(400).json({ message: "Invalid project id" });
      return;
    }
    if (!taskId || !mongoose.isValidObjectId(taskId)) {
      res.status(400).json({ message: "Invalid task id" });
      return;
    }

    const { status, position } = req.body as { status?: TaskStatus; position?: number };
    const normalized = normalizeStatus(status);
    if (!normalized) {
      res.status(400).json({ message: "Invalid status" });
      return;
    }
    if (typeof position !== "number") {
      res.status(400).json({ message: "position must be a number" });
      return;
    }

    const task = await Task.findOne({ _id: taskId, workspaceId, projectId });
    if (!task) {
      res.status(404).json({ message: "Task not found" });
      return;
    }

    task.status = normalized;
    task.position = position;
    await task.save();

    try {
      const io = req.app.get("io");
      io.to(`project:${projectId}`).emit("task:moved", {
        taskId: task.id,
        projectId,
        workspaceId,
        status: task.status,
        position: task.position,
        updatedAt: task.updatedAt,
      });
    } catch {
      // ignore if io not configured
    }

    res.status(200).json({
      task: {
        id: task.id,
        workspaceId: task.workspaceId,
        projectId: task.projectId,
        title: task.title,
        description: task.description,
        status: task.status,
        position: task.position,
        assigneeId: task.assigneeId,
        dueDate: task.dueDate,
        createdBy: task.createdBy,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      },
    });
  } catch (err) {
    next(err as Error);
  }
};

