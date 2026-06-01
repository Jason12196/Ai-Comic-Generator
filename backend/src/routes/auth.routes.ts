import { Router } from "express";

import { getCurrentUser, login, logout, register } from "../controllers/auth.controller.js";
import { optionalAuth, requireAuth } from "../middleware/auth.middleware.js";

const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/logout", logout);
authRouter.get("/me", optionalAuth, getCurrentUser);
authRouter.get("/session", requireAuth, getCurrentUser);

export { authRouter };
