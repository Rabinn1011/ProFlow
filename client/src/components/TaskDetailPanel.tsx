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
      <div className="absolute inset-0 animate-fade-in bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Task details"
        className="relative flex h-full w-full max-w-md animate-fade-in-up flex-col border-l border-slate-200 bg-white shadow-xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">Task</h2>
            <p className="mt-1 text-xs text-slate-400">
              Created {new Date(task.createdAt).toLocaleDateString()}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </header>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            <div>
              <label htmlFor="task-title" className="mb-2 block text-sm font-medium text-slate-700">
                Title
              </label>
              <input
                id="task-title"
                type="text"
                disabled={!canEdit}
                className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:bg-slate-50 disabled:text-slate-500 ${
                  errors.title ? "border-rose-400" : "border-slate-300"
                }`}
                {...register("title", {
                  required: "Title is required",
                  validate: (value) => value.trim().length > 0 || "Title is required",
                })}
              />
              {errors.title && <p className="mt-1 text-xs text-rose-600">{errors.title.message}</p>}
            </div>

            <div>
              <label
                htmlFor="task-description"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Description
              </label>
              <textarea
                id="task-description"
                rows={5}
                disabled={!canEdit}
                placeholder="Add more detail..."
                className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                {...register("description")}
              />
            </div>

            <div>
              <label htmlFor="task-status" className="mb-2 block text-sm font-medium text-slate-700">
                Status
              </label>
              <select
                id="task-status"
                disabled={!canEdit}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:bg-slate-50 disabled:text-slate-500"
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
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Assignee
              </label>
              <select
                id="task-assignee"
                disabled={!canEdit}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                {...register("assigneeId")}
              >
                <option value="">Unassigned</option>
                {members.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-400">
                Only workspace members can be assigned.
              </p>
            </div>

            <div>
              <label htmlFor="task-due" className="mb-2 block text-sm font-medium text-slate-700">
                Due date
              </label>
              <input
                id="task-due"
                type="date"
                disabled={!canEdit}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                {...register("dueDate")}
              />
            </div>

            {error && (
              <div className="animate-fade-in rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </div>
            )}
          </div>

          {canEdit && (
            <footer className="flex items-center justify-between gap-2 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                onClick={onDelete}
                disabled={isDeleting || isSaving}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-rose-300 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Trash2 size={16} />
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
              <button
                type="submit"
                disabled={isSaving || isDeleting || !isDirty}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
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
