import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createWorkspace,
  deleteWorkspace,
  getWorkspace,
  listWorkspaces,
  renameWorkspace,
  type Workspace,
} from "../services/workspace.service";

export const workspacesQueryKey = ["workspaces"] as const;
export const workspaceQueryKey = (id: string) => ["workspaces", id] as const;

export function useWorkspaces() {
  return useQuery<Workspace[]>({
    queryKey: workspacesQueryKey,
    queryFn: listWorkspaces,
  });
}

export function useWorkspace(id: string) {
  return useQuery<Workspace>({
    queryKey: workspaceQueryKey(id),
    queryFn: () => getWorkspace(id),
    enabled: Boolean(id),
  });
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => createWorkspace(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workspacesQueryKey }),
  });
}

export function useRenameWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameWorkspace(id, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workspacesQueryKey }),
  });
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteWorkspace(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workspacesQueryKey }),
  });
}
