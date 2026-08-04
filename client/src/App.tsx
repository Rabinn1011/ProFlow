import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Register from "./pages/Register";
import WorkspaceProjects from "./pages/WorkspaceProjects";
import ProjectBoard from "./pages/ProjectBoard";
import { useAuthBootstrap } from "./hooks/useAuthBootstrap";

function App() {
  useAuthBootstrap();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/app" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/app" element={<Dashboard />} />
          <Route path="/app/workspaces/:workspaceId" element={<WorkspaceProjects />} />
          <Route
            path="/app/workspaces/:workspaceId/projects/:projectId"
            element={<ProjectBoard />}
          />
        </Route>
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
