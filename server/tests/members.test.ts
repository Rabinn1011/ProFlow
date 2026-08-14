import request from "supertest";
import app from "../src/app";
import { addMember, createProject, createTask, createWorkspace, registerUser } from "./helpers";

describe("workspace members", () => {
  it("adds an existing user and returns the joined member list", async () => {
    const owner = await registerUser("Owner");
    const mate = await registerUser("Mate");
    const workspaceId = await createWorkspace(owner.token);

    const res = await addMember(owner.token, workspaceId, mate.email, "member").expect(201);

    expect(res.body.members).toHaveLength(2);
    expect(res.body.members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ email: mate.email, name: "Mate", role: "member" }),
      ]),
    );
  });

  it("is case-insensitive about the invited email", async () => {
    const owner = await registerUser();
    const mate = await registerUser();
    const workspaceId = await createWorkspace(owner.token);

    await addMember(owner.token, workspaceId, mate.email.toUpperCase(), "member").expect(201);
  });

  it("rejects an unknown email with 404", async () => {
    const owner = await registerUser();
    const workspaceId = await createWorkspace(owner.token);

    await addMember(owner.token, workspaceId, "ghost@example.com", "member").expect(404);
  });

  it("rejects a duplicate member with 409", async () => {
    const owner = await registerUser();
    const mate = await registerUser();
    const workspaceId = await createWorkspace(owner.token);

    await addMember(owner.token, workspaceId, mate.email, "member").expect(201);
    await addMember(owner.token, workspaceId, mate.email, "admin").expect(409);
  });

  it("rejects an invalid role", async () => {
    const owner = await registerUser();
    const mate = await registerUser();
    const workspaceId = await createWorkspace(owner.token);

    await addMember(owner.token, workspaceId, mate.email, "superuser").expect(400);
  });

  describe("guard rails", () => {
    it("stops an admin assigning a role above their own", async () => {
      const owner = await registerUser();
      const admin = await registerUser();
      const outsider = await registerUser();
      const workspaceId = await createWorkspace(owner.token);

      await addMember(owner.token, workspaceId, admin.email, "admin").expect(201);
      await addMember(admin.token, workspaceId, outsider.email, "owner").expect(403);
    });

    it("stops an admin demoting the owner", async () => {
      const owner = await registerUser();
      const admin = await registerUser();
      const workspaceId = await createWorkspace(owner.token);

      await addMember(owner.token, workspaceId, admin.email, "admin").expect(201);

      await request(app)
        .patch(`/api/workspaces/${workspaceId}/members/${owner.id}`)
        .set("Authorization", `Bearer ${admin.token}`)
        .send({ role: "viewer" })
        .expect(403);
    });

    it("stops an admin promoting themselves", async () => {
      const owner = await registerUser();
      const admin = await registerUser();
      const workspaceId = await createWorkspace(owner.token);

      await addMember(owner.token, workspaceId, admin.email, "admin").expect(201);

      await request(app)
        .patch(`/api/workspaces/${workspaceId}/members/${admin.id}`)
        .set("Authorization", `Bearer ${admin.token}`)
        .send({ role: "owner" })
        .expect(403);
    });

    it("stops the last owner demoting themselves", async () => {
      const owner = await registerUser();
      const workspaceId = await createWorkspace(owner.token);

      await request(app)
        .patch(`/api/workspaces/${workspaceId}/members/${owner.id}`)
        .set("Authorization", `Bearer ${owner.token}`)
        .send({ role: "admin" })
        .expect(400);
    });

    it("stops the last owner being removed", async () => {
      const owner = await registerUser();
      const workspaceId = await createWorkspace(owner.token);

      await request(app)
        .delete(`/api/workspaces/${workspaceId}/members/${owner.id}`)
        .set("Authorization", `Bearer ${owner.token}`)
        .expect(400);
    });

    it("allows an owner to step down once a second owner exists", async () => {
      const owner = await registerUser();
      const heir = await registerUser();
      const workspaceId = await createWorkspace(owner.token);

      await addMember(owner.token, workspaceId, heir.email, "owner").expect(201);

      await request(app)
        .patch(`/api/workspaces/${workspaceId}/members/${owner.id}`)
        .set("Authorization", `Bearer ${owner.token}`)
        .send({ role: "admin" })
        .expect(200);
    });

    it("stops a non-member reading the member list", async () => {
      const owner = await registerUser();
      const outsider = await registerUser();
      const workspaceId = await createWorkspace(owner.token);

      await request(app)
        .get(`/api/workspaces/${workspaceId}/members`)
        .set("Authorization", `Bearer ${outsider.token}`)
        .expect(403);
    });
  });

  it("unassigns a removed member's tasks", async () => {
    const owner = await registerUser();
    const mate = await registerUser();
    const workspaceId = await createWorkspace(owner.token);
    await addMember(owner.token, workspaceId, mate.email, "member").expect(201);

    const projectId = await createProject(owner.token, workspaceId);
    const taskId = await createTask(owner.token, workspaceId, projectId, { title: "Assigned" });

    await request(app)
      .patch(`/api/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ assigneeId: mate.id })
      .expect(200);

    await request(app)
      .delete(`/api/workspaces/${workspaceId}/members/${mate.id}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(200);

    const res = await request(app)
      .get(`/api/workspaces/${workspaceId}/projects/${projectId}/tasks`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(200);

    expect(res.body.tasks[0].assigneeId).toBeNull();
  });
});
