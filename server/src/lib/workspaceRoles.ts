import type { WorkspaceRole } from "../models/workspace.model";

export const roleRank: Record<WorkspaceRole, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
};

export const isWorkspaceRole = (value: unknown): value is WorkspaceRole =>
  value === "owner" || value === "admin" || value === "member" || value === "viewer";

// Owners may manage anyone (the last-owner guard still applies); everyone else may only
// manage members strictly below their own rank. This also blocks self-promotion, since
// your own rank is never strictly below itself.
export const canManageMember = (actor: WorkspaceRole, target: WorkspaceRole): boolean =>
  actor === "owner" || roleRank[target] < roleRank[actor];
