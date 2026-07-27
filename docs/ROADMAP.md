# ProFlow — Incremental Build Roadmap

Companion to [PROJECT_SCOPE.md](./PROJECT_SCOPE.md): the scope says *what*, this says
*in what order*. Each increment is sized for one sitting, ships something visible or
testable, and has an explicit "done when". Work top to bottom; tick things off as we go.

**Status legend:** ☐ not started · ◐ in progress · ✅ done

---

## Increment 0 — Repo hygiene ✅ (2026-07-22)

Auth env bug fixed, register/login response unified, `.env.example` added, missing deps
installed (`cookie-parser`, client `node_modules`), light violet theme established.

Leftovers closed 2026-07-27:
- ✅ `server/dist` untracked (`git rm -r --cached server/dist`)
- ✅ TS errors fixed — `createdAt`/`updatedAt` (and `id` on `IWorkspaceDocument`) added to the
  `I*Document` interfaces; `req.params` narrowed to `string` in the two controllers Express 5
  types as `string | string[]`. `npm run build` passes clean.

---

## Increment 1 — Signup page ✅ (2026-07-27)

- `client/src/pages/Register.tsx` — name/email/password/confirm via react-hook-form
  (`mode: "onBlur"`), matching Login's layout language; show/hide password toggle
- Route `/register` outside `ProtectedRoute`; cross-links both ways via `<Link>`
- Confirm-password matching with a `validate` rule reading `getValues("password")`
- On success: `setAuth({ user, accessToken })` → `/app`; 409 "Email already in use"
  surfaces in the error banner

Verified end-to-end against a running server: fresh signup lands on the dashboard, a
duplicate email shows the error.

Known rough edge, deliberately deferred: the confirm-password error doesn't re-validate
when the *password* field is edited afterwards.

## Increment 2 — Session survives refresh ☐

Currently F5 dumps a logged-in user back to `/login` even with a valid refresh cookie.

- On app boot, call `POST /auth/refresh`; if it succeeds, fetch `GET /users/me` and
  hydrate the auth store before rendering protected routes
- A loading state while that happens (blank flash → brief spinner, not a login flicker)

**Done when:** log in, hit F5, still on the dashboard.

## Increment 3 — Workspace CRUD in the UI ☐

Kill the "create one via API for now" placeholder.

- "New workspace" button + modal on the dashboard
- Rename (admin+) and delete (owner, with confirm) on each card
- Move workspace fetching from raw `useState`/`useEffect` to React Query — it's installed
  and unused; this is the moment it starts paying rent

**Done when:** full workspace lifecycle from the UI, no curl.

## Increment 4 — Projects page + routing ☐

- Click a workspace → `/app/workspaces/:id` — project list page
- Create / rename / delete projects (role-gated buttons)
- Breadcrumb navigation (Workspaces / {name})

**Done when:** navigate workspace → project list → create a project → land on its (empty)
board route.

## Increment 5 — The Kanban board (read + create) ☐

The centerpiece, split in two. First: render it.

- `/app/workspaces/:wsId/projects/:pId` — three columns (To Do / In Progress / Done)
  from `GET .../tasks`, sorted by `position`
- "Add task" per column; task card shows title + due date
- Task detail panel (click card): edit title/description/status/due date, delete

**Done when:** tasks created and edited entirely from the board UI.

## Increment 6 — Drag & drop + real-time ☐

Second half: make it move, together.

- Install `@hello-pangea/dnd`; drag between/within columns → `POST .../move` with
  optimistic update + rollback on failure
- Broadcast `task:created/updated/deleted` from the server (only `task:moved` exists)
- Client joins `project:<id>` room; socket events patch the React Query cache in place
- **Authenticate the socket handshake with the access token** — closes the open security
  gap (scope §4.5)

**Done when:** two browser windows, same board — drag in one, it moves in the other,
and an anonymous socket client can't join the room.

## Increment 7 — Member invites ☐

Until this, the product is single-player and RBAC is theoretical (scope §4.2).

- Backend: `POST/PATCH/DELETE /workspaces/:id/members` (+ guard rails: last owner
  protected, no promoting above your own rank; invite by email, existing users only)
- Frontend: members panel in the workspace — list, invite, change role, remove
- Viewer role actually enforced in the UI (no drag, no edit buttons)

**Done when:** second account invited as viewer sees the board read-only; as member,
can move tasks and it syncs live.

## Increment 8 — Analytics ☐

- Aggregation endpoints (scope §4.7): status counts, completions over time, per-member
  throughput, overdue
- `/app/workspaces/:id/analytics` with Recharts, owner/admin only

**Done when:** charts render real numbers from the aggregation pipeline (verifiable
against the board).

## Increment 9 — Chat ☐

- `Message` model + history endpoint (last 50, paginated)
- Socket send/receive in the project room (auth from Increment 6 reused)
- Chat panel on the project page

**Done when:** two accounts hold a conversation that survives a refresh.

## Increment 10 — Hardening & ship ☐

- Jest + Supertest: auth flow, RBAC middleware, invite guard rails at minimum
- Dockerfile + compose (server, client, local Mongo)
- GitHub Actions: typecheck + tests on push
- README rewritten to match reality (screenshots, setup, features)

**Done when:** `docker compose up` on a clean machine gives a working ProFlow;
CI is green.

---

## Deliberately not on the roadmap

Social login, file uploads, sprints/epics/story points, threads/reactions in chat,
custom board columns. See scope §1 and §4.8 — cut or deferred on purpose.
