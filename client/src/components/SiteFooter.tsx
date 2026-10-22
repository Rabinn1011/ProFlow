import { Link } from "react-router-dom";

const linkClass = "transition hover:text-violet-700";

// Shared by the landing page and the legal pages so the links stay in one place.
export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-slate-500 sm:flex-row">
        <span>© {new Date().getFullYear()} ProFlow</span>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <Link to="/terms" className={linkClass}>
            Terms and Conditions
          </Link>
          <Link to="/privacy" className={linkClass}>
            Privacy Policy
          </Link>
          <a
            href="https://github.com/Rabinn1011/ProFlow"
            target="_blank"
            rel="noreferrer"
            className={linkClass}
          >
            Source on GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
