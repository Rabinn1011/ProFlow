import request from "supertest";
import app from "../src/app";
import { Task } from "../src/models/task.model";
import { Project } from "../src/models/project.model";
import { addMember, createProject, createWorkspace, registerUser } from "./helpers";

describe("workspace access control", () => {
  it("hides workspaces you are not a member of", async () => {
    const owner = await registerUser();
    const outsider = await registerUser();
    await createWorkspace(owner.token);

    const res = await request(app)
      .get("/api/workspaces")
      .set("Authorization", `Bearer ${outsider.token}`)
      .expect(200);

    expect(res.body.workspaces).toHaveLength(0);
  });

  it("rejects a non-member reading a workspace directly", async () => {
    const owner = await registerUser();
    const outsider = await registerUser();
    const workspaceId = await createWorkspace(owner.token);

    await request(app)
      .get(`/api/workspaces/${workspaceId}`)
      .set("Authorization", `Bearer ${outsider.token}`)
      .expect(403);
  });

  describe("role gates", () => {
    const setup = async (role: string) => {
      const owner = await registerUser();
      const other = await registerUser();
      const workspaceId = await createWorkspace(owner.token);
      await addMember(owner.token, workspaceId, other.email, role).expect(201);
      const projectId = await createProject(owner.token, workspaceId);
      return { owner, other, workspaceId, projectId };
    };

    it("lets a viewer read the board but not create tasks", async () => {
      const { other, workspaceId, projectId } = await setup("viewer");

      await request(app)
        .get(`/api/workspaces/${workspaceId}/projects/${projectId}/tasks`)
        .set("Authorization", `Bearer ${other.token}`)
        .expect(200);

      await request(app)
        .post(`/api/workspaces/${workspaceId}/projects/${projectId}/tasks`)
        .set("Authorization", `Bearer ${other.token}`)
        .send({ title: "Nope" })
        .expect(403);
    });

    it("lets a member create and move tasks", async () => {
      const { other, workspaceId, projectId } = await setup("member");

      const created = await request(app)
        .post(`/api/workspaces/${workspaceId}/projects/${projectId}/tasks`)
        .set("Authorization", `Bearer ${other.token}`)
        .send({ title: "Mine" })
        .expect(201);

      await request(app)
        .post(
          `/api/workspaces/${workspaceId}/projects/${projectId}/tasks/${created.body.task.id}/move`,
        )
        .set("Authorization", `Bearer ${other.token}`)
        .send({ status: "done", position: 1 })
        .expect(200);
    });

    it("stops a member deleting a project (admin+ only)", async () => {
      const { other, workspaceId, projectId } = await setup("member");

      await request(app)
        .delete(`/api/workspaces/${workspaceId}/projects/${projectId}`)
        .set("Authorization", `Bearer ${other.token}`)
        .expect(403);
    });

    it("stops an admin deleting the workspace (owner only)", async () => {
      const { other, workspaceId } = await setup("admin");

      await request(app)
        .delete(`/api/workspaces/${workspaceId}`)
        .set("Authorization", `Bearer ${other.token}`)
        .expect(403);
    });

    it("stops a member reading analytics (admin+ only)", async () => {
      const { other, workspaceId } = await setup("member");

      await request(app)
        .get(`/api/workspaces/${workspaceId}/analytics`)
        .set("Authorization", `Bearer ${other.token}`)
        .expect(403);
    });
  });

  describe("cascade deletes", () => {
    it("removes projects and tasks when a workspace is deleted", async () => {
      const owner = await registerUser();
      const workspaceId = await createWorkspace(owner.token);
      const projectId = await createProject(owner.token, workspaceId);

      await request(app)
        .post(`/api/workspaces/${workspaceId}/projects/${projectId}/tasks`)
        .set("Authorization", `Bearer ${owner.token}`)
        .send({ title: "Doomed" })
        .expect(201);

      await request(app)
        .delete(`/api/workspaces/${workspaceId}`)
        .set("Authorization", `Bearer ${owner.token}`)
        .expect(204);

      expect(await Task.countDocuments({ workspaceId })).toBe(0);
      expect(await Project.countDocuments({ workspaceId })).toBe(0);
    });

    it("removes tasks when a project is deleted", async () => {
      const owner = await registerUser();
      const workspaceId = await createWorkspace(owner.token);
      const projectId = await createProject(owner.token, workspaceId);

      await request(app)
        .post(`/api/workspaces/${workspaceId}/projects/${projectId}/tasks`)
        .set("Authorization", `Bearer ${owner.token}`)
        .send({ title: "Doomed" })
        .expect(201);

      await request(app)
        .delete(`/api/workspaces/${workspaceId}/projects/${projectId}`)
        .set("Authorization", `Bearer ${owner.token}`)
        .expect(204);

      expect(await Task.countDocuments({ projectId })).toBe(0);
    });
  });
});
