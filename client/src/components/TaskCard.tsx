import { forwardRef } from "react";
import { CalendarDays } from "lucide-react";
import type { DraggableProvidedDragHandleProps } from "@hello-pangea/dnd";
import type { Task } from "../services/task.service";
import { formatDueDate, isOverdue } from "../lib/taskDate";
import { initials } from "../lib/initials";

type TaskCardProps = {
  task: Task;
  assigneeName?: string;
  isDragging?: boolean;
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
  onClick: () => void;
} & React.HTMLAttributes<HTMLDivElement>;

// A div rather than a button: the drag library owns mousedown on this element, and a
// nested native button fights it for the event. Keyboard access is restored by hand.
export const TaskCard = forwardRef<HTMLDivElement, TaskCardProps>(function TaskCard(
  { task, assigneeName, isDragging = false, dragHandleProps, onClick, ...rest },
  ref,
) {
  const overdue = isOverdue(task.dueDate, task.status);

  return (
    <div
      ref={ref}
      {...rest}
      {...dragHandleProps}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      className={`w-full rounded-xl border bg-white p-3 text-left shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 ${
        isDragging
          ? "border-violet-400 shadow-lg"
          : "border-slate-200 hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md"
      }`}
    >
      <div className="text-sm font-medium text-slate-900">{task.title}</div>

      {(task.dueDate || assigneeName) && (
        <div className="mt-2 flex items-center justify-between gap-2">
          {task.dueDate ? (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                overdue ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"
              }`}
            >
              <CalendarDays size={12} />
              {formatDueDate(task.dueDate)}
            </span>
          ) : (
            <span />
          )}

          {assigneeName && (
            <span
              title={assigneeName}
              aria-label={`Assigned to ${assigneeName}`}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700"
            >
              {initials(assigneeName)}
            </span>
          )}
        </div>
      )}
    </div>
  );
});
