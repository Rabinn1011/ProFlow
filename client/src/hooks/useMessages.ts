import { useInfiniteQuery } from "@tanstack/react-query";
import { listMessages, type MessagePage } from "../services/message.service";

export const messagesQueryKey = (workspaceId: string, projectId: string) =>
  ["workspaces", workspaceId, "projects", projectId, "messages"] as const;

// Pages walk backwards through history: page 0 is the newest 50, each further page is
// older. Cursor (not offset) pagination, so live messages arriving mid-scroll cannot
// shift the window and duplicate a row.
export function useMessages(workspaceId: string, projectId: string, enabled: boolean) {
  return useInfiniteQuery<MessagePage>({
    queryKey: messagesQueryKey(workspaceId, projectId),
    queryFn: ({ pageParam }) => listMessages(workspaceId, projectId, pageParam as string | null),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: enabled && Boolean(workspaceId && projectId),
  });
}
