import request from "supertest";
import app from "../src/app";

export type TestUser = {
  id: string;
  name: string;
  email: string;
  token: string;
  refreshCookie: string;
};

let counter = 0;

// Registering through the API rather than the model keeps tokens and cookies real,
// which is the point of these suites.
export const registerUser = async (name = "Test User"): Promise<TestUser> => {
  counter += 1;
  const email = `user${counter}@example.com`;

  const res = await request(app)
    .post("/api/auth/register")
    .send({ name, email, password: "testpass123" })
    .expect(201);

  const setCookie = res.headers["set-cookie"] as unknown as string[] | undefined;

  return {
    id: res.body.user.id,
    name,
    email,
    token: res.body.accessToken,
    refreshCookie: setCookie?.[0] ?? "",
  };
};

export const createWorkspace = async (token: string, name = "Test Workspace"): Promise<string> => {
  const res = await request(app)
    .post("/api/workspaces")
    .set("Authorization", `Bearer ${token}`)
    .send({ name })
    .expect(201);

  return res.body.workspace.id;
};

export const createProject = async (
  token: string,
  workspaceId: string,
  name = "Test Project",
): Promise<string> => {
  const res = await request(app)
    .post(`/api/workspaces/${workspaceId}/projects`)
    .set("Authorization", `Bearer ${token}`)
    .send({ name })
    .expect(201);

  return res.body.project.id;
};

export const createTask = async (
  token: string,
  workspaceId: string,
  projectId: string,
  body: Record<string, unknown>,
): Promise<string> => {
  const res = await request(app)
    .post(`/api/workspaces/${workspaceId}/projects/${projectId}/tasks`)
    .set("Authorization", `Bearer ${token}`)
    .send({ title: "Test task", ...body })
    .expect(201);

  return res.body.task.id;
};

export const addMember = (
  token: string,
  workspaceId: string,
  email: string,
  role: string,
) =>
  request(app)
    .post(`/api/workspaces/${workspaceId}/members`)
    .set("Authorization", `Bearer ${token}`)
    .send({ email, role });
