import { useForm } from "react-hook-form";
import { Eye, EyeOff, User, UserPlus, Mail, Lock } from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { API_BASE_URL } from "../services/api";

type RegisterFormValues = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type RegisterResponse = {
  accessToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
};

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState("");
  const { setAuth } = useAuthStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    getValues,
  } = useForm<RegisterFormValues>({
    mode: "onBlur",
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setApiError("");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: data.name.trim(),
          email: data.email.trim().toLowerCase(),
          password: data.password,
        }),
      });

      const payload = (await response.json()) as RegisterResponse & { message?: string };

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to register. Please try again.");
      }

      setAuth({
        user: payload.user,
        accessToken: payload.accessToken,
      });
      navigate("/app", { replace: true });
    } catch (error) {
      if (error instanceof Error) {
        setApiError(error.message);
      } else {
        setApiError("An unexpected error occurred. Please try again.");
      }
    }
  };

  if (isAuthenticated) return <Navigate to="/app" replace />;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-canvas px-4 py-10 text-ink-soft">
      <div className="relative w-full max-w-md animate-fade-in-up rounded-2xl border border-line bg-surface p-8 shadow-[0_20px_60px_-24px_rgba(17,17,17,0.18)]">
        <div className="mb-8">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-line-strong px-3 py-1 text-xs font-medium text-ink-muted">
            <UserPlus size={14} />
            ProFlow Workspace
          </p>
          <h1 className="text-3xl font-semibold tracking-[-0.025em] text-ink">
            Create your <em className="font-serif text-[1.08em] font-normal tracking-normal">account</em>
          </h1>
          <p className="mt-2 text-sm text-ink-muted">Start managing projects and tasks with your team.</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div>
            <label htmlFor="name" className="mb-2 block text-sm font-medium text-ink-soft">
              Full name
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" size={18} />
              <input
                id="name"
                type="text"
                autoComplete="name"
                className={`w-full rounded-lg border bg-surface py-2.5 pl-10 pr-3 text-sm text-ink placeholder:text-ink-faint outline-none transition focus:border-ink focus:ring-2 focus:ring-ink/10 ${
                  errors.name ? "border-danger" : "border-line-strong"
                }`}
                placeholder="Ada Lovelace"
                {...register("name", { required: "Name is required" })}
              />
            </div>
            {errors.name && <p className="mt-1 text-xs text-danger">{errors.name.message}</p>}
          </div>

          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-ink-soft">
              Email address
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" size={18} />
              <input
                id="email"
                type="email"
                autoComplete="email"
                className={`w-full rounded-lg border bg-surface py-2.5 pl-10 pr-3 text-sm text-ink placeholder:text-ink-faint outline-none transition focus:border-ink focus:ring-2 focus:ring-ink/10 ${
                  errors.email ? "border-danger" : "border-line-strong"
                }`}
                placeholder="you@company.com"
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Enter a valid email address",
                  },
                })}
              />
            </div>
            {errors.email && <p className="mt-1 text-xs text-danger">{errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-ink-soft">
              Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" size={18} />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                className={`w-full rounded-lg border bg-surface py-2.5 pl-10 pr-10 text-sm text-ink placeholder:text-ink-faint outline-none transition focus:border-ink focus:ring-2 focus:ring-ink/10 ${
                  errors.password ? "border-danger" : "border-line-strong"
                }`}
                placeholder="Enter your password"
                {...register("password", {
                  required: "Password is required",
                  minLength: {
                    value: 6,
                    message: "Password must be at least 6 characters",
                  },
                })}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint transition hover:text-ink"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-danger">{errors.password.message}</p>}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-ink-soft">
              Confirm password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" size={18} />
              <input
                id="confirmPassword"
                type= {showPassword ? "text" : "password"}
                autoComplete="new-password"
                className={`w-full rounded-lg border bg-surface py-2.5 pl-10 pr-10 text-sm text-ink placeholder:text-ink-faint outline-none transition focus:border-ink focus:ring-2 focus:ring-ink/10 ${
                  errors.confirmPassword ? "border-danger" : "border-line-strong"
                }`}
                placeholder="Confirm your password"
                {...register("confirmPassword", {
                  required: "Please confirm your password",
                  validate: (value) => value === getValues("password") || "Passwords do not match",
                })}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint transition hover:text-ink"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-danger">{errors.confirmPassword.message}</p>
            )}
          </div>

          {apiError && (
            <div className="animate-fade-in rounded-lg border border-danger-line bg-danger-soft px-3 py-2 text-sm text-danger">
              {apiError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-canvas shadow-sm transition hover:bg-ink-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Signing up..." : "Sign up"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-muted">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-ink underline underline-offset-2 transition hover:text-ink-muted">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
