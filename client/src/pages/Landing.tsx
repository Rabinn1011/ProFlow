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
import { SiteFooter } from "../components/SiteFooter";
import { HeroBoardPreview } from "../components/HeroBoardPreview";

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
    <div className="min-h-screen bg-canvas text-ink-soft">
      <header>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <span className="text-lg font-semibold tracking-tight text-ink">ProFlow</span>
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-ink-muted transition hover:text-ink"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-canvas transition hover:bg-ink-hover active:scale-[0.98]"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section>
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 lg:grid-cols-[1fr_1.05fr] lg:py-24">
            <div className="animate-fade-in-up">
              <p className="mb-5 inline-flex items-center rounded-full border border-line-strong bg-surface px-3 py-1 text-xs font-medium text-ink-muted">
                Team project management
              </p>
              <h1 className="text-5xl font-semibold leading-[1.04] tracking-[-0.035em] text-ink sm:text-6xl">
                The space between a to-do list{" "}
                <em className="font-serif font-normal tracking-[-0.01em]">and Jira</em>
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-muted">
                Workspaces, projects and a Kanban board your whole team watches update live.
                Enough structure to run real work, without the ceremony nobody asked for.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-canvas transition hover:bg-ink-hover active:scale-[0.99]"
                >
                  Create your workspace
                  <ArrowRight size={16} />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface px-5 py-3 text-sm font-semibold text-ink-soft transition hover:border-ink/30 hover:text-ink"
                >
                  I already have an account
                </Link>
              </div>

              <p className="mt-4 text-xs text-ink-faint">
                Free to try · No credit card · Invite your team in a minute
              </p>
            </div>

            <div className="animate-fade-in">
              <HeroBoardPreview />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-muted">
            What you get
          </h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <article
                key={title}
                className="rounded-2xl border border-line bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-ink/30 hover:shadow-md"
              >
                <span className="inline-flex rounded-xl bg-sunken p-2.5 text-ink">
                  <Icon size={20} />
                </span>
                <h3 className="mt-4 text-base font-semibold text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20">
          <div className="rounded-3xl bg-ink p-10 text-center sm:p-16">
            <h2 className="text-3xl font-semibold tracking-[-0.025em] text-canvas sm:text-4xl">
              Start with <em className="font-serif font-normal tracking-normal">one workspace</em>
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-canvas/70">
              Create an account, make a board, invite the people who need to see it.
            </p>
            <Link
              to="/register"
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-canvas px-5 py-3 text-sm font-semibold text-ink transition hover:bg-surface active:scale-[0.99]"
            >
              Get started free
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
