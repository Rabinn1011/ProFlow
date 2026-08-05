import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useWorkspace } from "../hooks/useWorkspaces";
import { useProjects } from "../hooks/useProjects";
import { useCreateTask, useDeleteTask, useTasks, useUpdateTask } from "../hooks/useTasks";
import { getMyRole, hasAtLeastRole } from "../lib/workspaceRole";
import type { Task, TaskStatus } from "../services/task.service";
import { AppHeader } from "../components/AppHeader";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { BoardColumn } from "../components/BoardColumn";
import { TaskDetailPanel } from "../components/TaskDetailPanel";
import { ConfirmDialog } from "../components/ConfirmDialog";

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "todo", label: "To Do" },
  { status: "in_progress", label: "In Progress" },
  { status: "done", label: "Done" },
];

const errorMessage = (error: unknown): string | undefined =>
  error instanceof Error ? error.message : undefined;

export default function ProjectBoard() {
  const { workspaceId = "", projectId = "" } = useParams<{
    workspaceId: string;
    projectId: string;
  }>();

  const user = useAuthStore((s) => s.user);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const workspaceQuery = useWorkspace(workspaceId);
  const projectsQuery = useProjects(workspaceId);
  const tasksQuery = useTasks(workspaceId, projectId);

  const createMutation = useCreateTask(workspaceId, projectId);
  const updateMutation = useUpdateTask(workspaceId, projectId);
  const deleteMutation = useDeleteTask(workspaceId, projectId);

  const role = workspaceQuery.data ? getMyRole(workspaceQuery.data, user?.id) : null;
  const canEdit = hasAtLeastRole(role, "member");

  const workspaceName = workspaceQuery.data?.name ?? "Workspace";
  const project = projectsQuery.data?.find((p) => p.id === projectId);
  const projectName = project?.name ?? "Project";

  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);

  // Grouped from the same source the panel reads, so an edit updates both at once.
  const columns = useMemo(
    () =>
      COLUMNS.map((column) => ({
        ...column,
        tasks: tasks
          .filter((task) => task.status === column.status)
          .sort((a, b) => a.position - b.position),
      })),
    [tasks],
  );

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;

  const closePanel = () => {
    setSelectedTaskId(null);
    setIsConfirmingDelete(false);
    updateMutation.reset();
    deleteMutation.reset();
  };

  const handleCreate = (title: string, status: TaskStatus) => {
    createMutation.mutate({ title, status });
  };

  const handleDelete = (task: Task) => {
    deleteMutation.mutate(task.id, { onSuccess: closePanel });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <AppHeader>
        <Breadcrumbs
          items={[
            { label: "Workspaces", to: "/app" },
            { label: workspaceName, to: `/app/workspaces/${workspaceId}` },
            { label: projectName },
          ]}
        />
        <h1 className="mt-1 truncate text-xl font-semibold tracking-tight text-slate-900">
          {projectName}
        </h1>
      </AppHeader>

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-8">
        {tasksQuery.isError && (
          <div className="animate-fade-in rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorMessage(tasksQuery.error) ?? "Failed to load tasks"}
          </div>
        )}
        {createMutation.isError && (
          <div className="animate-fade-in rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorMessage(createMutation.error)}
          </div>
        )}

        {tasksQuery.isPending ? (
          <div className="grid gap-4 md:grid-cols-3">
            {COLUMNS.map((column) => (
              <div
                key={column.status}
                className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-slate-100"
              />
            ))}
          </div>
        ) : (
          <div className="grid items-start gap-4 md:grid-cols-3">
            {columns.map((column) => (
              <BoardColumn
                key={column.status}
                label={column.label}
                status={column.status}
                tasks={column.tasks}
                canEdit={canEdit}
                isCreating={createMutation.isPending}
                onSelectTask={(task) => setSelectedTaskId(task.id)}
                onCreateTask={handleCreate}
              />
            ))}
          </div>
        )}
      </main>

      {selectedTask && (
        <TaskDetailPanel
          key={selectedTask.id}
          task={selectedTask}
          canEdit={canEdit}
          isSaving={updateMutation.isPending}
          isDeleting={deleteMutation.isPending}
          error={errorMessage(updateMutation.error) ?? errorMessage(deleteMutation.error)}
          onClose={closePanel}
          onSave={(input) =>
            updateMutation.mutate({ taskId: selectedTask.id, ...input }, { onSuccess: closePanel })
          }
          onDelete={() => setIsConfirmingDelete(true)}
        />
      )}

      {selectedTask && isConfirmingDelete && (
        <ConfirmDialog
          title={`Delete "${selectedTask.title}"?`}
          description="This permanently removes the task. This cannot be undone."
          confirmLabel="Delete task"
          pendingLabel="Deleting..."
          isPending={deleteMutation.isPending}
          error={errorMessage(deleteMutation.error)}
          onClose={() => setIsConfirmingDelete(false)}
          onConfirm={() => handleDelete(selectedTask)}
        />
      )}
    </div>
  );
}
