import { useCallback, useEffect, useMemo, useRef } from "react";
import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { API_BASE_URL } from "../services/api";
import { useAuthStore } from "../store/authStore";
import { useSocket } from "./useSocket";
import { tasksQueryKey } from "./useTasks";
import { messagesQueryKey } from "./useMessages";
import type { Task } from "../services/task.service";
import type { ChatMessage, MessagePage } from "../services/message.service";

type TaskEvent = { task: Task };
type TaskDeletedEvent = { taskId: string };
type ChatEvent = { message: ChatMessage };

// One socket per project view, shared by the board and the chat panel — calling useSocket
// in two places would open two connections.
//
// Keeps the board in sync with other people's edits by patching the React Query cache
// in place. Refetching on every event would work but throws away the payload the server
// already sent, and flickers the board for everyone on each keystroke-sized change.
export function useProjectRealtime(workspaceId: string, projectId: string) {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);

  const socketUrl = useMemo(() => API_BASE_URL.replace(/\/api\/?$/, ""), []);
  const socket = useSocket(socketUrl, Boolean(accessToken));

  // Distinguishes the first connect from a reconnect. On the first one the queries have
  // just loaded, so re-fetching would be a wasted round trip.
  const hasConnectedRef = useRef(false);

  useEffect(() => {
    if (!socket || !workspaceId || !projectId) return;

    const taskKey = tasksQueryKey(workspaceId, projectId);
    const messageKey = messagesQueryKey(workspaceId, projectId);

    const upsert = ({ task }: TaskEvent) => {
      queryClient.setQueryData<Task[]>(taskKey, (current) => {
        if (!current) return current;
        const index = current.findIndex((t) => t.id === task.id);
        if (index === -1) return [...current, task];

        const next = [...current];
        next[index] = task;
        return next;
      });
    };

    const remove = ({ taskId }: TaskDeletedEvent) => {
      queryClient.setQueryData<Task[]>(taskKey, (current) =>
        current ? current.filter((t) => t.id !== taskId) : current,
      );
    };

    // Page 0 holds the newest messages, so a new one is appended there.
    const appendMessage = ({ message }: ChatEvent) => {
      queryClient.setQueryData<InfiniteData<MessagePage>>(messageKey, (current) => {
        if (!current || current.pages.length === 0) return current;
        if (current.pages.some((page) => page.messages.some((m) => m.id === message.id))) {
          return current;
        }

        const [first, ...rest] = current.pages;
        return {
          ...current,
          pages: [{ ...first, messages: [...first.messages, message] }, ...rest],
        };
      });
    };

    const join = () => {
      socket.emit("project:join", { projectId });

      // Events that fired while the socket was down were never delivered, so the cache is
      // stale by an unknown amount. Refetching once on reconnect is the only way back to
      // the truth — this happens routinely on hosts that sleep idle connections.
      if (hasConnectedRef.current) {
        void queryClient.invalidateQueries({ queryKey: taskKey });
        void queryClient.invalidateQueries({ queryKey: messageKey });
      }
      hasConnectedRef.current = true;
    };

    // Join on every connect, so a reconnect re-enters the room instead of going silent.
    socket.on("connect", join);
    if (socket.connected) join();

    socket.on("task:created", upsert);
    socket.on("task:updated", upsert);
    socket.on("task:moved", upsert);
    socket.on("task:deleted", remove);
    socket.on("chat:message", appendMessage);

    return () => {
      socket.off("connect", join);
      socket.off("task:created", upsert);
      socket.off("task:updated", upsert);
      socket.off("task:moved", upsert);
      socket.off("task:deleted", remove);
      socket.off("chat:message", appendMessage);
      socket.emit("project:leave", { projectId });
    };
  }, [socket, queryClient, workspaceId, projectId]);

  const sendMessage = useCallback(
    (body: string) => {
      socket?.emit("chat:send", { projectId, body });
    },
    [socket, projectId],
  );

  return { sendMessage, isConnected: Boolean(socket) };
}
