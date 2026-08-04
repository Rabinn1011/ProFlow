import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { useWorkspace } from "../hooks/useWorkspaces";
import {
  useCreateProject,
  useDeleteProject,
  useProjects,
  useUpdateProject,
} from "../hooks/useProjects";
import { getMyRole, hasAtLeastRole } from "../lib/workspaceRole";
import type { Project } from "../services/project.service";
import { AppHeader } from "../components/AppHeader";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { ProjectFormModal } from "../components/ProjectFormModal";
import { ConfirmDialog } from "../components/ConfirmDialog";

type DialogState =
  | { mode: "create" }
  | { mode: "edit"; project: Project }
  | { mode: "delete"; project: Project }
  | null;

const errorMessage = (error: unknown): string | undefined =>
  error instanceof Error ? error.message : undefined;

export default function WorkspaceProjects() {
  const { workspaceId = "" } = useParams<{ workspaceId: string }>();
  const user = useAuthStore((s) => s.user);
  const [dialog, setDialog] = useState<DialogState>(null);

  const workspaceQuery = useWorkspace(workspaceId);
  const projectsQuery = useProjects(workspaceId);
  const createMutation = useCreateProject(workspaceId);
  const updateMutation = useUpdateProject(workspaceId);
  const deleteMutation = useDeleteProject(workspaceId);

  const role = workspaceQuery.data ? getMyRole(workspaceQuery.data, user?.id) : null;
  const canEdit = hasAtLeastRole(role, "member");
  const canDelete = hasAtLeastRole(role, "admin");

  const closeDialog = () => {
    setDialog(null);
    createMutation.reset();
    updateMutation.reset();
    deleteMutation.reset();
  };

  const projects = projectsQuery.data ?? [];
  const workspaceName = workspaceQuery.data?.name ?? "Workspace";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <AppHeader>
        <Breadcrumbs items={[{ label: "Workspaces", to: "/app" }, { label: workspaceName }]} />
        <h1 className="mt-1 truncate text-xl font-semibold tracking-tight text-slate-900">
          {workspaceName}
        </h1>
      </AppHeader>

      <main className="mx-auto max-w-5xl space-y-4 px-4 py-8">
        {workspaceQuery.isError && (
          <div className="animate-fade-in rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorMessage(workspaceQuery.error) ?? "Failed to load workspace"}
          </div>
        )}
        {projectsQuery.isError && (
          <div className="animate-fade-in rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorMessage(projectsQuery.error) ?? "Failed to load projects"}
          </div>
        )}

        <section className="animate-fade-in-up rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">Projects</h2>
            {canEdit && (
              <button
                type="button"
                onClick={() => setDialog({ mode: "create" })}
                className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 active:scale-[0.98]"
              >
                <Plus size={16} />
                New project
              </button>
            )}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {projectsQuery.isPending &&
              [0, 1].map((key) => (
                <div key={key} className="h-24 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
              ))}

            {!projectsQuery.isPending &&
              projects.map((project) => (
                <div
                  key={project.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md"
                >
                  <Link
                    to={`/app/workspaces/${workspaceId}/projects/${project.id}`}
                    className="block min-w-0"
                  >
                    <div className="truncate text-base font-semibold text-slate-900">{project.name}</div>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                      {project.description ?? "No description"}
                    </p>
                  </Link>

                  {(canEdit || canDelete) && (
                    <div className="mt-3 flex gap-2">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => setDialog({ mode: "edit", project })}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-violet-300 hover:text-violet-700"
                        >
                          <Pencil size={14} />
                          Edit
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => setDialog({ mode: "delete", project })}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-rose-300 hover:text-rose-700"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}

            {!projectsQuery.isPending && !projectsQuery.isError && projects.length === 0 && (
              <div className="text-sm text-slate-500">
                {canEdit
                  ? "No projects yet. Create your first one to get started."
                  : "No projects in this workspace yet."}
              </div>
            )}
          </div>
        </section>
      </main>

      {dialog?.mode === "create" && (
        <ProjectFormModal
          title="New project"
          description="Projects hold the Kanban board and its tasks."
          submitLabel="Create project"
          pendingLabel="Creating..."
          isPending={createMutation.isPending}
          error={errorMessage(createMutation.error)}
          onClose={closeDialog}
          onSubmit={(values) => createMutation.mutate(values, { onSuccess: closeDialog })}
        />
      )}

      {dialog?.mode === "edit" && (
        <ProjectFormModal
          title="Edit project"
          submitLabel="Save changes"
          pendingLabel="Saving..."
          defaultValues={{ name: dialog.project.name, description: dialog.project.description }}
          isPending={updateMutation.isPending}
          error={errorMessage(updateMutation.error)}
          onClose={closeDialog}
          onSubmit={(values) =>
            updateMutation.mutate(
              { projectId: dialog.project.id, ...values },
              { onSuccess: closeDialog },
            )
          }
        />
      )}

      {dialog?.mode === "delete" && (
        <ConfirmDialog
          title={`Delete "${dialog.project.name}"?`}
          description="This permanently removes the project and all of its tasks. This cannot be undone."
          confirmLabel="Delete project"
          pendingLabel="Deleting..."
          isPending={deleteMutation.isPending}
          error={errorMessage(deleteMutation.error)}
          onClose={closeDialog}
          onConfirm={() => deleteMutation.mutate(dialog.project.id, { onSuccess: closeDialog })}
        />
      )}
    </div>
  );
}
