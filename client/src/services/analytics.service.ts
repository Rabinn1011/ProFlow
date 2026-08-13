import { authFetch } from "../lib/authFetch";

export type WorkspaceAnalytics = {
  days: number;
  totals: {
    todo: number;
    in_progress: number;
    done: number;
    total: number;
    overdue: number;
  };
  byProject: {
    projectId: string;
    name: string;
    total: number;
    todo: number;
    in_progress: number;
    done: number;
  }[];
  completions: { date: string; count: number }[];
  throughput: { userId: string | null; name: string; completed: number }[];
};

export async function getWorkspaceAnalytics(
  workspaceId: string,
  days: number,
): Promise<WorkspaceAnalytics> {
  const res = await authFetch(`/workspaces/${workspaceId}/analytics?days=${days}`);
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(payload.message ?? "Failed to load analytics");
  }

  return (await res.json()) as WorkspaceAnalytics;
}
