import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { requireWorkspaceMember, requireWorkspaceRole } from "../middleware/workspace-access.middleware";
import {
  createWorkspace,
  deleteWorkspace,
  getWorkspace,
  listWorkspaces,
  updateWorkspace,
} from "../controllers/workspaces.controller";
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject,
} from "../controllers/projects.controller";
import { createTask, deleteTask, listTasks, moveTask, updateTask } from "../controllers/tasks.controller";
import {
  addMember,
  listMembers,
  removeMember,
  updateMemberRole,
} from "../controllers/members.controller";
import { getWorkspaceAnalytics } from "../controllers/analytics.controller";
import { listMessages } from "../controllers/messages.controller";

const workspacesRouter = Router();

workspacesRouter.get("/", requireAuth, listWorkspaces);
workspacesRouter.post("/", requireAuth, createWorkspace);

workspacesRouter.get("/:id", requireAuth, requireWorkspaceMember, getWorkspace);
workspacesRouter.patch("/:id", requireAuth, requireWorkspaceMember, requireWorkspaceRole("admin"), updateWorkspace);
workspacesRouter.delete(
  "/:id",
  requireAuth,
  requireWorkspaceMember,
  requireWorkspaceRole("owner"),
  deleteWorkspace,
);

workspacesRouter.get(
  "/:id/analytics",
  requireAuth,
  requireWorkspaceMember,
  requireWorkspaceRole("admin"),
  getWorkspaceAnalytics,
);

workspacesRouter.get("/:id/members", requireAuth, requireWorkspaceMember, listMembers);
workspacesRouter.post(
  "/:id/members",
  requireAuth,
  requireWorkspaceMember,
  requireWorkspaceRole("admin"),
  addMember,
);
workspacesRouter.patch(
  "/:id/members/:userId",
  requireAuth,
  requireWorkspaceMember,
  requireWorkspaceRole("admin"),
  updateMemberRole,
);
workspacesRouter.delete(
  "/:id/members/:userId",
  requireAuth,
  requireWorkspaceMember,
  requireWorkspaceRole("admin"),
  removeMember,
);

workspacesRouter.get(
  "/:workspaceId/projects",
  requireAuth,
  requireWorkspaceMember,
  listProjects,
);
workspacesRouter.post(
  "/:workspaceId/projects",
  requireAuth,
  requireWorkspaceMember,
  requireWorkspaceRole("member"),
  createProject,
);
workspacesRouter.get(
  "/:workspaceId/projects/:projectId",
  requireAuth,
  requireWorkspaceMember,
  getProject,
);
workspacesRouter.patch(
  "/:workspaceId/projects/:projectId",
  requireAuth,
  requireWorkspaceMember,
  requireWorkspaceRole("member"),
  updateProject,
);
workspacesRouter.delete(
  "/:workspaceId/projects/:projectId",
  requireAuth,
  requireWorkspaceMember,
  requireWorkspaceRole("admin"),
  deleteProject,
);

workspacesRouter.get(
  "/:workspaceId/projects/:projectId/tasks",
  requireAuth,
  requireWorkspaceMember,
  listTasks,
);
workspacesRouter.post(
  "/:workspaceId/projects/:projectId/tasks",
  requireAuth,
  requireWorkspaceMember,
  requireWorkspaceRole("member"),
  createTask,
);
workspacesRouter.patch(
  "/:workspaceId/projects/:projectId/tasks/:taskId",
  requireAuth,
  requireWorkspaceMember,
  requireWorkspaceRole("member"),
  updateTask,
);
workspacesRouter.delete(
  "/:workspaceId/projects/:projectId/tasks/:taskId",
  requireAuth,
  requireWorkspaceMember,
  requireWorkspaceRole("member"),
  deleteTask,
);
// Viewers can read and post: they are stakeholders who need to ask questions
// (scope §4.6). Posting itself happens over the socket, not here.
workspacesRouter.get(
  "/:workspaceId/projects/:projectId/messages",
  requireAuth,
  requireWorkspaceMember,
  listMessages,
);

workspacesRouter.post(
  "/:workspaceId/projects/:projectId/tasks/:taskId/move",
  requireAuth,
  requireWorkspaceMember,
  requireWorkspaceRole("member"),
  moveTask,
);

export default workspacesRouter;

