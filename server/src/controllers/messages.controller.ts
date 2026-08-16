import type { NextFunction, Response } from "express";
import mongoose from "mongoose";
import type { RequestWithUser } from "../types/express";
import { Message, type IMessageDocument } from "../models/message.model";
import { User } from "../models/user.model";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

// Messages store only an author id; the panel needs a name next to each bubble.
export const serializeMessages = async (messages: IMessageDocument[]) => {
  const users = await User.find({ _id: { $in: messages.map((m) => m.author) } }).select("_id name");
  const byId = new Map(users.map((u) => [u.id as string, u.name]));

  return messages.map((message) => ({
    id: message.id,
    projectId: message.projectId.toString(),
    body: message.body,
    author: {
      id: message.author.toString(),
      name: byId.get(message.author.toString()) ?? "Unknown user",
    },
    createdAt: message.createdAt,
  }));
};

export const listMessages = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { workspaceId, projectId } = req.params as {
      workspaceId?: string;
      projectId?: string;
    };

    if (!workspaceId || !mongoose.isValidObjectId(workspaceId)) {
      res.status(400).json({ message: "Invalid workspace id" });
      return;
    }
    if (!projectId || !mongoose.isValidObjectId(projectId)) {
      res.status(400).json({ message: "Invalid project id" });
      return;
    }

    const requestedLimit = Number(req.query.limit);
    const limit =
      Number.isFinite(requestedLimit) && requestedLimit > 0
        ? Math.min(Math.trunc(requestedLimit), MAX_LIMIT)
        : DEFAULT_LIMIT;

    // Cursor pagination on createdAt: keyset, so new messages arriving mid-scroll cannot
    // shift the window the way an offset would.
    const before = typeof req.query.before === "string" ? new Date(req.query.before) : null;
    const filter: Record<string, unknown> = { workspaceId, projectId };
    if (before && !Number.isNaN(before.getTime())) {
      filter.createdAt = { $lt: before };
    }

    // Fetch one extra to detect whether older messages exist.
    const found = await Message.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit + 1);

    const hasMore = found.length > limit;
    const page = hasMore ? found.slice(0, limit) : found;

    // Stored newest-first for the cursor, returned oldest-first for rendering.
    const ordered = [...page].reverse();

    res.status(200).json({
      messages: await serializeMessages(ordered),
      hasMore,
      nextCursor: hasMore ? page[page.length - 1].createdAt.toISOString() : null,
    });
  } catch (err) {
    next(err as Error);
  }
};
