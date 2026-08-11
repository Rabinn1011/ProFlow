// Verifies the Increment 6 socket handshake fix.
//   node socket-auth-test.mjs                 -> expects REJECTED
//   node socket-auth-test.mjs <accessToken>   -> expects CONNECTED
//
// Run from client/ so socket.io-client resolves:
//   node "<scratchpad>/socket-auth-test.mjs"

import { io } from "socket.io-client";

const URL = process.env.SOCKET_URL ?? "http://localhost:5000";
const token = process.argv[2] ?? null;

console.log(`\nConnecting to ${URL} ${token ? "WITH a token" : "with NO token"}...\n`);

const socket = io(URL, {
  transports: ["websocket"],
  auth: token ? { token } : {},
  reconnection: false,
});

socket.on("connect", () => {
  console.log("CONNECTED  id:", socket.id);
  if (!token) {
    console.log("FAIL: an anonymous client got in. The handshake is not authenticated.");
    process.exit(1);
  }
  console.log("PASS: authenticated client connected as expected.");

  // Optional second check: try joining a project you are not a member of.
  const projectId = process.env.PROJECT_ID;
  if (projectId) {
    socket.emit("project:join", { projectId });
    socket.on("project:joined", () => console.log(`joined project:${projectId}`));
    socket.on("project:join-denied", () => console.log(`DENIED project:${projectId}`));
    setTimeout(() => process.exit(0), 1500);
    return;
  }
  process.exit(0);
});

socket.on("connect_error", (err) => {
  console.log("REJECTED:", err.message);
  if (!token) {
    console.log("PASS: anonymous connection refused. Handshake auth is working.");
    process.exit(0);
  }
  console.log("FAIL: a token was supplied but the server refused it.");
  process.exit(1);
});

setTimeout(() => {
  console.log("Timed out with no response — is the server running?");
  process.exit(1);
}, 8000);
