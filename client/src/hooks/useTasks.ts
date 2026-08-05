import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTask,
  deleteTask,
  listTasks,
  updateTask,
  type Task,
  type TaskInput,
  type TaskStatus,
} from "../services/task.service";

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

export function useDeleteTask(workspaceId: string, projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => deleteTask(workspaceId, projectId, taskId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: tasksQueryKey(workspaceId, projectId) }),
  });
}
