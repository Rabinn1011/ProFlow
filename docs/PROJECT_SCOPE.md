# ProFlow — Project Scope & Requirements

> **Status:** Reconstructed 2026-07-20 from the existing README, data models, and route
> definitions after a long break from the project. Sections marked _(inferred)_ were not
> written down anywhere — they are derived from what the code already commits to, and are
> the ones most worth a second look before building on them.

---

## 1. What this is

A team project-management workspace — a focused Jira/Linear alternative.

A user signs up, creates a **workspace**, invites teammates with **roles**, and inside that
workspace creates **projects**. Each project has a **Kanban board** of tasks that the whole
team sees update **live**. Teams **chat** in real time, and the workspace owner gets
**analytics** on throughput and completion.

**The one-line pitch:** bridge the gap between a to-do list (too simple) and Jira (too much).

**What it is not:** not a Jira clone feature-for-feature. No sprints, epics, story points,
custom workflow builders, time tracking, or issue types. The board has three fixed columns.
If a feature isn't in Section 4, it is deliberately out of scope.

---

## 2. Who it's for

| Persona | Role | What they need |
|---|---|---|
| **Owner** | Created the workspace | Full control, can delete the workspace, sees analytics |
| **Admin** | Trusted lead | Manage members and projects, everything except deleting the workspace |
| **Member** | Regular contributor | Create/move/edit tasks, chat, comment |
| **Viewer** | Stakeholder / client | Read-only. Sees the board and analytics, changes nothing |

This four-tier model is already implemented and enforced —
see `server/src/middleware/workspace-access.middleware.ts`, which ranks
`owner(4) > admin(3) > member(2) > viewer(1)` and gates every route by a minimum role.

---

## 3. Core domain model

Already built in `server/src/models/`. This is the spine of the project — changing it is
expensive, so it's worth confirming it still matches the intent.

```
User ──creates──> Workspace ──contains──> Project ──contains──> Task
                      │
                      └── members[] { user, role, joinedAt }   (embedded, not a join table)
```

- **User** — name, email, bcrypt password, global role, stored refresh token.
- **Workspace** — the tenancy boundary. Members are embedded in the document, so a
  membership check is one query with no join. _(inferred rationale: read speed and
  simplicity; the tradeoff is that very large member lists get unwieldy — fine at this scale.)_
- **Project** — belongs to a workspace. Just a name, description, and creator.
- **Task** — the Kanban card. `status` is one of `todo | in_progress | done`, and `position`
  is a sortable number within a column.

**Every task carries both `workspaceId` and `projectId`.** This is denormalized on purpose:
it lets any query scope itself to a tenant without joining through the project. Keep it.

---

## 4. Feature requirements

### 4.1 Authentication — ✅ built

- Email/password registration and login, bcrypt-hashed (cost 10).
- Short-lived JWT access token (15 min default) sent in the `Authorization: Bearer` header.
- Long-lived refresh token (7 days) in an **httpOnly, sameSite=strict** cookie, never
  readable by JavaScript.
- The client transparently retries once through `/auth/refresh` on any 401
  — implemented in `client/src/lib/authFetch.ts`.
- Logout clears the cookie and unsets the stored refresh token server-side.

**Deferred:** Google/GitHub social login. The original README promised it; it is a
significant chunk of work for a login method nobody has asked for yet. Explicitly punted to
post-v1 unless it becomes a portfolio talking point worth the time.

### 4.2 Workspaces & membership — 🟡 partly built

Built: create, list, read, update, delete, all role-gated.

**Missing, and this is the highest-value gap:** there is **no way to invite anyone.**
No invite endpoint exists, so a workspace can only ever contain its creator. "Invite team
members with different roles" is half the product's premise, and the entire RBAC system
is currently theoretical because no workspace can have a second member.

