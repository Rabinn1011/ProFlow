import { authFetch } from "../lib/authFetch";
import type { WorkspaceRole } from "./workspace.service";

export type Member = {
  userId: string;
  name: string;
  email: string;
  role: WorkspaceRole;
  joinedAt: string;
};

async function toError(res: Response, fallback: string): Promise<Error> {
  const payload = (await res.json().catch(() => ({}))) as { message?: string };
  return new Error(payload.message ?? fallback);
}

// Every mutation returns the full member list, so the cache can be replaced outright
// instead of refetched.
async function readMembers(res: Response): Promise<Member[]> {
  const payload = (await res.json()) as { members?: Member[] };
  return payload.members ?? [];
}

export async function listMembers(workspaceId: string): Promise<Member[]> {
  const res = await authFetch(`/workspaces/${workspaceId}/members`);
  if (!res.ok) throw await toError(res, "Failed to load members");
  return readMembers(res);
}

export async function addMember(
  workspaceId: string,
  input: { email: string; role: WorkspaceRole },
): Promise<Member[]> {
  const res = await authFetch(`/workspaces/${workspaceId}/members`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await toError(res, "Failed to add member");
  return readMembers(res);
}

export async function updateMemberRole(
  workspaceId: string,
  userId: string,
  role: WorkspaceRole,
): Promise<Member[]> {
  const res = await authFetch(`/workspaces/${workspaceId}/members/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
  if (!res.ok) throw await toError(res, "Failed to change role");
  return readMembers(res);
}

export async function removeMember(workspaceId: string, userId: string): Promise<Member[]> {
  const res = await authFetch(`/workspaces/${workspaceId}/members/${userId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw await toError(res, "Failed to remove member");
  return readMembers(res);
}
