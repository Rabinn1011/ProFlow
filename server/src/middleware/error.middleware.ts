import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";

type HttpishError = Error & { status?: number; statusCode?: number; type?: string };

// Raw error messages used to go straight to the client. That leaked internals (config
// errors like "ACCESS_TOKEN_SECRET is not configured", Mongo cast details, library
// messages) and turned client mistakes such as malformed JSON into 500s. Known client
// errors now map to 4xx with a safe message; everything else is a generic 500 and the
// detail stays in the server log.
export const errorHandler = (
  err: HttpishError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err.type === "entity.parse.failed") {
    res.status(400).json({ message: "Malformed JSON body" });
    return;
  }
  if (err.type === "entity.too.large") {
    res.status(413).json({ message: "Request body too large" });
    return;
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const fields = Object.values(err.errors).map((e) => e.path);
    res.status(400).json({ message: `Invalid value for: ${fields.join(", ")}` });
    return;
  }
  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({ message: `Invalid value for: ${err.path}` });
    return;
  }

  const status = err.status ?? err.statusCode;
  if (status && status >= 400 && status < 500) {
    res.status(status).json({ message: err.message || "Bad request" });
    return;
  }

  if (process.env.NODE_ENV !== "test") {
    console.error(err);
  }
  res.status(500).json({ message: "Internal server error" });
};
