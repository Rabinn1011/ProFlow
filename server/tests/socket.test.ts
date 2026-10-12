import { createServer, type Server as HttpServer } from "http";
import type { AddressInfo } from "net";
import request from "supertest";
import { Server as SocketIOServer } from "socket.io";
import { io as connect, type Socket as ClientSocket } from "socket.io-client";
import app from "../src/app";
import { registerSocketHandlers } from "../src/socket";
import { addMember, createProject, createWorkspace, registerUser } from "./helpers";

let httpServer: HttpServer;
let ioServer: SocketIOServer;
let url: string;
const clients: ClientSocket[] = [];

beforeAll(async () => {
  httpServer = createServer(app);
  ioServer = new SocketIOServer(httpServer);
  registerSocketHandlers(ioServer);
  app.set("io", ioServer);
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  url = `http://localhost:${(httpServer.address() as AddressInfo).port}`;
});

afterEach(() => {
  while (clients.length) clients.pop()?.disconnect();
});

afterAll(async () => {
  await new Promise<void>((resolve) => ioServer.close(() => resolve()));
});

const open = (token: string): Promise<ClientSocket> =>
  new Promise((resolve, reject) => {
    const socket = connect(url, { auth: { token }, transports: ["websocket"], reconnection: false });
    clients.push(socket);
    socket.once("connect", () => resolve(socket));
    socket.once("connect_error", reject);
  });

const once = <T>(socket: ClientSocket, event: string): Promise<T> =>
  new Promise((resolve) => socket.once(event, resolve));

const join = async (socket: ClientSocket, projectId: string) => {
  socket.emit("project:join", { projectId });
  await once(socket, "project:joined");
};

describe("socket hardening", () => {
  it("survives junk payloads that used to crash the process", async () => {
    const user = await registerUser();
    const socket = await open(user.token);

    for (const junk of [null, undefined, 42, "str", [], { projectId: { $gt: "" } }]) {
      socket.emit("project:join", junk);
      socket.emit("chat:send", junk);
      socket.emit("project:leave", junk);
    }

    // Still alive and answering: a real join round-trips.
    const workspaceId = await createWorkspace(user.token);
    const projectId = await createProject(user.token, workspaceId);
    await join(socket, projectId);
  });

  it("stops a removed member hearing or posting in the project", async () => {
    const owner = await registerUser("Owner");
    const member = await registerUser("Member");
    const workspaceId = await createWorkspace(owner.token);
    const projectId = await createProject(owner.token, workspaceId);
    await addMember(owner.token, workspaceId, member.email, "member").expect(201);

    const ownerSocket = await open(owner.token);
    const memberSocket = await open(member.token);
    await join(ownerSocket, projectId);
    await join(memberSocket, projectId);

    await request(app)
      .delete(`/api/workspaces/${workspaceId}/members/${member.id}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(200);

    let leaked = false;
    memberSocket.on("chat:message", () => {
      leaked = true;
    });

    const delivered = once<{ message: { body: string } }>(ownerSocket, "chat:message");
    ownerSocket.emit("chat:send", { projectId, body: "members only" });
    expect((await delivered).message.body).toBe("members only");
    expect(leaked).toBe(false);

    const rejected = once<{ message: string }>(memberSocket, "chat:error");
    memberSocket.emit("chat:send", { projectId, body: "still here?" });
    expect((await rejected).message).toMatch(/join the project/i);
  });

  it("rate limits chat floods", async () => {
    const user = await registerUser();
    const workspaceId = await createWorkspace(user.token);
    const projectId = await createProject(user.token, workspaceId);
    const socket = await open(user.token);
    await join(socket, projectId);

    const throttled = once<{ message: string }>(socket, "chat:error");
    for (let i = 0; i < 15; i += 1) socket.emit("chat:send", { projectId, body: `spam ${i}` });

    expect((await throttled).message).toMatch(/too quickly/i);
  });
});
