import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";

import { optionalAuth } from "./middleware/auth.middleware.js";
import { authRouter } from "./routes/auth.routes.js";
import { healthRouter } from "./routes/health.routes.js";
import { modelRouter } from "./routes/model.routes.js";
import { taskRouter } from "./routes/task.routes.js";
import { errorResponse } from "./utils/response.js";

export function createApp() {
  const app = express();

  app.use(cors({
    origin: process.env.FRONTEND_URL ?? true,
    credentials: true
  }));
  app.use(cookieParser());
  app.use(express.json({ limit: "10mb" }));
  app.use(optionalAuth);

  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/tasks", taskRouter);
  app.use("/api/models", modelRouter);

  app.use((_request, response) => {
    response.status(404).json(errorResponse("Route not found"));
  });

  return app;
}
