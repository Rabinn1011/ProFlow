import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTask,
  deleteTask,
  listTasks,
  moveTask,
  updateTask,
  type Task,
  type TaskInput,
  type TaskStatus,
} from "../services/task.service";
import { toast } from "../store/toastStore";

export const tasksQueryKey = (workspaceId: string, projectId: string) =>
  ["workspaces", workspaceId, "projects", projectId, "tasks"] as const;

export function useTasks(workspaceId: string, projectId: string) {
  return useQuery<Task[]>({
    queryKey: tasksQueryKey(workspaceId, projectId),
    queryFn: () => listTasks(workspaceId, projectId),
    enabled: Boolean(workspaceId && projectId),
  });
}

export function useCreateTask(workspaceId: string, projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { title: string; description?: string | null; status?: TaskStatus }) =>
      createTask(workspaceId, projectId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: tasksQueryKey(workspaceId, projectId) }),
  });
}

export function useUpdateTask(workspaceId: string, projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, ...input }: TaskInput & { taskId: string }) =>
      updateTask(workspaceId, projectId, taskId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: tasksQueryKey(workspaceId, projectId) }),
  });
}

// Optimistic: the card must land where it was dropped immediately. A board that waits
// for the round trip feels broken, so we patch the cache first and roll back on failure.
export function useMoveTask(workspaceId: string, projectId: string) {
  const queryClient = useQueryClient();
  const queryKey = tasksQueryKey(workspaceId, projectId);

  return useMutation({
    mutationFn: ({
      taskId,
      ...input
    }: {
      taskId: string;
      status: TaskStatus;
      position: number;
    }) => moveTask(workspaceId, projectId, taskId, input),

    onMutate: async ({ taskId, status, position }) => {
      // Stop an in-flight refetch from overwriting the optimistic state.
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Task[]>(queryKey);

      queryClient.setQueryData<Task[]>(queryKey, (current) =>
        current?.map((task) => (task.id === taskId ? { ...task, status, position } : task)),
      );

      return { previous };
    },

    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },

    // The server's copy is authoritative (it may have clamped position), so take it.
    onSuccess: (task) => {
      queryClient.setQueryData<Task[]>(queryKey, (current) =>
        current?.map((existing) => (existing.id === task.id ? task : existing)),
      );
    },
  });
}

export function useDeleteTask(workspaceId: string, projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => deleteTask(workspaceId, projectId, taskId),
    onSuccess: () => {
      toast.success("Task deleted");
      return queryClient.invalidateQueries({ queryKey: tasksQueryKey(workspaceId, projectId) });
    },
  });
}