Required to close it:
- `POST /api/workspaces/:id/members` — invite by email, assign a role. Admin+.
- `PATCH /api/workspaces/:id/members/:userId` — change a role. Admin+.
- `DELETE /api/workspaces/:id/members/:userId` — remove. Admin+.
- Guard rails: the last owner cannot be removed or demoted; nobody can promote another
  member above their own rank.

_(Design decision to make: does inviting an email that has no account yet create a pending
invite, or does it just fail? Simplest v1 — only existing users can be invited.)_

### 4.3 Projects — ✅ built

Full CRUD, nested under a workspace, role-gated (members create, admins delete).

### 4.4 Kanban board — 🟡 API built, **UI does not exist**

The entire backend is ready: list, create, update, delete, and a dedicated
`POST .../tasks/:taskId/move` that sets `status` + `position` and broadcasts the change.

Nothing on the frontend consumes it. No board, no column, no card component. The dependency
that was chosen for drag-and-drop, `@hello-pangea/dnd`, is not installed.

Requirements:
- Three columns — To Do, In Progress, Done.
- Drag a card between columns or reorder within one → calls the `move` endpoint.
- **Optimistic UI:** the card moves instantly on drop and rolls back if the request fails.
  A board that waits for a round-trip before moving feels broken.
- Click a card to open a detail panel: title, description, assignee, due date.
- Viewers can see the board but cannot drag.

### 4.5 Real-time collaboration — 🟡 skeleton only

What exists: a Socket.io server, `project:join` / `project:leave` room handlers, and exactly
one broadcast — `task:moved`, fired by the move controller. The client hook connects, and its
listener is an empty placeholder with a `// later` comment.

Requirements to finish:
- Broadcast `task:created`, `task:updated`, `task:deleted` too — currently only moves
  propagate, so a teammate's new card silently doesn't appear.
- Client listeners update the React Query cache in place rather than refetching the board.
- **Authenticate the socket handshake.** Right now any anonymous connection can join any
  `project:<id>` room and watch a private team's activity. This is a security gap, not a
  polish item.
- Reconnect cleanly and re-sync after connection loss.

### 4.6 Chat — ❌ not started

Real-time messaging per project. Nothing exists: no message model, no routes, no UI.

Minimum viable version:
- A `Message` model — workspaceId, projectId, author, body, createdAt.
- Send/receive over the existing Socket.io connection.
- Persist messages and load the last ~50 on open.
- Viewers can read; whether they can post is _(undecided — leaning yes, they're stakeholders
  who need to ask questions)_.

Out of scope: threads, reactions, file attachments, DMs, editing, typing indicators.

### 4.7 Analytics — ❌ not started

The README's specific promise was **MongoDB aggregation pipelines** — the point being to
demonstrate real aggregation work rather than counting arrays in JavaScript. Worth honoring;
it's the most technically interesting piece left.

Target metrics:
- Task count by status, per project (the pipeline behind every other chart).
- Completion rate over time — tasks moved to `done` per day/week.
- Per-member throughput — who closed what.
- Overdue tasks — `dueDate` in the past and status is not `done`.

Rendered with Recharts. Owner and admin only.

### 4.8 File uploads — ❌ not started, and probably cut

The README listed Multer + Cloudinary/S3. Nothing references it and no feature currently
needs a file. **Recommend cutting** unless chat attachments or task avatars become real
requirements — it adds a paid external dependency for no current user value.

---

## 5. Technical decisions worth remembering

**Stack:** React 19 + Vite + TypeScript on the client, Express 5 + Mongoose 9 on the server,
MongoDB, Socket.io both ends, Tailwind for styling.

**Why the API is deeply nested** (`/api/workspaces/:wsId/projects/:pId/tasks/:taskId`):
every request carries its full tenancy path, so a single middleware chain can resolve the
workspace, confirm membership, and check role rank before the controller ever runs. The
controllers stay free of authorization logic. This is the best structural idea in the
codebase — preserve it.

**State management is currently duplicated.** Redux Toolkit is installed and wired into
`main.tsx` with an **empty reducer**, while Zustand does all the real auth state work.
React Query is installed for server state. Three libraries, one of them dead weight.
**Decision: drop Redux, keep Zustand for client state and React Query for server state.**

