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
        <div className="mb-4 animate-fade-in rounded-lg border border-danger-line bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="rounded-full border border-line-strong bg-surface px-4 py-2 text-sm font-semibold text-ink-soft transition hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-70"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isPending}
          className="rounded-full bg-danger px-4 py-2 text-sm font-semibold text-canvas shadow-sm transition hover:bg-danger-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? pendingLabel : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
