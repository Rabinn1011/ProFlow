import { Router } from "express";
import { me } from "../controllers/users.controller";
import { requireAuth } from "../middleware/auth.middleware";

const usersRouter = Router();

usersRouter.get("/me", requireAuth, me);

export default usersRouter;

