import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { useToastStore, type ToastVariant } from "../store/toastStore";

const VARIANTS: Record<
  ToastVariant,
  { icon: typeof CheckCircle2; ring: string; iconColor: string }
> = {
  success: { icon: CheckCircle2, ring: "border-success-line", iconColor: "text-success" },
  error: { icon: AlertCircle, ring: "border-danger-line", iconColor: "text-danger" },
  info: { icon: Info, ring: "border-line-strong", iconColor: "text-ink" },
};

export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    // aria-live so screen readers announce results that are otherwise only visual.
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0"
    >
      {toasts.map((toast) => {
        const { icon: Icon, ring, iconColor } = VARIANTS[toast.variant];

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border ${ring} animate-fade-in-up bg-surface px-4 py-3 shadow-[0_16px_40px_-20px_rgba(17,17,17,0.28)]`}
          >
            <Icon size={18} className={`mt-0.5 shrink-0 ${iconColor}`} />
            <p className="min-w-0 flex-1 text-sm text-ink-soft">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
              className="-mr-1 shrink-0 rounded-md p-1 text-ink-faint transition hover:bg-sunken hover:text-ink-soft"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
