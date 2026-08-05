import { CalendarDays } from "lucide-react";
import type { Task } from "../services/task.service";
import { formatDueDate, isOverdue } from "../lib/taskDate";

type TaskCardProps = {
  task: Task;
  onClick: () => void;
};

export function TaskCard({ task, onClick }: TaskCardProps) {
  const overdue = isOverdue(task.dueDate, task.status);

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
    >
      <div className="text-sm font-medium text-slate-900">{task.title}</div>

      {task.dueDate && (
        <span
          className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
            overdue ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"
          }`}
        >
          <CalendarDays size={12} />
          {formatDueDate(task.dueDate)}
        </span>
      )}
    </button>
  );
}
