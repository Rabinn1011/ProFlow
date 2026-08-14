import request from "supertest";
import app from "../src/app";
import { registerUser } from "./helpers";

describe("auth", () => {
  describe("POST /api/auth/register", () => {
    it("creates a user and returns an access token plus a refresh cookie", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ name: "Ada", email: "ada@example.com", password: "testpass123" })
        .expect(201);

      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.user).toMatchObject({ name: "Ada", email: "ada@example.com" });
      expect(res.body.user.password).toBeUndefined();

      const cookies = res.headers["set-cookie"] as unknown as string[];
      expect(cookies.join(";")).toContain("refreshToken=");
      expect(cookies.join(";")).toContain("HttpOnly");
    });

    it("rejects a missing field", async () => {
      await request(app)
        .post("/api/auth/register")
        .send({ email: "nobody@example.com", password: "testpass123" })
        .expect(400);
    });

    it("rejects a duplicate email", async () => {
      await request(app)
        .post("/api/auth/register")
        .send({ name: "First", email: "dupe@example.com", password: "testpass123" })
        .expect(201);

      await request(app)
        .post("/api/auth/register")
        .send({ name: "Second", email: "dupe@example.com", password: "testpass123" })
        .expect(409);
    });

    // Regression test for the privilege-escalation hole fixed in Increment 4.
    it("ignores a role supplied by the client", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Sneaky",
          email: "sneaky@example.com",
          password: "testpass123",
          role: "admin",
        })
        .expect(201);

      expect(res.body.user.role).toBe("member");
    });
  });

  describe("POST /api/auth/login", () => {
    it("accepts correct credentials", async () => {
      const user = await registerUser();

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: user.email, password: "testpass123" })
        .expect(200);

      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.user.email).toBe(user.email);
    });

    it("rejects a wrong password", async () => {
      const user = await registerUser();

      await request(app)
        .post("/api/auth/login")
        .send({ email: user.email, password: "wrongpassword" })
        .expect(401);
    });

    it("rejects an unknown email", async () => {
      await request(app)
        .post("/api/auth/login")
        .send({ email: "ghost@example.com", password: "testpass123" })
        .expect(401);
    });
  });

  describe("POST /api/auth/refresh", () => {
    it("issues a new access token from the refresh cookie", async () => {
      const user = await registerUser();

      const res = await request(app)
        .post("/api/auth/refresh")
        .set("Cookie", user.refreshCookie)
        .expect(200);

      expect(res.body.accessToken).toEqual(expect.any(String));
    });

    it("rejects a request with no cookie", async () => {
      await request(app).post("/api/auth/refresh").expect(401);
    });

    // The stored token is what makes logout actually revoke a session.
    it("rejects a refresh token that is no longer stored on the user", async () => {
      const user = await registerUser();

      await request(app).post("/api/auth/logout").set("Cookie", user.refreshCookie).expect(200);

      await request(app).post("/api/auth/refresh").set("Cookie", user.refreshCookie).expect(401);
    });
  });

  describe("GET /api/users/me", () => {
    it("returns the current user", async () => {
      const user = await registerUser("Grace");

      const res = await request(app)
        .get("/api/users/me")
        .set("Authorization", `Bearer ${user.token}`)
        .expect(200);

      expect(res.body.user).toMatchObject({ id: user.id, name: "Grace", email: user.email });
    });

    it("rejects a missing token", async () => {
      await request(app).get("/api/users/me").expect(401);
    });

    it("rejects a garbage token", async () => {
      await request(app)
        .get("/api/users/me")
        .set("Authorization", "Bearer not-a-real-token")
        .expect(401);
    });
  });
});
