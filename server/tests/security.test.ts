import request from "supertest";
import app from "../src/app";
import { User } from "../src/models/user.model";
import { Message } from "../src/models/message.model";
import { addMember, createProject, createWorkspace, registerUser } from "./helpers";

// Pulls "refreshToken=<value>" out of a response, ignoring the clearing cookies.
const refreshCookieFrom = (res: request.Response): string => {
  const cookies = (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
  const match = cookies.find((c) => /^refreshToken=[^;]+/.test(c));
  return match ? match.split(";")[0] : "";
};

const refreshWith = (cookie: string) => request(app).post("/api/auth/refresh").set("Cookie", cookie);

describe("security hardening", () => {
  describe("refresh token rotation", () => {
    it("rotates the refresh cookie on every refresh", async () => {
      const user = await registerUser();
      const original = user.refreshCookie.split(";")[0];

      const res = await refreshWith(original).expect(200);
      const rotated = refreshCookieFrom(res);

      expect(rotated).toMatch(/^refreshToken=/);
      expect(rotated).not.toBe(original);
      await refreshWith(rotated).expect(200);
    });

    it("tolerates a parallel refresh with the previous token inside the grace window", async () => {
      const user = await registerUser();
      const original = user.refreshCookie.split(";")[0];

      await refreshWith(original).expect(200);
      const res = await refreshWith(original).expect(200);

      expect(res.body.accessToken).toEqual(expect.any(String));
      // The loser must not overwrite the winner's cookie.
      expect(refreshCookieFrom(res)).toBe("");
    });

    it("revokes the session when an old token is replayed after the grace window", async () => {
      const user = await registerUser();
      const original = user.refreshCookie.split(";")[0];

      const rotated = refreshCookieFrom(await refreshWith(original).expect(200));

      await User.updateOne(
        { _id: user.id },
        { $set: { "sessions.$[].rotatedAt": new Date(Date.now() - 60 * 60 * 1000) } },
      );

      await refreshWith(original).expect(401);
      // The legitimate holder is logged out too: we cannot tell which copy is the thief's.
      await refreshWith(rotated).expect(401);
    });

    it("never stores the raw refresh token", async () => {
      const user = await registerUser();
      const raw = user.refreshCookie.split(";")[0].replace("refreshToken=", "");

      const stored = await User.findById(user.id).select("+sessions").lean();
      expect(stored?.sessions).toHaveLength(1);
      expect(JSON.stringify(stored)).not.toContain(raw);
    });

    it("keeps separate sessions per device and signs out all of them on request", async () => {
      const user = await registerUser();
      const laptop = user.refreshCookie.split(";")[0];

      const phoneLogin = await request(app)
        .post("/api/auth/login")
        .send({ email: user.email, password: "testpass123" })
        .expect(200);
      const phone = refreshCookieFrom(phoneLogin);

      // Logging in on the phone used to log the laptop out.
      await refreshWith(laptop).expect(200);

      await request(app)
        .post("/api/auth/logout-all")
        .set("Authorization", `Bearer ${user.token}`)
        .expect(200);

      await refreshWith(phone).expect(401);
    });
  });

  describe("CSRF origin check", () => {
    it("rejects cookie-authenticated calls from an unknown site", async () => {
      const user = await registerUser();
      await refreshWith(user.refreshCookie)
        .set("Origin", "https://evil.example.com")
        .expect(403);
    });

    it("allows the configured client origin", async () => {
      const user = await registerUser();
      await refreshWith(user.refreshCookie).set("Origin", "http://localhost:5173").expect(200);
    });
  });

  describe("input handling", () => {
    it("answers malformed JSON with 400, not a 500 with internals", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .set("Content-Type", "application/json")
        .send("{not json")
        .expect(400);
      expect(res.body.message).toBe("Malformed JSON body");
    });

    it("rejects non-string credentials instead of crashing", async () => {
      await request(app)
        .post("/api/auth/login")
        .send({ email: { $gt: "" }, password: "x" })
        .expect(400);
    });

    it("enforces a minimum password length", async () => {
      await request(app)
        .post("/api/auth/register")
        .send({ name: "Short", email: "short@example.com", password: "abc" })
        .expect(400);
    });

    it("caps text field lengths", async () => {
      const owner = await registerUser();
      const workspaceId = await createWorkspace(owner.token);
      const projectId = await createProject(owner.token, workspaceId);

      await request(app)
        .post(`/api/workspaces/${workspaceId}/projects/${projectId}/tasks`)
        .set("Authorization", `Bearer ${owner.token}`)
        .send({ title: "x".repeat(301) })
        .expect(400);
    });
  });

  describe("membership integrity", () => {
    it("never leaves a workspace ownerless when two owners demote each other at once", async () => {
      const a = await registerUser("Owner A");
      const b = await registerUser("Owner B");
      const workspaceId = await createWorkspace(a.token);
      await addMember(a.token, workspaceId, b.email, "owner").expect(201);

      const demote = (actor: string, target: string) =>
        request(app)
          .patch(`/api/workspaces/${workspaceId}/members/${target}`)
          .set("Authorization", `Bearer ${actor}`)
          .send({ role: "member" });

      const results = await Promise.all([demote(a.token, b.id), demote(b.token, a.id)]);
      expect(results.map((r) => r.status).sort()).toEqual([200, 400]);

      const members = await request(app)
        .get(`/api/workspaces/${workspaceId}/members`)
        .set("Authorization", `Bearer ${a.token}`)
        .expect(200);
      const owners = (members.body.members as { role: string }[]).filter((m) => m.role === "owner");
      expect(owners).toHaveLength(1);
    });

    it("lets a plain member leave, but not remove anyone else", async () => {
      const owner = await registerUser();
      const m1 = await registerUser();
      const m2 = await registerUser();
      const workspaceId = await createWorkspace(owner.token);
      await addMember(owner.token, workspaceId, m1.email, "member").expect(201);
      await addMember(owner.token, workspaceId, m2.email, "member").expect(201);

      await request(app)
        .delete(`/api/workspaces/${workspaceId}/members/${m2.id}`)
        .set("Authorization", `Bearer ${m1.token}`)
        .expect(403);

      await request(app)
        .delete(`/api/workspaces/${workspaceId}/members/${m1.id}`)
        .set("Authorization", `Bearer ${m1.token}`)
        .expect(200);
    });
  });

  it("deletes a workspace's chat history along with it", async () => {
    const owner = await registerUser();
    const workspaceId = await createWorkspace(owner.token);
    const projectId = await createProject(owner.token, workspaceId);
    await Message.create({ workspaceId, projectId, author: owner.id, body: "hello" });

    await request(app)
      .delete(`/api/workspaces/${workspaceId}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(204);

    expect(await Message.countDocuments({ workspaceId })).toBe(0);
  });
});
