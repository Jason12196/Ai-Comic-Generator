import cors from "cors";
import express from "express";

import { generateRouter } from "./routes/generate.routes.js";
import { healthRouter } from "./routes/health.routes.js";
import { modelRouter } from "./routes/model.routes.js";
import { taskRouter } from "./routes/task.routes.js";
import { errorResponse } from "./utils/response.js";

export function createApp() {
  const app = express();

  app.use(cors({
    origin: process.env.FRONTEND_URL ?? "*"
  }));
  app.use(express.json({ limit: "10mb" }));

  app.use("/api/health", healthRouter);
  app.use("/api/models", modelRouter);
  app.use("/api/generate", generateRouter);
  app.use("/api/tasks", taskRouter);

  app.use((_request, response) => {
    response.status(404).json(errorResponse("Route not found"));
  });

  return app;
}
