import * as jwt from "jsonwebtoken";
import mongoose from "mongoose";
import type { Server as SocketIOServer, Socket } from "socket.io";
import { Project } from "../models/project.model";
import { Workspace } from "../models/workspace.model";
import { MAX_MESSAGE_LENGTH, Message } from "../models/message.model";
import { serializeMessages } from "../controllers/messages.controller";
import { projectRoom, userRoom } from "../lib/realtime";

const getAccessTokenSecret = (): string => {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret) throw new Error("ACCESS_TOKEN_SECRET is not configured");
  return secret;
};

// Rooms carry a team's live activity, so the handshake must prove who is connecting.
// Without this, any anonymous client could join project:<id> and watch everything.
const authenticate = (socket: Socket, next: (err?: Error) => void): void => {
  const token = (socket.handshake.auth as { token?: unknown } | undefined)?.token;
  if (typeof token !== "string" || !token) {
    next(new Error("Unauthorized"));
    return;
  }

  try {
    const payload = jwt.verify(token, getAccessTokenSecret(), { algorithms: ["HS256"] }) as {
      sub: string;
    };
    socket.data.userId = payload.sub;
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
};

// Payloads are whatever the client chose to send: null, a string, an array, a nested
// object. Destructuring `({ projectId })` straight off one used to throw inside the
// handler, and socket.io runs handlers outside any try/catch, so a single
// `emit("project:join", null)` from any signed-in user crashed the whole server.
const readProjectId = (payload: unknown): string | null => {
  if (typeof payload !== "object" || payload === null) return null;
  const { projectId } = payload as { projectId?: unknown };
  return typeof projectId === "string" && mongoose.isValidObjectId(projectId) ? projectId : null;
};

// Returns the owning workspace id if the user may access this project, otherwise null.
// Re-run on every message, not just at join: membership can be revoked while the socket
// stays connected.
const resolveProjectAccess = async (
  userId: string,
  projectId: string,
): Promise<mongoose.Types.ObjectId | null> => {
  const project = await Project.findById(projectId).select("workspaceId");
  if (!project) return null;

  const isMember = await Workspace.exists({ _id: project.workspaceId, "members.user": userId });
  return isMember ? project.workspaceId : null;
};

// Token bucket per socket: allows a short burst, then a steady rate. Chat is otherwise
// an unauthenticated-cost write path: one script could fill the database and every
// teammate's screen.
const createBucket = (capacity: number, refillPerSecond: number) => {
  let tokens = capacity;
  let last = Date.now();
  return (): boolean => {
    const now = Date.now();
    tokens = Math.min(capacity, tokens + ((now - last) / 1000) * refillPerSecond);
    last = now;
    if (tokens < 1) return false;
    tokens -= 1;
    return true;
  };
};

// A handler that throws or rejects must never reach the process: Node exits on an
// uncaught exception or unhandled rejection.
const safely =
  (socket: Socket, handler: (payload: unknown) => Promise<void>) =>
  (payload: unknown): void => {
    handler(payload).catch(() => {
      socket.emit("chat:error", { message: "Something went wrong" });
    });
  };

export function registerSocketHandlers(io: SocketIOServer): void {
  io.use(authenticate);

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;
    void socket.join(userRoom(userId));

    const allowJoin = createBucket(20, 2);
    const allowMessage = createBucket(10, 1);

    socket.on(
      "project:join",
      safely(socket, async (payload) => {
        const projectId = readProjectId(payload);
        if (!projectId || !allowJoin()) return;

        const allowed = await resolveProjectAccess(userId, projectId);
        if (allowed) {
          await socket.join(projectRoom(projectId));
          socket.emit("project:joined", { projectId });
        } else {
          socket.emit("project:join-denied", { projectId });
        }
      }),
    );

    socket.on(
      "project:leave",
      safely(socket, async (payload) => {
        const projectId = readProjectId(payload);
        if (projectId) await socket.leave(projectRoom(projectId));
      }),
    );

    socket.on(
      "chat:send",
      safely(socket, async (payload) => {
        const projectId = readProjectId(payload);
        const body = (payload as { body?: unknown } | null)?.body;
        if (!projectId || typeof body !== "string") return;

        const trimmed = body.trim();
        if (!trimmed || trimmed.length > MAX_MESSAGE_LENGTH) return;

        if (!socket.rooms.has(projectRoom(projectId))) {
          socket.emit("chat:error", { message: "Join the project before sending messages" });
          return;
        }

        if (!allowMessage()) {
          socket.emit("chat:error", { message: "You're sending messages too quickly" });
          return;
        }

        const workspaceId = await resolveProjectAccess(userId, projectId);
        if (!workspaceId) {
          await socket.leave(projectRoom(projectId));
          socket.emit("chat:error", { message: "You no longer have access to this project" });
          return;
        }

        const message = await Message.create({
          workspaceId,
          projectId,
          author: userId,
          body: trimmed,
        });

        const [dto] = await serializeMessages([message]);
        io.to(projectRoom(projectId)).emit("chat:message", { message: dto });
      }),
    );
  });
}
