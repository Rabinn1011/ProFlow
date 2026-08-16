import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthLoadingScreen } from "./components/AuthLoadingScreen";
import { ToastViewport } from "./components/ToastViewport";
import { useAuthBootstrap } from "./hooks/useAuthBootstrap";

// The app behind the login wall pulls in Recharts, the drag-and-drop engine and the
// socket client. A first-time visitor on the landing page needs none of it, so these
// routes are split out and fetched on demand.
const Dashboard = lazy(() => import("./pages/Dashboard"));
const WorkspaceProjects = lazy(() => import("./pages/WorkspaceProjects"));
const ProjectBoard = lazy(() => import("./pages/ProjectBoard"));
const WorkspaceAnalytics = lazy(() => import("./pages/WorkspaceAnalytics"));

function App() {
  useAuthBootstrap();

  return (
    <BrowserRouter>
      <Suspense fallback={<AuthLoadingScreen />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/app" element={<Dashboard />} />
            <Route path="/app/workspaces/:workspaceId" element={<WorkspaceProjects />} />
            <Route path="/app/workspaces/:workspaceId/analytics" element={<WorkspaceAnalytics />} />
            <Route
              path="/app/workspaces/:workspaceId/projects/:projectId"
              element={<ProjectBoard />}
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>

      <ToastViewport />
    </BrowserRouter>
  );
}

export default App;
