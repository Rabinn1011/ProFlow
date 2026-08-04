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
        <label htmlFor="project-name" className="mb-2 block text-sm font-medium text-slate-700">
          Project name
        </label>
        <input
          id="project-name"
          type="text"
          autoFocus
          autoComplete="off"
          className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 ${
            errors.name ? "border-rose-400" : "border-slate-300"
          }`}
          placeholder="Website redesign"
          {...register("name", {
            required: "Project name is required",
            maxLength: { value: 80, message: "Keep it under 80 characters" },
            validate: (value) => value.trim().length > 0 || "Project name is required",
          })}
        />
        {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name.message}</p>}

        <label
          htmlFor="project-description"
          className="mb-2 mt-4 block text-sm font-medium text-slate-700"
        >
          Description <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <textarea
          id="project-description"
          rows={3}
          className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
          placeholder="What is this project for?"
          {...register("description", {
            maxLength: { value: 400, message: "Keep it under 400 characters" },
          })}
        />
        {errors.description && (
          <p className="mt-1 text-xs text-rose-600">{errors.description.message}</p>
        )}

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
