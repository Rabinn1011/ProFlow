import type { Workspace, WorkspaceRole } from "../services/workspace.service";

// Mirrors server/src/middleware/workspace-access.middleware.ts — keep the two in sync.
const roleRank: Record<WorkspaceRole, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
};

export function getMyRole(workspace: Workspace, userId?: string): WorkspaceRole | null {
  if (!userId) return null;
  return workspace.members.find((m) => String(m.user) === userId)?.role ?? null;
}

export function hasAtLeastRole(role: WorkspaceRole | null, minimum: WorkspaceRole): boolean {
  if (!role) return false;
  return roleRank[role] >= roleRank[minimum];
}
