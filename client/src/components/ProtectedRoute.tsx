import type { ReactNode } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { AuthLoadingScreen } from "./AuthLoadingScreen";

export function ProtectedRoute({ children }: { children?: ReactNode }) {
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isBootstrapping) return <AuthLoadingScreen />;
  // Landing, not /login: signing out should return you to the public front door, and it
  // offers both "Sign in" and "Get started" for whoever lands here without a session.
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return children ? children : <Outlet />;
}