**Visual language (decided 2026-07-22): light theme, violet accent.** Page background
`slate-50`; white surfaces with `border-slate-200` + `shadow-sm`; text `slate-900/800/500`;
accent `violet-600` (hover `violet-700`), tinted chips `violet-50`/`violet-700`; errors
`rose-50`/`rose-700`; motion limited to fades/lifts ≤0.35s (`animate-fade-in-up`,
`animate-fade-in` in the Tailwind config). Every new page follows this — no dark surfaces,
no gradients on buttons.

**Tokens live in memory, not localStorage.** Access tokens are held in the Zustand store and
vanish on refresh; the httpOnly refresh cookie re-establishes the session. This is the
correct security posture — it is not a bug that a hard refresh briefly logs you out, though
it does mean the app needs to attempt a silent refresh on boot _(currently it doesn't —
a page reload dumps you to the login screen)_.

---

## 6. Known defects

1. ~~**Login is broken** (env vars read before dotenv loaded)~~ — **fixed 2026-07-22.**
   Secrets now read at call time; `config/env.ts` loads dotenv before the import chain.
   Verified end-to-end against Atlas: register → login → refresh → protected route → logout.
2. ~~**Register and login return different shapes**~~ — **fixed 2026-07-22.** Register now
   mirrors login: `{ accessToken, user }` + refresh cookie.
3. **Unauthenticated sockets** — see 4.5. Still open.
4. ~~**No `.env` / `.env.example`**~~ — **fixed 2026-07-22.** `.env.example` committed;
   real `.env` configured with Atlas (non-SRV URI — SRV DNS lookups fail on this machine).
5. **No silent refresh on app boot** — still open. A hard refresh dumps you to login even
   with a valid refresh cookie.
6. **33 pre-existing TypeScript errors** in server controllers — `createdAt`/`updatedAt`
   missing from the `I*Document` interfaces (Mongoose timestamps not typed). `dev` mode
   transpiles anyway, but `npm run build` fails. Still open.
7. **`server/dist/` is committed to git** despite being gitignored (tracked before the
   ignore rule). Needs `git rm -r --cached server/dist`. Still open.

---

## 7. Where this actually stands

Against the README's original six phases:

| Phase | Status |
|---|---|
| 1 — Express + TS + secure auth | ✅ Done (modulo the env bug) |
| 2 — Workspace/project CRUD + protected routing | 🟡 Backend done; frontend is login + a workspace list |
| 3 — Kanban board with drag-and-drop | ❌ API ready, zero UI |
| 4 — Socket.io real-time | 🟡 Skeleton, one event, unauthenticated |
| 5 — Analytics dashboard | ❌ Not started |
| 6 — Docker + CI/CD | ❌ Not started |

**Roughly: backend ~60%, frontend ~15%.**

The honest summary is that the server is in good shape and the client stopped at the exact
moment the interesting UI work began.

---

## 8. Suggested order of work

1. **Fix the auth bugs** (Section 6, items 1–2) and add `.env.example`. Everything else is
   blocked behind login actually working. ~30 minutes.
2. **Signup page** — the endpoint exists and has no UI.
3. **Member invites** (4.2) — until this ships, the product is single-player and the entire
   RBAC layer is untested by reality.
4. **Kanban board** (4.4) — the centerpiece, and the thing worth showing someone.
5. **Finish real-time** (4.5) — including the socket auth fix. Do this right after the board,
   while the cache-update code is fresh.
6. **Analytics** (4.7) — self-contained, and the best demonstration of backend skill.
7. **Chat** (4.6) — largest remaining surface, least essential to the core pitch.
8. **Docker + CI** — last, once there's something stable to containerize.

Testing was promised in the README (Jest + Supertest) and no test exists. The RBAC middleware
is the piece most worth covering, and the easiest to test in isolation.
