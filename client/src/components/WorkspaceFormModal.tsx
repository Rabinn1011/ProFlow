import { useForm } from "react-hook-form";
import { Modal } from "./Modal";

type WorkspaceFormValues = {
  name: string;
};

type WorkspaceFormModalProps = {
  title: string;
  description?: string;
  submitLabel: string;
  pendingLabel: string;
  defaultName?: string;
  isPending: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (name: string) => void;
};

export function WorkspaceFormModal({
  title,
  description,
  submitLabel,
  pendingLabel,
  defaultName = "",
  isPending,
  error,
  onClose,
  onSubmit,
}: WorkspaceFormModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WorkspaceFormValues>({
    mode: "onBlur",
    defaultValues: { name: defaultName },
  });

  return (
    <Modal title={title} description={description} onClose={onClose}>
      <form onSubmit={handleSubmit((values) => onSubmit(values.name.trim()))} noValidate>
        <label htmlFor="workspace-name" className="mb-2 block text-sm font-medium text-ink-soft">
          Workspace name
        </label>
        <input
          id="workspace-name"
          type="text"
          autoFocus
          autoComplete="off"
          className={`w-full rounded-lg border bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint outline-none transition focus:border-ink focus:ring-2 focus:ring-ink/10 ${
            errors.name ? "border-danger" : "border-line-strong"
          }`}
          placeholder="Design team"
          {...register("name", {
            required: "Workspace name is required",
            maxLength: {
              value: 60,
              message: "Keep it under 60 characters",
            },
            validate: (value) => value.trim().length > 0 || "Workspace name is required",
          })}
        />
        {errors.name && <p className="mt-1 text-xs text-danger">{errors.name.message}</p>}

        {error && (
          <div className="mt-4 animate-fade-in rounded-lg border border-danger-line bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-full border border-line-strong bg-surface px-4 py-2 text-sm font-semibold text-ink-soft transition hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-70"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-canvas shadow-sm transition hover:bg-ink-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending ? pendingLabel : submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
