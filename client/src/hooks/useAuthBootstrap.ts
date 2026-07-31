import { useEffect } from "react";
import { API_BASE_URL } from "../services/api";
import { useAuthStore } from "../store/authStore";

type RefreshResponse = { accessToken?: string };

type MeResponse = {
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
};

// Access tokens live in memory, so a reload leaves the store empty even though the
// httpOnly refresh cookie is still valid. On boot we trade that cookie for a fresh
// access token and rehydrate the user. Plain fetch, not authFetch: authFetch's retry
// path calls logout() when there is no user in the store, which is exactly this case.
export function useAuthBootstrap(): void {
  const setAuth = useAuthStore((s) => s.setAuth);
  const setBootstrapping = useAuthStore((s) => s.setBootstrapping);

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async (): Promise<void> => {
      try {
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });
        if (!refreshResponse.ok) return;

        const { accessToken } = (await refreshResponse.json()) as RefreshResponse;
        if (!accessToken) return;

        const meResponse = await fetch(`${API_BASE_URL}/users/me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          credentials: "include",
        });
        if (!meResponse.ok) return;

        const { user } = (await meResponse.json()) as MeResponse;
        if (!user || cancelled) return;

        setAuth({ user, accessToken });
      } catch {
        // Network failure or malformed response: stay logged out.
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    };

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, [setAuth, setBootstrapping]);
}
