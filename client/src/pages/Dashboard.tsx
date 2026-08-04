import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { API_BASE_URL } from "../services/api";
import { useSocket } from "../hooks/useSocket";
import { useAuthStore } from "../store/authStore";
import { AppHeader } from "../components/AppHeader";
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

  const socketUrl = useMemo(() => API_BASE_URL.replace(/\/api\/?$/, ""), []);
  const socket = useSocket(socketUrl);

  const workspacesQuery = useWorkspaces();
  const createMutation = useCreateWorkspace();
  const renameMutation = useRenameWorkspace();
  const deleteMutation = useDeleteWorkspace();

  useEffect(() => {
    const onTaskMoved = () => {
      // placeholder: later we'll update react-query caches for kanban
    };
    socket.on("task:moved", onTaskMoved);
    return () => {
      socket.off("task:moved", onTaskMoved);
    };
  }, [socket]);

  const closeDialog = () => {
    setDialog(null);
    createMutation.reset();
    renameMutation.reset();
    deleteMutation.reset();
  };

  const workspaces = workspacesQuery.data ?? [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <AppHeader>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">{user ? `Signed in as ${user.email}` : ""}</p>
      </AppHeader>

      <main className="mx-auto max-w-5xl space-y-4 px-4 py-8">
        {workspacesQuery.isError && (
          <div className="animate-fade-in rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorMessage(workspacesQuery.error) ?? "Failed to load workspaces"}
          </div>
        )}

        <section className="animate-fade-in-up rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">Workspaces</h2>
            <button
              type="button"
              onClick={() => setDialog({ mode: "create" })}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 active:scale-[0.98]"
            >
              <Plus size={16} />
              New workspace
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {workspacesQuery.isPending &&
              [0, 1].map((key) => (
                <div key={key} className="h-24 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
              ))}

            {!workspacesQuery.isPending &&
              workspaces.map((workspace) => {
                const role = getMyRole(workspace, user?.id);
                const canRename = hasAtLeastRole(role, "admin");
                const canDelete = role === "owner";

                return (
                  <div
                    key={workspace.id}
                    className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Link to={`/app/workspaces/${workspace.id}`} className="min-w-0">
                        <div className="truncate text-base font-semibold text-slate-900">{workspace.name}</div>
                        <div className="mt-1 text-xs text-slate-400">
                          {workspace.members.length} member{workspace.members.length === 1 ? "" : "s"}
                        </div>
                      </Link>
                      {role && (
                        <span className="shrink-0 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700">
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
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-violet-300 hover:text-violet-700"
                          >
                            <Pencil size={14} />
                            Rename
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => setDialog({ mode: "delete", workspace })}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-rose-300 hover:text-rose-700"
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
              <div className="text-sm text-slate-500">
                No workspaces yet. Create your first one to get started.
              </div>
            )}
          </div>
        </section>
      </main>

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
    </div>
  );
}
