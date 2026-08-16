import * as jwt from "jsonwebtoken";
import mongoose from "mongoose";
import type { Server as SocketIOServer, Socket } from "socket.io";
import { Project } from "../models/project.model";
import { Workspace } from "../models/workspace.model";
import { MAX_MESSAGE_LENGTH, Message } from "../models/message.model";
import { serializeMessages } from "../controllers/messages.controller";

type JoinPayload = { projectId?: string };

type ChatSendPayload = { projectId?: string; body?: string };

const getAccessTokenSecret = (): string => {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret) throw new Error("ACCESS_TOKEN_SECRET is not configured");
  return secret;
};

// Rooms carry a team's live activity, so the handshake must prove who is connecting.
// Without this, any anonymous client could join project:<id> and watch everything.
const authenticate = (socket: Socket, next: (err?: Error) => void): void => {
  const token = (socket.handshake.auth as { token?: string } | undefined)?.token;
  if (!token) {
    next(new Error("Unauthorized"));
    return;
  }

  try {
    const payload = jwt.verify(token, getAccessTokenSecret()) as { sub: string; role?: string };
    socket.data.userId = payload.sub;
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
};

// Authentication alone is not enough: a signed-in user must still be a member of the
// workspace that owns the project before they can listen to its room.
const canJoinProject = async (userId: string, projectId: string): Promise<boolean> => {
  if (!mongoose.isValidObjectId(projectId)) return false;

  const project = await Project.findById(projectId).select("workspaceId");
  if (!project) return false;

  const workspace = await Workspace.findOne({
    _id: project.workspaceId,
    "members.user": userId,
  }).select("_id");

  return Boolean(workspace);
};

export function registerSocketHandlers(io: SocketIOServer): void {
  io.use(authenticate);

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;

    socket.on("project:join", ({ projectId }: JoinPayload) => {
      if (!projectId) return;

      void canJoinProject(userId, projectId).then((allowed) => {
        if (allowed) {
          socket.join(`project:${projectId}`);
          socket.emit("project:joined", { projectId });
        } else {
          socket.emit("project:join-denied", { projectId });
        }
      });
    });

    socket.on("project:leave", ({ projectId }: JoinPayload) => {
      if (projectId) socket.leave(`project:${projectId}`);
    });

    socket.on("chat:send", ({ projectId, body }: ChatSendPayload) => {
      if (!projectId || typeof body !== "string") return;

      const trimmed = body.trim();
      if (!trimmed || trimmed.length > MAX_MESSAGE_LENGTH) return;

      // Room membership is the authorization check: joining already verified that this
      // user belongs to the workspace that owns the project.
      if (!socket.rooms.has(`project:${projectId}`)) {
        socket.emit("chat:error", { message: "Join the project before sending messages" });
        return;
      }

      void (async () => {
        try {
          const project = await Project.findById(projectId).select("workspaceId");
          if (!project) return;

          const message = await Message.create({
            workspaceId: project.workspaceId,
            projectId,
            author: userId,
            body: trimmed,
          });

          const [dto] = await serializeMessages([message]);
          io.to(`project:${projectId}`).emit("chat:message", { message: dto });
        } catch {
          socket.emit("chat:error", { message: "Could not send that message" });
        }
      })();
    });
  });
}
