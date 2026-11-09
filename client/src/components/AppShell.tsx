import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Menu, X } from "lucide-react";
import { Breadcrumbs, type Crumb } from "./Breadcrumbs";
import { Sidebar } from "./Sidebar";

type AppShellProps = {
  title: string;
  crumbs?: Crumb[];
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
};

export function AppShell({ title, crumbs, subtitle, actions, children }: AppShellProps) {
  const [isNavOpen, setIsNavOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsNavOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // "Back" goes up the hierarchy, not through browser history: the last linked crumb is
  // this page's parent, so the target is predictable no matter how you arrived.
  const parent = crumbs?.filter((crumb) => crumb.to).at(-1);

  return (
    <div className="min-h-screen bg-canvas text-ink-soft">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        <Sidebar />
      </aside>

      {isNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 animate-fade-in bg-ink/40 backdrop-blur-sm"
            onClick={() => setIsNavOpen(false)}
          />
          <div className="relative h-full w-64 animate-fade-in-up">
            <Sidebar onNavigate={() => setIsNavOpen(false)} />
            <button
              type="button"
              onClick={() => setIsNavOpen(false)}
              aria-label="Close navigation"
              className="absolute right-2 top-4 rounded-lg p-1.5 text-ink-faint transition hover:bg-sunken hover:text-ink-soft"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-start justify-between gap-4 px-4 py-4">
            <div className="flex min-w-0 items-start gap-2">
              <button
                type="button"
                onClick={() => setIsNavOpen(true)}
                aria-label="Open navigation"
                className="mt-0.5 rounded-lg p-1.5 text-ink-muted transition hover:bg-sunken hover:text-ink lg:hidden"
              >
                <Menu size={18} />
              </button>

              {parent?.to && (
                <Link
                  to={parent.to}
                  aria-label={`Back to ${parent.label}`}
                  title={`Back to ${parent.label}`}
                  className="mt-0.5 rounded-lg border border-line p-1.5 text-ink-muted transition hover:border-ink/30 hover:text-ink"
                >
                  <ArrowLeft size={18} />
                </Link>
              )}

              <div className="min-w-0">
                {crumbs && crumbs.length > 0 && <Breadcrumbs items={crumbs} />}
                <h1 className="mt-1 truncate text-xl font-semibold tracking-tight text-ink">
                  {title}
                </h1>
                {subtitle}
              </div>
            </div>

            {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
          </div>
        </header>

        <main className="mx-auto max-w-6xl space-y-4 px-4 py-8">{children}</main>
      </div>
    </div>
  );
}
