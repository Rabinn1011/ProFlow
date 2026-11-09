import { useForm } from "react-hook-form";
import { Modal } from "./Modal";

type ProjectFormValues = {
  name: string;
  description: string;
};

type ProjectFormModalProps = {
  title: string;
  description?: string;
  submitLabel: string;
  pendingLabel: string;
  defaultValues?: { name: string; description: string | null };
  isPending: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (values: { name: string; description: string | null }) => void;
};

export function ProjectFormModal({
  title,
  description,
  submitLabel,
  pendingLabel,
  defaultValues,
  isPending,
  error,
  onClose,
  onSubmit,
}: ProjectFormModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    mode: "onBlur",
    defaultValues: {
      name: defaultValues?.name ?? "",
      description: defaultValues?.description ?? "",
    },
  });

  return (
    <Modal title={title} description={description} onClose={onClose}>
      <form
        onSubmit={handleSubmit((values) =>
          onSubmit({
            name: values.name.trim(),
            description: values.description.trim() ? values.description.trim() : null,
          }),
        )}
        noValidate
      >
        <label htmlFor="project-name" className="mb-2 block text-sm font-medium text-ink-soft">
          Project name
        </label>
        <input
          id="project-name"
          type="text"
          autoFocus
          autoComplete="off"
          className={`w-full rounded-lg border bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint outline-none transition focus:border-ink focus:ring-2 focus:ring-ink/10 ${
            errors.name ? "border-danger" : "border-line-strong"
          }`}
          placeholder="Website redesign"
          {...register("name", {
            required: "Project name is required",
            maxLength: { value: 80, message: "Keep it under 80 characters" },
            validate: (value) => value.trim().length > 0 || "Project name is required",
          })}
        />
        {errors.name && <p className="mt-1 text-xs text-danger">{errors.name.message}</p>}

        <label
          htmlFor="project-description"
          className="mb-2 mt-4 block text-sm font-medium text-ink-soft"
        >
          Description <span className="font-normal text-ink-faint">(optional)</span>
        </label>
        <textarea
          id="project-description"
          rows={3}
          className="w-full resize-none rounded-lg border border-line-strong bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint outline-none transition focus:border-ink focus:ring-2 focus:ring-ink/10"
          placeholder="What is this project for?"
          {...register("description", {
            maxLength: { value: 400, message: "Keep it under 400 characters" },
          })}
        />
        {errors.description && (
          <p className="mt-1 text-xs text-danger">{errors.description.message}</p>
        )}

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
