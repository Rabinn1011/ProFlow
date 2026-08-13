import { useQuery } from "@tanstack/react-query";
import { getWorkspaceAnalytics, type WorkspaceAnalytics } from "../services/analytics.service";

export const analyticsQueryKey = (workspaceId: string, days: number) =>
  ["workspaces", workspaceId, "analytics", days] as const;

export function useAnalytics(workspaceId: string, days: number) {
  return useQuery<WorkspaceAnalytics>({
    queryKey: analyticsQueryKey(workspaceId, days),
    queryFn: () => getWorkspaceAnalytics(workspaceId, days),
    enabled: Boolean(workspaceId),
  });
}
