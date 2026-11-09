import { useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { AppShell } from "../components/AppShell";
import {
  useCreateWorkspace,
  useDeleteWorkspace,
  useRenameWorkspace,
  useWorkspaces,
} from "../hooks/useWorkspaces";
import { getMyRole, hasAtLeastRole } from "../lib/workspaceRole";
import type { Workspace } from "../services/workspace.service";
import { WorkspaceFormModal } from "../components/WorkspaceFormModal";
import { ConfirmDialog } from "../components/ConfirmDialog";

type DialogState =
  | { mode: "create" }
  | { mode: "rename"; workspace: Workspace }
  | { mode: "delete"; workspace: Workspace }
  | null;

const errorMessage = (error: unknown): string | undefined =>
  error instanceof Error ? error.message : undefined;

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const [dialog, setDialog] = useState<DialogState>(null);

  const workspacesQuery = useWorkspaces();
  const createMutation = useCreateWorkspace();
  const renameMutation = useRenameWorkspace();
  const deleteMutation = useDeleteWorkspace();

  const closeDialog = () => {
    setDialog(null);
    createMutation.reset();
    renameMutation.reset();
    deleteMutation.reset();
  };

  const workspaces = workspacesQuery.data ?? [];

  return (
    <AppShell
      title={user?.name ? `Welcome back, ${user.name.split(" ")[0]}` : "Dashboard"}
      subtitle={
        <p className="mt-1 text-sm text-ink-muted">
          {workspaces.length === 0
            ? "Create a workspace to get started."
            : `${workspaces.length} workspace${workspaces.length === 1 ? "" : "s"}`}
        </p>
      }
      actions={
        <button
          type="button"
          onClick={() => setDialog({ mode: "create" })}
          className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-2 text-sm font-semibold text-canvas shadow-sm transition hover:bg-ink-hover active:scale-[0.98]"
        >
          <Plus size={16} />
          New workspace
        </button>
      }
    >
      <>
        {workspacesQuery.isError && (
          <div className="animate-fade-in rounded-lg border border-danger-line bg-danger-soft px-3 py-2 text-sm text-danger">
            {errorMessage(workspacesQuery.error) ?? "Failed to load workspaces"}
          </div>
        )}

        <section className="animate-fade-in-up">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {workspacesQuery.isPending &&
              [0, 1].map((key) => (
                <div key={key} className="h-24 animate-pulse rounded-xl border border-line bg-sunken" />
              ))}

            {!workspacesQuery.isPending &&
              workspaces.map((workspace) => {
                const role = getMyRole(workspace, user?.id);
                const canRename = hasAtLeastRole(role, "admin");
                const canDelete = role === "owner";

                return (
                  <div
                    key={workspace.id}
                    className="group rounded-xl border border-line bg-surface p-4 transition hover:-translate-y-0.5 hover:border-ink/30 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Link to={`/app/workspaces/${workspace.id}`} className="min-w-0">
                        <div className="truncate text-base font-semibold text-ink">{workspace.name}</div>
                        <div className="mt-1 text-xs text-ink-faint">
                          {workspace.members.length} member{workspace.members.length === 1 ? "" : "s"}
                        </div>
                      </Link>
                      {role && (
                        <span className="shrink-0 rounded-full bg-sunken px-2 py-0.5 text-xs font-semibold text-ink">
                          {role}
                        </span>
                      )}
                    </div>

                    {(canRename || canDelete) && (
                      <div className="mt-3 flex gap-2">
                        {canRename && (
                          <button
                            type="button"
                            onClick={() => setDialog({ mode: "rename", workspace })}
                            className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink-soft transition hover:border-ink/30 hover:text-ink"
                          >
                            <Pencil size={14} />
                            Rename
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => setDialog({ mode: "delete", workspace })}
                            className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink-soft transition hover:border-danger-line hover:text-danger"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

            {!workspacesQuery.isPending && !workspacesQuery.isError && workspaces.length === 0 && (
              <button
                type="button"
                onClick={() => setDialog({ mode: "create" })}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong bg-surface p-8 text-sm text-ink-muted transition hover:border-ink/30 hover:text-ink sm:col-span-2 lg:col-span-3"
              >
                <Plus size={20} />
                Create your first workspace
              </button>
            )}
          </div>
        </section>
      </>

      {dialog?.mode === "create" && (
        <WorkspaceFormModal
          title="New workspace"
          description="Workspaces group your projects and teammates."
          submitLabel="Create workspace"
          pendingLabel="Creating..."
          isPending={createMutation.isPending}
          error={errorMessage(createMutation.error)}
          onClose={closeDialog}
          onSubmit={(name) => createMutation.mutate(name, { onSuccess: closeDialog })}
        />
      )}

      {dialog?.mode === "rename" && (
        <WorkspaceFormModal
          title="Rename workspace"
          submitLabel="Save changes"
          pendingLabel="Saving..."
          defaultName={dialog.workspace.name}
          isPending={renameMutation.isPending}
          error={errorMessage(renameMutation.error)}
          onClose={closeDialog}
          onSubmit={(name) =>
            renameMutation.mutate({ id: dialog.workspace.id, name }, { onSuccess: closeDialog })
          }
        />
      )}

      {dialog?.mode === "delete" && (
        <ConfirmDialog
          title={`Delete "${dialog.workspace.name}"?`}
          description="This permanently removes the workspace and everything inside it. This cannot be undone."
          confirmLabel="Delete workspace"
          pendingLabel="Deleting..."
          isPending={deleteMutation.isPending}
          error={errorMessage(deleteMutation.error)}
          onClose={closeDialog}
          onConfirm={() => deleteMutation.mutate(dialog.workspace.id, { onSuccess: closeDialog })}
        />
      )}
    </AppShell>
  );
}
