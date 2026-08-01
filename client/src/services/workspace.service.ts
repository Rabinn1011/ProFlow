import { authFetch } from "../lib/authFetch";

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";

export type WorkspaceMember = {
  user: string;
  role: WorkspaceRole;
  joinedAt: string;
};

export type Workspace = {
  id: string;
  name: string;
  createdBy: string;
  members: WorkspaceMember[];
  createdAt: string;
  updatedAt: string;
};

async function toError(res: Response, fallback: string): Promise<Error> {
  const payload = (await res.json().catch(() => ({}))) as { message?: string };
  return new Error(payload.message ?? fallback);
}

export async function listWorkspaces(): Promise<Workspace[]> {
  const res = await authFetch("/workspaces");
  if (!res.ok) throw await toError(res, "Failed to load workspaces");

  const payload = (await res.json()) as { workspaces?: Workspace[] };
  return payload.workspaces ?? [];
}

export async function createWorkspace(name: string): Promise<Workspace> {
  const res = await authFetch("/workspaces", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw await toError(res, "Failed to create workspace");

  const payload = (await res.json()) as { workspace: Workspace };
  return payload.workspace;
}

export async function renameWorkspace(id: string, name: string): Promise<Workspace> {
  const res = await authFetch(`/workspaces/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw await toError(res, "Failed to rename workspace");

  const payload = (await res.json()) as { workspace: Workspace };
  return payload.workspace;
}

// The server answers 204 with no body, so there is nothing to parse on success.
export async function deleteWorkspace(id: string): Promise<void> {
  const res = await authFetch(`/workspaces/${id}`, { method: "DELETE" });
  if (!res.ok) throw await toError(res, "Failed to delete workspace");
}
