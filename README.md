# ProFlow

A team project-management workspace — a focused alternative that sits between a to-do list
(too simple) and Jira (too much).

Sign up, create a **workspace**, invite teammates with **roles**, and inside it create
**projects**. Each project has a **Kanban board** that the whole team sees update **live**.
Owners and admins get **analytics** on throughput and completion.

## Features

- **Real-time Kanban board** — three fixed columns, drag and drop between and within them.
  Moves apply optimistically and roll back if the server rejects them; every change
  broadcasts over Socket.io and patches other clients' caches in place.
- **Workspaces with real RBAC** — `owner > admin > member > viewer`, enforced by server
  middleware on every route and reflected in the UI. Viewers get a genuinely read-only board.
- **Member management** — invite existing users by email, change roles, remove members.
  Guard rails prevent losing the last owner or assigning a role above your own.
- **Analytics** — MongoDB aggregation pipelines behind status splits, completions over
  time, per-assignee throughput, and overdue counts. Rendered with Recharts, admin+ only.
- **Secure auth** — bcrypt passwords, short-lived JWT access tokens held in memory, and a
  long-lived refresh token in an httpOnly cookie. Sessions survive a page refresh; the
  Socket.io handshake is authenticated and room joins are membership-checked.

## Tech stack

| Layer | Choice |
|---|---|
| Client | React 19, Vite, TypeScript, Tailwind CSS |
| Client state | Zustand (client state) + TanStack Query (server state) |
| Forms | React Hook Form |
| Drag & drop | @hello-pangea/dnd |
| Charts | Recharts |
| Server | Node.js, Express 5, TypeScript |
| Database | MongoDB with Mongoose |
| Real-time | Socket.io |
| Tests | Jest + Supertest + mongodb-memory-server |

## Running it

### Docker (everything, including a local Mongo)

```bash
docker compose up --build
```

Client on <http://localhost:8080>, API on <http://localhost:5000>.

### Locally

Requires Node 22+ and a MongoDB instance (local or Atlas).

```bash
# 1. Configure the server
cp server/.env.example server/.env      # then fill in MONGO_URI and the two secrets

# 2. Install
npm install                    # root: concurrently
npm install --prefix server
npm install --prefix client

# 3. Run both halves
npm run dev
```

Client on <http://localhost:5173>, API on <http://localhost:5000>.

Generate each auth secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Tests

```bash
npm test --prefix server
```

44 tests covering the auth flow, RBAC gating, membership guard rails, cascade deletes, and
the analytics aggregations. They run against an in-memory MongoDB, so no database setup is
needed — CI runs the same command on every push and pull request.

## Project layout

```
client/    React app (pages, components, hooks, services, Zustand store)
server/    Express API (routes -> middleware -> controllers -> Mongoose models)
docs/      Scope, roadmap, and deployment notes
```

The API is deliberately nested — `/api/workspaces/:wsId/projects/:pId/tasks/:taskId` — so
every request carries its full tenancy path. One middleware chain resolves the workspace,
confirms membership, and checks role rank before any controller runs, which keeps
authorization logic out of the controllers entirely.

## Docs

- [`docs/PROJECT_SCOPE.md`](docs/PROJECT_SCOPE.md) — what this is, feature by feature, plus
  known defects and decisions worth remembering
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — the incremental build plan and what shipped when
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — hosting, environment variables, and the
  cross-domain gotchas

## Not built, on purpose

Social login, file uploads, sprints/epics/story points, custom board columns, and
threads/reactions in chat are all out of scope — see scope §1 and §4.8.
