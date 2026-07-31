import { create } from 'zustand';

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
} | null;

interface AuthState {
  user: AuthUser;
  accessToken: string | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  setUser: (user: AuthUser) => void;
  setAuth: (payload: { user: NonNullable<AuthUser>; accessToken: string }) => void;
  setBootstrapping: (value: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isBootstrapping: true,
  setUser: (user) =>
    set({
      user,
      isAuthenticated: Boolean(user),
    }),
  setAuth: ({ user, accessToken }) =>
    set({
      user,
      accessToken,
      isAuthenticated: true,
    }),
  setBootstrapping: (value) => set({ isBootstrapping: value }),
  logout: () =>
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
    }),
}));
