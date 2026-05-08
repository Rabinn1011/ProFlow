import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../services/api";
import { useSocket } from "../hooks/useSocket";
import { authFetch } from "../lib/authFetch";
import { useAuthStore } from "../store/authStore";

type Workspace = {
  id: string;
  name: string;
};

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const logoutStore = useAuthStore((s) => s.logout);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [error, setError] = useState("");

  const socketUrl = useMemo(() => API_BASE_URL.replace(/\/api\/?$/, ""), []);
  const socket = useSocket(socketUrl);

  useEffect(() => {
    const run = async () => {
      setError("");
      const res = await authFetch("/workspaces");
      const payload = (await res.json().catch(() => ({}))) as { workspaces?: Workspace[]; message?: string };
      if (!res.ok) {
        setError(payload.message ?? "Failed to load workspaces");
        return;
      }
      setWorkspaces(payload.workspaces ?? []);
    };
    void run();
  }, []);

  useEffect(() => {
    const onTaskMoved = () => {
      // placeholder: later we’ll update react-query caches for kanban
    };
    socket.on("task:moved", onTaskMoved);
    return () => {
      socket.off("task:moved", onTaskMoved);
    };
  }, [socket]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-300">{user ? `Signed in as ${user.email}` : ""}</p>
        </div>
        <button
          onClick={async () => {
            await fetch(`${API_BASE_URL}/auth/logout`, { method: "POST", credentials: "include" });
            logoutStore();
          }}
          className="rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-2 text-sm font-semibold text-fuchsia-200 hover:bg-fuchsia-500/15"
        >
          Logout
        </button>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 px-4 pb-10">
        {error && (
          <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-300">Workspaces</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {workspaces.map((w) => (
              <div key={w.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <div className="text-base font-semibold">{w.name}</div>
                <div className="mt-1 text-xs text-slate-400">{w.id}</div>
              </div>
            ))}
            {workspaces.length === 0 && !error && (
              <div className="text-sm text-slate-400">No workspaces yet. Create one via API for now.</div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

