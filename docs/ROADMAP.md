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

## Increment 5 — The Kanban board (read + create) ✅ (2026-07-27)

- `ProjectBoard` renders three columns from `GET .../tasks`, grouped by status and sorted
  by `position`; `services/task.service.ts` + `hooks/useTasks.ts` (key
  `["workspaces", ws, "projects", p, "tasks"]`)
- Inline "Add task" per column — Enter submits, Shift+Enter newlines, Escape cancels.
  Title-only, because `createTask` accepts title/description/status but **not** `dueDate`.
- `TaskDetailPanel` slide-over: edit title/description/status/due date, delete behind a
  confirm. Save is disabled until the form is dirty.
- `TaskCard` shows title + a due-date chip that turns rose when overdue
  (`lib/taskDate.ts` handles the ISO ↔ `yyyy-MM-dd` conversion in local time).
- All mutations are member+; viewers get a read-only board with no add/edit controls.

**Done when:** tasks created and edited entirely from the board UI. ✅

## Increment 6 — Drag & drop + real-time ✅ (2026-07-27)

- `@hello-pangea/dnd` wired into the board; drag between and within columns.
  `useMoveTask` is optimistic (`onMutate` snapshots + patches, `onError` rolls back,
  `onSuccess` takes the server's copy) and new positions are midpoints between neighbours
  (`POSITION_GAP` 1000 at the ends).
- Server broadcasts `task:created` / `task:updated` / `task:deleted`; `task:moved` now
  carries the full task so clients patch all four events identically.
  `lib/realtime.ts` centralises the best-effort emit; `toTaskDto` kills the six copies
  of the response shape.
- `useProjectRealtime` joins `project:<id>`, patches the React Query cache via
  `setQueryData` (no refetch), rejoins on reconnect, and leaves on unmount.
- **Socket handshake authenticated** (scope §4.5 closed): `io.use` verifies the access
  token from `handshake.auth`, and `project:join` additionally checks workspace membership
  before joining the room — auth alone would still let any user watch any project.

**Done when:** two browser windows, same board — drag in one, it moves in the other,
and an anonymous socket client can't join the room. ✅

## Increment 7 — Member invites ✅ (2026-07-27)

- Backend `controllers/members.controller.ts` + routes:
  `GET` (member+), `POST` / `PATCH` / `DELETE /workspaces/:id/members` (admin+).
  Members are returned joined with name/email — `members[]` only stores ids.
- Guard rails, all verified against a running server:
  last owner cannot be demoted or removed; nobody can assign a role above their own rank;
  owners manage anyone, others only ranks strictly below their own (which also blocks
  self-promotion); duplicate invites 409; unknown email 404; non-members 403.
  `lib/workspaceRoles.ts` holds the rank table, now shared with the access middleware.
- Removing a member unassigns their tasks, so `assigneeId` never points at someone who
  can no longer see the workspace.
- Frontend `MembersPanel` on the workspace page: list, invite by email with a role, change
  role inline, remove behind a confirm. Role options are capped at the caller's own rank.

**Done when:** second account invited as viewer sees the board read-only; as member,
can move tasks and it syncs live.

## Increment 8 — Analytics ✅ (2026-07-27)

- **`completedAt` added to `Task`** — set on transition into `done`, cleared on the way
  out, via one `applyStatus()` helper shared by create/update/move. `updatedAt` could not
  stand in: any edit bumps it, which would mis-date completions. Existing done tasks were
  backfilled from `updatedAt` (`server/scripts/backfill-completed-at.mjs`, dry-run by
  default) — pre-2026-07-27 completion dates are therefore approximate.
- `GET /workspaces/:id/analytics?days=` (admin+), four real aggregation pipelines run in
  parallel: status `$group`; per-project double `$group` + `$lookup` on projects;
  completions bucketed with `$dateToString` (UTC); throughput `$group` on `assigneeId`
  + `$lookup` on users. Missing days are zero-filled server-side so the chart axis is
  continuous. Index added on `{ workspaceId, completedAt }`.
- `/app/workspaces/:id/analytics` with Recharts: stat tiles, completions line, stacked
  per-project bar, throughput bar. Palette validated with the dataviz checker (worst
  adjacent CVD ΔE 23.2 deutan); amber is below 3:1 contrast so its marks carry labels.
- Verified with a scripted fixture: 13/13 assertions on totals, per-project splits,
  day buckets, throughput grouping, and the viewer-denied 403.

**Done when:** charts render real numbers from the aggregation pipeline (verifiable
against the board). ✅

Known limitation: throughput is attributed by **assignee**, not by who moved the task —
there is no audit trail of status changes. Unassigned completions group under
"Unassigned".

## Increment 9 — Chat ✅ (2026-08-16)

- `Message` model (`workspaceId`, `projectId`, `author`, `body`, 2000-char cap) with a
  `{ projectId, createdAt: -1 }` index serving the history query directly.
- `GET /workspaces/:wsId/projects/:pId/messages?before=&limit=` — member+, 50 per page,
  max 100. **Keyset (cursor) pagination on `createdAt`**, not offset: live messages
  arriving mid-scroll cannot shift the window and duplicate a row. Fetches `limit + 1`
  to report `hasMore` without a second count query.
- Socket `chat:send` → persist → broadcast `chat:message` to the room. **Authorization is
  room membership**: `project:join` already verified workspace membership, so
  `socket.rooms.has()` is the check — a socket that never joined gets `chat:error`.
- `ChatPanel` slide-over on the board: day separators, own-vs-others bubbles,
  Enter to send / Shift+Enter for newline, "Load older messages", auto-scroll.
  Client cache appends to page 0 and de-dupes by id.
- **Viewers can post** — scope §4.6's open question resolved as yes; they are stakeholders
  who need to ask questions.
- 6 history tests (ordering, 50-cap, cursor walk, project isolation, viewer read,
  non-member 403) plus a 7-assertion socket end-to-end run covering two clients, viewer
  posting, empty/oversized rejection, persistence, and the non-joined-socket case.

**Done when:** two accounts hold a conversation that survives a refresh. ✅

## Increment 10 — Hardening & ship ✅ (2026-08-16)

- ✅ **Jest + Supertest, 44 tests** against `mongodb-memory-server` (no external DB, so CI
  needs no service container). `tsconfig.test.json` exists because the base config scopes
  to `src` only. Suites: auth flow (incl. the ignored-`role` regression and logout
  revoking a refresh token), RBAC gating per role, membership guard rails, cascade
  deletes, analytics aggregations, and the `completedAt` lifecycle.
- ✅ **CI extended** to run `npm test` on the server job.
- ✅ **README rewritten** — the old one promised social login, file uploads and
  Multer/Cloudinary, none of which exist or are planned.
- ✅ **`COOKIE_CROSS_SITE`** added: cookie SameSite mode is now a deployment fact, not
  inferred from `NODE_ENV`. Compose runs "production" with both halves on localhost
  (same-site), which the old `NODE_ENV`-only logic would have got wrong.
- ✅ **Docker verified 2026-08-16** — `server/Dockerfile` (multi-stage, non-root),
  `client/Dockerfile` (build → nginx with SPA fallback + asset caching),
  `docker-compose.yml` (mongo with healthcheck, server, client). `docker compose up`
  builds and runs; health check, SPA deep-route fallback, registration, CORS and the
  `SameSite=Strict` refresh cookie all confirmed against the running stack.

**Done when:** `docker compose up` on a clean machine gives a working ProFlow;
CI is green. ✅

---

## Deliberately not on the roadmap

Social login, file uploads, sprints/epics/story points, threads/reactions in chat,
custom board columns. See scope §1 and §4.8 — cut or deferred on purpose.
