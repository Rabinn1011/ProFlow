import type { Request } from "express";
import type { Server as SocketIOServer } from "socket.io";

// Every socket also sits in a per-user room, so server-side changes to someone's access
// (being removed from a workspace) can reach all of their open tabs at once.
export const userRoom = (userId: string): string => `user:${userId}`;
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

// Joining a room is checked once, at join time. Without this, someone removed from a
// workspace would keep receiving its live task updates and chat until they reloaded.
export function removeUserFromProjects(req: Request, userId: string, projectIds: string[]): void {
  try {
    if (projectIds.length === 0) return;
    getIo(req)?.in(userRoom(userId)).socketsLeave(projectIds.map(projectRoom));
  } catch {
    // io not configured
  }
}
