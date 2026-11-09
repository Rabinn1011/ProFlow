import { useState } from "react";
import { Plus } from "lucide-react";
import { Draggable, Droppable } from "@hello-pangea/dnd";
import type { Task, TaskStatus } from "../services/task.service";
import { TaskCard } from "./TaskCard";

type BoardColumnProps = {
  label: string;
  status: TaskStatus;
  tasks: Task[];
  assigneeNames: Map<string, string>;
  canEdit: boolean;
  isCreating: boolean;
  onSelectTask: (task: Task) => void;
  onCreateTask: (title: string, status: TaskStatus) => void;
};

export function BoardColumn({
  label,
  status,
  tasks,
  assigneeNames,
  canEdit,
  isCreating,
  onSelectTask,
  onCreateTask,
}: BoardColumnProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;

    onCreateTask(trimmed, status);
    setTitle("");
    setIsAdding(false);
  };

  return (
    <section className="flex flex-col rounded-2xl border border-line bg-sunken/60 p-3">
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-muted">{label}</h2>
        <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-ink-muted">
          {tasks.length}
        </span>
      </div>

      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`min-h-[3rem] space-y-2 rounded-xl transition ${
              snapshot.isDraggingOver ? "bg-ink/5" : ""
            }`}
          >
            {tasks.map((task, index) => (
              <Draggable
                key={task.id}
                draggableId={task.id}
                index={index}
                isDragDisabled={!canEdit}
              >
                {(dragProvided, dragSnapshot) => (
                  <TaskCard
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    dragHandleProps={dragProvided.dragHandleProps}
                    isDragging={dragSnapshot.isDragging}
                    task={task}
                    assigneeName={
                      task.assigneeId ? assigneeNames.get(task.assigneeId) : undefined
                    }
                    onClick={() => onSelectTask(task)}
                  />
                )}
              </Draggable>
            ))}
            {provided.placeholder}

            {tasks.length === 0 && !isAdding && !snapshot.isDraggingOver && (
              <p className="px-1 py-3 text-xs text-ink-faint">Nothing here yet.</p>
            )}
          </div>
        )}
      </Droppable>

      {canEdit && (
        <div className="mt-2">
          {isAdding ? (
            <div className="rounded-xl border border-line-strong bg-surface p-2 shadow-sm">
              <textarea
                autoFocus
                rows={2}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    submit();
                  }
                  if (event.key === "Escape") {
                    setTitle("");
                    setIsAdding(false);
                  }
                }}
                placeholder="What needs doing?"
                className="w-full resize-none rounded-lg border border-line px-2 py-1.5 text-sm text-ink placeholder:text-ink-faint outline-none focus:border-ink"
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTitle("");
                    setIsAdding(false);
                  }}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink-muted transition hover:text-ink-soft"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={isCreating || !title.trim()}
                  className="rounded-full bg-ink px-2.5 py-1.5 text-xs font-semibold text-canvas transition hover:bg-ink-hover disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isCreating ? "Adding..." : "Add task"}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="inline-flex w-full items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium text-ink-muted transition hover:bg-surface hover:text-ink"
            >
              <Plus size={16} />
              Add task
            </button>
          )}
        </div>
      )}
    </section>
  );
}
