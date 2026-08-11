import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import authRouter from "./routes/auth.routes";
import healthRouter from "./routes/health.routes";
import usersRouter from "./routes/users.routes";
import workspacesRouter from "./routes/workspaces.routes";
import { errorHandler } from "./middleware/error.middleware";
import { notFoundHandler } from "./middleware/not-found.middleware";

const app = express();

// Hosts like Render/Railway terminate TLS at a proxy; without this Express sees plain
// http and req.protocol / req.ip are wrong.
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",").map((s) => s.trim()) ?? true,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

app.get("/", (_req, res) => {
  res.json({ message: "Welcome to ProFlow API" });
});

app.use("/api/auth", authRouter);
app.use("/api/health", healthRouter);
app.use("/api/users", usersRouter);
app.use("/api/workspaces", workspacesRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
