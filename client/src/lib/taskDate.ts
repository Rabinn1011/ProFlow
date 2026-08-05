// Tasks store dueDate as an ISO string (or null). <input type="date"> wants yyyy-MM-dd,
// so both directions need a conversion — and both need to stay in local time, otherwise
// a date picked in the evening can land on the previous day.

export function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function fromDateInputValue(value: string): string | null {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day).toISOString();
}

export function formatDueDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function isOverdue(iso: string | null, status: string): boolean {
  if (!iso || status === "done") return false;

  const due = new Date(iso);
  if (Number.isNaN(due.getTime())) return false;

  const endOfDueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate(), 23, 59, 59, 999);
  return endOfDueDay.getTime() < Date.now();
}
