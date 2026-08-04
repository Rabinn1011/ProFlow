import { authFetch } from "../lib/authFetch";

export type Project = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

async function toError(res: Response, fallback: string): Promise<Error> {
  const payload = (await res.json().catch(() => ({}))) as { message?: string };
  return new Error(payload.message ?? fallback);
}

export async function listProjects(workspaceId: string): Promise<Project[]> {
  const res = await authFetch(`/workspaces/${workspaceId}/projects`);
  if (!res.ok) throw await toError(res, "Failed to load projects");

  const payload = (await res.json()) as { projects?: Project[] };
  return payload.projects ?? [];
}

export async function createProject(
  workspaceId: string,
  input: { name: string; description?: string | null },
): Promise<Project> {
  const res = await authFetch(`/workspaces/${workspaceId}/projects`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await toError(res, "Failed to create project");

  const payload = (await res.json()) as { project: Project };
  return payload.project;
}

export async function updateProject(
  workspaceId: string,
  projectId: string,
  input: { name?: string; description?: string | null },
): Promise<Project> {
  const res = await authFetch(`/workspaces/${workspaceId}/projects/${projectId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await toError(res, "Failed to update project");

  const payload = (await res.json()) as { project: Project };
  return payload.project;
}

// 204 No Content on success — nothing to parse.
export async function deleteProject(workspaceId: string, projectId: string): Promise<void> {
  const res = await authFetch(`/workspaces/${workspaceId}/projects/${projectId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw await toError(res, "Failed to delete project");
}
