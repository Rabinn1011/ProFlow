import type { NextFunction, Response } from "express";
import mongoose from "mongoose";
import type { RequestWithUser } from "../types/express";
import { Task } from "../models/task.model";

const DEFAULT_DAYS = 30;
const MAX_DAYS = 180;

type StatusCounts = { todo: number; in_progress: number; done: number };

const emptyCounts = (): StatusCounts => ({ todo: 0, in_progress: 0, done: 0 });

// Aggregations return only the days that had completions; the chart needs a continuous
// axis, so gaps are filled with zeroes here rather than in the client.
const fillMissingDays = (
  rows: { date: string; count: number }[],
  days: number,
): { date: string; count: number }[] => {
  const byDate = new Map(rows.map((row) => [row.date, row.count]));
  const out: { date: string; count: number }[] = [];

  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);
  cursor.setUTCDate(cursor.getUTCDate() - (days - 1));

  for (let i = 0; i < days; i += 1) {
    const date = cursor.toISOString().slice(0, 10);
    out.push({ date, count: byDate.get(date) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return out;
};

export const getWorkspaceAnalytics = async (
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

    const requestedDays = Number(req.query.days);
    const days =
      Number.isFinite(requestedDays) && requestedDays > 0
        ? Math.min(Math.trunc(requestedDays), MAX_DAYS)
        : DEFAULT_DAYS;

    const workspaceId = new mongoose.Types.ObjectId(workspace.id);

    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - (days - 1));

    const now = new Date();

    const [byStatusRows, byProjectRows, completionRows, throughputRows, overdueCount] =
      await Promise.all([
        // Overall status split.
        Task.aggregate<{ _id: string; count: number }>([
          { $match: { workspaceId } },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),

        // Per-project split: group twice, then join the project name.
        Task.aggregate<{
          projectId: mongoose.Types.ObjectId;
          name: string;
          total: number;
          counts: { status: string; count: number }[];
        }>([
          { $match: { workspaceId } },
          {
            $group: {
              _id: { projectId: "$projectId", status: "$status" },
              count: { $sum: 1 },
            },
          },
          {
            $group: {
              _id: "$_id.projectId",
              counts: { $push: { status: "$_id.status", count: "$count" } },
              total: { $sum: "$count" },
            },
          },
          {
            $lookup: {
              from: "projects",
              localField: "_id",
              foreignField: "_id",
              as: "project",
            },
          },
          { $unwind: "$project" },
          { $project: { _id: 0, projectId: "$_id", name: "$project.name", counts: 1, total: 1 } },
          { $sort: { total: -1, name: 1 } },
        ]),

        // Completions per day, bucketed in UTC.
        Task.aggregate<{ date: string; count: number }>([
          { $match: { workspaceId, status: "done", completedAt: { $gte: since } } },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$completedAt", timezone: "UTC" } },
              count: { $sum: 1 },
            },
          },
          { $project: { _id: 0, date: "$_id", count: 1 } },
          { $sort: { date: 1 } },
        ]),

        // Who closed what. There is no audit trail of who moved a task, so this is
        // attributed by assignee — unassigned completions are grouped separately.
        Task.aggregate<{ userId: mongoose.Types.ObjectId | null; name: string; completed: number }>([
          { $match: { workspaceId, status: "done" } },
          { $group: { _id: "$assigneeId", completed: { $sum: 1 } } },
          {
            $lookup: {
              from: "users",
              localField: "_id",
              foreignField: "_id",
              as: "user",
            },
          },
          {
            $project: {
              _id: 0,
              userId: "$_id",
              completed: 1,
              name: {
                $ifNull: [{ $first: "$user.name" }, "Unassigned"],
              },
            },
          },
          { $sort: { completed: -1, name: 1 } },
        ]),

        Task.countDocuments({
          workspaceId,
          status: { $ne: "done" },
          dueDate: { $ne: null, $lt: now },
        }),
      ]);

    const byStatus = byStatusRows.reduce<StatusCounts>((acc, row) => {
      if (row._id === "todo" || row._id === "in_progress" || row._id === "done") {
        acc[row._id] = row.count;
      }
      return acc;
    }, emptyCounts());

    res.status(200).json({
      days,
      totals: {
        ...byStatus,
        total: byStatus.todo + byStatus.in_progress + byStatus.done,
        overdue: overdueCount,
      },
      byProject: byProjectRows.map((row) => {
        const counts = row.counts.reduce<StatusCounts>((acc, entry) => {
          if (entry.status === "todo" || entry.status === "in_progress" || entry.status === "done") {
            acc[entry.status] = entry.count;
          }
          return acc;
        }, emptyCounts());

        return {
          projectId: row.projectId.toString(),
          name: row.name,
          total: row.total,
          ...counts,
        };
      }),
      completions: fillMissingDays(completionRows, days),
      throughput: throughputRows.map((row) => ({
        userId: row.userId ? row.userId.toString() : null,
        name: row.name,
        completed: row.completed,
      })),
    });
  } catch (err) {
    next(err as Error);
  }
};
