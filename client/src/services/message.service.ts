import { authFetch } from "../lib/authFetch";

export type ChatMessage = {
  id: string;
  projectId: string;
  body: string;
  author: { id: string; name: string };
  createdAt: string;
};

export type MessagePage = {
  messages: ChatMessage[];
  hasMore: boolean;
  nextCursor: string | null;
};

export const MAX_MESSAGE_LENGTH = 2000;

export async function listMessages(
  workspaceId: string,
  projectId: string,
  before?: string | null,
): Promise<MessagePage> {
  const query = before ? `?before=${encodeURIComponent(before)}` : "";
  const res = await authFetch(
    `/workspaces/${workspaceId}/projects/${projectId}/messages${query}`,
  );

  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(payload.message ?? "Failed to load messages");
  }

  return (await res.json()) as MessagePage;
}
