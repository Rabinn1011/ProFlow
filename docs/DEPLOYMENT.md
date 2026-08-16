# ProFlow — Deployment

Three moving parts, three homes:

| Piece | Where | Why |
|---|---|---|
| MongoDB | Atlas | production gets its own database, separate from dev |
| API (`server/`) | Render / Railway / Fly.io | Socket.io needs a **long-lived process**. Serverless functions are request-scoped and cannot hold WebSocket connections — do not deploy this to Vercel/Netlify functions. |
| Client (`client/`) | Vercel / Netlify / Cloudflare Pages | static bundle after `vite build` |

**Order matters.** There is a circular dependency — the client needs the API's URL at build
time, the API needs the client's URL for CORS. Deploy the API first with a placeholder
origin, then the client, then come back and fix the origin.

---

## Step 1 — MongoDB Atlas

1. Create a **new database** for production, e.g. `proflow-prod`. Never point production at
   the dev database; a bad migration should not touch data you are testing against.
2. **Database Access** → add a user with a generated password, *Read and write to any database*.
3. **Network Access** → allow `0.0.0.0/0`.

   This is the normal compromise: PaaS free tiers have no static outbound IP, so there is
   nothing narrower to allow. The credentials are the protection — generate the password,
   never type one.
4. Connection string, with the real password and the database name:

   ```
   mongodb+srv://user:pass@cluster.mongodb.net/proflow-prod?retryWrites=true&w=majority
   ```

## Step 2 — API on Render

New + → **Web Service** → connect the GitHub repo.

| Field | Value |
|---|---|
| Root Directory | `server` |
| Runtime | Node |
| Build Command | `npm ci --include=dev && npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` (optional; under Advanced, or add later in Settings) |

> **`--include=dev` is not optional.** `NODE_ENV=production` applies to the build as well as
> the runtime, and npm reads it as an implicit `--omit=dev` — so `npm ci` alone skips
> `typescript` and every `@types/*` package, and `tsc` fails with dozens of
> "Could not find a declaration file for module 'express'" errors. Docker does not hit this
> because its build stage runs before `ENV NODE_ENV=production` is set.

Environment variables:

| Var | Production value |
|---|---|
| `NODE_ENV` | `production` |
| `MONGO_URI` | the Atlas string from step 1 |
| `ACCESS_TOKEN_SECRET` | fresh random value — **not** the dev one |
| `REFRESH_TOKEN_SECRET` | fresh random value, different from the above |
| `ACCESS_TOKEN_EXPIRES_IN_SECONDS` | `900` |
| `REFRESH_TOKEN_EXPIRES_IN_SECONDS` | `604800` |
| `COOKIE_CROSS_SITE` | `true` — client and API are on different domains |
| `CORS_ORIGIN` | placeholder for now; set properly in step 4 |

Generate each secret separately:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Do **not** set `PORT` — the host injects it and `server.ts` already reads `process.env.PORT`.
`server/dist/` is gitignored, which is why the build command must run.

**Verify before continuing:** open `https://<api-url>/api/health` in a browser. If that is
not JSON, nothing downstream will work.

## Step 3 — Client on Vercel

Add New → **Project** → import the repo.

| Field | Value |
|---|---|
| Root Directory | `client` |
| Framework Preset | Vite (auto-detected) |
| Build Command | `npm run build` (default) |
| Output Directory | `dist` (default) |

One environment variable:

```
VITE_API_BASE_URL = https://<api-url>/api
```

Note the `/api` suffix and no trailing slash.

> Vite **inlines** env vars at build time — the value is string-replaced into the bundle,
> not read at runtime. Changing it later requires a rebuild, not a restart. Build with the
> wrong value and you ship a client permanently pointing at localhost.

The Socket.io URL is derived from this by stripping `/api`, so it follows automatically.

## Step 4 — Close the loop

Back on the API host, set `CORS_ORIGIN` to the deployed client URL:

```
CORS_ORIGIN = https://proflow-<something>.vercel.app
```

No trailing slash, `https` not `http`. This one variable covers **both** HTTP requests and
the Socket.io handshake, so a mistake here breaks real-time as well as fetches.

## Step 5 — Verify, in this order

Each step proves a different layer, so a failure tells you where to look.

1. Client URL loads the login page → static hosting is fine
2. **Register a new account** → lands on the dashboard → API + DB + CORS are fine
3. **Hit F5** → still logged in → the cross-site cookie is fine *(most likely thing to be wrong)*
4. Create a workspace → project → task
5. Same board in a normal and an incognito window; drag in one → moves in the other → WebSockets are fine

---

## Failure modes

| Symptom | Cause |
|---|---|
| Console: "blocked by CORS policy" | `CORS_ORIGIN` mismatch — trailing slash, or http vs https |
| Login works, F5 logs you out | `COOKIE_CROSS_SITE` is not `true` |
| Requests going to `localhost:5000` | `VITE_API_BASE_URL` missing at build time — set it and **redeploy** |
| First request takes ~50 s | Free-tier cold start; normal |
| Real-time stops after a quiet period | Free tier spun down and dropped the WebSocket; a reload reconnects |

### Why `COOKIE_CROSS_SITE` exists

The refresh cookie is `httpOnly` and `SameSite`-scoped. When the client and API are on
different domains the browser treats the cookie as cross-site and will only send it with
`SameSite=None`, which browsers accept only alongside `Secure`. With `SameSite=Strict` the
cookie is silently never sent: login appears to work, then every refresh logs you out.

This is a **deployment fact, not an environment fact** — a docker-compose stack runs
`NODE_ENV=production` with both halves on `localhost`, which is same-site. So the mode is
set explicitly. Left unset, it falls back to `NODE_ENV === "production"`.

---

## Docker

`docker compose up --build` runs the whole stack — Mongo, API, client — with the client on
:8080 and the API on :5000. Compose sets `COOKIE_CROSS_SITE=false` because both halves are
served from localhost.

The client image takes `VITE_API_BASE_URL` as a **build arg**, not a runtime env var, for
the reason above. Changing which API the image talks to means rebuilding it.

**Verified 2026-08-16** — built and run end to end: health check OK, client served, the
nginx SPA fallback returns index.html for deep routes, registration succeeds against the
containerised Mongo, CORS header correct, and the refresh cookie comes back
`HttpOnly; Secure; SameSite=Strict` (i.e. `COOKIE_CROSS_SITE=false` applied).

## CI

`.github/workflows/ci.yml` runs on every PR and every push to `main`:

- **server** — `npm ci`, `npm run build` (tsc), `npm test` (44 Jest + Supertest tests
  against an in-memory MongoDB, so no service container is needed)
- **client** — `npm ci`, `npm run lint`, `npm run build` (tsc -b + vite build)

Enable branch protection on `main` requiring both jobs, so a red build cannot merge.

## CD — not built yet

Deploy manually first and get it genuinely working end to end. Automating a deploy you have
never performed by hand means debugging the pipeline and the app config at the same time,
with worse error messages. Once the manual path is understood, both Render and Vercel can
auto-deploy on push to `main` with no extra workflow, which is usually enough.
