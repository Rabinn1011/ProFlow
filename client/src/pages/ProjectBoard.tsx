import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { useAuthStore } from "../store/authStore";
import { useWorkspace } from "../hooks/useWorkspaces";
import { useProjects } from "../hooks/useProjects";
import {
  useCreateTask,
  useDeleteTask,
  useMoveTask,
  useTasks,
  useUpdateTask,
} from "../hooks/useTasks";
import { useProjectRealtime } from "../hooks/useProjectRealtime";
import { useMembers } from "../hooks/useMembers";
import { getMyRole, hasAtLeastRole } from "../lib/workspaceRole";
import type { Task, TaskStatus } from "../services/task.service";
import { MessageSquare } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { BoardColumn } from "../components/BoardColumn";
import { TaskDetailPanel } from "../components/TaskDetailPanel";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { ChatPanel } from "../components/ChatPanel";

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "todo", label: "To Do" },
  { status: "in_progress", label: "In Progress" },
  { status: "done", label: "Done" },
];

const errorMessage = (error: unknown): string | undefined =>
  error instanceof Error ? error.message : undefined;

const POSITION_GAP = 1000;

// Positions are sparse numbers, so a drop only needs a value between its new neighbours.
// `ordered` must already exclude the task being moved.
function computePosition(ordered: Task[], destinationIndex: number): number {
  const before = ordered[destinationIndex - 1];
  const after = ordered[destinationIndex];

  if (!before && !after) return Date.now();
  if (!before) return after.position - POSITION_GAP;
  if (!after) return before.position + POSITION_GAP;
  return (before.position + after.position) / 2;
}

export default function ProjectBoard() {
  const { workspaceId = "", projectId = "" } = useParams<{
    workspaceId: string;
    projectId: string;
  }>();

  const user = useAuthStore((s) => s.user);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const workspaceQuery = useWorkspace(workspaceId);
  const projectsQuery = useProjects(workspaceId);
  const tasksQuery = useTasks(workspaceId, projectId);
  const membersQuery = useMembers(workspaceId);

  const createMutation = useCreateTask(workspaceId, projectId);
  const updateMutation = useUpdateTask(workspaceId, projectId);
  const deleteMutation = useDeleteTask(workspaceId, projectId);
  const moveMutation = useMoveTask(workspaceId, projectId);

  const { sendMessage } = useProjectRealtime(workspaceId, projectId);

  const role = workspaceQuery.data ? getMyRole(workspaceQuery.data, user?.id) : null;
  const canEdit = hasAtLeastRole(role, "member");

  const workspaceName = workspaceQuery.data?.name ?? "Workspace";
  const project = projectsQuery.data?.find((p) => p.id === projectId);
  const projectName = project?.name ?? "Project";

  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);
  const members = useMemo(() => membersQuery.data ?? [], [membersQuery.data]);

  // Cards only store an assignee id; this resolves it to a name for the avatar.
  const assigneeNames = useMemo(
    () => new Map(members.map((member) => [member.userId, member.name])),
    [members],
  );

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

  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    const sameSpot =
      source.droppableId === destination.droppableId && source.index === destination.index;
    if (sameSpot) return;

    const status = destination.droppableId as TaskStatus;
    const withoutMoved = tasks
      .filter((task) => task.status === status && task.id !== draggableId)
      .sort((a, b) => a.position - b.position);

    moveMutation.mutate({
      taskId: draggableId,
      status,
      position: computePosition(withoutMoved, destination.index),
    });
  };

  return (
    <AppShell
      title={projectName}
      crumbs={[
        { label: "Workspaces", to: "/app" },
        { label: workspaceName, to: `/app/workspaces/${workspaceId}` },
        { label: projectName },
      ]}
      actions={
        <button
          type="button"
          onClick={() => setIsChatOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:text-violet-700"
        >
          <MessageSquare size={16} />
          Chat
        </button>
      }
    >
      <>
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
        {moveMutation.isError && (
          <div className="animate-fade-in rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorMessage(moveMutation.error) ?? "Failed to move task"} — the card was put back.
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
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid items-start gap-4 md:grid-cols-3">
              {columns.map((column) => (
                <BoardColumn
                  key={column.status}
                  label={column.label}
                  status={column.status}
                  tasks={column.tasks}
                  assigneeNames={assigneeNames}
                  canEdit={canEdit}
                  isCreating={createMutation.isPending}
                  onSelectTask={(task) => setSelectedTaskId(task.id)}
                  onCreateTask={handleCreate}
                />
              ))}
            </div>
          </DragDropContext>
        )}
      </>

      {selectedTask && (
        <TaskDetailPanel
          key={selectedTask.id}
          task={selectedTask}
          members={members}
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

      {isChatOpen && (
        <ChatPanel
          workspaceId={workspaceId}
          projectId={projectId}
          onClose={() => setIsChatOpen(false)}
          onSend={sendMessage}
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
    </AppShell>
  );
}
