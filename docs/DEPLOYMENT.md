# ProFlow — Deployment

Three moving parts, three homes:

| Piece | Where | Why |
|---|---|---|
| MongoDB | Atlas | already in use for dev; production gets its own database |
| API (`server/`) | Render / Railway / Fly.io | Socket.io needs a **long-lived process**. Serverless functions are request-scoped and cannot hold WebSocket connections — do not deploy this to Vercel/Netlify functions. |
| Client (`client/`) | Vercel / Netlify / Cloudflare Pages | static bundle after `vite build` |

---

## 1. Database

Create a **separate** Atlas database for production (not `astrosewa-dev`-style shared use —
a bad migration should never touch dev data). Allow network access from the API host;
most PaaS providers do not offer static egress IPs on lower tiers, so `0.0.0.0/0` plus a
strong password is the usual compromise.

## 2. API

Build command `npm ci && npm run build`, start command `npm start`
(`node dist/server.js`). `server/dist/` is gitignored, so the host must build it.

Environment variables (see `server/.env.example`):

| Var | Production value |
|---|---|
| `NODE_ENV` | `production` — **this switches the refresh cookie to `SameSite=None; Secure`** |
| `PORT` | usually injected by the host |
| `MONGO_URI` | Atlas production connection string |
| `CORS_ORIGIN` | deployed client URL, no trailing slash, e.g. `https://proflow.vercel.app` |
| `ACCESS_TOKEN_SECRET` | fresh random value — **not** the dev one |
| `REFRESH_TOKEN_SECRET` | fresh random value, different from the above |
| `ACCESS_TOKEN_EXPIRES_IN_SECONDS` | `900` |
| `REFRESH_TOKEN_EXPIRES_IN_SECONDS` | `604800` |

Generate each secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## 3. Client

Build command `npm ci && npm run build`, output directory `dist`.

Set **`VITE_API_BASE_URL`** to the deployed API URL including `/api`
(e.g. `https://proflow-api.onrender.com/api`).

> Vite **inlines** env vars at build time — the value is string-replaced into the bundle,
> not read at runtime. Changing it later requires a rebuild, not a restart. Build with the
> wrong value and you ship a client permanently pointing at localhost.

The Socket.io URL is derived from this by stripping `/api`, so it follows automatically.

---

## Cross-domain gotchas

These are the ones that produce confusing, works-locally failures.

**Refresh cookie.** Client and API sit on different domains in production, which makes the
cookie cross-site. `SameSite=Strict` (the local setting) means the browser silently never
sends it: login appears to work, then every page refresh logs you out. `NODE_ENV=production`
switches it to `SameSite=None; Secure`, which requires HTTPS — every host above provides it.
If `NODE_ENV` is not exactly `production`, this does not happen.

**CORS.** `CORS_ORIGIN` covers both HTTP requests and the Socket.io handshake. A trailing
slash or an `http://` vs `https://` mismatch fails the check.

**Free tiers sleep.** Render's free tier spins down when idle: the first request after that
takes ~50 s, and open WebSocket connections drop — the board stops updating live until a
reload. Acceptable for a demo; know it is happening before debugging a "real-time bug."

---

## CI

`.github/workflows/ci.yml` runs on every PR and every push to `main`:

- **server** — `npm ci`, `npm run build` (tsc)
- **client** — `npm ci`, `npm run lint`, `npm run build` (tsc -b + vite build)

Enable branch protection on `main` requiring both jobs, so a red build cannot merge.

**Green CI does not mean "works."** There are no tests yet — it means the code compiles
and lints. Test coverage is roadmap Increment 10.

## CD — not built yet

Deploy manually first and get it genuinely working end to end. Automating a deploy you
have never performed by hand means debugging the pipeline and the app config at the same
time, with worse error messages. Once the manual path is understood, both Render and
Vercel can auto-deploy on push to `main` with no extra workflow, which is usually enough.
