import type { Request, Response } from "express";

export const getHealth = (_req: Request, res: Response): void => {
  res.status(200).json({
    status: "ok",
    service: "proflow-server",
    timestamp: new Date().toISOString(),
  });
};
