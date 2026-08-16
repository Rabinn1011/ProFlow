import request from "supertest";
import app from "../src/app";
import { Message } from "../src/models/message.model";
import { addMember, createProject, createWorkspace, registerUser } from "./helpers";

const seed = async (workspaceId: string, projectId: string, author: string, count: number) => {
  // Explicit createdAt so ordering is deterministic rather than dependent on insert speed.
  const base = Date.now() - count * 1000;
  await Message.insertMany(
    Array.from({ length: count }, (_, i) => ({
      workspaceId,
      projectId,
      author,
      body: `message ${i}`,
      createdAt: new Date(base + i * 1000),
      updatedAt: new Date(base + i * 1000),
    })),
  );
};

describe("message history", () => {
  it("returns messages oldest-first with the author name joined", async () => {
    const owner = await registerUser("Ada");
    const workspaceId = await createWorkspace(owner.token);
    const projectId = await createProject(owner.token, workspaceId);
    await seed(workspaceId, projectId, owner.id, 3);

    const res = await request(app)
      .get(`/api/workspaces/${workspaceId}/projects/${projectId}/messages`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(200);

    expect(res.body.messages).toHaveLength(3);
    expect(res.body.messages.map((m: { body: string }) => m.body)).toEqual([
      "message 0",
      "message 1",
      "message 2",
    ]);
    expect(res.body.messages[0].author).toMatchObject({ id: owner.id, name: "Ada" });
    expect(res.body.hasMore).toBe(false);
    expect(res.body.nextCursor).toBeNull();
  });

  it("caps a page at 50 and reports more remaining", async () => {
    const owner = await registerUser();
    const workspaceId = await createWorkspace(owner.token);
    const projectId = await createProject(owner.token, workspaceId);
    await seed(workspaceId, projectId, owner.id, 60);

    const res = await request(app)
      .get(`/api/workspaces/${workspaceId}/projects/${projectId}/messages`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(200);

    expect(res.body.messages).toHaveLength(50);
    expect(res.body.hasMore).toBe(true);
    expect(res.body.nextCursor).toEqual(expect.any(String));
    // The newest 50 of 60, so the page starts at message 10.
    expect(res.body.messages[0].body).toBe("message 10");
    expect(res.body.messages.at(-1).body).toBe("message 59");
  });

  it("walks backwards through history with the cursor", async () => {
    const owner = await registerUser();
    const workspaceId = await createWorkspace(owner.token);
    const projectId = await createProject(owner.token, workspaceId);
    await seed(workspaceId, projectId, owner.id, 60);

    const first = await request(app)
      .get(`/api/workspaces/${workspaceId}/projects/${projectId}/messages`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(200);

    const older = await request(app)
      .get(
        `/api/workspaces/${workspaceId}/projects/${projectId}/messages?before=${encodeURIComponent(
          first.body.nextCursor,
        )}`,
      )
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(200);

    expect(older.body.messages).toHaveLength(10);
    expect(older.body.messages[0].body).toBe("message 0");
    expect(older.body.messages.at(-1).body).toBe("message 9");
    expect(older.body.hasMore).toBe(false);
  });

  it("does not leak messages from another project", async () => {
    const owner = await registerUser();
    const workspaceId = await createWorkspace(owner.token);
    const a = await createProject(owner.token, workspaceId, "A");
    const b = await createProject(owner.token, workspaceId, "B");

    await seed(workspaceId, a, owner.id, 3);

    const res = await request(app)
      .get(`/api/workspaces/${workspaceId}/projects/${b}/messages`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(200);

    expect(res.body.messages).toHaveLength(0);
  });

  it("lets a viewer read the history (scope 4.6)", async () => {
    const owner = await registerUser();
    const viewer = await registerUser();
    const workspaceId = await createWorkspace(owner.token);
    await addMember(owner.token, workspaceId, viewer.email, "viewer").expect(201);
    const projectId = await createProject(owner.token, workspaceId);
    await seed(workspaceId, projectId, owner.id, 2);

    const res = await request(app)
      .get(`/api/workspaces/${workspaceId}/projects/${projectId}/messages`)
      .set("Authorization", `Bearer ${viewer.token}`)
      .expect(200);

    expect(res.body.messages).toHaveLength(2);
  });

  it("rejects a non-member", async () => {
    const owner = await registerUser();
    const outsider = await registerUser();
    const workspaceId = await createWorkspace(owner.token);
    const projectId = await createProject(owner.token, workspaceId);

    await request(app)
      .get(`/api/workspaces/${workspaceId}/projects/${projectId}/messages`)
      .set("Authorization", `Bearer ${outsider.token}`)
      .expect(403);
  });
});
