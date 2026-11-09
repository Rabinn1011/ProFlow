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
      className={`w-full rounded-xl border bg-surface p-3 text-left shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
        isDragging
          ? "border-ink shadow-lg"
          : "border-line hover:-translate-y-0.5 hover:border-ink/30 hover:shadow-md"
      }`}
    >
      <div className="text-sm font-medium text-ink">{task.title}</div>

      {(task.dueDate || assigneeName) && (
        <div className="mt-2 flex items-center justify-between gap-2">
          {task.dueDate ? (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                overdue ? "bg-danger-soft text-danger" : "bg-sunken text-ink-muted"
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
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sunken text-[10px] font-bold text-ink"
            >
              {initials(assigneeName)}
            </span>
          )}
        </div>
      )}
    </div>
  );
});
