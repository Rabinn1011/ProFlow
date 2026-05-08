import type { Response } from "express";
import { User } from "../models/user.model";
import type { RequestWithUser } from "../types/express";

export const me = async (req: RequestWithUser, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  const user = await User.findById(userId).select("_id name email role createdAt updatedAt");
  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  res.status(200).json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  });
};

