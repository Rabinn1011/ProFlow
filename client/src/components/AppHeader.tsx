import type { ReactNode } from "react";
import { API_BASE_URL } from "../services/api";
import { useAuthStore } from "../store/authStore";

export function AppHeader({ children }: { children: ReactNode }) {
  const logoutStore = useAuthStore((s) => s.logout);

  const handleLogout = async () => {
    await fetch(`${API_BASE_URL}/auth/logout`, { method: "POST", credentials: "include" });
    logoutStore();
  };

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-5">
        <div className="min-w-0">{children}</div>
        <button
          onClick={handleLogout}
          className="shrink-0 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 active:scale-[0.98]"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
