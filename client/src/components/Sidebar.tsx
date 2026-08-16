import { Link, useLocation, useParams } from "react-router-dom";
import { BarChart3, FolderKanban, LayoutGrid, LogOut, Plus } from "lucide-react";
import { API_BASE_URL } from "../services/api";
import { useAuthStore } from "../store/authStore";
import { useWorkspaces } from "../hooks/useWorkspaces";
import { getMyRole, hasAtLeastRole } from "../lib/workspaceRole";

const initials = (name: string): string =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const user = useAuthStore((s) => s.user);
  const logoutStore = useAuthStore((s) => s.logout);
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { pathname } = useLocation();

  const workspacesQuery = useWorkspaces();
  const workspaces = workspacesQuery.data ?? [];

  const active = workspaces.find((w) => w.id === workspaceId);
  const activeRole = active && user ? getMyRole(active, user.id) : null;

  const handleLogout = async () => {
    await fetch(`${API_BASE_URL}/auth/logout`, { method: "POST", credentials: "include" });
    logoutStore();
  };

  const linkClass = (isActive: boolean) =>
    `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive
        ? "bg-violet-50 text-violet-700"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;

  return (
    <div className="flex h-full flex-col border-r border-slate-200 bg-white">
      <div className="px-5 py-5">
        <Link
          to="/app"
          onClick={onNavigate}
          className="text-lg font-semibold tracking-tight text-slate-900"
        >
          ProFlow
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3">
        <Link to="/app" onClick={onNavigate} className={linkClass(pathname === "/app")}>
          <LayoutGrid size={16} />
          All workspaces
        </Link>

        <div className="mt-5 flex items-center justify-between px-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Workspaces
          </span>
          {workspacesQuery.isPending && (
            <span className="h-3 w-3 animate-spin rounded-full border border-slate-300 border-t-violet-500" />
          )}
        </div>

        <ul className="mt-2 space-y-0.5">
          {workspaces.map((workspace) => {
            const isActive = workspace.id === workspaceId;
            return (
              <li key={workspace.id}>
                <Link
                  to={`/app/workspaces/${workspace.id}`}
                  onClick={onNavigate}
                  className={linkClass(isActive)}
                  title={workspace.name}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold ${
                      isActive ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-500"
                    }`}
                    aria-hidden="true"
                  >
                    {initials(workspace.name)}
                  </span>
                  <span className="truncate">{workspace.name}</span>
                </Link>
              </li>
            );
          })}

          {!workspacesQuery.isPending && workspaces.length === 0 && (
            <li className="px-3 py-2 text-xs text-slate-400">No workspaces yet</li>
          )}
        </ul>

        <Link
          to="/app"
          onClick={onNavigate}
          className="mt-2 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-violet-700"
        >
          <Plus size={16} />
          New workspace
        </Link>

        {/* Only surfaced once a workspace is open, and only to those allowed in. */}
        {active && hasAtLeastRole(activeRole, "admin") && (
          <>
            <div className="mt-5 px-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
              {active.name}
            </div>
            <Link
              to={`/app/workspaces/${active.id}/analytics`}
              onClick={onNavigate}
              className={`mt-2 ${linkClass(pathname.endsWith("/analytics"))}`}
            >
              <BarChart3 size={16} />
              Analytics
            </Link>
            <Link
              to={`/app/workspaces/${active.id}`}
              onClick={onNavigate}
              className={linkClass(pathname === `/app/workspaces/${active.id}`)}
            >
              <FolderKanban size={16} />
              Projects
            </Link>
          </>
        )}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700"
            aria-hidden="true"
          >
            {initials(user?.name ?? "")}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-slate-900">{user?.name}</div>
            <div className="truncate text-xs text-slate-500">{user?.email}</div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-rose-50 hover:text-rose-700"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </div>
  );
}
