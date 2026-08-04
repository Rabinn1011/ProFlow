import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createProject,
  deleteProject,
  listProjects,
  updateProject,
  type Project,
} from "../services/project.service";

export const projectsQueryKey = (workspaceId: string) => ["workspaces", workspaceId, "projects"] as const;

export function useProjects(workspaceId: string) {
  return useQuery<Project[]>({
    queryKey: projectsQueryKey(workspaceId),
    queryFn: () => listProjects(workspaceId),
    enabled: Boolean(workspaceId),
  });
}

export function useCreateProject(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { name: string; description?: string | null }) =>
      createProject(workspaceId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectsQueryKey(workspaceId) }),
  });
}

export function useUpdateProject(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      ...input
    }: {
      projectId: string;
      name?: string;
      description?: string | null;
    }) => updateProject(workspaceId, projectId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectsQueryKey(workspaceId) }),
  });
}

export function useDeleteProject(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) => deleteProject(workspaceId, projectId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectsQueryKey(workspaceId) }),
  });
}
