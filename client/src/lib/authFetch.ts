import { API_BASE_URL } from "../services/api";
import { useAuthStore } from "../store/authStore";

type RefreshResponse = { accessToken: string; message?: string };

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

  // Attempt refresh token flow
  const refresh = await fetch(`${API_BASE_URL}/auth/refresh`, { method: "POST", credentials: "include" });
  const payload = (await refresh.json().catch(() => ({}))) as RefreshResponse;
  if (!refresh.ok || !payload.accessToken || !user) {
    logout();
    return res;
  }

  setAuth({ user, accessToken: payload.accessToken });
  headers.set("Authorization", `Bearer ${payload.accessToken}`);
  res = await doFetch();
  return res;
}

