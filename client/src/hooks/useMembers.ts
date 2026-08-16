import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addMember,
  listMembers,
  removeMember,
  updateMemberRole,
  type Member,
} from "../services/member.service";
import type { WorkspaceRole } from "../services/workspace.service";
import { workspaceQueryKey, workspacesQueryKey } from "./useWorkspaces";
import { toast } from "../store/toastStore";

export const membersQueryKey = (workspaceId: string) =>
  ["workspaces", workspaceId, "members"] as const;

export function useMembers(workspaceId: string) {
  return useQuery<Member[]>({
    queryKey: membersQueryKey(workspaceId),
    queryFn: () => listMembers(workspaceId),
    enabled: Boolean(workspaceId),
  });
}

// Membership changes also change the caller's own role gating, so the workspace queries
// have to be refreshed alongside the member list.
function useMemberMutation<TVariables>(
  workspaceId: string,
  mutationFn: (variables: TVariables) => Promise<Member[]>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (members) => {
      queryClient.setQueryData(membersQueryKey(workspaceId), members);
      void queryClient.invalidateQueries({ queryKey: workspaceQueryKey(workspaceId) });
      void queryClient.invalidateQueries({ queryKey: workspacesQueryKey });
    },
  });
}

export function useAddMember(workspaceId: string) {
  return useMemberMutation(workspaceId, async (input: { email: string; role: WorkspaceRole }) => {
    const members = await addMember(workspaceId, input);
    toast.success(`${input.email} added as ${input.role}`);
    return members;
  });
}

export function useUpdateMemberRole(workspaceId: string) {
  return useMemberMutation(
    workspaceId,
    async ({ userId, role }: { userId: string; role: WorkspaceRole }) => {
      const members = await updateMemberRole(workspaceId, userId, role);
      const changed = members.find((m) => m.userId === userId);
      toast.success(`${changed?.name ?? "Member"} is now ${role}`);
      return members;
    },
  );
}

export function useRemoveMember(workspaceId: string) {
  return useMemberMutation(workspaceId, async (userId: string) => {
    const members = await removeMember(workspaceId, userId);
    toast.success("Member removed from the workspace");
    return members;
  });
}
