import type { Request } from "express";
import type { Server as SocketIOServer } from "socket.io";

export const projectRoom = (projectId: string): string => `project:${projectId}`;

const getIo = (req: Request): SocketIOServer | undefined => {
  try {
    return req.app.get("io") as SocketIOServer | undefined;
  } catch {
    return undefined;
  }
};

// Broadcasts are best-effort: a socket failure must never fail the HTTP request that
// already succeeded, so everything here swallows its errors.
export function emitToProject(
  req: Request,
  projectId: string,
  event: string,
  payload: unknown,
): void {
  try {
    getIo(req)?.to(projectRoom(projectId)).emit(event, payload);
  } catch {
    // io not configured (tests, or server started without sockets)
  }
}
