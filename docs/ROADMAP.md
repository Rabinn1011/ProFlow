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

## Increment 2 — Session survives refresh ✅ (2026-07-27)

- `useAuthBootstrap()` runs once on mount: `POST /auth/refresh` → `GET /users/me` with the
  fresh token → `setAuth`. Uses plain `fetch`, not `authFetch` — the latter calls `logout()`
  when the store has no user, which is exactly the cold-boot state.
- `isBootstrapping` in the auth store (defaults `true`); `ProtectedRoute` checks it *before*
  `isAuthenticated` and renders a spinner, so the guard never answers before the answer exists.

Verified in the browser: log in → F5 → still on the dashboard, no login flicker.

Deferred: `/login` and `/register` don't bounce an already-authenticated user to `/app`.

## Increment 3 — Workspace CRUD in the UI ✅ (2026-07-27)

- `services/workspace.service.ts` (list/create/rename/delete over `authFetch`) +
  `hooks/useWorkspaces.ts` wrapping them in React Query; mutations invalidate the
  `["workspaces"]` key, so the list refetches itself. The raw `useState`/`useEffect` fetch
  in `Dashboard` is gone.
- Reusable `Modal` shell + `WorkspaceFormModal` (create/rename) and `ConfirmDialog` (delete).
- Role gating from the workspace's own `members[]`: rename needs admin+, delete is
  owner-only. `lib/workspaceRole.ts` mirrors the server's rank table — keep the two in sync.
- Loading skeletons while the list is pending; per-dialog error banners.

**Done when:** full workspace lifecycle from the UI, no curl. ✅

## Increment 4 — Projects page + routing ✅ (2026-07-27)

- `/app/workspaces/:workspaceId` (project list) and
  `/app/workspaces/:workspaceId/projects/:projectId` (board placeholder), both inside
  `ProtectedRoute`
- `services/project.service.ts` + `hooks/useProjects.ts` (React Query, key
  `["workspaces", id, "projects"]`); `useWorkspace(id)` added for the breadcrumb name and role
- Create/edit (member+) and delete (admin+) via `ProjectFormModal` and `ConfirmDialog`
- `Breadcrumbs` + `AppHeader` extracted; `Dashboard` now uses `AppHeader` too

Fixed along the way:
- **Cascade deletes.** Deleting a workspace left its projects and tasks orphaned; deleting a
  project left its tasks orphaned. Both now `deleteMany` their children first.
- **Mass assignment on `role`** (scope §6 defect 8) — `register` no longer reads `role` from
  the request body; new users are always `member`.
- `/login` and `/register` now redirect an already-authenticated user to `/app` (deferred
  from Increment 2).

**Done when:** navigate workspace → project list → create a project → land on its (empty)
board route. ✅

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
