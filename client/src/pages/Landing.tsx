import { Link, Navigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  KanbanSquare,
  MessagesSquare,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { AuthLoadingScreen } from "../components/AuthLoadingScreen";
import heroImage from "../assets/hero.png";

const FEATURES = [
  {
    icon: KanbanSquare,
    title: "Kanban that keeps up",
    body: "Drag between To Do, In Progress and Done. Cards move the instant you drop them and roll back if the server disagrees.",
  },
  {
    icon: Zap,
    title: "Live by default",
    body: "Everyone on a board sees the same thing. Moves, edits and new tasks appear for teammates without a refresh.",
  },
  {
    icon: Users,
    title: "Roles that mean something",
    body: "Owner, admin, member, viewer — enforced on every request, not just hidden in the UI. Stakeholders get read-only access.",
  },
  {
    icon: MessagesSquare,
    title: "Chat where the work is",
    body: "Per-project conversation next to the board, with history that survives a reload. No extra tab, no context switch.",
  },
  {
    icon: BarChart3,
    title: "Analytics worth reading",
    body: "Completions over time, throughput per person, overdue counts — aggregated in the database, not counted in the browser.",
  },
  {
    icon: ShieldCheck,
    title: "Sessions done properly",
    body: "Short-lived tokens in memory, refresh tokens in an httpOnly cookie, and an authenticated realtime connection.",
  },
];

export default function Landing() {
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Wait for the silent refresh before deciding, or a returning user sees the marketing
  // page flash before being sent to their dashboard.
  if (isBootstrapping) return <AuthLoadingScreen />;
  if (isAuthenticated) return <Navigate to="/app" replace />;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <span className="text-lg font-semibold tracking-tight text-slate-900">ProFlow</span>
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:text-violet-700"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 active:scale-[0.98]"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.10),transparent_55%)]" />
          <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-violet-200/40 blur-3xl" />
          <div className="absolute -right-20 top-40 h-72 w-72 rounded-full bg-purple-200/40 blur-3xl" />

          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
            <div className="animate-fade-in-up">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-violet-700">
                Team project management
              </p>
              <h1 className="text-4xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-5xl">
                The space between a to-do list and Jira
              </h1>
              <p className="mt-4 max-w-xl text-lg text-slate-600">
                Workspaces, projects and a Kanban board your whole team watches update live.
                Enough structure to run real work, without the ceremony nobody asked for.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 active:scale-[0.99]"
                >
                  Create your workspace
                  <ArrowRight size={16} />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:text-violet-700"
                >
                  I already have an account
                </Link>
              </div>

              <p className="mt-4 text-xs text-slate-400">
                Free to try · No credit card · Invite your team in a minute
              </p>
            </div>

            <div className="animate-fade-in flex justify-center md:justify-end">
              <img
                src={heroImage}
                alt=""
                width={360}
                height={360}
                className="w-64 drop-shadow-[0_30px_60px_rgba(139,92,246,0.35)] sm:w-80"
              />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">
            What you get
          </h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <article
                key={title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md"
              >
                <span className="inline-flex rounded-xl bg-violet-50 p-2.5 text-violet-600">
                  <Icon size={20} />
                </span>
                <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20">
          <div className="relative overflow-hidden rounded-2xl border border-violet-200 bg-white p-8 text-center shadow-sm sm:p-12">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.08),transparent_60%)]" />
            <div className="relative">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                Start with one workspace
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
                Create an account, make a board, invite the people who need to see it.
              </p>
              <Link
                to="/register"
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 active:scale-[0.99]"
              >
                Get started free
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-slate-500 sm:flex-row">
          <span>ProFlow</span>
          <a
            href="https://github.com/Rabinn1011/ProFlow"
            target="_blank"
            rel="noreferrer"
            className="transition hover:text-violet-700"
          >
            Source on GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
