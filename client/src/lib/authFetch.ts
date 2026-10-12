import { API_BASE_URL } from "../services/api";
import { useAuthStore } from "../store/authStore";

type RefreshResponse = { accessToken?: string };

// The server rotates the refresh cookie on every refresh and treats a replay of an old
// cookie as theft. If a board fires five requests that all 401 at once, five parallel
// refreshes would each send the same cookie; sharing one in-flight promise means only
// one refresh ever goes out at a time.
let inFlightRefresh: Promise<string | null> | null = null;

export function refreshAccessToken(): Promise<string | null> {
  inFlightRefresh ??= (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) return null;
      const payload = (await res.json().catch(() => ({}))) as RefreshResponse;
      return payload.accessToken ?? null;
    } catch {
      return null;
    } finally {
      inFlightRefresh = null;
    }
  })();
  return inFlightRefresh;
}

export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const { accessToken, setAuth, user, logout } = useAuthStore.getState();

  const url = input.startsWith("http") ? input : `${API_BASE_URL}${input}`;
  const headers = new Headers(init.headers);

  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const doFetch = () =>
    fetch(url, {
      ...init,
      headers,
      credentials: "include",
    });

  let res = await doFetch();
  if (res.status !== 401) return res;

  const freshToken = await refreshAccessToken();
  if (!freshToken || !user) {
    logout();
    return res;
  }

  setAuth({ user, accessToken: freshToken });
  headers.set("Authorization", `Bearer ${freshToken}`);
  res = await doFetch();
  return res;
}
