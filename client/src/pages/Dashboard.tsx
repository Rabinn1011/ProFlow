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
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-500">{user ? `Signed in as ${user.email}` : ""}</p>
          </div>
          <button
            onClick={async () => {
              await fetch(`${API_BASE_URL}/auth/logout`, { method: "POST", credentials: "include" });
              logoutStore();
            }}
            className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 active:scale-[0.98]"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 px-4 py-8">
        {error && (
          <div className="animate-fade-in rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        <section className="animate-fade-in-up rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">Workspaces</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {workspaces.map((w) => (
              <div
                key={w.id}
                className="rounded-xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md"
              >
                <div className="text-base font-semibold text-slate-900">{w.name}</div>
                <div className="mt-1 text-xs text-slate-400">{w.id}</div>
              </div>
            ))}
            {workspaces.length === 0 && !error && (
              <div className="text-sm text-slate-500">No workspaces yet. Create one via API for now.</div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

