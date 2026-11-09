import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Trash2, X } from "lucide-react";
import type { Task, TaskInput, TaskStatus } from "../services/task.service";
import type { Member } from "../services/member.service";
import { fromDateInputValue, toDateInputValue } from "../lib/taskDate";

type TaskFormValues = {
  title: string;
  description: string;
  status: TaskStatus;
  dueDate: string;
  assigneeId: string;
};

type TaskDetailPanelProps = {
  task: Task;
  members: Member[];
  canEdit: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  error?: string;
  onClose: () => void;
  onSave: (input: TaskInput) => void;
  onDelete: () => void;
};

export function TaskDetailPanel({
  task,
  members,
  canEdit,
  isSaving,
  isDeleting,
  error,
  onClose,
  onSave,
  onDelete,
}: TaskDetailPanelProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<TaskFormValues>({
    mode: "onBlur",
    defaultValues: {
      title: task.title,
      description: task.description ?? "",
      status: task.status,
      dueDate: toDateInputValue(task.dueDate),
      // "" is the unassigned option; the API wants null for that.
      assigneeId: task.assigneeId ?? "",
    },
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const submit = handleSubmit((values) =>
    onSave({
      title: values.title.trim(),
      description: values.description.trim() ? values.description.trim() : null,
      status: values.status,
      dueDate: fromDateInputValue(values.dueDate),
      assigneeId: values.assigneeId || null,
    }),
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 animate-fade-in bg-ink/40 backdrop-blur-sm" onClick={onClose} />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Task details"
        className="relative flex h-full w-full max-w-md animate-fade-in-up flex-col border-l border-line bg-surface shadow-xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-muted">Task</h2>
            <p className="mt-1 text-xs text-ink-faint">
              Created {new Date(task.createdAt).toLocaleDateString()}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="rounded-lg p-1.5 text-ink-faint transition hover:bg-sunken hover:text-ink-soft"
          >
            <X size={18} />
          </button>
        </header>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            <div>
              <label htmlFor="task-title" className="mb-2 block text-sm font-medium text-ink-soft">
                Title
              </label>
              <input
                id="task-title"
                type="text"
                disabled={!canEdit}
                className={`w-full rounded-lg border bg-surface px-3 py-2.5 text-sm text-ink outline-none transition focus:border-ink focus:ring-2 focus:ring-ink/10 disabled:bg-canvas disabled:text-ink-muted ${
                  errors.title ? "border-danger" : "border-line-strong"
                }`}
                {...register("title", {
                  required: "Title is required",
                  validate: (value) => value.trim().length > 0 || "Title is required",
                })}
              />
              {errors.title && <p className="mt-1 text-xs text-danger">{errors.title.message}</p>}
            </div>

            <div>
              <label
                htmlFor="task-description"
                className="mb-2 block text-sm font-medium text-ink-soft"
              >
                Description
              </label>
              <textarea
                id="task-description"
                rows={5}
                disabled={!canEdit}
                placeholder="Add more detail..."
                className="w-full resize-none rounded-lg border border-line-strong bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint outline-none transition focus:border-ink focus:ring-2 focus:ring-ink/10 disabled:bg-canvas disabled:text-ink-muted"
                {...register("description")}
              />
            </div>

            <div>
              <label htmlFor="task-status" className="mb-2 block text-sm font-medium text-ink-soft">
                Status
              </label>
              <select
                id="task-status"
                disabled={!canEdit}
                className="w-full rounded-lg border border-line-strong bg-surface px-3 py-2.5 text-sm text-ink outline-none transition focus:border-ink focus:ring-2 focus:ring-ink/10 disabled:bg-canvas disabled:text-ink-muted"
                {...register("status")}
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="task-assignee"
                className="mb-2 block text-sm font-medium text-ink-soft"
              >
                Assignee
              </label>
              <select
                id="task-assignee"
                disabled={!canEdit}
                className="w-full rounded-lg border border-line-strong bg-surface px-3 py-2.5 text-sm text-ink outline-none transition focus:border-ink focus:ring-2 focus:ring-ink/10 disabled:bg-canvas disabled:text-ink-muted"
                {...register("assigneeId")}
              >
                <option value="">Unassigned</option>
                {members.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-ink-faint">
                Only workspace members can be assigned.
              </p>
            </div>

            <div>
              <label htmlFor="task-due" className="mb-2 block text-sm font-medium text-ink-soft">
                Due date
              </label>
              <input
                id="task-due"
                type="date"
                disabled={!canEdit}
                className="w-full rounded-lg border border-line-strong bg-surface px-3 py-2.5 text-sm text-ink outline-none transition focus:border-ink focus:ring-2 focus:ring-ink/10 disabled:bg-canvas disabled:text-ink-muted"
                {...register("dueDate")}
              />
            </div>

            {error && (
              <div className="animate-fade-in rounded-lg border border-danger-line bg-danger-soft px-3 py-2 text-sm text-danger">
                {error}
              </div>
            )}
          </div>

          {canEdit && (
            <footer className="flex items-center justify-between gap-2 border-t border-line px-5 py-4">
              <button
                type="button"
                onClick={onDelete}
                disabled={isDeleting || isSaving}
                className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 py-2 text-sm font-semibold text-ink-soft transition hover:border-danger-line hover:text-danger disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Trash2 size={16} />
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
              <button
                type="submit"
                disabled={isSaving || isDeleting || !isDirty}
                className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-canvas shadow-sm transition hover:bg-ink-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSaving ? "Saving..." : "Save changes"}
              </button>
            </footer>
          )}
        </form>
      </aside>
    </div>
  );
}
