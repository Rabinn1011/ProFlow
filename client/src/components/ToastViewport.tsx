import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { useToastStore, type ToastVariant } from "../store/toastStore";

const VARIANTS: Record<
  ToastVariant,
  { icon: typeof CheckCircle2; ring: string; iconColor: string }
> = {
  success: { icon: CheckCircle2, ring: "border-emerald-200", iconColor: "text-emerald-600" },
  error: { icon: AlertCircle, ring: "border-rose-200", iconColor: "text-rose-600" },
  info: { icon: Info, ring: "border-violet-200", iconColor: "text-violet-600" },
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
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border ${ring} animate-fade-in-up bg-white px-4 py-3 shadow-[0_16px_40px_-20px_rgba(15,23,42,0.4)]`}
          >
            <Icon size={18} className={`mt-0.5 shrink-0 ${iconColor}`} />
            <p className="min-w-0 flex-1 text-sm text-slate-800">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
              className="-mr-1 shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
