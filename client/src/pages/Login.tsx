import { useState } from "react";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, Lock, LogIn, Mail } from "lucide-react";
import { API_BASE_URL } from "../services/api";
import { useAuthStore } from "../store/authStore";
import { Link, Navigate, useNavigate } from "react-router-dom";

type LoginFormValues = {
  email: string;
  password: string;
};

type LoginResponse = {
  accessToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
};

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState("");
  const { setAuth } = useAuthStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    mode: "onBlur",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setApiError("");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: data.email.trim().toLowerCase(),
          password: data.password,
        }),
      });

      const payload = (await response.json()) as LoginResponse & { message?: string };

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to login. Please try again.");
      }

      setAuth({
        user: payload.user,
        accessToken: payload.accessToken,
      });
      navigate("/app", { replace: true });
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Unexpected error while signing in.");
    }
  };

  if (isAuthenticated) return <Navigate to="/app" replace />;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-canvas px-4 py-10 text-ink-soft">
      <div className="relative w-full max-w-md animate-fade-in-up rounded-2xl border border-line bg-surface p-8 shadow-[0_20px_60px_-24px_rgba(17,17,17,0.18)]">
        <div className="mb-8">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-line-strong px-3 py-1 text-xs font-medium text-ink-muted">
            <LogIn size={14} />
            ProFlow Workspace
          </p>
          <h1 className="text-3xl font-semibold tracking-[-0.025em] text-ink">
            Welcome <em className="font-serif text-[1.08em] font-normal tracking-normal">back</em>
          </h1>
          <p className="mt-2 text-sm text-ink-muted">Sign in to continue managing projects and tasks.</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
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
                className="w-full rounded-lg border border-line-strong bg-surface py-2.5 pl-10 pr-3 text-sm text-ink placeholder:text-ink-faint outline-none transition focus:border-ink focus:ring-2 focus:ring-ink/10"
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
                autoComplete="current-password"
                className="w-full rounded-lg border border-line-strong bg-surface py-2.5 pl-10 pr-10 text-sm text-ink placeholder:text-ink-faint outline-none transition focus:border-ink focus:ring-2 focus:ring-ink/10"
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
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-muted">
          Don't have an account?{" "}
          <Link to="/register" className="font-semibold text-ink underline underline-offset-2 transition hover:text-ink-muted">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
