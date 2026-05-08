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
