import { Modal } from "./Modal";

type ConfirmDialogProps = {
  title: string;
  description: string;
  confirmLabel: string;
  pendingLabel: string;
  isPending: boolean;
  error?: string;
  onClose: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  pendingLabel,
  isPending,
  error,
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Modal title={title} description={description} onClose={onClose}>
      {error && (
        <div className="mb-4 animate-fade-in rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isPending}
          className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? pendingLabel : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
