import { useState } from "react";
import { useForm } from "react-hook-form";
import { UserMinus, UserPlus } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { useAddMember, useMembers, useRemoveMember, useUpdateMemberRole } from "../hooks/useMembers";
import type { WorkspaceRole } from "../services/workspace.service";
import type { Member } from "../services/member.service";
import { ConfirmDialog } from "./ConfirmDialog";

const ROLES: WorkspaceRole[] = ["owner", "admin", "member", "viewer"];

const roleRank: Record<WorkspaceRole, number> = { owner: 4, admin: 3, member: 2, viewer: 1 };

type InviteFormValues = {
  email: string;
  role: WorkspaceRole;
};

const errorMessage = (error: unknown): string | undefined =>
  error instanceof Error ? error.message : undefined;

export function MembersPanel({
  workspaceId,
  myRole,
}: {
  workspaceId: string;
  myRole: WorkspaceRole | null;
}) {
  const user = useAuthStore((s) => s.user);
  const [pendingRemoval, setPendingRemoval] = useState<Member | null>(null);

  const membersQuery = useMembers(workspaceId);
  const addMutation = useAddMember(workspaceId);
  const roleMutation = useUpdateMemberRole(workspaceId);
  const removeMutation = useRemoveMember(workspaceId);

  const canManage = myRole === "owner" || myRole === "admin";
  const ownerCount = (membersQuery.data ?? []).filter((m) => m.role === "owner").length;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteFormValues>({
    mode: "onBlur",
    defaultValues: { email: "", role: "member" },
  });

  // Mirrors server/src/lib/workspaceRoles.ts — owners manage anyone, everyone else only
  // manages ranks strictly below their own.
  const canManageMember = (target: Member): boolean => {
    if (!myRole || !canManage) return false;
    return myRole === "owner" || roleRank[target.role] < roleRank[myRole];
  };

  const isLastOwner = (target: Member): boolean => target.role === "owner" && ownerCount === 1;

  const members = membersQuery.data ?? [];

  return (
    <section className="animate-fade-in-up rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">Members</h2>

      {membersQuery.isError && (
        <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {errorMessage(membersQuery.error) ?? "Failed to load members"}
        </div>
      )}

      <ul className="mt-4 divide-y divide-slate-100">
        {membersQuery.isPending && (
          <li className="h-12 animate-pulse rounded-lg bg-slate-100" aria-hidden="true" />
        )}

        {members.map((member) => {
          const isSelf = member.userId === user?.id;
          const manageable = canManageMember(member);

          return (
            <li key={member.userId} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-slate-900">
                  {member.name}
                  {isSelf && <span className="ml-1.5 text-xs font-normal text-slate-400">(you)</span>}
                </div>
                <div className="truncate text-xs text-slate-500">{member.email}</div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {manageable ? (
                  <select
                    aria-label={`Role for ${member.name}`}
                    value={member.role}
                    disabled={roleMutation.isPending}
                    onChange={(event) =>
                      roleMutation.mutate({
                        userId: member.userId,
                        role: event.target.value as WorkspaceRole,
                      })
                    }
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:opacity-70"
                  >
                    {ROLES.filter((role) => roleRank[role] <= roleRank[myRole ?? "viewer"]).map(
                      (role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ),
                    )}
                  </select>
                ) : (
                  <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700">
                    {member.role}
                  </span>
                )}

                {manageable && !isLastOwner(member) && (
                  <button
                    type="button"
                    onClick={() => setPendingRemoval(member)}
                    aria-label={`Remove ${member.name}`}
                    className="rounded-lg border border-slate-300 bg-white p-1.5 text-slate-500 transition hover:border-rose-300 hover:text-rose-700"
                  >
                    <UserMinus size={14} />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {(roleMutation.isError || removeMutation.isError) && (
        <div className="mt-3 animate-fade-in rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {errorMessage(roleMutation.error) ?? errorMessage(removeMutation.error)}
        </div>
      )}

      {canManage && (
        <form
          onSubmit={handleSubmit((values) =>
            addMutation.mutate(
              { email: values.email.trim().toLowerCase(), role: values.role },
              { onSuccess: () => reset({ email: "", role: values.role }) },
            ),
          )}
          noValidate
          className="mt-5 border-t border-slate-100 pt-5"
        >
          <label htmlFor="invite-email" className="mb-2 block text-sm font-medium text-slate-700">
            Invite a teammate
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              id="invite-email"
              type="email"
              autoComplete="off"
              placeholder="teammate@company.com"
              className={`min-w-0 flex-1 rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 ${
                errors.email ? "border-rose-400" : "border-slate-300"
              }`}
              {...register("email", {
                required: "Email is required",
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: "Enter a valid email address",
                },
              })}
            />
            <select
              aria-label="Role for the new member"
              className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
              {...register("role")}
            >
              {ROLES.filter((role) => roleRank[role] <= roleRank[myRole ?? "viewer"]).map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={addMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
            >
              <UserPlus size={16} />
              {addMutation.isPending ? "Adding..." : "Add"}
            </button>
          </div>

          {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email.message}</p>}

          {addMutation.isError && (
            <div className="mt-3 animate-fade-in rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {errorMessage(addMutation.error)}
            </div>
          )}

          <p className="mt-2 text-xs text-slate-400">
            They need a ProFlow account already — invites by email are not sent yet.
          </p>
        </form>
      )}

      {pendingRemoval && (
        <ConfirmDialog
          title={`Remove ${pendingRemoval.name}?`}
          description="They lose access to this workspace and everything in it. Any tasks assigned to them become unassigned."
          confirmLabel="Remove member"
          pendingLabel="Removing..."
          isPending={removeMutation.isPending}
          error={errorMessage(removeMutation.error)}
          onClose={() => setPendingRemoval(null)}
          onConfirm={() =>
            removeMutation.mutate(pendingRemoval.userId, {
              onSuccess: () => setPendingRemoval(null),
            })
          }
        />
      )}
    </section>
  );
}
