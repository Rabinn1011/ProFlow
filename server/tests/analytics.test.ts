import request from "supertest";
import app from "../src/app";
import { createProject, createTask, createWorkspace, registerUser } from "./helpers";

const getAnalytics = (token: string, workspaceId: string, days?: number) =>
  request(app)
    .get(`/api/workspaces/${workspaceId}/analytics${days ? `?days=${days}` : ""}`)
    .set("Authorization", `Bearer ${token}`);

describe("analytics aggregations", () => {
  it("counts tasks by status across the workspace", async () => {
    const owner = await registerUser();
    const workspaceId = await createWorkspace(owner.token);
    const projectId = await createProject(owner.token, workspaceId);

    await createTask(owner.token, workspaceId, projectId, { status: "todo" });
    await createTask(owner.token, workspaceId, projectId, { status: "todo" });
    await createTask(owner.token, workspaceId, projectId, { status: "in_progress" });
    await createTask(owner.token, workspaceId, projectId, { status: "done" });

    const res = await getAnalytics(owner.token, workspaceId).expect(200);

    expect(res.body.totals).toMatchObject({ todo: 2, in_progress: 1, done: 1, total: 4 });
  });

  it("splits counts per project and sorts by size", async () => {
    const owner = await registerUser();
    const workspaceId = await createWorkspace(owner.token);
    const big = await createProject(owner.token, workspaceId, "Big");
    const small = await createProject(owner.token, workspaceId, "Small");

    await createTask(owner.token, workspaceId, big, { status: "todo" });
    await createTask(owner.token, workspaceId, big, { status: "done" });
    await createTask(owner.token, workspaceId, small, { status: "todo" });

    const res = await getAnalytics(owner.token, workspaceId).expect(200);

    expect(res.body.byProject).toHaveLength(2);
    expect(res.body.byProject[0]).toMatchObject({ name: "Big", total: 2, todo: 1, done: 1 });
    expect(res.body.byProject[1]).toMatchObject({ name: "Small", total: 1, todo: 1 });
  });

  it("counts only overdue tasks that are not done", async () => {
    const owner = await registerUser();
    const workspaceId = await createWorkspace(owner.token);
    const projectId = await createProject(owner.token, workspaceId);

    const yesterday = new Date(Date.now() - 86_400_000).toISOString();
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString();

    const overdue = await createTask(owner.token, workspaceId, projectId, { status: "todo" });
    const future = await createTask(owner.token, workspaceId, projectId, { status: "todo" });
    const finished = await createTask(owner.token, workspaceId, projectId, { status: "done" });

    const patch = (taskId: string, dueDate: string) =>
      request(app)
        .patch(`/api/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`)
        .set("Authorization", `Bearer ${owner.token}`)
        .send({ dueDate })
        .expect(200);

    await patch(overdue, yesterday);
    await patch(future, tomorrow);
    await patch(finished, yesterday);

    const res = await getAnalytics(owner.token, workspaceId).expect(200);

    // Only the not-done past-due task counts; a task with no due date never does.
    expect(res.body.totals.overdue).toBe(1);
  });

  it("returns one completion bucket per day in the range", async () => {
    const owner = await registerUser();
    const workspaceId = await createWorkspace(owner.token);
    const projectId = await createProject(owner.token, workspaceId);

    await createTask(owner.token, workspaceId, projectId, { status: "done" });
    await createTask(owner.token, workspaceId, projectId, { status: "done" });

    const res = await getAnalytics(owner.token, workspaceId, 7).expect(200);

    expect(res.body.completions).toHaveLength(7);
    expect(res.body.completions.at(-1)).toMatchObject({ count: 2 });
    // Zero-filled days keep the chart axis continuous.
    expect(res.body.completions[0].count).toBe(0);
  });

  it("clamps an absurd range instead of trusting the query string", async () => {
    const owner = await registerUser();
    const workspaceId = await createWorkspace(owner.token);

    const res = await getAnalytics(owner.token, workspaceId, 100_000).expect(200);
    expect(res.body.days).toBe(180);

    const bad = await getAnalytics(owner.token, workspaceId, Number("abc")).expect(200);
    expect(bad.body.days).toBe(30);
  });

  it("groups unassigned completions under a single bucket", async () => {
    const owner = await registerUser();
    const workspaceId = await createWorkspace(owner.token);
    const projectId = await createProject(owner.token, workspaceId);

    await createTask(owner.token, workspaceId, projectId, { status: "done" });
    await createTask(owner.token, workspaceId, projectId, { status: "done" });

    const res = await getAnalytics(owner.token, workspaceId).expect(200);

    expect(res.body.throughput).toEqual([{ userId: null, name: "Unassigned", completed: 2 }]);
  });

  it("attributes completions to the assignee", async () => {
    const owner = await registerUser("Owner");
    const workspaceId = await createWorkspace(owner.token);
    const projectId = await createProject(owner.token, workspaceId);
    const taskId = await createTask(owner.token, workspaceId, projectId, { status: "todo" });

    await request(app)
      .patch(`/api/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ assigneeId: owner.id, status: "done" })
      .expect(200);

    const res = await getAnalytics(owner.token, workspaceId).expect(200);

    expect(res.body.throughput).toEqual([
      { userId: owner.id, name: "Owner", completed: 1 },
    ]);
  });
});

describe("completedAt lifecycle", () => {
  it("is set when a task becomes done and cleared when it leaves", async () => {
    const owner = await registerUser();
    const workspaceId = await createWorkspace(owner.token);
    const projectId = await createProject(owner.token, workspaceId);
    const taskId = await createTask(owner.token, workspaceId, projectId, { status: "todo" });

    const url = `/api/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`;

    const created = await request(app)
      .get(`/api/workspaces/${workspaceId}/projects/${projectId}/tasks`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(200);
    expect(created.body.tasks[0].completedAt).toBeNull();

    const done = await request(app)
      .patch(url)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ status: "done" })
      .expect(200);
    expect(done.body.task.completedAt).not.toBeNull();

    const reopened = await request(app)
      .patch(url)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ status: "todo" })
      .expect(200);
    expect(reopened.body.task.completedAt).toBeNull();
  });

  // Regression guard: updatedAt changes on every edit, completedAt must not.
  it("does not move when an unrelated field is edited", async () => {
    const owner = await registerUser();
    const workspaceId = await createWorkspace(owner.token);
    const projectId = await createProject(owner.token, workspaceId);
    const taskId = await createTask(owner.token, workspaceId, projectId, { status: "done" });

    const url = `/api/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`;

    const before = await request(app)
      .patch(url)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ title: "First edit" })
      .expect(200);

    await new Promise((resolve) => setTimeout(resolve, 20));

    const after = await request(app)
      .patch(url)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ title: "Second edit" })
      .expect(200);

    expect(after.body.task.completedAt).toBe(before.body.task.completedAt);
    expect(after.body.task.updatedAt).not.toBe(before.body.task.updatedAt);
  });
});
