import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createWorkspace,
  deleteWorkspace,
  listWorkspaces,
  renameWorkspace,
  type Workspace,
} from "../services/workspace.service";

export const workspacesQueryKey = ["workspaces"] as const;

export function useWorkspaces() {
  return useQuery<Workspace[]>({
    queryKey: workspacesQueryKey,
    queryFn: listWorkspaces,
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
