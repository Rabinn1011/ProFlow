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
        <label htmlFor="workspace-name" className="mb-2 block text-sm font-medium text-slate-700">
          Workspace name
        </label>
        <input
          id="workspace-name"
          type="text"
          autoFocus
          autoComplete="off"
          className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 ${
            errors.name ? "border-rose-400" : "border-slate-300"
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
        {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name.message}</p>}

        {error && (
          <div className="mt-4 animate-fade-in rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending ? pendingLabel : submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
