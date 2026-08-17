import { authFetch } from "../lib/authFetch";

export type TaskStatus = "todo" | "in_progress" | "done";

export type Task = {
  id: string;
  workspaceId: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  position: number;
  assigneeId: string | null;
  dueDate: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type TaskInput = {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  dueDate?: string | null;
  assigneeId?: string | null;
};

async function toError(res: Response, fallback: string): Promise<Error> {
  const payload = (await res.json().catch(() => ({}))) as { message?: string };
  return new Error(payload.message ?? fallback);
}

const tasksPath = (workspaceId: string, projectId: string) =>
  `/workspaces/${workspaceId}/projects/${projectId}/tasks`;

export async function listTasks(workspaceId: string, projectId: string): Promise<Task[]> {
  const res = await authFetch(tasksPath(workspaceId, projectId));
  if (!res.ok) throw await toError(res, "Failed to load tasks");

  const payload = (await res.json()) as { tasks?: Task[] };
  return payload.tasks ?? [];
}

// The create endpoint accepts title/description/status only — dueDate is set via update.
export async function createTask(
  workspaceId: string,
  projectId: string,
  input: { title: string; description?: string | null; status?: TaskStatus },
): Promise<Task> {
  const res = await authFetch(tasksPath(workspaceId, projectId), {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await toError(res, "Failed to create task");

  const payload = (await res.json()) as { task: Task };
  return payload.task;
}

export async function updateTask(
  workspaceId: string,
  projectId: string,
  taskId: string,
  input: TaskInput,
): Promise<Task> {
  const res = await authFetch(`${tasksPath(workspaceId, projectId)}/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await toError(res, "Failed to update task");

  const payload = (await res.json()) as { task: Task };
  return payload.task;
}

export async function moveTask(
  workspaceId: string,
  projectId: string,
  taskId: string,
  input: { status: TaskStatus; position: number },
): Promise<Task> {
  const res = await authFetch(`${tasksPath(workspaceId, projectId)}/${taskId}/move`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await toError(res, "Failed to move task");

  const payload = (await res.json()) as { task: Task };
  return payload.task;
}

export async function deleteTask(
  workspaceId: string,
  projectId: string,
  taskId: string,
): Promise<void> {
  const res = await authFetch(`${tasksPath(workspaceId, projectId)}/${taskId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw await toError(res, "Failed to delete task");
}
