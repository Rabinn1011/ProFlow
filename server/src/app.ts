import cors from "cors";
import express from "express";
import authRouter from "./routes/auth.routes";
import healthRouter from "./routes/health.routes";
import { errorHandler } from "./middleware/error.middleware";
import { notFoundHandler } from "./middleware/not-found.middleware";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ message: "Welcome to ProFlow API" });
});

app.use("/api/auth", authRouter);
app.use("/api/health", healthRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
