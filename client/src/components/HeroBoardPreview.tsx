import { Check } from "lucide-react";

// A static picture of the product for the landing page, with illustrative data.
// Decorative: hidden from assistive tech. The floating cards need room, so phones get
// just the board.
const COLUMNS = [
  {
    label: "To do",
    tasks: [
      { title: "Draft launch checklist", due: "Nov 18", who: "AK" },
      { title: "Review pricing copy", who: "MJ" },
    ],
  },
  {
    label: "In progress",
    tasks: [
      { title: "Homepage redesign", due: "Nov 14", who: "RS" },
      { title: "Invite flow QA", who: "AK" },
    ],
  },
  {
    label: "Done",
    tasks: [
      { title: "Set up workspace roles", who: "RS" },
      { title: "Import backlog", who: "MJ" },
    ],
  },
];

const ACTIVITY = [
  { text: "Maya moved Homepage redesign", done: true },
  { text: "Arun added Invite flow QA", done: true },
  { text: "Sam is editing Pricing copy", done: false },
];

const WEEK = [38, 52, 30, 66, 48, 58, 92];

export function HeroBoardPreview() {
  return (
    <div className="relative mx-auto w-full max-w-xl sm:pb-[5.5rem] sm:pr-4" aria-hidden="true">
      <div className="rounded-2xl border border-line bg-surface p-3 shadow-[0_30px_60px_-36px_rgba(17,17,17,0.35)] sm:p-4">
        <div className="mb-3 flex items-center justify-between px-1">
          <span className="text-sm font-semibold tracking-tight text-ink">Website relaunch</span>
          <span className="rounded-full bg-sunken px-2 py-0.5 text-[10px] font-medium text-ink-muted">
            3 online
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {COLUMNS.map((column) => (
            <div key={column.label} className="rounded-xl bg-sunken/60 p-2">
              <div className="mb-2 truncate px-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                {column.label}
              </div>
              <div className="space-y-1.5">
                {column.tasks.map((task) => (
                  <div key={task.title} className="rounded-lg border border-line bg-surface p-2">
                    <div className="text-[11px] font-medium leading-snug text-ink">{task.title}</div>
                    <div className="mt-1.5 flex items-center justify-between gap-1">
                      <span className="truncate text-[10px] text-ink-faint">{task.due ?? ""}</span>
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-ink text-[7px] font-bold text-canvas">
                        {task.who}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute -left-6 bottom-0 hidden w-64 rounded-xl border border-line bg-surface p-3 shadow-[0_20px_40px_-24px_rgba(17,17,17,0.4)] sm:block">
        <div className="mb-2 text-xs font-semibold text-ink">Live on this board</div>
        <ul className="space-y-1.5">
          {ACTIVITY.map((item) => (
            <li key={item.text} className="flex items-center gap-2 text-[11px] text-ink-muted">
              <span
                className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full ${
                  item.done ? "bg-ink text-canvas" : "border border-line-strong"
                }`}
              >
                {item.done && <Check size={9} strokeWidth={3} />}
              </span>
              <span className="truncate">{item.text}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="absolute bottom-0 right-0 hidden w-36 rounded-xl border border-line bg-surface p-3 shadow-[0_20px_40px_-24px_rgba(17,17,17,0.4)] sm:block">
        <div className="text-[10px] font-medium text-ink-muted">Done this week</div>
        <div className="mt-0.5 text-xl font-semibold tracking-tight text-ink">24</div>
        <div className="mt-2 flex h-7 items-end gap-1">
          {WEEK.map((height, index) => (
            <span
              key={index}
              className={`flex-1 rounded-sm ${index === WEEK.length - 1 ? "bg-ink" : "bg-sunken"}`}
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
