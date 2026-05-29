import cors from "cors";
import express from "express";

import { healthRouter } from "./routes/health.routes.js";
import { modelRouter } from "./routes/model.routes.js";
import { errorResponse } from "./utils/response.js";

export function createApp() {
  const app = express();

  app.use(cors({
    origin: process.env.FRONTEND_URL ?? "*"
  }));
  app.use(express.json({ limit: "10mb" }));

  app.use("/api/health", healthRouter);
  app.use("/api/models", modelRouter);

  app.use((_request, response) => {
    response.status(404).json(errorResponse("Route not found"));
  });

  return app;
}
