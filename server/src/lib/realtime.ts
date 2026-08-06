import type { Request } from "express";
import type { Server as SocketIOServer } from "socket.io";

// Broadcasts are best-effort: a socket failure must never fail the HTTP request that
// already succeeded, so everything here swallows its errors.
export function emitToProject(
  req: Request,
  projectId: string,
  event: string,
  payload: unknown,
): void {
  try {
    const io = req.app.get("io") as SocketIOServer | undefined;
    io?.to(`project:${projectId}`).emit(event, payload);
  } catch {
    // io not configured (tests, or server started without sockets)
  }
}
