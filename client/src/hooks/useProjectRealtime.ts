import { useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "../services/api";
import { useAuthStore } from "../store/authStore";
import { useSocket } from "./useSocket";
import { tasksQueryKey } from "./useTasks";
import type { Task } from "../services/task.service";

type TaskEvent = { task: Task };
type TaskDeletedEvent = { taskId: string };

// Keeps the board in sync with other people's edits by patching the React Query cache
// in place. Refetching on every event would work but throws away the payload the server
// already sent, and flickers the board for everyone on each keystroke-sized change.
export function useProjectRealtime(workspaceId: string, projectId: string): void {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);

  const socketUrl = useMemo(() => API_BASE_URL.replace(/\/api\/?$/, ""), []);
  const socket = useSocket(socketUrl, accessToken);

  useEffect(() => {
    if (!socket || !workspaceId || !projectId) return;

    const queryKey = tasksQueryKey(workspaceId, projectId);

    const upsert = ({ task }: TaskEvent) => {
      queryClient.setQueryData<Task[]>(queryKey, (current) => {
        if (!current) return current;
        const index = current.findIndex((t) => t.id === task.id);
        if (index === -1) return [...current, task];

        const next = [...current];
        next[index] = task;
        return next;
      });
    };

    const remove = ({ taskId }: TaskDeletedEvent) => {
      queryClient.setQueryData<Task[]>(queryKey, (current) =>
        current ? current.filter((t) => t.id !== taskId) : current,
      );
    };

    const join = () => socket.emit("project:join", { projectId });

    // Join on every connect, so a reconnect re-enters the room instead of going silent.
    socket.on("connect", join);
    if (socket.connected) join();

    socket.on("task:created", upsert);
    socket.on("task:updated", upsert);
    socket.on("task:moved", upsert);
    socket.on("task:deleted", remove);

    return () => {
      socket.off("connect", join);
      socket.off("task:created", upsert);
      socket.off("task:updated", upsert);
      socket.off("task:moved", upsert);
      socket.off("task:deleted", remove);
      socket.emit("project:leave", { projectId });
    };
  }, [socket, queryClient, workspaceId, projectId]);
}
