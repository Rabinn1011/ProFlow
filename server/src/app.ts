import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import authRouter from "./routes/auth.routes";
import healthRouter from "./routes/health.routes";
import usersRouter from "./routes/users.routes";
import workspacesRouter from "./routes/workspaces.routes";
import { getAllowedOrigins } from "./config/cors";
import { errorHandler } from "./middleware/error.middleware";
import { notFoundHandler } from "./middleware/not-found.middleware";

const app = express();

// Hosts like Render/Railway terminate TLS at a proxy; without this Express sees plain
// http and req.protocol / req.ip are wrong.
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Security headers (HSTS, nosniff, frame-ancestors, no X-Powered-By, ...). This is a JSON
// API, so the default CSP, which forbids everything, is exactly right.
app.use(helmet());

app.use(
  cors({
    origin: getAllowedOrigins(),
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

app.get("/", (_req, res) => {
  res.json({ message: "Welcome to ProFlow API" });
});

// Lightweight keep-alive for free-tier hosts. No DB, no auth, no extra fields.
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/health", healthRouter);
app.use("/api/users", usersRouter);
app.use("/api/workspaces", workspacesRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
